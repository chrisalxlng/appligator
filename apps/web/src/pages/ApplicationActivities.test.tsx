import { activityTermsSchema, activityTypes } from "@appligator/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { activityWith, applicationFor, createFakeApi, jobFixture } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const application = applicationFor(jobFixture);
const submission = activityWith({ occurredAt: "2026-10-17T08:00:00.000Z" });
const interview = activityWith({
  type: "interviewScheduled",
  occurredAt: "2026-10-22T10:00:00.000Z",
  appointmentAt: "2026-10-24T13:00:00.000Z",
  attachments: [{ kind: "link", url: "https://teams.microsoft.com/meeting/1", title: "Meeting" }],
});
const task = activityWith({
  type: "taskReceived",
  occurredAt: "2026-10-29T09:00:00.000Z",
  dueDate: "2026-11-09",
  notes: "<p>Vue knowledge expected</p>",
});

function renderActivities(activities = [task, interview, submission]) {
  const api = createFakeApi([jobFixture], [application], { [application.id]: activities });
  renderApp(`/applications/${application.id}`);
  return api;
}

async function findLog() {
  const log = await screen.findByRole("region", { name: "Activities" });
  const [entries] = await within(log).findAllByRole("list");
  return entries!;
}

function entriesOf(log: HTMLElement) {
  return Array.from(log.children) as HTMLElement[];
}

function titlesOf(log: HTMLElement) {
  return entriesOf(log).map((entry) => within(entry).getByRole("heading").textContent);
}

async function openPicker() {
  await userEvent.click(await screen.findByRole("button", { name: "Add activity" }));
  return screen.findByRole("dialog", { name: "Add activity" });
}

function typeOptions(picker: HTMLElement) {
  return within(picker)
    .getAllByRole("listitem")
    .map((item) => within(item).getByRole("button").firstElementChild!.firstChild!.textContent);
}

test("shows the activities, latest first, with their fields and attachments", async () => {
  renderActivities();

  const log = await findLog();
  const entries = entriesOf(log);
  expect(titlesOf(log)).toEqual(["Task received", "Interview scheduled", "Application submitted"]);
  expect(entries[0]).toHaveTextContent("Due dateNovember 9, 2026");
  expect(entries[0]).toHaveTextContent("NotesVue knowledge expected");
  expect(entries[1]).toHaveTextContent("AppointmentOctober 24, 2026");
  expect(within(entries[1]!).getByRole("link", { name: /Meeting/ })).toHaveAttribute(
    "href",
    "https://teams.microsoft.com/meeting/1",
  );
  expect(within(entries[1]!).getByRole("link", { name: /Meeting/ })).toHaveTextContent(
    "Meetingteams.microsoft.com",
  );
});

test("takes the receipt of the application from its submission", async () => {
  renderActivities([interview, submission]);
  const detail = await screen.findByRole("article");

  const received = within(detail).getByText("Received", { selector: "dt > span" });
  expect(received.parentElement!.nextElementSibling).toHaveTextContent("October 17, 2026");
});

test("marks the receipt as not specified without a submission", async () => {
  renderActivities([interview]);
  const detail = await screen.findByRole("article");

  const received = within(detail).getByText("Received", { selector: "dt > span" });
  await waitFor(() =>
    expect(received.parentElement!.nextElementSibling).toHaveTextContent("Not specified"),
  );
});

test("explains when there are no activities yet", async () => {
  renderActivities([]);

  const log = await screen.findByRole("region", { name: "Activities" });
  expect(await within(log).findByText("No activities yet.")).toBeVisible();
});

test("retries loading the activities after an error", async () => {
  const api = renderActivities();
  api.failWith("GET", 500, "/activities");

  const log = await screen.findByRole("region", { name: "Activities" });
  expect(await within(log).findByRole("alert")).toHaveTextContent("Activities could not be loaded");

  api.recover();
  await userEvent.click(within(log).getByRole("button", { name: "Try again" }));
  expect(await findLog()).toBeVisible();
});

test("offers the five most relevant activity types first and the others on request", async () => {
  renderActivities();
  await findLog();
  const picker = await openPicker();

  expect(typeOptions(picker)).toEqual([
    "Task submitted",
    "Interview held",
    "Interview scheduled",
    "Application submitted",
    "Receipt confirmed",
  ]);

  await userEvent.click(within(picker).getByRole("button", { name: "Show more" }));
  expect(typeOptions(picker)).toHaveLength(activityTypes.length);

  await userEvent.click(within(picker).getByRole("button", { name: "Show less" }));
  expect(typeOptions(picker)).toHaveLength(5);
});

test("adds an activity with a link attachment", async () => {
  const api = renderActivities();
  await findLog();
  const picker = await openPicker();

  await userEvent.click(within(picker).getByRole("button", { name: /^Interview held/ }));
  const form = await screen.findByRole("dialog", { name: "Interview held" });
  const time = within(form).getByLabelText("Time");
  await userEvent.clear(time);
  await userEvent.type(time, "2026-10-24T14:00");
  await userEvent.click(within(form).getByRole("button", { name: "Add attachment" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Link" }));
  const addLink = await screen.findByRole("dialog", { name: "Add link" });
  await userEvent.click(within(addLink).getByRole("button", { name: "Add" }));
  expect(within(addLink).getByText("Please enter a valid link.")).toBeVisible();
  await userEvent.type(within(addLink).getByRole("textbox", { name: "Link" }), "github.com/x");
  await userEvent.type(within(addLink).getByRole("textbox", { name: "Title" }), "Repository");
  await userEvent.click(within(addLink).getByRole("button", { name: "Add" }));
  await userEvent.click(within(form).getByRole("button", { name: "Add" }));

  expect(await screen.findByText("Activity added")).toBeInTheDocument();
  expect(api.requestsWith("POST")[0]).toMatchObject({
    path: `/applications/${application.id}/activities`,
    body: {
      type: "interviewHeld",
      occurredAt: new Date("2026-10-24T14:00").toISOString(),
      terms: null,
      attachments: [{ kind: "link", url: "https://github.com/x", title: "Repository" }],
    },
  });
  const log = await findLog();
  await waitFor(() => expect(titlesOf(log)).toContain("Interview held"));
  expect(screen.queryByRole("dialog", { name: "Add activity" })).not.toBeInTheDocument();
});

test("adds the terms of an offer", async () => {
  const api = renderActivities();
  await findLog();
  const picker = await openPicker();
  await userEvent.click(within(picker).getByRole("button", { name: "Show more" }));
  await userEvent.click(within(picker).getByRole("button", { name: /^Offer received/ }));
  const form = await screen.findByRole("dialog", { name: "Offer received" });

  await userEvent.type(within(form).getByLabelText("Response deadline"), "2026-11-30");
  await userEvent.click(within(form).getByRole("button", { name: "Add terms" }));
  const terms = await screen.findByRole("dialog", { name: "Add terms" });
  await userEvent.type(within(terms).getByRole("textbox", { name: "Position" }), "Lead Developer");
  await userEvent.type(within(terms).getByRole("textbox", { name: "Vacation days" }), "30");
  await userEvent.click(within(terms).getByRole("button", { name: "Add" }));
  expect(await within(form).findByRole("button", { name: "Edit terms" })).toHaveTextContent(
    "Lead DeveloperVacation days",
  );
  await userEvent.click(within(form).getByRole("button", { name: "Add" }));

  await waitFor(() =>
    expect(api.requestsWith("POST")[0]?.body).toMatchObject({
      type: "offerReceived",
      responseDeadline: "2026-11-30",
      terms: { position: "Lead Developer", vacationDays: 30, salary: null },
    }),
  );
  const adoption = await screen.findByRole("dialog", { name: "Take over values" });
  await userEvent.click(within(adoption).getByRole("button", { name: "Close" }));
  const latest = entriesOf(await findLog())[0]!;
  await waitFor(() => expect(latest).toHaveTextContent("PositionLead Developer"));
  expect(latest).toHaveTextContent("Vacation days30");
  expect(latest).toHaveTextContent("Response deadlineNovember 30, 2026");
});

test("requires the time of an activity", async () => {
  const api = renderActivities();
  await findLog();
  const picker = await openPicker();
  await userEvent.click(within(picker).getByRole("button", { name: /^Task submitted/ }));
  const form = await screen.findByRole("dialog", { name: "Task submitted" });

  await userEvent.clear(within(form).getByLabelText("Time"));
  await userEvent.click(within(form).getByRole("button", { name: "Add" }));

  expect(await within(form).findByText("Please enter a date.")).toBeVisible();
  expect(api.requestsWith("POST")).toHaveLength(0);
});

test("edits an activity", async () => {
  const api = renderActivities();
  const log = await findLog();

  await userEvent.click(within(log).getByRole("button", { name: /Edit Task received$/ }));
  const form = await screen.findByRole("dialog", { name: "Task received" });
  const dueDate = within(form).getByLabelText("Due date");
  expect(dueDate).toHaveValue("2026-11-09");
  await userEvent.clear(dueDate);
  await userEvent.type(dueDate, "2026-11-12");
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  expect(await screen.findByText("Activity updated")).toBeInTheDocument();
  expect(api.requestsWith("PUT")[0]).toMatchObject({
    path: `/applications/${application.id}/activities/${task.id}`,
    body: { type: "taskReceived", dueDate: "2026-11-12", notes: task.notes },
  });
  await waitFor(() => expect(log).toHaveTextContent("Due dateNovember 12, 2026"));
});

test("deletes an activity after confirmation", async () => {
  const api = renderActivities();
  const log = await findLog();

  await userEvent.click(within(log).getByRole("button", { name: /Edit Task received$/ }));
  const form = await screen.findByRole("dialog", { name: "Task received" });
  await userEvent.click(within(form).getByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Delete activity?" });
  expect(dialog).toHaveTextContent("“Task received” from October 29, 2026 will be deleted");
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByText("Activity deleted")).toBeInTheDocument();
  expect(api.requestsWith("DELETE")[0]?.path).toBe(
    `/applications/${application.id}/activities/${task.id}`,
  );
  await waitFor(() =>
    expect(titlesOf(log)).toEqual(["Interview scheduled", "Application submitted"]),
  );
});

test("edits and removes the terms of an activity", async () => {
  const offer = activityWith({
    type: "offerReceived",
    occurredAt: "2026-10-30T09:00:00.000Z",
    terms: {
      ...activityTermsSchema.parse(jobFixture),
      position: "Lead Developer",
      salary: { currency: "EUR", period: "year", min: 70_000, max: 70_000 },
    },
  });
  const api = renderActivities([offer, submission]);
  const log = await findLog();
  await userEvent.click(within(log).getByRole("button", { name: /Edit Offer received$/ }));
  const form = await screen.findByRole("dialog", { name: "Offer received" });

  await userEvent.click(within(form).getByRole("button", { name: "Edit terms" }));
  const terms = await screen.findByRole("dialog", { name: "Edit terms" });
  const position = within(terms).getByRole("textbox", { name: "Position" });
  expect(position).toHaveValue("Lead Developer");
  await userEvent.clear(position);
  await userEvent.type(position, "Staff Engineer");
  await userEvent.click(within(terms).getByRole("button", { name: "Update" }));
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.terms).toMatchObject({
      position: "Staff Engineer",
      salary: offer.terms!.salary,
    }),
  );
  const adoption = await screen.findByRole("dialog", { name: "Take over values" });
  await userEvent.click(within(adoption).getByRole("button", { name: "Close" }));

  await userEvent.click(within(log).getByRole("button", { name: /Edit Offer received$/ }));
  const reopened = await screen.findByRole("dialog", { name: "Offer received" });
  await userEvent.click(within(reopened).getByRole("button", { name: "Remove terms" }));
  expect(within(reopened).getByRole("button", { name: "Add terms" })).toBeVisible();
  await userEvent.click(within(reopened).getByRole("button", { name: "Update" }));

  await waitFor(() => expect(api.requestsWith("PUT")[1]?.body?.terms).toBeNull());
});
