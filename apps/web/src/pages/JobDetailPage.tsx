import { EmptyState, IconButton, LinkButton } from "@appligator/ui";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/apiClient.ts";
import notFoundIllustration from "../assets/not-found.svg";
import { JobDetail } from "../jobs/JobDetail.tsx";
import { useJob } from "../jobs/jobQueries.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { PageSpinner } from "../loading/PageSpinner.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { useIsWide } from "../shell/useMediaQuery.ts";
import styles from "./JobDetailPage.module.css";
import { Page } from "./Page.tsx";

export function JobDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isWide = useIsWide();
  const { jobId } = useParams({ from: "/shell/jobs/$jobId" });
  const job = useJob(jobId);
  const documentTitle =
    job.data?.position ?? t(isNotFound(job.error) ? "jobs.notFound.title" : "navigation.jobs");

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
      <DocumentTitle title={documentTitle} />
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

  if (isNotFound(job.error)) {
    return (
      <div className={styles.notFound}>
        <EmptyState
          illustration={<img src={notFoundIllustration} alt="" width={225} height={224} />}
          title={t("jobs.notFound.title")}
          description={t("jobs.notFound.description")}
          action={
            <LinkButton render={<Link to="/jobs" />}>
              <IconArrowLeft size={20} stroke={2.4} aria-hidden />
              {t("jobs.notFound.back")}
            </LinkButton>
          }
        />
      </div>
    );
  }

  if (job.isError) {
    return (
      <LoadError
        title={t("jobs.detailLoadError.title")}
        description={t("jobs.detailLoadError.description")}
        onRetry={() => void job.refetch()}
      />
    );
  }

  return <JobDetail job={job.data} />;
}

function isNotFound(error: Error | null) {
  return error instanceof ApiError && error.status === 404;
}
