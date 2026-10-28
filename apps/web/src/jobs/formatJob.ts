import type { Salary } from "@appligator/shared";

const millisecondsPerDay = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysAgo(isoDateTime: string, now = new Date()) {
  const difference = startOfDay(now).getTime() - startOfDay(new Date(isoDateTime)).getTime();
  return Math.round(difference / millisecondsPerDay);
}

export function formatDate(isoDateTime: string, locale: string) {
  return new Date(isoDateTime).toLocaleDateString(locale, { dateStyle: "medium" });
}

export function formatDeadline(isoDate: string, locale: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year!, month! - 1, day).toLocaleDateString(locale, { dateStyle: "medium" });
}

export function formatSalaryRange({ currency, min, max }: Salary, locale: string) {
  const format = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return min === max ? format.format(min) : format.formatRange(min, max);
}

export function hostname(link: string) {
  return new URL(link).hostname.replace(/^www\./, "");
}
