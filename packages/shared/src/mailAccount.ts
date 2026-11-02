import { z } from "zod";

const mailErrorCodes = ["loginRejected", "connectionFailed"] as const;

// The last label starts with a letter, which rules out IP addresses: the server's certificate is
// verified against this name.
const mailHostPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;

export const mailHostSchema = z.string().trim().toLowerCase().max(253).regex(mailHostPattern);

export const mailAccountInputSchema = z.object({
  host: mailHostSchema,
  username: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1_000),
});

export const mailAccountSchema = mailAccountInputSchema.omit({ password: true }).extend({
  accessUpdatedAt: z.iso.datetime(),
});

export const mailErrorSchema = z.object({ error: z.enum(mailErrorCodes) });

export type MailErrorCode = (typeof mailErrorCodes)[number];
export type MailAccountInput = z.infer<typeof mailAccountInputSchema>;
export type MailAccount = z.infer<typeof mailAccountSchema>;
