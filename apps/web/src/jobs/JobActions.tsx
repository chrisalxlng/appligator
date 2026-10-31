import type { Job } from "@appligator/shared";
import { Button, ConfirmDialog, LinkButton, MenuItem, useSuccessToast } from "@appligator/ui";
import { IconArrowUpRight, IconPencil, IconPlayerPlay, IconTrash } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApplyDrawer } from "../applications/ApplyDrawer.tsx";
import { DetailActions } from "../collection/DetailActions.tsx";
import { PinButton } from "../collection/PinButton.tsx";
import { ShortcutTooltip } from "../shortcuts/ShortcutTooltip.tsx";
import { useAltShortcut } from "../shortcuts/useAltShortcut.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { JobFormDrawer } from "./JobFormDrawer.tsx";
import { useDeleteJob, usePinJob } from "./jobQueries.ts";

export function JobActions({ job }: { job: Job }) {
  const { t } = useTranslation();
  const pin = usePinJob(job.id);
  const pinButton = <PinButton pinned={job.pinned} pin={pin} />;
  const pinError = pin.isError && t("common.pinError");

  return job.application ? (
    <DetailActions
      buttons={[
        <ApplicationLink key="application" applicationId={job.application.id} />,
        pinButton,
      ]}
      error={pinError}
    />
  ) : (
    <OpenJobActions job={job} pinButton={pinButton} pinError={pinError} />
  );
}

function ApplicationLink({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation();

  return (
    <LinkButton render={<Link to="/applications/$applicationId" params={{ applicationId }} />}>
      <IconArrowUpRight size={20} stroke={2.4} aria-hidden />
      {t("jobs.openApplication")}
    </LinkButton>
  );
}

interface OpenJobActionsProps {
  job: Job;
  pinButton: ReactNode;
  pinError: string | false;
}

function OpenJobActions({ job, pinButton, pinError }: OpenJobActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteJob = useDeleteJob(job.id);
  const [isApplying, setIsApplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();
  useAltShortcut("E", () => setIsEditing(true));

  function confirmDelete() {
    deleteJob.mutate(undefined, {
      onSuccess: () => {
        setIsConfirmingDelete(false);
        showSuccess(t("jobs.toast.deleted"));
        void navigate({ to: "/jobs" });
      },
    });
  }

  const applyButton = (
    <Button onClick={() => setIsApplying(true)}>
      <IconPlayerPlay size={20} stroke={2.4} aria-hidden />
      {t("jobs.apply")}
    </Button>
  );
  const editButton = (
    <ShortcutTooltip hint={shortcutHints?.alt("E")}>
      <Button variant="surface" onClick={() => setIsEditing(true)} aria-keyshortcuts="Alt+E">
        <IconPencil size={20} stroke={2.4} aria-hidden />
        {t("jobs.edit")}
      </Button>
    </ShortcutTooltip>
  );
  const deleteItem = (
    <MenuItem
      variant="destructive"
      icon={<IconTrash size={18} stroke={2} aria-hidden />}
      onClick={() => {
        deleteJob.reset();
        setIsConfirmingDelete(true);
      }}
    >
      {t("jobs.delete.action")}
    </MenuItem>
  );

  return (
    <>
      <DetailActions
        buttons={[applyButton, editButton, pinButton]}
        menuItems={deleteItem}
        error={pinError}
      />
      <ApplyDrawer job={job} open={isApplying} onOpenChange={setIsApplying} />
      <JobFormDrawer job={job} open={isEditing} onOpenChange={setIsEditing} />
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={t("jobs.delete.title")}
        description={t("jobs.delete.description", {
          position: job.position,
          company: job.company,
        })}
        confirmLabel={t("jobs.delete.confirm")}
        cancelLabel={t("jobs.delete.cancel")}
        onConfirm={confirmDelete}
        pending={deleteJob.isPending}
        error={deleteJob.isError ? t("jobs.delete.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
      />
    </>
  );
}
