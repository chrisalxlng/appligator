import type { ActivityType, MailMessage } from "@appligator/shared";
import { Button, Drawer, Popover, SearchList, Spinner, useSuccessToast } from "@appligator/ui";
import { IconLink, IconPlus } from "@tabler/icons-react";
import { useRef, useState, type RefObject } from "react";
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
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import { useAssignMailMessage } from "./mailQueries.ts";

const searchDelayMs = 200;

export function AssignMailPicker({ message }: { message: MailMessage }) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [application, setApplication] = useState<{ id: string | null; open: boolean }>({
    id: null,
    open: false,
  });

  function select(applicationId: string) {
    setOpen(false);
    setApplication({ id: applicationId, open: true });
  }

  const popupProps = {
    title: t("emails.assign.action"),
    closeLabel: t("common.close"),
    open,
    onOpenChange: setOpen,
    initialFocus: inputRef,
    // Closing must not take the focus back from the drawer that opens for the application.
    finalFocus: application.open ? (false as const) : buttonRef,
    children: <ApplicationSearch inputRef={inputRef} onSelect={select} />,
  };

  return (
    <>
      <Button ref={buttonRef} onClick={() => setOpen(true)}>
        <IconLink size={20} stroke={2.4} aria-hidden />
        {t("emails.assign.action")}
      </Button>
      {isDesktop ? <Popover anchor={buttonRef} {...popupProps} /> : <Drawer {...popupProps} />}
      <AssignActivityDrawer
        message={message}
        applicationId={application.id}
        open={application.open}
        onOpenChange={(nextOpen) => setApplication((current) => ({ ...current, open: nextOpen }))}
        finalFocus={buttonRef}
      />
    </>
  );
}

interface ApplicationSearchProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (applicationId: string) => void;
}

function ApplicationSearch({ inputRef, onSelect }: ApplicationSearchProps) {
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
      inputLabel={t("emails.assign.search")}
      placeholder={t("emails.assign.searchPlaceholder")}
      listLabel={t("emails.assign.action")}
      inputRef={inputRef}
      status={searchStatus()}
    />
  );

  function searchStatus() {
    if (applications.isPending) return <Spinner label={t("emails.assign.loading")} />;

    if (applications.isError) {
      return (
        <LoadError
          title={t("emails.assign.loadError.title")}
          description={t("emails.assign.loadError.description")}
          onRetry={() => void applications.refetch()}
        />
      );
    }

    if (applications.data.length > 0) return null;

    if (trimmedSearch) return <p>{t("emails.assign.noMatches", { search: trimmedSearch })}</p>;

    return (
      <>
        <p className={pickerStyles.statusTitle}>{t("emails.assign.noApplications.title")}</p>
        <p>{t("emails.assign.noApplications.description")}</p>
      </>
    );
  }
}

interface AssignActivityDrawerProps {
  message: MailMessage;
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus: RefObject<HTMLElement | null>;
}

function AssignActivityDrawer({
  message,
  applicationId,
  open,
  onOpenChange,
  finalFocus,
}: AssignActivityDrawerProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const [type, setType] = useState<{ value: ActivityType | null; open: boolean }>({
    value: null,
    open: false,
  });

  return (
    <Drawer
      title={t("activities.form.addTitle")}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
      finalFocus={finalFocus}
    >
      {applicationId && (
        <RankedActivityTypePicker
          applicationId={applicationId}
          onSelect={(value) => setType({ value, open: true })}
        />
      )}
      <Drawer
        title={type.value ? t(`activities.types.${type.value}.label`) : ""}
        closeLabel={t("common.close")}
        open={type.open}
        onOpenChange={(nextOpen) => setType((current) => ({ ...current, open: nextOpen }))}
      >
        {applicationId && type.value && (
          <AssignForm
            key={`${applicationId}-${type.value}`}
            message={message}
            applicationId={applicationId}
            type={type.value}
            onSaved={() => {
              setType((current) => ({ ...current, open: false }));
              onOpenChange(false);
              showSuccess(t("activities.toast.added"));
            }}
          />
        )}
      </Drawer>
    </Drawer>
  );
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
  const { subject, from, to, sentAt, body, createdAt } = message;

  return (
    <ActivityForm
      type={type}
      prefill={{
        occurredAt: sentAt ?? createdAt,
        attachments: [{ kind: "email", subject, from, to, sentAt, body }],
      }}
      save={assign}
      onSaved={onSaved}
      submit={{ label: t("activities.form.add"), icon: IconPlus }}
    />
  );
}
