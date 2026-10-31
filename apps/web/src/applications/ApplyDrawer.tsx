import type { Application } from "@appligator/shared";
import { Drawer, Fieldset, useSuccessToast } from "@appligator/ui";
import { IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ActivityForm } from "../activities/ActivityForm.tsx";
import { useApply } from "./applicationQueries.ts";
import styles from "./ApplyDrawer.module.css";

interface ApplyJob {
  id: string;
  company: string;
  position: string;
}

interface ApplyDrawerProps {
  job: ApplyJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (application: Application) => void;
}

export function ApplyDrawer({ job, open, onOpenChange, onApplied }: ApplyDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      title={t("applications.applyForm.title")}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      {job && (
        <ApplyForm
          key={job.id}
          job={job}
          onApplied={(application) => {
            onOpenChange(false);
            onApplied?.(application);
          }}
        />
      )}
    </Drawer>
  );
}

interface ApplyFormProps {
  job: ApplyJob;
  onApplied: (application: Application) => void;
}

function ApplyForm({ job, onApplied }: ApplyFormProps) {
  const { t } = useTranslation();
  const apply = useApply(job.id);
  const showSuccess = useSuccessToast();

  return (
    <ActivityForm
      type="applicationSubmitted"
      save={apply}
      onSaved={(application) => {
        showSuccess(t("applications.toast.created"));
        onApplied(application);
      }}
      submit={{ label: t("applications.applyForm.submit"), icon: IconSend }}
      header={
        <Fieldset legend={t("applications.applyForm.job")}>
          <p className={styles.job}>
            <span>{job.position}</span>
            <span className={styles.company}>{job.company}</span>
          </p>
        </Fieldset>
      }
    />
  );
}
