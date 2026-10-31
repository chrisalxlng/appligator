import type { Activity, Application } from "@appligator/shared";
import { RichText, Spinner } from "@appligator/ui";
import {
  IconArrowBackUp,
  IconCalendarEvent,
  IconChevronRight,
  IconId,
  IconNote,
  IconSend,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Property, PropertyList, Section } from "../collection/DetailView.tsx";
import { useDetails, type Detail } from "../details/DetailsSection.tsx";
import { formatDateTime, formatIsoDate } from "../details/format.ts";
import { AttachmentCards } from "../attachments/AttachmentCards.tsx";
import { LoadError } from "../loading/LoadError.tsx";
import { useActivities } from "./activityQueries.ts";
import { AdoptTermsHint } from "./AdoptTerms.tsx";
import styles from "./ActivityLog.module.css";
import { EditActivityDrawer } from "./EditActivityDrawer.tsx";
import { termsDifferences } from "./termsDifferences.ts";
import { useActivityDateLabel } from "./useActivityDateLabel.ts";

export function ActivityLog({ application }: { application: Application }) {
  const { t } = useTranslation();
  const activities = useActivities(application.id);
  const latestTerms = activities.data?.find(({ terms }) => terms !== null);

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
              application={application}
              activity={activity}
              isLatest={index === 0}
              offersTerms={activity === latestTerms && !activity.detailsReviewed}
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
      key: "position",
      icon: IconId,
      label: t("activities.properties.position"),
      value: activity.terms!.position,
    },
    ...terms,
    activity.appointmentAt !== null && {
      key: "appointmentAt",
      icon: IconCalendarEvent,
      label: t("activities.properties.appointmentAt"),
      value: formatDateTime(activity.appointmentAt, locale),
    },
    activity.dueDate !== null && {
      key: "dueDate",
      icon: IconSend,
      label: t("activities.properties.dueDate"),
      value: formatIsoDate(activity.dueDate, locale),
    },
    activity.responseDeadline !== null && {
      key: "responseDeadline",
      icon: IconArrowBackUp,
      label: t("activities.properties.responseDeadline"),
      value: formatIsoDate(activity.responseDeadline, locale),
    },
    Boolean(activity.notes) && {
      key: "activityNotes",
      icon: IconNote,
      label: t("details.properties.notes"),
      value: <RichText html={activity.notes} />,
    },
  ];

  return entries.filter((entry) => entry !== false);
}

interface ActivityEntryProps {
  application: Application;
  activity: Activity;
  isLatest: boolean;
  offersTerms: boolean;
}

function ActivityEntry({ application, activity, isLatest, offersTerms }: ActivityEntryProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const dateLabel = useActivityDateLabel()(activity.occurredAt);
  const properties = useActivityProperties(activity);
  const typeLabel = t(`activities.types.${activity.type}.label`);
  const differences =
    offersTerms && activity.terms ? termsDifferences(activity.terms, application) : [];

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
            {properties.map(({ key, icon, label, value }) => (
              <Property key={key} icon={icon} label={label}>
                {value}
              </Property>
            ))}
          </PropertyList>
        </div>
      )}
      {differences.length > 0 && (
        <AdoptTermsHint application={application} activity={activity} differences={differences} />
      )}
      {activity.attachments.length > 0 && <AttachmentCards attachments={activity.attachments} />}
      <EditActivityDrawer
        applicationId={application.id}
        activity={activity}
        open={isEditing}
        onOpenChange={setIsEditing}
      />
    </li>
  );
}
