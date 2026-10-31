import { Button, IconButton, SpinnerCircle } from "@appligator/ui";
import { IconAlertTriangle, IconRefresh, IconSparkles, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./JobAnalysisStatus.module.css";
import type { JobAnalysis } from "./useJobAnalysis.ts";

type ActiveAnalysis = Exclude<JobAnalysis, { status: "idle" }>;

interface JobAnalysisStatusProps {
  analysis: JobAnalysis;
  onRetry: () => void;
  onDismiss: () => void;
}

export function JobAnalysisStatus({ analysis, onRetry, onDismiss }: JobAnalysisStatusProps) {
  return (
    <output className={styles.status} data-status={analysis.status}>
      {analysis.status !== "idle" && (
        <StatusContent analysis={analysis} onRetry={onRetry} onDismiss={onDismiss} />
      )}
    </output>
  );
}

interface StatusContentProps extends JobAnalysisStatusProps {
  analysis: ActiveAnalysis;
}

function StatusContent({ analysis, onRetry, onDismiss }: StatusContentProps) {
  const { t, i18n } = useTranslation();

  const dismissButton = (
    <IconButton
      variant={analysis.status === "failed" ? "destructiveSecondary" : "highlightSecondary"}
      size="small"
      label={t("jobs.analysis.dismiss")}
      onClick={onDismiss}
    >
      <IconX size={16} stroke={2.4} aria-hidden />
    </IconButton>
  );

  if (analysis.status === "analyzing") {
    return (
      <>
        <SpinnerCircle size={20} className={styles.icon} />
        <span className={styles.text}>
          <span className={styles.title}>{t("jobs.analysis.analyzing")}</span>
          <span className={styles.description}>{t("jobs.analysis.analyzingHint")}</span>
        </span>
      </>
    );
  }

  if (analysis.status === "failed") {
    return (
      <>
        <IconAlertTriangle className={styles.icon} size={20} stroke={2} aria-hidden />
        <span className={styles.text}>
          <span className={styles.title}>{t("jobs.analysis.failed")}</span>
          <span className={styles.description}>{t(`jobs.analysis.errors.${analysis.error}`)}</span>
          <Button variant="destructiveSecondary" className={styles.retry} onClick={onRetry}>
            <IconRefresh size={20} stroke={2.4} aria-hidden />
            {t("jobs.analysis.retry")}
          </Button>
        </span>
        {dismissButton}
      </>
    );
  }

  const fieldList = new Intl.ListFormat(i18n.language).format(
    analysis.filledFields.map((field) => t(`fields.${field}`)),
  );

  return (
    <>
      <IconSparkles className={styles.icon} size={20} stroke={2} aria-hidden />
      <span className={styles.text}>
        <span className={styles.title}>
          {analysis.filledFields.length > 0
            ? t("jobs.analysis.filled", { count: analysis.filledFields.length })
            : t("jobs.analysis.nothingFilled")}
        </span>
        <span className={styles.description}>
          {analysis.filledFields.length > 0
            ? t("jobs.analysis.filledFields", { fields: fieldList })
            : t("jobs.analysis.nothingFilledHint")}
        </span>
      </span>
      {dismissButton}
    </>
  );
}
