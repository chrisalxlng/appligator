import type { Salary } from "@appligator/shared";

const millisecondsPerDay = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysAgo(isoDateTime: string, now = new Date()) {
  const difference = startOfDay(now).getTime() - startOfDay(new Date(isoDateTime)).getTime();
  return Math.round(difference / millisecondsPerDay);
}

export function formatDate(
  isoDateTime: string,
  locale: string,
  dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = "medium",
) {
  return new Date(isoDateTime).toLocaleDateString(locale, { dateStyle });
}

export function formatDateTime(isoDateTime: string, locale: string) {
  return new Date(isoDateTime).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" });
}

export function formatIsoDate(isoDate: string, locale: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year!, month! - 1, day).toLocaleDateString(locale, { dateStyle: "long" });
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

export function formatUnit(value: number, unit: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "unit", unit }).format(value);
}

const rangeSeparator = "–";

export function formatSalaryRange({ currency, min, max }: Salary, locale: string) {
  const format = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  if (min === max) return format.format(min);

  return format
    .formatRangeToParts(min, max)
    .map(({ value }) => (value === rangeSeparator ? ` ${rangeSeparator} ` : value))
    .join("");
}

export function hostname(link: string) {
  return new URL(link).hostname.replace(/^www\./, "");
}
