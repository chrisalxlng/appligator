import { aiLanguages, type AiLanguage, type AiSettings } from "@appligator/shared";
import { Button, Drawer, Field, Select, submitKeyShortcuts, useSuccessToast } from "@appligator/ui";
import { IconPencil } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import styles from "./AiSettingsForm.module.css";
import { useSaveAiSettings } from "./aiQueries.ts";

interface AiLanguageDrawerProps {
  settings: AiSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiLanguageDrawer({ settings, open, onOpenChange }: AiLanguageDrawerProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();

  function handleSaved() {
    onOpenChange(false);
    showSuccess(t("ai.toast.languageUpdated"));
  }

  return (
    <Drawer
      title={t("ai.language.title")}
      closeLabel={t("ai.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      <AiLanguageForm settings={settings} onSaved={handleSaved} />
    </Drawer>
  );
}

function AiLanguageForm({ settings, onSaved }: { settings: AiSettings; onSaved: () => void }) {
  const { t } = useTranslation();
  const save = useSaveAiSettings();
  const [language, setLanguage] = useState<AiLanguage>(settings.language);
  const shortcutHints = useShortcutHints();

  function submit(event: FormEvent) {
    event.preventDefault();
    const { provider, model } = settings;
    save.mutate({ provider, model, language }, { onSuccess: onSaved });
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t("ai.language.label")}>
        <Select
          items={aiLanguages.map((value) => ({ value, label: t(`ai.languageName.${value}`) }))}
          value={language}
          onValueChange={(value) => value && setLanguage(value)}
          placeholder={t("ai.selectPlaceholder")}
        />
      </Field>
      {save.isError && (
        <p role="alert" className={styles.saveError}>
          {t("ai.language.saveError")}
        </p>
      )}
      <Button
        type="submit"
        pending={save.isPending}
        shortcutHint={shortcutHints?.submit}
        aria-keyshortcuts={submitKeyShortcuts}
      >
        <IconPencil size={20} stroke={2.4} aria-hidden />
        {t("ai.language.submit")}
      </Button>
    </form>
  );
}
