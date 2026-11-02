import type { ActivityType, MailMessage } from "@appligator/shared";
import { Drawer, SearchList, Spinner, useSuccessToast } from "@appligator/ui";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityForm } from "../activities/ActivityForm.tsx";
import { useActivities } from "../activities/activityQueries.ts";
import { rankActivityTypes } from "../activities/activityRelevance.ts";
import { ActivityTypePicker } from "../activities/ActivityTypePicker.tsx";
import { useApplicationSearch } from "../applications/applicationQueries.ts";
import pickerStyles from "../applications/JobPicker.module.css";
import { useApplicationStatus } from "../applications/useApplicationStatus.ts";
import { useDebouncedValue } from "../collection/useDebouncedValue.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { useAssignMailMessage } from "./mailQueries.ts";

const searchDelayMs = 200;

interface AssignMailDrawerProps {
  message: MailMessage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function AssignMailDrawer({
  message,
  open,
  onOpenChange,
  onAssigned,
}: AssignMailDrawerProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const [application, setApplication] = useState<{ id: string | null; open: boolean }>({
    id: null,
    open: false,
  });
  const [type, setType] = useState<{ value: ActivityType | null; open: boolean }>({
    value: null,
    open: false,
  });

  return (
    <Drawer
      title={t("inbox.assign.action")}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ApplicationSearch onSelect={(id) => setApplication({ id, open: true })} />
      <Drawer
        title={t("activities.form.addTitle")}
        closeLabel={t("common.close")}
        open={application.open}
        onOpenChange={(nextOpen) => setApplication((current) => ({ ...current, open: nextOpen }))}
      >
        {application.id && (
          <RankedActivityTypePicker
            applicationId={application.id}
            onSelect={(value) => setType({ value, open: true })}
          />
        )}
        <Drawer
          title={type.value ? t(`activities.types.${type.value}.label`) : ""}
          closeLabel={t("common.close")}
          open={type.open}
          onOpenChange={(nextOpen) => setType((current) => ({ ...current, open: nextOpen }))}
        >
          {application.id && type.value && (
            <AssignForm
              key={`${application.id}-${type.value}`}
              message={message}
              applicationId={application.id}
              type={type.value}
              onSaved={() => {
                onAssigned();
                showSuccess(t("activities.toast.added"));
              }}
            />
          )}
        </Drawer>
      </Drawer>
    </Drawer>
  );
}

function ApplicationSearch({ onSelect }: { onSelect: (applicationId: string) => void }) {
  const { t } = useTranslation();
  const applicationStatus = useApplicationStatus();
  const [search, setSearch] = useState("");
  const trimmedSearch = useDebouncedValue(search.trim(), searchDelayMs);
  const applications = useApplicationSearch(trimmedSearch);

  return (
    <SearchList
      items={applications.data ?? []}
      search={search}
      onSearchChange={setSearch}
      onSelect={({ id }) => onSelect(id)}
      itemKey={({ id }) => id}
      renderItem={({ position, company, status }) => (
        <>
          <span className={pickerStyles.position}>{position}</span>
          <span className={pickerStyles.meta}>
            {company} • {applicationStatus(status).label}
          </span>
        </>
      )}
      inputLabel={t("inbox.assign.search")}
      placeholder={t("inbox.assign.searchPlaceholder")}
      listLabel={t("inbox.assign.action")}
      status={searchStatus()}
    />
  );

  function searchStatus() {
    if (applications.isPending) return <Spinner label={t("inbox.assign.loading")} />;

    if (applications.isError) {
      return (
        <LoadError
          title={t("inbox.assign.loadError.title")}
          description={t("inbox.assign.loadError.description")}
          onRetry={() => void applications.refetch()}
        />
      );
    }

    if (applications.data.length > 0) return null;

    if (trimmedSearch) return <p>{t("inbox.assign.noMatches", { search: trimmedSearch })}</p>;

    return (
      <>
        <p className={pickerStyles.statusTitle}>{t("inbox.assign.noApplications.title")}</p>
        <p>{t("inbox.assign.noApplications.description")}</p>
      </>
    );
  }
}

function RankedActivityTypePicker({
  applicationId,
  onSelect,
}: {
  applicationId: string;
  onSelect: (type: ActivityType) => void;
}) {
  const activities = useActivities(applicationId);

  return (
    <ActivityTypePicker
      rankedTypes={rankActivityTypes((activities.data ?? []).map(({ type }) => type))}
      onSelect={onSelect}
    />
  );
}

interface AssignFormProps {
  message: MailMessage;
  applicationId: string;
  type: ActivityType;
  onSaved: () => void;
}

function AssignForm({ message, applicationId, type, onSaved }: AssignFormProps) {
  const { t } = useTranslation();
  const assign = useAssignMailMessage(message.id, applicationId);
  const { subject, from, to, sentAt, body, receivedAt } = message;

  return (
    <ActivityForm
      type={type}
      prefill={{
        occurredAt: sentAt ?? receivedAt,
        attachments: [{ kind: "email", subject, from, to, sentAt, body }],
      }}
      save={assign}
      onSaved={onSaved}
      submit={{ label: t("activities.form.add"), icon: IconPlus }}
    />
  );
}
