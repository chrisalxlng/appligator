import { activityTypes, type ActivityType } from "@appligator/shared";

const followUps: Partial<Record<ActivityType, ActivityType[]>> = {
  interviewScheduled: ["interviewHeld"],
  taskReceived: ["taskSubmitted"],
  documentsRequested: ["documentsSubmitted"],
  offerReceived: ["offerAccepted", "offerDeclined", "counterOfferSubmitted"],
  counterOfferSubmitted: ["offerReceived", "offerAccepted", "offerDeclined"],
};

const successors: Partial<Record<ActivityType, ActivityType[]>> = {
  applicationSubmitted: [
    "receiptConfirmed",
    "interviewScheduled",
    "rejectionReceived",
    "taskReceived",
    "documentsRequested",
  ],
  receiptConfirmed: [
    "interviewScheduled",
    "rejectionReceived",
    "taskReceived",
    "documentsRequested",
    "statusInquired",
  ],
  interviewScheduled: ["interviewHeld", "taskReceived", "documentsRequested"],
  interviewHeld: [
    "interviewScheduled",
    "offerReceived",
    "rejectionReceived",
    "taskReceived",
    "documentsRequested",
  ],
  taskReceived: ["taskSubmitted", "interviewScheduled"],
  taskSubmitted: ["interviewScheduled", "rejectionReceived", "offerReceived", "statusInquired"],
  documentsRequested: ["documentsSubmitted"],
  documentsSubmitted: ["interviewScheduled", "offerReceived", "rejectionReceived"],
  statusInquired: ["interviewScheduled", "rejectionReceived", "offerReceived"],
  offerReceived: ["offerAccepted", "offerDeclined", "counterOfferSubmitted"],
  counterOfferSubmitted: ["offerReceived", "offerAccepted", "offerDeclined"],
  applicationPaused: ["statusInquired", "interviewScheduled", "rejectionReceived"],
};

const endings = new Set<ActivityType>([
  "offerAccepted",
  "offerDeclined",
  "rejectionReceived",
  "applicationWithdrawn",
]);

/**
 * Activities that wait for a follow-up stay open until one follows, e.g. a scheduled interview
 * until it is held, even if other activities happen in between. Each follow-up closes the oldest
 * matching open activity, and the end of the application process closes all of them.
 */
function openActivities(typesOldestFirst: ActivityType[]) {
  let open: ActivityType[] = [];

  for (const type of typesOldestFirst) {
    if (endings.has(type)) {
      open = [];
      continue;
    }
    const closed = open.findIndex((openType) => followUps[openType]?.includes(type));
    if (closed !== -1) open = open.toSpliced(closed, 1);
    if (followUps[type]) open.push(type);
  }

  return open;
}

export function rankActivityTypes(typesLatestFirst: ActivityType[]) {
  const latest = typesLatestFirst[0];
  const openFollowUps = openActivities(typesLatestFirst.toReversed())
    .toReversed()
    .flatMap((type) => followUps[type] ?? []);

  return [
    ...new Set([...openFollowUps, ...((latest && successors[latest]) ?? []), ...activityTypes]),
  ];
}
