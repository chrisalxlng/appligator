import { aiLanguages, type AiLanguage, type AiSettings } from "@appligator/shared";
import { Drawer, Field, Select, useSuccessToast } from "@appligator/ui";
import { IconPencil } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { SubmitButton } from "../shortcuts/SubmitButton.tsx";
import styles from "../details/form.module.css";
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
      closeLabel={t("common.close")}
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
          placeholder={t("fields.selectPlaceholder")}
        />
      </Field>
      {save.isError && (
        <p role="alert" className={styles.saveError}>
          {t("ai.language.saveError")}
        </p>
      )}
      <SubmitButton icon={IconPencil} pending={save.isPending}>
        {t("ai.language.submit")}
      </SubmitButton>
    </form>
  );
}
