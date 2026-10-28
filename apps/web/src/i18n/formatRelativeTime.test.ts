import { expect, test } from "vite-plus/test";
import { capitalize, formatRelativeTime } from "./formatRelativeTime.ts";

const now = new Date("2026-10-28T12:00:00Z");

function ago(seconds: number) {
  return new Date(now.getTime() - seconds * 1000).toISOString();
}

test.each([
  [10, "now"],
  [5 * 60, "5 minutes ago"],
  [3 * 60 * 60, "3 hours ago"],
  [24 * 60 * 60, "1 day ago"],
  [14 * 24 * 60 * 60, "2 weeks ago"],
  [35 * 24 * 60 * 60, "1 month ago"],
  [400 * 24 * 60 * 60, "1 year ago"],
])("formats %i seconds ago as %s", (seconds, expected) => {
  expect(formatRelativeTime(ago(seconds), "en", now)).toBe(expected);
});

test("formats in the given locale", () => {
  expect(formatRelativeTime(ago(3 * 24 * 60 * 60), "de", now)).toBe("vor 3 Tagen");
});

test("treats future times as now", () => {
  expect(formatRelativeTime(ago(-60), "en", now)).toBe("now");
});

test("capitalizes the first letter", () => {
  expect(capitalize("vor 1 Monat aktualisiert")).toBe("Vor 1 Monat aktualisiert");
});
