import { activityLimits, jobLimits, type Attachment } from "@appligator/shared";
import { toRichText } from "@appligator/ui";
import PostalMime from "postal-mime";

type LinkAttachment = Extract<Attachment, { kind: "link" }>;

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function textToHtml(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function toIsoDateTime(date: string | undefined) {
  const parsed = date ? new Date(date) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

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
    if (!isWebLink(url) || url.length > activityLimits.linkLength || unique.has(url)) continue;
    const useTitle = title !== url && title.length <= jobLimits.textLength;
    unique.set(url, { kind: "link", url, title: useTitle ? title : "" });
  }
  return [...unique.values()];
}

export function isEmailFile(file: File) {
  return file.name.toLowerCase().endsWith(".eml") || file.type === "message/rfc822";
}

export async function importEmail(file: File) {
  const { subject, from, date, html, text } = await PostalMime.parse(file);
  const sender = from && "address" in from ? from.address || from.name : "";

  return {
    email: {
      kind: "email" as const,
      subject: subject?.trim() ?? "",
      from: sender.toLowerCase(),
      sentAt: toIsoDateTime(date),
      body: html ? toRichText(html) : textToHtml(text ?? ""),
    },
    links: findLinks(html, text),
  };
}
