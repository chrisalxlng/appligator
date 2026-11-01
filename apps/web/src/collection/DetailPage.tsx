import { EmptyState, IconButton, LinkButton } from "@appligator/ui";
import type { UseQueryResult } from "@tanstack/react-query";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import { useState, type ReactElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/apiClient.ts";
import notFoundIllustration from "../assets/not-found.svg";
import { LoadError } from "../loading/LoadError.tsx";
import { PageSpinner } from "../loading/PageSpinner.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import { Page } from "../pages/Page.tsx";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { ScrollToTop } from "../shell/ScrollToTop.tsx";
import { useIsWide } from "../shell/useMediaQuery.ts";
import { DetailTitleRefContext } from "./DetailView.tsx";
import styles from "./DetailPage.module.css";
import { useIsScrolledAway } from "./useIsScrolledAway.ts";

interface Message {
  title: string;
  description: string;
}

interface DetailTexts {
  loading: string;
  notFound: Message & { back: string };
  loadError: Message;
}

interface DetailData {
  position: string;
  company: string;
}

interface DetailPageProps<Data extends DetailData> {
  title: string;
  texts: DetailTexts;
  query: UseQueryResult<Data>;
  onClose: () => void;
  backLink: ReactElement;
  children: (data: Data) => ReactNode;
}

export function DetailPage<Data extends DetailData>({
  title,
  texts,
  query,
  onClose,
  backLink,
  children,
}: DetailPageProps<Data>) {
  const { t } = useTranslation();
  const isWide = useIsWide();
  const [detailTitle, setDetailTitle] = useState<HTMLElement | null>(null);
  const isTitleScrolledAway = useIsScrolledAway(detailTitle);
  const documentTitle =
    query.data?.position ?? (isNotFound(query.error) ? texts.notFound.title : title);

  const closeButton = (
    <IconButton variant="secondary" size="small" label={t("common.close")} onClick={onClose}>
      <IconX size={16} stroke={2.4} aria-hidden />
    </IconButton>
  );

  return (
    <Page
      title={title}
      actions={!isWide && closeButton}
      hideHeader={isWide && !isTitleScrolledAway}
      compactTitle={
        isTitleScrolledAway && query.data
          ? { title: query.data.position, subtitle: query.data.company }
          : undefined
      }
      className={styles.page}
    >
      <DocumentTitle title={documentTitle} />
      <DetailTitleRefContext value={setDetailTitle}>
        <DetailContent texts={texts} query={query} backLink={backLink}>
          {children}
        </DetailContent>
      </DetailTitleRefContext>
      <ScrollToTop scrollsWith="parent" />
    </Page>
  );
}

type DetailContentProps<Data extends DetailData> = Pick<
  DetailPageProps<Data>,
  "texts" | "query" | "backLink" | "children"
>;

function DetailContent<Data extends DetailData>({
  texts,
  query,
  backLink,
  children,
}: DetailContentProps<Data>) {
  const showSpinner = useDelayedSpinner(query.isPending);

  if (query.isPending || showSpinner) {
    return showSpinner && <PageSpinner label={texts.loading} />;
  }

  if (isNotFound(query.error)) {
    return (
      <div className={styles.notFound}>
        <EmptyState
          illustration={<img src={notFoundIllustration} alt="" width={225} height={224} />}
          title={texts.notFound.title}
          description={texts.notFound.description}
          action={
            <LinkButton render={backLink}>
              <IconArrowLeft size={20} stroke={2.4} aria-hidden />
              {texts.notFound.back}
            </LinkButton>
          }
        />
      </div>
    );
  }

  if (query.isError) {
    return (
      <LoadError
        title={texts.loadError.title}
        description={texts.loadError.description}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return children(query.data);
}

function isNotFound(error: Error | null) {
  return error instanceof ApiError && error.status === 404;
}
