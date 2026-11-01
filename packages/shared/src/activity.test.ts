import { expect, test } from "vite-plus/test";
import { applicationStatusOf } from "./activity.ts";

test("derives the status from the latest activity that affects it", () => {
  expect(applicationStatusOf(["offerReceived", "interviewHeld", "applicationSubmitted"])).toBe(
    "offer",
  );
});

test("skips activities that leave the status as it is", () => {
  expect(
    applicationStatusOf(["statusInquired", "other", "documentsSubmitted", "interviewHeld"]),
  ).toBe("interviewing");
});

test("counts an application as applied without activities that affect the status", () => {
  expect(applicationStatusOf([])).toBe("applied");
  expect(applicationStatusOf(["documentsRequested"])).toBe("applied");
});

test.each([
  ["offerAccepted", "accepted"],
  ["offerDeclined", "declined"],
  ["rejectionReceived", "rejected"],
  ["applicationWithdrawn", "withdrawn"],
  ["applicationPaused", "paused"],
] as const)("derives the status of %s", (type, status) => {
  expect(applicationStatusOf([type])).toBe(status);
});
