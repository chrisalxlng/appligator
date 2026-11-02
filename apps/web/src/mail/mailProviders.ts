export const mailPresets = {
  gmx: { name: "GMX", host: "imap.gmx.net" },
  webDe: { name: "WEB.DE", host: "imap.web.de" },
};

export type MailPreset = keyof typeof mailPresets;
export type MailProvider = MailPreset | "other";

export function isMailPreset(provider: MailProvider): provider is MailPreset {
  return provider !== "other";
}
