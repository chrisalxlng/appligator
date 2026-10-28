const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

export function formatRelativeTime(isoDateTime: string, locale: string, now = new Date()) {
  const secondsAgo = (now.getTime() - new Date(isoDateTime).getTime()) / 1000;
  const match = units.find(([, unitSeconds]) => secondsAgo >= unitSeconds);
  if (!match) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");

  const [unit, unitSeconds] = match;
  return new Intl.RelativeTimeFormat(locale).format(-Math.floor(secondsAgo / unitSeconds), unit);
}

export function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
