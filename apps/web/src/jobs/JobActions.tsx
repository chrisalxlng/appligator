import type { Job } from "@appligator/shared";
import { Button, ConfirmDialog, IconButton, Menu, MenuItem, useSuccessToast } from "@appligator/ui";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import { ShortcutTooltip } from "../shortcuts/ShortcutTooltip.tsx";
import { useAltShortcut } from "../shortcuts/useAltShortcut.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { JobFormDrawer } from "./JobFormDrawer.tsx";
import styles from "./JobActions.module.css";
import { useDeleteJob } from "./jobQueries.ts";

export function JobActions({ job }: { job: Job }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const deleteJob = useDeleteJob(job.id);
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

  const menu = (
    <Menu
      trigger={
        <IconButton variant="surface" label={t("jobs.moreActions")}>
          <IconDots size={20} stroke={2.4} aria-hidden />
        </IconButton>
      }
    >
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
    </Menu>
  );
  const editButton = (
    <ShortcutTooltip hint={shortcutHints?.alt("E")}>
      <Button onClick={() => setIsEditing(true)} aria-keyshortcuts="Alt+E">
        <IconPencil size={20} stroke={2.4} aria-hidden />
        {t("jobs.edit")}
      </Button>
    </ShortcutTooltip>
  );

  return (
    <>
      {isDesktop ? (
        <div className={styles.actions}>
          {editButton}
          {menu}
        </div>
      ) : (
        <FloatingActions>
          {menu}
          {editButton}
        </FloatingActions>
      )}
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
