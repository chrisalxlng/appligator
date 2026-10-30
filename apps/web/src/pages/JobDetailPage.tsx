import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DetailPage } from "../collection/DetailPage.tsx";
import { JobDetail } from "../jobs/JobDetail.tsx";
import { useJob } from "../jobs/jobQueries.ts";

export function JobDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { jobId } = useParams({ from: "/shell/jobs/$jobId" });

  return (
    <DetailPage
      title={t("navigation.jobs")}
      texts={{
        loading: t("jobs.loadingJob"),
        notFound: t("jobs.notFound", { returnObjects: true }),
        loadError: t("jobs.detailLoadError", { returnObjects: true }),
      }}
      query={useJob(jobId)}
      onClose={() => void navigate({ to: "/jobs" })}
      backLink={<Link to="/jobs" />}
    >
      {(job) => <JobDetail job={job} />}
    </DetailPage>
  );
}
