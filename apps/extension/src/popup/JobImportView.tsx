import { Button, LinkButton } from "@appligator/ui";
import { IconCircleCheck, IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { appUrl } from "../config.ts";
import { jobImportKey, withStaleImportFailed, type JobImport } from "../jobImport.ts";
import { sendMessage } from "../messages.ts";
import { useActiveTab } from "./useActiveTab.ts";
import { useStoredValue } from "./useStoredValue.ts";
import styles from "./Popup.module.css";

function isWebPage(link: string) {
  return /^https?:\/\//.test(link);
}

function hostname(link: string) {
  return new URL(link).hostname.replace(/^www\./, "");
}

function ImportedJob({ jobId }: { jobId: string }) {
  const { t } = useTranslation();

  return (
    <div className={styles.importedJob}>
      <output className={styles.importedMessage}>
        <IconCircleCheck size={20} stroke={2.4} aria-hidden />
        {t("jobImport.done")}
      </output>
      <LinkButton
        variant="secondary"
        className={styles.action}
        href={`${appUrl}/jobs/${jobId}`}
        target="_blank"
        rel="noreferrer"
      >
        {t("jobImport.open")}
        <span className={styles.visuallyHidden}>{t("jobImport.opensInNewTab")}</span>
      </LinkButton>
    </div>
  );
}

function TabJobImport({ tabId, title, link }: { tabId: number; title: string; link: string }) {
  const { t } = useTranslation();
  const stored = useStoredValue<JobImport>("session", jobImportKey(link));
  const [submitted, setSubmitted] = useState<{ previousImport: JobImport | undefined }>();
  if (!stored.isLoaded) return null;

  const jobImport = stored.value && withStaleImportFailed(stored.value);
  const isSubmitting = submitted !== undefined && submitted.previousImport === stored.value;
  const isImporting = isSubmitting || jobImport?.status === "importing";

  function submit() {
    setSubmitted({ previousImport: stored.value });
    sendMessage({ type: "importJob", tabId, link });
  }

  return (
    <>
      <div className={styles.page}>
        <p className={styles.pageTitle}>{title}</p>
        <p className={styles.pageHost}>{hostname(link)}</p>
      </div>
      {jobImport?.status === "done" ? (
        <ImportedJob jobId={jobImport.jobId} />
      ) : (
        <div className={styles.submit}>
          {jobImport?.status === "failed" && !isSubmitting && (
            <p role="alert" className={styles.error}>
              {t(`jobImport.errors.${jobImport.error}`)}
            </p>
          )}
          <Button className={styles.action} pending={isImporting} onClick={submit}>
            <IconSend size={20} stroke={2.4} aria-hidden />
            {t("jobImport.submit")}
          </Button>
          {isImporting && <p className={styles.hint}>{t("jobImport.importing")}</p>}
        </div>
      )}
    </>
  );
}

export function JobImportView() {
  const { t } = useTranslation();
  const tab = useActiveTab();
  const link = tab?.url ?? "";

  return (
    <>
      <h1 className={styles.title}>{t("jobImport.title")}</h1>
      {tab?.id !== undefined &&
        (isWebPage(link) ? (
          <TabJobImport tabId={tab.id} title={tab.title ?? ""} link={link} />
        ) : (
          <p>{t("jobImport.unsupportedPage")}</p>
        ))}
      <button
        type="button"
        className={styles.logout}
        onClick={() => sendMessage({ type: "logout" })}
      >
        {t("jobImport.logout")}
      </button>
    </>
  );
}
