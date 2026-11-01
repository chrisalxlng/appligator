import type { Job } from "@appligator/shared";
import { Button, ConfirmDialog, LinkButton, MenuItem, useSuccessToast } from "@appligator/ui";
import { IconArrowUpRight, IconPlayerPlay, IconTrash } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApplyDrawer } from "../applications/ApplyDrawer.tsx";
import { DetailActions } from "../collection/DetailActions.tsx";
import { useAltShortcut } from "../shortcuts/useAltShortcut.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { JobFormDrawer } from "./JobFormDrawer.tsx";
import { useDeleteJob, usePinJob } from "./jobQueries.ts";

export function JobActions({ job }: { job: Job }) {
  return job.application ? (
    <ApplicationJobActions job={job} applicationId={job.application.id} />
  ) : (
    <OpenJobActions job={job} />
  );
}

function ApplicationJobActions({ job, applicationId }: { job: Job; applicationId: string }) {
  const { t } = useTranslation();
  const pin = usePinJob(job.id);

  return (
    <DetailActions
      primaryAction={
        <LinkButton render={<Link to="/applications/$applicationId" params={{ applicationId }} />}>
          <IconArrowUpRight size={20} stroke={2.4} aria-hidden />
          {t("jobs.openApplication")}
        </LinkButton>
      }
      pinned={job.pinned}
      pin={pin}
    />
  );
}

function OpenJobActions({ job }: { job: Job }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pin = usePinJob(job.id);
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
        primaryAction={applyButton}
        edit={{ label: t("jobs.edit"), onClick: () => setIsEditing(true) }}
        deleteItem={deleteItem}
        pinned={job.pinned}
        pin={pin}
      />
      <ApplyDrawer jobId={job.id} open={isApplying} onOpenChange={setIsApplying} />
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
