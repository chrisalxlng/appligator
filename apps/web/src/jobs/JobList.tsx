import type { JobListItem } from "@appligator/shared";
import { Link } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useRef } from "react";
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

interface JobListProps {
  jobs: JobListItem[];
  onEndReached?: () => void;
}

export function JobList({ jobs, onEndReached }: JobListProps) {
  const createdLabel = useCreatedLabel();

  return (
    <div className={styles.container}>
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
      {onEndReached && <EndTrigger onReached={onEndReached} />}
    </div>
  );
}

function EndTrigger({ onReached }: { onReached: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reach = useEffectEvent(onReached);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) reach();
    });
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={styles.endTrigger} aria-hidden />;
}
