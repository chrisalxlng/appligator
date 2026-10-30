import type { Job } from "@appligator/shared";
import { Button, ConfirmDialog, MenuItem, Tooltip, useSuccessToast } from "@appligator/ui";
import { IconPencil, IconPlayerPlay, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useApply } from "../applications/applicationQueries.ts";
import { DetailActions } from "../collection/DetailActions.tsx";
import { ShortcutTooltip } from "../shortcuts/ShortcutTooltip.tsx";
import { useAltShortcut } from "../shortcuts/useAltShortcut.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { JobFormDrawer } from "./JobFormDrawer.tsx";
import { useDeleteJob } from "./jobQueries.ts";

function LockedTooltip({ reason, children }: { reason?: string; children: ReactElement }) {
  return reason ? <Tooltip label={reason}>{children}</Tooltip> : children;
}

export function JobActions({ job }: { job: Job }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const apply = useApply();
  const deleteJob = useDeleteJob(job.id);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();
  const isApplied = job.status === "applied";
  useAltShortcut("E", () => {
    if (!isApplied) setIsEditing(true);
  });

  function confirmDelete() {
    deleteJob.mutate(undefined, {
      onSuccess: () => {
        setIsConfirmingDelete(false);
        showSuccess(t("jobs.toast.deleted"));
        void navigate({ to: "/jobs" });
      },
    });
  }

  const menuItems = (
    <LockedTooltip reason={isApplied ? t("jobs.deleteLocked") : undefined}>
      <MenuItem
        variant="destructive"
        icon={<IconTrash size={18} stroke={2} aria-hidden />}
        disabled={isApplied}
        onClick={() => {
          deleteJob.reset();
          setIsConfirmingDelete(true);
        }}
      >
        {t("jobs.delete.action")}
      </MenuItem>
    </LockedTooltip>
  );
  const applyButton = (
    <LockedTooltip reason={isApplied ? t("jobs.appliedHint") : undefined}>
      <Button
        disabled={isApplied}
        focusableWhenDisabled
        pending={apply.isPending}
        onClick={() =>
          apply.mutate(job.id, { onSuccess: () => showSuccess(t("applications.toast.created")) })
        }
      >
        <IconPlayerPlay size={20} stroke={2.4} aria-hidden />
        {t("jobs.apply")}
      </Button>
    </LockedTooltip>
  );
  const editButton = isApplied ? (
    <Tooltip label={t("jobs.editLocked")}>
      <Button variant="surface" disabled focusableWhenDisabled>
        <IconPencil size={20} stroke={2.4} aria-hidden />
        {t("jobs.edit")}
      </Button>
    </Tooltip>
  ) : (
    <ShortcutTooltip hint={shortcutHints?.alt("E")}>
      <Button variant="surface" onClick={() => setIsEditing(true)} aria-keyshortcuts="Alt+E">
        <IconPencil size={20} stroke={2.4} aria-hidden />
        {t("jobs.edit")}
      </Button>
    </ShortcutTooltip>
  );

  return (
    <>
      <DetailActions
        buttons={[applyButton, editButton]}
        menuItems={menuItems}
        error={apply.isError && t("applications.createError")}
      />
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
