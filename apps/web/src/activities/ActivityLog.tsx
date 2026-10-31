import type { Activity } from "@appligator/shared";
import { RichText, Spinner } from "@appligator/ui";
import {
  IconArrowBackUp,
  IconCalendarEvent,
  IconChevronRight,
  IconId,
  IconNote,
  IconSend,
  IconWorld,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Property, PropertyList, Section } from "../collection/DetailView.tsx";
import { useDetails, type Detail } from "../details/DetailsSection.tsx";
import { formatDateTime, formatIsoDate, hostname } from "../details/format.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { useActivities } from "./activityQueries.ts";
import styles from "./ActivityLog.module.css";
import { attachmentTitle } from "./AttachmentList.tsx";
import { EditActivityDrawer } from "./EditActivityDrawer.tsx";
import { useActivityDateLabel } from "./useActivityDateLabel.ts";

export function ActivityLog({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation();
  const activities = useActivities(applicationId);

  return (
    <Section title={t("activities.title")}>
      {activities.isPending ? (
        <Spinner label={t("activities.loading")} />
      ) : activities.isError ? (
        <LoadError
          title={t("activities.loadError.title")}
          description={t("activities.loadError.description")}
          onRetry={() => void activities.refetch()}
        />
      ) : activities.data.length === 0 ? (
        <p className={styles.empty}>{t("activities.empty")}</p>
      ) : (
        <ol className={styles.log}>
          {activities.data.map((activity, index) => (
            <ActivityEntry
              key={activity.id}
              applicationId={applicationId}
              activity={activity}
              isLatest={index === 0}
            />
          ))}
        </ol>
      )}
    </Section>
  );
}

function useActivityProperties(activity: Activity): Detail[] {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const terms = useDetails(activity.terms && { ...activity.terms, notes: "" });

  const entries: (Detail | false)[] = [
    Boolean(activity.terms?.position) && {
      icon: IconId,
      label: t("activities.properties.position"),
      value: activity.terms!.position,
    },
    ...terms,
    activity.appointmentAt !== null && {
      icon: IconCalendarEvent,
      label: t("activities.properties.appointmentAt"),
      value: formatDateTime(activity.appointmentAt, locale),
    },
    activity.dueDate !== null && {
      icon: IconSend,
      label: t("activities.properties.dueDate"),
      value: formatIsoDate(activity.dueDate, locale),
    },
    activity.responseDeadline !== null && {
      icon: IconArrowBackUp,
      label: t("activities.properties.responseDeadline"),
      value: formatIsoDate(activity.responseDeadline, locale),
    },
    Boolean(activity.notes) && {
      icon: IconNote,
      label: t("details.properties.notes"),
      value: <RichText html={activity.notes} />,
    },
  ];

  return entries.filter((entry) => entry !== false);
}

interface ActivityEntryProps {
  applicationId: string;
  activity: Activity;
  isLatest: boolean;
}

function ActivityEntry({ applicationId, activity, isLatest }: ActivityEntryProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const dateLabel = useActivityDateLabel()(activity.occurredAt);
  const properties = useActivityProperties(activity);
  const typeLabel = t(`activities.types.${activity.type}.label`);

  return (
    <li className={`${styles.entry} ${isLatest ? styles.latest : ""}`}>
      <div className={styles.header}>
        <h4 className={styles.title}>{typeLabel}</h4>
        <button
          type="button"
          className={styles.edit}
          aria-label={t("activities.edit", { date: dateLabel, type: typeLabel })}
          onClick={() => setIsEditing(true)}
        >
          <time dateTime={activity.occurredAt}>{dateLabel}</time>
          <IconChevronRight size={16} stroke={2} aria-hidden />
        </button>
      </div>
      {properties.length > 0 && (
        <div className={styles.properties}>
          <PropertyList>
            {properties.map(({ icon, label, value }) => (
              <Property key={label} icon={icon} label={label}>
                {value}
              </Property>
            ))}
          </PropertyList>
        </div>
      )}
      {activity.attachments.length > 0 && (
        <ul className={styles.attachments}>
          {activity.attachments.map((attachment, index) => (
            <li key={`${index}-${attachment.url}`}>
              <a
                className={styles.attachment}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
              >
                <IconWorld size={20} stroke={2} aria-hidden />
                <span className={styles.attachmentText}>
                  <span className={styles.attachmentTitle}>{attachmentTitle(attachment)}</span>
                  <span className={styles.attachmentMeta}>{hostname(attachment.url)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <EditActivityDrawer
        applicationId={applicationId}
        activity={activity}
        dateLabel={dateLabel}
        open={isEditing}
        onOpenChange={setIsEditing}
      />
    </li>
  );
}
