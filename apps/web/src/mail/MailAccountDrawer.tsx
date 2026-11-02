import type { MailAccount } from "@appligator/shared";
import {
  Drawer,
  Field,
  Select,
  TextInput,
  useFocusFirstError,
  useSuccessToast,
} from "@appligator/ui";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import formStyles from "../details/form.module.css";
import styles from "../profile/settingsSection.module.css";
import { SubmitButton } from "../shortcuts/SubmitButton.tsx";
import {
  mailSaveError,
  toMailAccountFormValues,
  validateMailAccountForm,
  type MailAccountFormErrors,
  type MailAccountFormValues,
} from "./mailAccountForm.ts";
import { isMailPreset, mailPresets, type MailProvider } from "./mailProviders.ts";
import { useSaveMailAccount } from "./mailQueries.ts";

interface MailAccountDrawerProps {
  account?: MailAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MailAccountDrawer({ account, open, onOpenChange }: MailAccountDrawerProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();

  function handleSaved() {
    onOpenChange(false);
    showSuccess(t(account ? "mail.toast.updated" : "mail.toast.added"));
  }

  return (
    <Drawer
      title={t(account ? "mail.account.editTitle" : "mail.account.addTitle")}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      <MailAccountForm account={account} onSaved={handleSaved} />
    </Drawer>
  );
}

interface MailAccountFormProps {
  account?: MailAccount;
  onSaved: () => void;
}

function MailAccountForm({ account, onSaved }: MailAccountFormProps) {
  const { t } = useTranslation();
  const save = useSaveMailAccount();
  const [values, setValues] = useState(() => toMailAccountFormValues(account));
  const [errors, setErrors] = useState<MailAccountFormErrors>({});
  const formRef = useFocusFirstError(errors);

  function setValue<Key extends keyof MailAccountFormValues>(key: Key) {
    return (value: MailAccountFormValues[Key]) =>
      setValues((current) => ({ ...current, [key]: value }));
  }

  function errorFor(field: keyof MailAccountFormErrors) {
    const error = errors[field];
    return error && t(`mail.account.errors.${error}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateMailAccountForm(values);
    setErrors(result.errors ?? {});
    if (result.input) save.mutate(result.input, { onSuccess: onSaved });
  }

  const providerItems: { value: MailProvider; label: string }[] = [
    { value: "gmx", label: mailPresets.gmx.name },
    { value: "webDe", label: mailPresets.webDe.name },
    { value: "other", label: t("mail.account.otherProvider") },
  ];

  return (
    <form ref={formRef} className={formStyles.form} onSubmit={submit} noValidate>
      <p className={styles.description}>{t("mail.account.privacyHint")}</p>
      <Field label={t("mail.account.provider")} error={errorFor("provider")}>
        <Select
          items={providerItems}
          value={values.provider}
          onValueChange={setValue("provider")}
          placeholder={t("fields.selectPlaceholder")}
        />
      </Field>
      {values.provider && (
        <p className={styles.description}>
          {isMailPreset(values.provider)
            ? t("mail.account.setupHint.preset", { provider: mailPresets[values.provider].name })
            : t("mail.account.setupHint.other")}
        </p>
      )}
      {values.provider === "other" && (
        <Field label={t("mail.account.host")} error={errorFor("host")}>
          <TextInput
            autoComplete="off"
            spellCheck={false}
            placeholder="imap.example.com"
            value={values.host}
            onValueChange={setValue("host")}
          />
        </Field>
      )}
      <Field label={t("mail.account.username")} error={errorFor("username")}>
        <TextInput
          name="username"
          autoComplete="username"
          spellCheck={false}
          placeholder={t("mail.account.usernamePlaceholder")}
          value={values.username}
          onValueChange={setValue("username")}
        />
      </Field>
      <Field label={t("mail.account.password")} error={errorFor("password")}>
        <TextInput
          type="password"
          name="password"
          autoComplete="current-password"
          spellCheck={false}
          value={values.password}
          onValueChange={setValue("password")}
        />
      </Field>
      {save.isError && (
        <p role="alert" className={formStyles.saveError}>
          {t(`mail.account.errors.${mailSaveError(save.error)}`)}
        </p>
      )}
      <SubmitButton icon={account ? IconPencil : IconPlus} pending={save.isPending}>
        {t(account ? "mail.account.submitUpdate" : "mail.account.submitAdd")}
      </SubmitButton>
    </form>
  );
}
