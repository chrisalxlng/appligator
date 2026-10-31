import PostalMime from "postal-mime";

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

function htmlToText(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

function toIsoDateTime(date: string | undefined) {
  const parsed = date ? new Date(date) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

export function isEmailFile(file: File) {
  return file.name.toLowerCase().endsWith(".eml") || file.type === "message/rfc822";
}

export async function importEmail(file: File) {
  const email = await PostalMime.parse(file);

  return {
    kind: "email" as const,
    subject: email.subject?.trim() ?? "",
    from: email.from && "address" in email.from ? email.from.address || email.from.name : "",
    sentAt: toIsoDateTime(email.date),
    body: textToHtml(email.text ?? htmlToText(email.html ?? "")),
  };
}
