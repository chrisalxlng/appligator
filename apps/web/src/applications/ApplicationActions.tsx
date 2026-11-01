import type { Application } from "@appligator/shared";
import { Button, ConfirmDialog, MenuItem, useSuccessToast } from "@appligator/ui";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fileIdsOf } from "../attachments/attachments.ts";
import { useDeleteFiles } from "../attachments/useFileCleanup.ts";
import { AddActivityDrawer } from "../activities/AddActivityDrawer.tsx";
import { useActivities } from "../activities/activityQueries.ts";
import { DetailActions } from "../collection/DetailActions.tsx";
import { PinButton } from "../collection/PinButton.tsx";
import { ShortcutTooltip } from "../shortcuts/ShortcutTooltip.tsx";
import { useAltShortcut } from "../shortcuts/useAltShortcut.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { ApplicationFormDrawer } from "./ApplicationFormDrawer.tsx";
import { useDeleteApplication, usePinApplication } from "./applicationQueries.ts";

export function ApplicationActions({ application }: { application: Application }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteApplication = useDeleteApplication(application);
  const pin = usePinApplication(application.id);
  const activities = useActivities(application.id);
  const deleteFiles = useDeleteFiles();
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();
  useAltShortcut("E", () => setIsEditing(true));

  function confirmDelete() {
    deleteApplication.mutate(undefined, {
      onSuccess: () => {
        deleteFiles((activities.data ?? []).flatMap(({ attachments }) => fileIdsOf(attachments)));
        setIsConfirmingDelete(false);
        showSuccess(t("applications.toast.deleted"));
        void navigate({ to: "/applications" });
      },
    });
  }

  const deleteItem = (
    <MenuItem
      variant="destructive"
      icon={<IconTrash size={18} stroke={2} aria-hidden />}
      onClick={() => {
        deleteApplication.reset();
        setIsConfirmingDelete(true);
      }}
    >
      {t("applications.delete.action")}
    </MenuItem>
  );
  const addActivityButton = (
    <Button onClick={() => setIsAddingActivity(true)}>
      <IconPlus size={20} stroke={2.4} aria-hidden />
      {t("activities.add")}
    </Button>
  );
  const editButton = (
    <ShortcutTooltip hint={shortcutHints?.alt("E")}>
      <Button variant="surface" onClick={() => setIsEditing(true)} aria-keyshortcuts="Alt+E">
        <IconPencil size={20} stroke={2.4} aria-hidden />
        {t("applications.edit")}
      </Button>
    </ShortcutTooltip>
  );
  const pinButton = <PinButton pinned={application.pinned} pin={pin} />;

  return (
    <>
      <DetailActions
        buttons={[addActivityButton, editButton, pinButton]}
        menuItems={deleteItem}
        error={pin.isError && t("common.pinError")}
      />
      <AddActivityDrawer
        application={application}
        activities={activities.data ?? []}
        open={isAddingActivity}
        onOpenChange={setIsAddingActivity}
      />
      <ApplicationFormDrawer
        application={application}
        open={isEditing}
        onOpenChange={setIsEditing}
      />
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={t("applications.delete.title")}
        description={t("applications.delete.description", {
          position: application.position,
          company: application.company,
        })}
        confirmLabel={t("applications.delete.confirm")}
        cancelLabel={t("applications.delete.cancel")}
        onConfirm={confirmDelete}
        pending={deleteApplication.isPending}
        error={deleteApplication.isError ? t("applications.delete.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
      />
    </>
  );
}
