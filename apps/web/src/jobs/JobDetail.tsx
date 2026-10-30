import type { ContractTerm, Job, NoticePeriod, NoticePeriodUnit } from "@appligator/shared";
import { RichText } from "@appligator/ui";
import {
  IconBasketHeart,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconCoins,
  IconContract,
  IconCurrencyDollar,
  IconFlask,
  IconHandStop,
  IconHome,
  IconHourglass,
  IconLink,
  IconMapPin,
  IconNote,
  IconRocket,
  IconRoute,
  IconSwimming,
  type Icon,
} from "@tabler/icons-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { JobActions } from "./JobActions.tsx";
import styles from "./JobDetail.module.css";
import {
  formatIsoDate,
  formatNumber,
  formatSalaryRange,
  formatUnit,
  hostname,
} from "./formatJob.ts";

export function JobDetail({ job }: { job: Job }) {
  const { t, i18n } = useTranslation();

  return (
    <article className={styles.detail}>
      <header className={styles.header}>
        <p className={styles.company}>{job.company}</p>
        <h2 className={styles.position}>{job.position}</h2>
      </header>
      <JobActions job={job} />
      <dl className={`${styles.properties} ${styles.meta}`}>
        <Property icon={IconCalendar} label={t("jobs.properties.applicationDeadline")}>
          {job.applicationDeadline ? (
            formatIsoDate(job.applicationDeadline, i18n.language)
          ) : (
            <NotSpecified />
          )}
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
      <JobDetails job={job} />
      {job.description && (
        <Section title={t("jobs.sections.description")}>
          <RichText html={job.description} />
        </Section>
      )}
    </article>
  );
}

interface Detail {
  icon: Icon;
  label: string;
  value: ReactNode;
}

function useDetails(job: Job): Detail[] {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  function formatDuration({ amount, unit }: { amount: number; unit: NoticePeriodUnit }) {
    return t(`jobs.duration.${unit}`, { count: amount });
  }

  function formatContractTerm(contractTerm: ContractTerm) {
    switch (contractTerm.kind) {
      case "permanent":
        return t("jobs.contractTerm.permanent");
      case "months":
        return t("jobs.contractTerm.months", { count: contractTerm.months });
      case "until":
        return t("jobs.contractTerm.until", { date: formatIsoDate(contractTerm.date, locale) });
    }
  }

  function formatNoticePeriod(noticePeriod: NoticePeriod) {
    const duration = formatDuration(noticePeriod);
    return noticePeriod.endOf
      ? t(`jobs.noticePeriodEndOf.${noticePeriod.endOf}`, { duration })
      : duration;
  }

  const commute = [
    job.commuteDistance !== null && formatUnit(job.commuteDistance, "kilometer", locale),
    job.commuteDuration !== null && formatUnit(job.commuteDuration, "minute", locale),
  ].filter(Boolean);

  const details: (Detail | false)[] = [
    job.salary !== null && {
      icon: IconCurrencyDollar,
      label: t("jobs.properties.salary"),
      value: t(`jobs.salaryPerPeriod.${job.salary.period}`, {
        amount: formatSalaryRange(job.salary, locale),
      }),
    },
    job.bonuses.length > 0 && {
      icon: IconCoins,
      label: t("jobs.properties.bonuses", { count: job.bonuses.length }),
      value: job.bonuses.join(", "),
    },
    job.benefits.length > 0 && {
      icon: IconBasketHeart,
      label: t("jobs.properties.benefits", { count: job.benefits.length }),
      value: job.benefits.join(", "),
    },
    job.employmentType !== null && {
      icon: IconContract,
      label: t("jobs.properties.employmentType"),
      value: t(`jobs.employmentType.${job.employmentType}`),
    },
    job.workModel !== null && {
      icon: IconBuilding,
      label: t("jobs.properties.workModel"),
      value: t(`jobs.workModel.${job.workModel}`),
    },
    job.homeOfficePercentage !== null && {
      icon: IconHome,
      label: t("jobs.properties.homeOffice"),
      value: formatUnit(job.homeOfficePercentage, "percent", locale),
    },
    job.workingHours !== null && {
      icon: IconClock,
      label: t("jobs.properties.workingHours"),
      value: t(`jobs.workingHoursPerPeriod.${job.workingHours.period}`, {
        hours: formatNumber(job.workingHours.hours, locale),
      }),
    },
    job.locations.length > 0 && {
      icon: IconMapPin,
      label: t("jobs.properties.locations", { count: job.locations.length }),
      value: job.locations.join(", "),
    },
    commute.length > 0 && {
      icon: IconRoute,
      label: t("jobs.properties.commute"),
      value: commute.join(", "),
    },
    job.vacationDays !== null && {
      icon: IconSwimming,
      label: t("jobs.properties.vacationDays"),
      value: formatNumber(job.vacationDays, locale),
    },
    job.startDate !== null && {
      icon: IconRocket,
      label: t("jobs.properties.startDate"),
      value: formatIsoDate(job.startDate, locale),
    },
    job.contractTerm !== null && {
      icon: IconHourglass,
      label: t("jobs.properties.contractTerm"),
      value: formatContractTerm(job.contractTerm),
    },
    job.probationMonths !== null && {
      icon: IconFlask,
      label: t("jobs.properties.probation"),
      value: formatDuration({ amount: job.probationMonths, unit: "months" }),
    },
    job.noticePeriod !== null && {
      icon: IconHandStop,
      label: t("jobs.properties.noticePeriod"),
      value: formatNoticePeriod(job.noticePeriod),
    },
    Boolean(job.notes) && {
      icon: IconNote,
      label: t("jobs.properties.notes"),
      value: <RichText html={job.notes} />,
    },
  ];

  return details.filter((detail) => detail !== false);
}

function JobDetails({ job }: { job: Job }) {
  const { t } = useTranslation();
  const details = useDetails(job);

  if (details.length === 0) return null;

  return (
    <Section title={t("jobs.sections.details")}>
      <dl className={styles.properties}>
        {details.map(({ icon, label, value }) => (
          <Property key={label} icon={icon} label={label}>
            {value}
          </Property>
        ))}
      </dl>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.sectionTitle}>
        {title}
      </h3>
      {children}
    </section>
  );
}

interface PropertyProps {
  icon: Icon;
  label: string;
  children: ReactNode;
}

function Property({ icon: PropertyIcon, label, children }: PropertyProps) {
  return (
    <div className={styles.property}>
      <dt className={styles.propertyLabel}>
        <PropertyIcon size={20} stroke={2} aria-hidden />
        {label}
      </dt>
      <dd className={styles.propertyValue}>{children}</dd>
    </div>
  );
}

function NotSpecified() {
  const { t } = useTranslation();

  return (
    <>
      <span aria-hidden>—</span>
      <span className={styles.visuallyHidden}>{t("jobs.notSpecified")}</span>
    </>
  );
}
