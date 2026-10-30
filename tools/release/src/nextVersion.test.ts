import { expect, test } from "vite-plus/test";
import { isBump, nextVersion } from "./nextVersion.ts";

test.each([
  ["patch", "1.2.4"],
  ["minor", "1.3.0"],
  ["major", "2.0.0"],
] as const)("raises the %s version of the latest tag", (bump, expected) => {
  expect(nextVersion("v1.2.3", bump)).toBe(expected);
});

test("counts each version part as a number", () => {
  expect(nextVersion("v0.9.9", "patch")).toBe("0.9.10");
});

test.each([
  ["patch", "0.0.1"],
  ["minor", "0.1.0"],
  ["major", "1.0.0"],
] as const)("raises the %s version of 0.0.0 without a tag", (bump, expected) => {
  expect(nextVersion(undefined, bump)).toBe(expected);
});

test("rejects a latest tag that isn't a version", () => {
  expect(() => nextVersion("v1.2", "patch")).toThrow("Tag v1.2 is not a version like v1.2.3");
});

test("accepts only major, minor and patch as bump", () => {
  expect(isBump("minor")).toBe(true);
  expect(isBump("beta")).toBe(false);
  expect(isBump(undefined)).toBe(false);
});
