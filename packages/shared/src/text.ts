export function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function hostname(link: string) {
  return new URL(link).hostname.replace(/^www\./, "");
}
