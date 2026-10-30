import { EmptyState, IconButton, LinkButton } from "@appligator/ui";
import type { UseQueryResult } from "@tanstack/react-query";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/apiClient.ts";
import notFoundIllustration from "../assets/not-found.svg";
import { LoadError } from "../loading/LoadError.tsx";
import { PageSpinner } from "../loading/PageSpinner.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import { Page } from "../pages/Page.tsx";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { useIsWide } from "../shell/useMediaQuery.ts";
import styles from "./DetailPage.module.css";

interface Message {
  title: string;
  description: string;
}

export interface DetailTexts {
  loading: string;
  notFound: Message & { back: string };
  loadError: Message;
}

interface DetailPageProps<Data extends { position: string }> {
  title: string;
  texts: DetailTexts;
  query: UseQueryResult<Data>;
  onClose: () => void;
  backLink: ReactElement;
  children: (data: Data) => ReactNode;
}

export function DetailPage<Data extends { position: string }>({
  title,
  texts,
  query,
  onClose,
  backLink,
  children,
}: DetailPageProps<Data>) {
  const { t } = useTranslation();
  const isWide = useIsWide();
  const documentTitle =
    query.data?.position ?? (isNotFound(query.error) ? texts.notFound.title : title);

  const closeButton = (
    <IconButton variant="secondary" size="small" label={t("common.close")} onClick={onClose}>
      <IconX size={16} stroke={2.4} aria-hidden />
    </IconButton>
  );

  return (
    <Page title={title} actions={closeButton} hideHeader={isWide} className={styles.page}>
      <DocumentTitle title={documentTitle} />
      <DetailContent texts={texts} query={query} backLink={backLink}>
        {children}
      </DetailContent>
    </Page>
  );
}

type DetailContentProps<Data extends { position: string }> = Pick<
  DetailPageProps<Data>,
  "texts" | "query" | "backLink" | "children"
>;

function DetailContent<Data extends { position: string }>({
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
