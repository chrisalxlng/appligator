export function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function hostname(link: string) {
  return new URL(link).hostname.replace(/^www\./, "");
}

export function textToHtml(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

export function toIsoDateTime(date: string | undefined) {
  const parsed = date ? new Date(date) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

interface EmailAddress {
  name?: string;
  address?: string;
  group?: EmailAddress[];
}

export function emailAddressesOf(addresses: EmailAddress[]) {
  return addresses
    .flatMap((address) => address.group ?? [address])
    .map(({ address, name }) => address || name)
    .join(", ")
    .toLowerCase();
}
