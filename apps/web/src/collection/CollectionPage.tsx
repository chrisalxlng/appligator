import { EmptyState, Spinner } from "@appligator/ui";
import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import emptyIllustration from "../assets/jobs-empty.svg";
import { LoadError } from "../loading/LoadError.tsx";
import { PageSpinner } from "../loading/PageSpinner.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import { Page } from "../pages/Page.tsx";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import styles from "./CollectionPage.module.css";

interface Message {
  title: string;
  description: string;
}

interface CollectionTexts {
  loading: string;
  loadingMore: string;
  loadError: Message;
  loadMoreError: Message;
  empty: Message;
}

interface CollectionQuery<Item> {
  data: Item[] | undefined;
  isPending: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

interface CollectionPageProps<Item> {
  title: string;
  texts: CollectionTexts;
  query: CollectionQuery<Item>;
  openedId: string | undefined;
  action: ReactNode;
  filter?: ReactNode;
  renderList: (items: Item[], onEndReached: (() => void) | undefined) => ReactNode;
  children?: ReactNode;
}

export function CollectionPage<Item>({
  title,
  texts,
  query,
  openedId,
  action,
  filter,
  renderList,
  children,
}: CollectionPageProps<Item>) {
  const isDesktop = useIsDesktop();
  const showSpinner = useDelayedSpinner(query.isPending);

  const documentTitle = <DocumentTitle title={title} />;
  const floatingAction = !isDesktop && <FloatingActions>{action}</FloatingActions>;

  const loadMore = () => void query.fetchNextPage();
  const canLoadMore = query.hasNextPage && !query.isFetchingNextPage && !query.isFetchNextPageError;

  if (query.isPending || showSpinner) {
    return (
      <Page title={title}>
        {documentTitle}
        {showSpinner && <PageSpinner label={texts.loading} />}
      </Page>
    );
  }

  if (query.isError && !query.isFetchNextPageError) {
    return (
      <Page title={title} hideHeader={isDesktop}>
        {documentTitle}
        <LoadError
          title={texts.loadError.title}
          description={texts.loadError.description}
          onRetry={() => void query.refetch()}
        />
      </Page>
    );
  }

  if (query.data?.length === 0 && !openedId) {
    return (
      <Page title={title} hideHeader={isDesktop} className={styles.empty}>
        {documentTitle}
        <EmptyState
          illustration={<img src={emptyIllustration} alt="" width={210} height={281} />}
          title={texts.empty.title}
          description={texts.empty.description}
          action={isDesktop && action}
        />
        {floatingAction}
        {children}
      </Page>
    );
  }

  return (
    <div className={styles.layout} data-detail-open={openedId ? "" : undefined}>
      <Page title={title} actions={isDesktop && action} className={styles.list}>
        {!openedId && documentTitle}
        <div className={styles.content}>
          {filter}
          {renderList(query.data ?? [], canLoadMore ? loadMore : undefined)}
        </div>
        {query.isFetchingNextPage && (
          <div className={styles.loadingMore}>
            <Spinner label={texts.loadingMore} />
          </div>
        )}
        {query.isFetchNextPageError && (
          <LoadError
            title={texts.loadMoreError.title}
            description={texts.loadMoreError.description}
            onRetry={loadMore}
          />
        )}
      </Page>
      <Outlet />
      {!openedId && floatingAction}
      {children}
    </div>
  );
}
