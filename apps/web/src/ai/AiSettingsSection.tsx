import type { AiSettings } from "@appligator/shared";
import { ConfirmDialog, IconButton, Spinner, useSuccessToast } from "@appligator/ui";
import { IconChevronRight, IconPlus, IconTrash } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { capitalize, formatRelativeTime } from "../i18n/formatRelativeTime.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { AiAccessDrawer } from "./AiAccessDrawer.tsx";
import { AiLanguageDrawer } from "./AiLanguageDrawer.tsx";
import { aiProviderNames } from "./aiProviders.ts";
import { useAiSettings, useDeleteAiSettings } from "./aiQueries.ts";
import styles from "./AiSettingsSection.module.css";

type OpenDrawer = "access" | "language" | null;

export function AiSettingsSection() {
  const { t } = useTranslation();
  const titleId = useId();
  const settings = useAiSettings();
  const showSpinner = useDelayedSpinner(settings.isPending);
  const [openDrawer, setOpenDrawer] = useState<OpenDrawer>(null);

  function setDrawerOpen(drawer: Exclude<OpenDrawer, null>) {
    return (open: boolean) => setOpenDrawer(open ? drawer : null);
  }

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.intro}>
        <h2 id={titleId} className={styles.title}>
          {t("ai.title")}
        </h2>
        <p className={styles.description}>{t("ai.description")}</p>
      </div>
      {showSpinner && <Spinner label={t("ai.loading")} />}
      {settings.isError && (
        <LoadError
          title={t("ai.loadError.title")}
          description={t("ai.loadError.description")}
          onRetry={() => void settings.refetch()}
        />
      )}
      {settings.isSuccess &&
        (settings.data ? (
          <>
            <AiAccessCard settings={settings.data} onEdit={() => setOpenDrawer("access")} />
            <AiLanguageCard settings={settings.data} onEdit={() => setOpenDrawer("language")} />
            <AiLanguageDrawer
              settings={settings.data}
              open={openDrawer === "language"}
              onOpenChange={setDrawerOpen("language")}
            />
          </>
        ) : (
          <button
            type="button"
            className={styles.addButton}
            aria-label={t("ai.access.addTitle")}
            onClick={() => setOpenDrawer("access")}
          >
            <IconPlus size={20} stroke={2.4} aria-hidden />
            {t("ai.access.add")}
          </button>
        ))}
      <AiAccessDrawer
        settings={settings.data ?? undefined}
        open={openDrawer === "access"}
        onOpenChange={setDrawerOpen("access")}
      />
    </section>
  );
}

function AiAccessCard({ settings, onEdit }: { settings: AiSettings; onEdit: () => void }) {
  const { t, i18n } = useTranslation();
  const deleteSettings = useDeleteAiSettings();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();
  const providerName = aiProviderNames[settings.provider];

  function confirmDelete() {
    deleteSettings.mutate(undefined, {
      onSuccess: () => {
        setIsConfirmingDelete(false);
        showSuccess(t("ai.toast.deleted"));
      },
    });
  }

  return (
    <div className={`${styles.card} ${styles.accessCard}`}>
      <button type="button" className={styles.cardButton} onClick={onEdit}>
        <span className={styles.cardTitle}>{providerName}</span>
        <span className={styles.cardText}>{settings.model}</span>
        <span className={styles.cardCaption}>
          {capitalize(
            t("ai.access.updated", {
              time: formatRelativeTime(settings.accessUpdatedAt, i18n.language),
            }),
          )}
        </span>
      </button>
      <IconButton
        variant="surface"
        className={styles.deleteButton}
        label={t("ai.access.delete.action")}
        onClick={() => {
          deleteSettings.reset();
          setIsConfirmingDelete(true);
        }}
      >
        <IconTrash size={20} stroke={2} aria-hidden />
      </IconButton>
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={t("ai.access.delete.title")}
        description={t("ai.access.delete.description", { provider: providerName })}
        confirmLabel={t("ai.access.delete.confirm")}
        cancelLabel={t("ai.access.delete.cancel")}
        onConfirm={confirmDelete}
        pending={deleteSettings.isPending}
        error={deleteSettings.isError ? t("ai.access.delete.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
      />
    </div>
  );
}

function AiLanguageCard({ settings, onEdit }: { settings: AiSettings; onEdit: () => void }) {
  const { t } = useTranslation();

  return (
    <button type="button" className={`${styles.card} ${styles.languageCard}`} onClick={onEdit}>
      <span className={styles.cardContent}>
        <span className={styles.cardTitle}>{t(`ai.languageName.${settings.language}`)}</span>
        <span className={styles.cardText}>{t("ai.language.description")}</span>
      </span>
      <IconChevronRight size={20} stroke={2} aria-hidden />
    </button>
  );
}
