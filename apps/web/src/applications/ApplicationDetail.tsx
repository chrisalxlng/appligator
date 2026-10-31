import type { Application } from "@appligator/shared";
import { Badge, LinkChip } from "@appligator/ui";
import { IconBriefcase2, IconMailbox, IconTag } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DetailView, Property } from "../collection/DetailView.tsx";
import { DetailsSection } from "../details/DetailsSection.tsx";
import { formatIsoDate } from "../details/format.ts";
import { ApplicationActions } from "./ApplicationActions.tsx";
import { useApplicationStatus } from "./useApplicationStatus.ts";

export function ApplicationDetail({ application }: { application: Application }) {
  const { t, i18n } = useTranslation();
  const status = useApplicationStatus()(application.status);

  return (
    <DetailView
      company={application.company}
      position={application.position}
      actions={<ApplicationActions application={application} />}
      properties={
        <>
          <Property icon={IconTag} label={t("applications.properties.status")}>
            <Badge tone={status.tone}>{status.label}</Badge>
          </Property>
          <Property icon={IconMailbox} label={t("applications.properties.appliedAt")}>
            {formatIsoDate(application.appliedAt, i18n.language)}
          </Property>
          <Property icon={IconBriefcase2} label={t("applications.properties.job")}>
            <LinkChip render={<Link to="/jobs/$jobId" params={{ jobId: application.job.id }} />}>
              {application.job.position}
            </LinkChip>
          </Property>
        </>
      }
    >
      <DetailsSection details={application} />
    </DetailView>
  );
}
