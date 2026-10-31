import { activityTermsSchema, type Application, type Job } from "@appligator/shared";
import { Drawer, Fieldset, Spinner, useSuccessToast } from "@appligator/ui";
import { IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ActivityForm } from "../activities/ActivityForm.tsx";
import { useJob } from "../jobs/jobQueries.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { useApply } from "./applicationQueries.ts";
import styles from "./ApplyDrawer.module.css";

interface ApplyDrawerProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (application: Application) => void;
}

export function ApplyDrawer({ jobId, open, onOpenChange, onApplied }: ApplyDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      title={t("applications.applyForm.title")}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      {jobId && (
        <ApplyContent
          key={jobId}
          jobId={jobId}
          onApplied={(application) => {
            onOpenChange(false);
            onApplied?.(application);
          }}
        />
      )}
    </Drawer>
  );
}

interface ApplyContentProps {
  jobId: string;
  onApplied: (application: Application) => void;
}

function ApplyContent({ jobId, onApplied }: ApplyContentProps) {
  const { t } = useTranslation();
  const job = useJob(jobId);

  if (job.isPending) return <Spinner label={t("jobs.loadingJob")} />;
  if (job.isError) {
    return (
      <LoadError
        title={t("jobs.detailLoadError.title")}
        description={t("jobs.detailLoadError.description")}
        onRetry={() => void job.refetch()}
      />
    );
  }
  return <ApplyForm job={job.data} onApplied={onApplied} />;
}

function ApplyForm({ job, onApplied }: { job: Job; onApplied: ApplyContentProps["onApplied"] }) {
  const { t } = useTranslation();
  const apply = useApply(job.id);
  const showSuccess = useSuccessToast();

  return (
    <ActivityForm
      type="applicationSubmitted"
      initialTerms={activityTermsSchema.parse(job)}
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
