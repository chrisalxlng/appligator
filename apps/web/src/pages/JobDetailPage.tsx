import { IconButton } from "@appligator/ui";
import { IconX } from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/apiClient.ts";
import { JobDetail } from "../jobs/JobDetail.tsx";
import { useJob } from "../jobs/jobQueries.ts";
import { LoadError } from "../jobs/LoadError.tsx";
import { PageSpinner } from "../loading/PageSpinner.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import { useIsWide } from "../shell/useMediaQuery.ts";
import styles from "./JobDetailPage.module.css";
import { Page } from "./Page.tsx";

export function JobDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isWide = useIsWide();
  const { jobId } = useParams({ from: "/shell/jobs/$jobId" });
  const job = useJob(jobId);

  const closeButton = (
    <IconButton
      variant="secondary"
      size="small"
      label={t("jobs.close")}
      onClick={() => void navigate({ to: "/jobs" })}
    >
      <IconX size={16} stroke={2.4} aria-hidden />
    </IconButton>
  );

  return (
    <Page
      title={t("navigation.jobs")}
      actions={closeButton}
      hideHeader={isWide}
      className={styles.page}
    >
      <JobDetailContent job={job} />
    </Page>
  );
}

function JobDetailContent({ job }: { job: ReturnType<typeof useJob> }) {
  const { t } = useTranslation();
  const showSpinner = useDelayedSpinner(job.isPending);

  if (job.isPending || showSpinner) {
    return showSpinner && <PageSpinner label={t("jobs.loadingJob")} />;
  }

  if (job.error instanceof ApiError && job.error.status === 404) {
    return (
      <div className={styles.notFound}>
        <h2 className={styles.notFoundTitle}>{t("jobs.notFound.title")}</h2>
        <p className={styles.notFoundDescription}>{t("jobs.notFound.description")}</p>
        <Link to="/jobs" className={styles.backLink}>
          {t("jobs.notFound.back")}
        </Link>
      </div>
    );
  }

  if (job.isError) {
    return <LoadError message={t("jobs.detailLoadError")} onRetry={() => void job.refetch()} />;
  }

  return <JobDetail job={job.data} />;
}
