export function parseLink(value: string) {
  const link = value.trim();
  if (!link) return null;

  if (/\s/.test(link)) return undefined;

  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(link) ? link : `https://${link}`;
  try {
    const url = new URL(withProtocol);
    const isWebLink = ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
    return isWebLink ? url.href : undefined;
  } catch {
    return undefined;
  }
}
