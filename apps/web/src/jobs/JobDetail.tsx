import type { Job } from "@appligator/shared";
import { RichText } from "@appligator/ui";
import {
  IconBuilding,
  IconCalendar,
  IconContract,
  IconCurrencyDollar,
  IconLink,
  IconMapPin,
  type Icon,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { JobActions } from "./JobActions.tsx";
import styles from "./JobDetail.module.css";
import { formatDeadline, formatSalaryRange, hostname } from "./formatJob.ts";

export function JobDetail({ job }: { job: Job }) {
  const { t, i18n } = useTranslation();

  return (
    <article className={styles.detail}>
      <header className={styles.header}>
        <p className={styles.company}>{job.company}</p>
        <h2 className={styles.position}>{job.position}</h2>
      </header>
      <JobActions job={job} />
      <dl className={styles.properties}>
        <Property icon={IconCurrencyDollar} label={t("jobs.properties.salary")}>
          {job.salary &&
            t(`jobs.salaryPerPeriod.${job.salary.period}`, {
              amount: formatSalaryRange(job.salary, i18n.language),
            })}
        </Property>
        <Property icon={IconMapPin} label={t("jobs.properties.locations")}>
          {job.locations.length > 0 && job.locations.join(", ")}
        </Property>
        <Property icon={IconBuilding} label={t("jobs.properties.workModel")}>
          {job.workModel && t(`jobs.workModel.${job.workModel}`)}
        </Property>
        <Property icon={IconContract} label={t("jobs.properties.employmentType")}>
          {job.employmentType && t(`jobs.employmentType.${job.employmentType}`)}
        </Property>
        <Property icon={IconCalendar} label={t("jobs.properties.applicationDeadline")}>
          {job.applicationDeadline && formatDeadline(job.applicationDeadline, i18n.language)}
        </Property>
      </dl>
      {(job.summary || job.link) && (
        <div className={styles.summary}>
          {job.summary && <RichText html={job.summary} />}
          {job.link && (
            <a className={styles.link} href={job.link} target="_blank" rel="noreferrer">
              <IconLink size={16} stroke={2} aria-hidden />
              {hostname(job.link)}
            </a>
          )}
        </div>
      )}
      {job.description && (
        <>
          <hr className={styles.separator} />
          <RichText html={job.description} />
        </>
      )}
    </article>
  );
}

interface PropertyProps {
  icon: Icon;
  label: string;
  children: ReactNode;
}

function Property({ icon: PropertyIcon, label, children }: PropertyProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.property}>
      <dt className={styles.propertyLabel}>
        <PropertyIcon size={20} stroke={2} aria-hidden />
        {label}
      </dt>
      <dd className={styles.propertyValue}>
        {children || (
          <>
            <span aria-hidden>—</span>
            <span className={styles.visuallyHidden}>{t("jobs.notSpecified")}</span>
          </>
        )}
      </dd>
    </div>
  );
}
