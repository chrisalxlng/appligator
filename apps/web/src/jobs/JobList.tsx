import type { JobListItem } from "@appligator/shared";
import { Link, useParams } from "@tanstack/react-router";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
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

const focusTargets: Record<string, (current: number, last: number) => number> = {
  ArrowDown: (current, last) => Math.min(current + 1, last),
  ArrowUp: (current) => Math.max(current - 1, 0),
  Home: () => 0,
  End: (_, last) => last,
};

function moveFocus(event: KeyboardEvent<HTMLAnchorElement>) {
  const target = focusTargets[event.key];
  if (!target || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const links = [...event.currentTarget.closest("ul")!.querySelectorAll("a")];
  event.preventDefault();
  links[target(links.indexOf(event.currentTarget), links.length - 1)]?.focus();
}

// The list is a single tab stop: the focused job, else the opened one, else the first one.
function useTabStop(jobs: JobListItem[]) {
  const { jobId: openedJobId } = useParams({ strict: false });
  const [focusedJobId, setFocusedJobId] = useState<string>();
  const tabStopId =
    [focusedJobId, openedJobId].find((id) => jobs.some((job) => job.id === id)) ?? jobs[0]?.id;

  function leaveList(event: FocusEvent<HTMLAnchorElement>) {
    if (!event.currentTarget.closest("ul")!.contains(event.relatedTarget)) {
      setFocusedJobId(undefined);
    }
  }

  return { tabStopId, focusJob: setFocusedJobId, leaveList };
}

interface JobListProps {
  jobs: JobListItem[];
  onEndReached?: () => void;
}

export function JobList({ jobs, onEndReached }: JobListProps) {
  const createdLabel = useCreatedLabel();
  const { tabStopId, focusJob, leaveList } = useTabStop(jobs);

  return (
    <div className={styles.container}>
      <ul className={styles.list}>
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className={styles.card}
              tabIndex={job.id === tabStopId ? 0 : -1}
              onFocus={() => focusJob(job.id)}
              onBlur={leaveList}
              onKeyDown={moveFocus}
            >
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
