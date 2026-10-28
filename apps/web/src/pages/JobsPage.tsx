import { Button, EmptyState } from "@appligator/ui";
import { IconPlus } from "@tabler/icons-react";
import { Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import emptyIllustration from "../assets/jobs-empty.svg";
import { JobFormDrawer } from "../jobs/JobFormDrawer.tsx";
import { JobList } from "../jobs/JobList.tsx";
import { useJobs } from "../jobs/jobQueries.ts";
import { LoadError } from "../jobs/LoadError.tsx";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useIsDesktop.ts";
import { Page } from "./Page.tsx";
import styles from "./JobsPage.module.css";

export function JobsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const jobs = useJobs();
  const { jobId } = useParams({ strict: false });
  const [isAdding, setIsAdding] = useState(false);

  const title = t("navigation.jobs");
  const addButton = (
    <Button onClick={() => setIsAdding(true)}>
      <IconPlus size={20} stroke={2.4} aria-hidden />
      {t("jobs.add")}
    </Button>
  );
  const floatingAddButton = !isDesktop && <FloatingActions>{addButton}</FloatingActions>;
  const addDrawer = (
    <JobFormDrawer
      open={isAdding}
      onOpenChange={setIsAdding}
      onSaved={(job) => void navigate({ to: "/jobs/$jobId", params: { jobId: job.id } })}
    />
  );

  if (jobs.isPending) {
    return (
      <Page title={title}>
        <output className={styles.status}>{t("jobs.loading")}</output>
      </Page>
    );
  }

  if (jobs.isError) {
    return (
      <Page title={title}>
        <LoadError message={t("jobs.loadError")} onRetry={() => void jobs.refetch()} />
      </Page>
    );
  }

  if (jobs.data.length === 0 && !jobId) {
    return (
      <Page title={title} headerOnMobileOnly className={styles.empty}>
        <EmptyState
          illustration={<img src={emptyIllustration} alt="" width={210} height={281} />}
          title={t("jobs.empty.title")}
          description={t("jobs.empty.description")}
          action={isDesktop && addButton}
        />
        {floatingAddButton}
        {addDrawer}
      </Page>
    );
  }

  return (
    <div className={styles.layout} data-detail-open={jobId ? "" : undefined}>
      <Page title={title} actions={isDesktop && addButton} className={styles.list}>
        <JobList jobs={jobs.data} />
      </Page>
      <Outlet />
      {!jobId && floatingAddButton}
      {addDrawer}
    </div>
  );
}
