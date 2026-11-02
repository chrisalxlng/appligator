import {
  mailHostSchema,
  type MailAccount,
  type MailAccountInput,
  type MailErrorCode,
} from "@appligator/shared";
import { ApiError } from "../api/apiClient.ts";
import { isMailPreset, mailPresets, type MailPreset, type MailProvider } from "./mailProviders.ts";

export interface MailAccountFormValues {
  provider: MailProvider | null;
  host: string;
  username: string;
  password: string;
}

export type MailAccountFormError =
  | "providerRequired"
  | "hostRequired"
  | "hostInvalid"
  | "usernameRequired"
  | "passwordRequired";

export type MailAccountFormErrors = Partial<
  Record<keyof MailAccountFormValues, MailAccountFormError>
>;

type ValidationResult =
  | { input: MailAccountInput; errors?: never }
  | { input?: never; errors: MailAccountFormErrors };

const saveErrors = [
  "loginRejected",
  "connectionFailed",
] as const satisfies readonly MailErrorCode[];

export function mailSaveError(error: Error) {
  const code = error instanceof ApiError ? error.code : undefined;
  return saveErrors.find((saveError) => saveError === code) ?? "saveFailed";
}

function presetOf(host: string) {
  const presets = Object.keys(mailPresets) as MailPreset[];
  return presets.find((preset) => mailPresets[preset].host === host);
}

export function toMailAccountFormValues(account?: MailAccount): MailAccountFormValues {
  if (!account) return { provider: null, host: "", username: "", password: "" };

  const preset = presetOf(account.host);
  return {
    provider: preset ?? "other",
    host: preset ? "" : account.host,
    username: account.username,
    password: "",
  };
}

function hostError(host: string) {
  if (!host.trim()) return "hostRequired";
  return mailHostSchema.safeParse(host).success ? undefined : "hostInvalid";
}

export function validateMailAccountForm({
  provider,
  host,
  username,
  password,
}: MailAccountFormValues): ValidationResult {
  const errors: MailAccountFormErrors = {};

  if (!provider) errors.provider = "providerRequired";
  if (provider === "other") {
    const failure = hostError(host);
    if (failure) errors.host = failure;
  }
  if (!username.trim()) errors.username = "usernameRequired";
  if (!password) errors.password = "passwordRequired";

  if (!provider || Object.keys(errors).length > 0) return { errors };

  return {
    input: {
      host: isMailPreset(provider) ? mailPresets[provider].host : mailHostSchema.parse(host),
      username: username.trim(),
      password,
    },
  };
}
