import type { Job } from "@appligator/shared";
import { Badge, LinkChip, RichText } from "@appligator/ui";
import { IconCalendar, IconInbox, IconLink, IconTag } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useApplicationStatus } from "../applications/useApplicationStatus.ts";
import { DetailView, NotSpecified, Property, Section } from "../collection/DetailView.tsx";
import { DetailsSection } from "../details/DetailsSection.tsx";
import { formatIsoDate, hostname } from "../details/format.ts";
import { JobActions } from "./JobActions.tsx";
import styles from "./JobDetail.module.css";
import { useMarkJobViewed } from "./jobQueries.ts";
import { useJobStatus } from "./useJobStatus.ts";

export function JobDetail({ job }: { job: Job }) {
  const { t, i18n } = useTranslation();
  const jobStatus = useJobStatus()(job.status);
  const applicationStatus = useApplicationStatus();
  useMarkJobViewed(job);

  return (
    <DetailView
      company={job.company}
      position={job.position}
      actions={<JobActions job={job} />}
      properties={
        <>
          <Property icon={IconTag} label={t("jobs.properties.status")}>
            <Badge tone={jobStatus.tone}>{jobStatus.label}</Badge>
          </Property>
          <Property icon={IconCalendar} label={t("jobs.properties.applicationDeadline")}>
            {job.applicationDeadline ? (
              formatIsoDate(job.applicationDeadline, i18n.language)
            ) : (
              <NotSpecified />
            )}
          </Property>
          <Property icon={IconInbox} label={t("jobs.properties.application")}>
            {job.application ? (
              <LinkChip
                render={
                  <Link
                    to="/applications/$applicationId"
                    params={{ applicationId: job.application.id }}
                  />
                }
                badge={
                  <Badge tone={applicationStatus(job.application.status).tone}>
                    {applicationStatus(job.application.status).label}
                  </Badge>
                }
              >
                {job.application.position}
              </LinkChip>
            ) : (
              <NotSpecified />
            )}
          </Property>
        </>
      }
    >
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
      <DetailsSection details={job} />
      {job.description && (
        <Section title={t("sections.description")}>
          <RichText html={job.description} />
        </Section>
      )}
    </DetailView>
  );
}
