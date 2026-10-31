import type { Activity } from "@appligator/shared";
import { Button, ConfirmDialog, Drawer, useSuccessToast } from "@appligator/ui";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fileIdsOf } from "../attachments/attachments.ts";
import { useDeleteFiles } from "../attachments/useFileCleanup.ts";
import { formatDate } from "../details/format.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { ActivityForm } from "./ActivityForm.tsx";
import { useDeleteActivity, useSaveActivity } from "./activityQueries.ts";

interface EditActivityDrawerProps {
  applicationId: string;
  activity: Activity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditActivityDrawer({
  applicationId,
  activity,
  open,
  onOpenChange,
}: EditActivityDrawerProps) {
  const { t, i18n } = useTranslation();
  const save = useSaveActivity(applicationId, activity.id);
  const deleteActivity = useDeleteActivity(applicationId, activity.id);
  const deleteFiles = useDeleteFiles();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();
  const typeLabel = t(`activities.types.${activity.type}.label`);

  function confirmDelete() {
    // The promise also settles when the deleted activity, and with it this drawer, leaves the log.
    deleteActivity.mutateAsync().then(
      () => {
        deleteFiles(fileIdsOf(activity.attachments));
        setIsConfirmingDelete(false);
        onOpenChange(false);
        showSuccess(t("activities.toast.deleted"));
      },
      () => {},
    );
  }

  return (
    <>
      <Drawer
        title={typeLabel}
        closeLabel={t("common.close")}
        open={open}
        onOpenChange={onOpenChange}
      >
        <ActivityForm
          type={activity.type}
          activity={activity}
          save={save}
          onSaved={() => {
            onOpenChange(false);
            showSuccess(t("activities.toast.updated"));
          }}
          submit={{ label: t("activities.form.update"), icon: IconPencil }}
          footer={
            <Button
              type="button"
              variant="destructiveSecondary"
              onClick={() => {
                deleteActivity.reset();
                setIsConfirmingDelete(true);
              }}
            >
              <IconTrash size={20} stroke={2.4} aria-hidden />
              {t("activities.delete.action")}
            </Button>
          }
        />
      </Drawer>
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={t("activities.delete.title")}
        description={t("activities.delete.description", {
          type: typeLabel,
          date: formatDate(activity.occurredAt, i18n.language, "long"),
        })}
        confirmLabel={t("activities.delete.confirm")}
        cancelLabel={t("activities.delete.cancel")}
        onConfirm={confirmDelete}
        pending={deleteActivity.isPending}
        error={deleteActivity.isError ? t("activities.delete.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
      />
    </>
  );
}
