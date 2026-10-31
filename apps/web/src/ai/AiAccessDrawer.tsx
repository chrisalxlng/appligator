import { aiProviders, detectLanguage, type AiProvider, type AiSettings } from "@appligator/shared";
import {
  Button,
  Drawer,
  Field,
  Select,
  submitKeyShortcuts,
  TextInput,
  useSuccessToast,
} from "@appligator/ui";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { accessError } from "./accessError.ts";
import styles from "./AiSettingsForm.module.css";
import {
  toAiAccessFormValues,
  validateAiAccessForm,
  type AiAccessFormErrors,
  type AiAccessFormValues,
} from "./aiAccessForm.ts";
import { aiProviderNames } from "./aiProviders.ts";
import { useAiModels, useSaveAiSettings } from "./aiQueries.ts";

const maskedApiKey = "•".repeat(24);

interface AiAccessDrawerProps {
  settings?: AiSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiAccessDrawer({ settings, open, onOpenChange }: AiAccessDrawerProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();

  function handleSaved() {
    onOpenChange(false);
    showSuccess(t(settings ? "ai.toast.updated" : "ai.toast.added"));
  }

  return (
    <Drawer
      title={t(settings ? "ai.access.editTitle" : "ai.access.addTitle")}
      closeLabel={t("ai.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      <AiAccessForm settings={settings} onSaved={handleSaved} />
    </Drawer>
  );
}

interface AiAccessFormProps {
  settings?: AiSettings;
  onSaved: () => void;
}

function AiAccessForm({ settings, onSaved }: AiAccessFormProps) {
  const { t, i18n } = useTranslation();
  const models = useAiModels();
  const save = useSaveAiSettings();
  const [values, setValues] = useState(() => toAiAccessFormValues(settings));
  const [errors, setErrors] = useState<AiAccessFormErrors>({});
  const shortcutHints = useShortcutHints();

  function setValue<Key extends keyof AiAccessFormValues>(key: Key) {
    return (value: AiAccessFormValues[Key]) =>
      setValues((current) => ({ ...current, [key]: value }));
  }

  function selectProvider(provider: AiProvider | null) {
    setValues((current) =>
      provider === current.provider ? current : { ...current, provider, model: null },
    );
  }

  function errorFor(field: keyof AiAccessFormErrors) {
    const error = errors[field];
    return error && t(`ai.access.errors.${error}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateAiAccessForm(values, {
      settings,
      language: detectLanguage(i18n.language),
    });
    setErrors(result.errors ?? {});
    if (result.input) save.mutate(result.input, { onSuccess: onSaved });
  }

  const providerModels = values.provider ? (models.data?.[values.provider] ?? []) : [];
  const keepsProvider = settings && values.provider === settings.provider;
  const modelItems = [
    ...(keepsProvider && !providerModels.includes(settings.model) ? [settings.model] : []),
    ...providerModels,
  ].map((model) => ({ value: model, label: model }));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t("ai.access.provider")} error={errorFor("provider")}>
        <Select
          items={aiProviders.map((provider) => ({
            value: provider,
            label: aiProviderNames[provider],
          }))}
          value={values.provider}
          onValueChange={selectProvider}
          placeholder={t("ai.selectPlaceholder")}
        />
      </Field>
      <Field
        label={t("ai.access.model")}
        error={models.isError ? t("ai.access.modelsLoadError") : errorFor("model")}
      >
        <Select
          items={modelItems}
          value={values.model}
          onValueChange={setValue("model")}
          placeholder={t(models.isPending ? "ai.access.modelsLoading" : "ai.selectPlaceholder")}
        />
      </Field>
      <Field label={t("ai.access.apiKey")} error={errorFor("apiKey")}>
        <TextInput
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={keepsProvider ? maskedApiKey : undefined}
          value={values.apiKey}
          onValueChange={setValue("apiKey")}
        />
      </Field>
      {save.isError && (
        <p role="alert" className={styles.saveError}>
          {t(`ai.access.errors.${accessError(save.error, "saveFailed")}`)}
        </p>
      )}
      <Button
        type="submit"
        pending={save.isPending}
        shortcutHint={shortcutHints?.submit}
        aria-keyshortcuts={submitKeyShortcuts}
      >
        {settings ? (
          <IconPencil size={20} stroke={2.4} aria-hidden />
        ) : (
          <IconPlus size={20} stroke={2.4} aria-hidden />
        )}
        {t(settings ? "ai.access.submitUpdate" : "ai.access.submitAdd")}
      </Button>
    </form>
  );
}
