import { activityTypes } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { rankActivityTypes } from "./activityRelevance.ts";

test("ranks the activity types in process order without activities", () => {
  expect(rankActivityTypes([])).toEqual(activityTypes);
});

test("ranks every activity type exactly once", () => {
  const ranked = rankActivityTypes(["interviewScheduled", "offerReceived"]);

  expect(ranked.toSorted()).toEqual(activityTypes.toSorted());
});

test("ranks the likely successors of the latest activity first", () => {
  expect(rankActivityTypes(["offerReceived", "interviewHeld"]).slice(0, 3)).toEqual([
    "offerAccepted",
    "offerDeclined",
    "counterOfferSubmitted",
  ]);
});

test("keeps the follow-up of an earlier open activity on top", () => {
  const ranked = rankActivityTypes(["taskSubmitted", "taskReceived", "interviewScheduled"]);

  expect(ranked[0]).toBe("interviewHeld");
});

test("ranks the follow-ups of the most recently opened activity first", () => {
  const ranked = rankActivityTypes(["documentsRequested", "taskReceived", "interviewScheduled"]);

  expect(ranked.slice(0, 3)).toEqual(["documentsSubmitted", "taskSubmitted", "interviewHeld"]);
});

test("closes each open activity with its own follow-up", () => {
  const twoScheduled = ["interviewHeld", "interviewScheduled", "interviewScheduled"] as const;
  const bothHeld = ["interviewHeld", ...twoScheduled] as const;

  expect(rankActivityTypes([...twoScheduled])[0]).toBe("interviewHeld");
  expect(rankActivityTypes([...bothHeld])[0]).toBe("interviewScheduled");
});

test("closes all open activities when the application process ends", () => {
  const ranked = rankActivityTypes(["rejectionReceived", "taskReceived", "interviewScheduled"]);

  expect(ranked).toEqual(activityTypes);
});
