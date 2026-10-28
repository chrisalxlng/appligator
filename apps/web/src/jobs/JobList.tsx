import type { JobListItem } from "@appligator/shared";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { daysAgo, formatDate } from "./formatJob.ts";
import styles from "./JobList.module.css";

function useCreatedLabel() {
  const { t, i18n } = useTranslation();

  return (createdAt: string) => {
    const days = daysAgo(createdAt);
    if (days === 0) return t("jobs.today");
    if (days === 1) return t("jobs.yesterday");
    return formatDate(createdAt, i18n.language);
  };
}

export function JobList({ jobs }: { jobs: JobListItem[] }) {
  const createdLabel = useCreatedLabel();

  return (
    <ul className={styles.list}>
      {jobs.map((job) => (
        <li key={job.id}>
          <Link to="/jobs/$jobId" params={{ jobId: job.id }} className={styles.card}>
            <span className={styles.position}>{job.position}</span>
            <span className={styles.company}>{job.company}</span>
            <span className={styles.created}>{createdLabel(job.createdAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
