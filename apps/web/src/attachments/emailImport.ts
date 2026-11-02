import {
  activityLimits,
  emailAddressesOf,
  jobLimits,
  textToHtml,
  toIsoDateTime,
} from "@appligator/shared";
import { toRichText } from "@appligator/ui";
import PostalMime from "postal-mime";
import type { EmailAttachment, LinkAttachment } from "./attachments.ts";

function isWebLink(url: string) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function linksInHtml(html: string) {
  const anchors = new DOMParser().parseFromString(html, "text/html").querySelectorAll("a[href]");
  return [...anchors].map((anchor) => ({
    url: anchor.getAttribute("href")!.trim(),
    title: anchor.textContent?.trim() ?? "",
  }));
}

function linksInText(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/g)].map(([url]) => ({ url, title: "" }));
}

function findLinks(html: string | undefined, text: string | undefined): LinkAttachment[] {
  const links = html ? linksInHtml(html) : linksInText(text ?? "");
  const unique = new Map<string, LinkAttachment>();
  for (const { url, title } of links) {
    if (!isWebLink(url) || url.length > jobLimits.linkLength || unique.has(url)) continue;
    const useTitle = title !== url && title.length <= jobLimits.textLength;
    unique.set(url, { kind: "link", url, title: useTitle ? title : "" });
  }
  return [...unique.values()];
}

export function exceedsEmailLimits({
  subject,
  from,
  to,
  body,
}: Pick<EmailAttachment, "subject" | "from" | "to" | "body">) {
  return (
    [subject, from, to].some((header) => header.length > activityLimits.emailHeaderLength) ||
    body.length > activityLimits.emailBodyLength
  );
}

export function isEmailFile(file: File) {
  return file.name.toLowerCase().endsWith(".eml") || file.type === "message/rfc822";
}

export async function importEmail(file: File) {
  const { subject, from, to, date, html, text } = await PostalMime.parse(file);

  return {
    email: {
      kind: "email" as const,
      subject: subject?.trim() ?? "",
      from: emailAddressesOf(from ? [from] : []),
      to: emailAddressesOf(to ?? []),
      sentAt: toIsoDateTime(date),
      body: html ? toRichText(html) : textToHtml(text ?? ""),
    },
    links: findLinks(html, text),
  };
}
