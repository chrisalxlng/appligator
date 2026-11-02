import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { applicationFor, createFakeApi, jobFixture } from "../testing/fakeApi.ts";
import {
  createFakeMailApi,
  mailAccountFixture,
  mailMessageFixture,
} from "../testing/fakeMailApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const application = applicationFor(jobFixture);
const messagePath = `/emails/${mailMessageFixture.id}`;
const newMail = {
  ...mailMessageFixture,
  id: "9c1f6a44-2f0c-4c55-9a0d-3f3a3f8c7e13",
  subject: "Neue Nachricht",
};

beforeEach(() => {
  createFakeApi([jobFixture], [application]);
});

afterEach(() => {
  vi.useRealTimers();
});

function messageCard(subject: string | RegExp = /^Einladung zum Gespräch/) {
  return screen.findByRole("link", { name: subject });
}

function retrieveButton() {
  return screen.findByRole("button", { name: "Retrieve" });
}

test("offers to add an access when no inbox is connected", async () => {
  createFakeMailApi();
  renderApp("/emails");

  expect(await screen.findByRole("heading", { name: "No inbox connected" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Add inbox access" })).toHaveAttribute(
    "href",
    "/profile",
  );
  expect(screen.queryByRole("button", { name: "Retrieve" })).toBeNull();
});

test("shows an empty state with the option to retrieve emails", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp("/emails");

  expect(await screen.findByRole("heading", { name: "No emails yet" })).toBeVisible();
  expect(await retrieveButton()).toBeVisible();
});

test("explains a disrupted retrieval without emails", async () => {
  createFakeMailApi({ ...mailAccountFixture, syncError: "connectionFailed" });
  renderApp("/emails");

  expect(await screen.findByRole("heading", { name: "Retrieving is disrupted" })).toBeVisible();
  expect(screen.getByText(/The server can't be reached/)).toBeVisible();
});

test("explains a disrupted retrieval above the emails", async () => {
  createFakeMailApi({ ...mailAccountFixture, syncError: "loginRejected" }, [mailMessageFixture]);
  renderApp(messagePath);

  expect(await screen.findByRole("alert")).toHaveTextContent("The server rejects the login.");
  expect(await messageCard()).toBeVisible();
});

test("lists the emails with subject, sender and status", async () => {
  createFakeMailApi(mailAccountFixture, [
    mailMessageFixture,
    { ...newMail, subject: "", folder: "sent", to: "hr@acme.example", status: "dismissed" },
  ]);
  renderApp(messagePath);

  const card = await messageCard();
  expect(card).toHaveTextContent("jobs@acme.example");
  expect(card).toHaveTextContent("To review");

  const sent = await messageCard(/^\(No subject\)/);
  expect(sent).toHaveTextContent("hr@acme.example");
  expect(sent).toHaveTextContent("Dismissed");
});

test("shows the time for emails of today and the day for older ones", async () => {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  createFakeMailApi(mailAccountFixture, [
    { ...mailMessageFixture, sentAt: today.toISOString() },
    { ...newMail, sentAt: yesterday.toISOString() },
  ]);
  renderApp(messagePath);

  const time = today.toLocaleTimeString("en", { timeStyle: "short" });
  expect(await messageCard()).toHaveTextContent(time);
  expect(await messageCard(/^Neue Nachricht/)).toHaveTextContent("Yesterday");
});

test("filters the emails by status", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture, { ...newMail, status: "dismissed" }]);
  renderApp(messagePath);

  await messageCard();
  await userEvent.click(await screen.findByRole("button", { name: "1 Dismissed" }));

  await waitFor(() =>
    expect(screen.queryByRole("link", { name: /^Einladung zum Gespräch/ })).toBeNull(),
  );
  expect(await messageCard(/^Neue Nachricht/)).toBeVisible();
});

test("opens the first email next to the list on wide screens", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  const router = renderApp("/emails");

  expect(await screen.findByText("Wir laden Sie ein.")).toBeVisible();
  expect(router.state.location.pathname).toBe(messagePath);
});

test("shows the email with its properties above the message", async () => {
  createFakeMailApi(mailAccountFixture, [{ ...mailMessageFixture, attachmentCount: 2 }]);
  renderApp(messagePath);

  const detail = await screen.findByRole("article");
  expect(within(detail).getByRole("heading", { name: "Einladung zum Gespräch" })).toBeVisible();
  expect(within(detail).getByText("To review")).toBeVisible();
  expect(within(detail).getByText("bewerbung@example.com")).toBeVisible();
  expect(within(detail).getByText("2 files not imported")).toBeVisible();
  expect(within(detail).getByText("Wir laden Sie ein.")).toBeVisible();
});

test("says when an email doesn't exist", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp(messagePath);

  expect(await screen.findByRole("heading", { name: "Email not found" })).toBeVisible();
});

test("shows a load error with a retry", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  api.failWith("GET /mail/messages", 500);
  renderApp(messagePath);

  expect(await screen.findByRole("heading", { name: "Emails could not be loaded" })).toBeVisible();

  api.recover();
  await userEvent.click(screen.getByRole("button", { name: /try again|retry/i }));

  expect(await messageCard()).toBeVisible();
});

test("dismisses an email after a confirmation and keeps showing it", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp(messagePath);

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Dismiss email?" });
  expect(dialog).toHaveTextContent("It remains unchanged in your inbox");
  await userEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }));

  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(api.requestsWith("DELETE")[0]!.path).toBe(`/mail/messages/${mailMessageFixture.id}`);
  expect(screen.getByText("Email dismissed")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull());
  expect(screen.getByRole("button", { name: "Assign to application" })).toBeVisible();
});

test("offers to dismiss an email in the menu on mobile", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp(messagePath, { viewport: "mobile" });

  await screen.findByRole("article");
  expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();

  await userEvent.click(await screen.findByRole("button", { name: "Show more actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Dismiss" }));

  expect(await screen.findByRole("alertdialog", { name: "Dismiss email?" })).toBeVisible();
});

test("keeps the email and shows an error when dismissing fails", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  api.failWith(`DELETE /mail/messages/${mailMessageFixture.id}`, 500);
  renderApp(messagePath);

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Dismiss email?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }));

  expect(
    await within(dialog).findByText("The email could not be dismissed. Please try again."),
  ).toBeVisible();
});

test("assigns an email from a popover and attaches it to the new activity", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp(messagePath);

  await userEvent.click(await screen.findByRole("button", { name: "Assign to application" }));
  await userEvent.click(
    await screen.findByRole("option", { name: new RegExp(application.position) }),
  );
  const types = await screen.findByRole("dialog", { name: "Add activity" });
  await userEvent.click(await within(types).findByRole("button", { name: /^Interview scheduled/ }));
  const form = await screen.findByRole("dialog", { name: "Interview scheduled" });
  expect(within(form).getByText("Einladung zum Gespräch")).toBeVisible();
  await userEvent.click(within(form).getByRole("button", { name: "Add" }));

  await waitFor(() => expect(form).not.toBeInTheDocument());
  await waitFor(() => expect(types).not.toBeInTheDocument());
  const { body } = api.requestsWith("POST")[0]!;
  expect(body!.applicationId).toBe(application.id);
  expect(body!.activity).toMatchObject({
    type: "interviewScheduled",
    occurredAt: expect.stringContaining("2026-10-30T09:14"),
    attachments: [
      {
        kind: "email",
        subject: "Einladung zum Gespräch",
        from: "jobs@acme.example",
        body: "<p>Wir laden Sie ein.</p>",
      },
    ],
  });
  expect(screen.getByText("Activity added")).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: "Assigned application" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Assign to application" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
});

test("retrieves emails on request and announces the new ones", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  api.prepareNewMail(newMail);
  renderApp("/emails");

  await userEvent.click(await retrieveButton());

  expect(await messageCard(/^Neue Nachricht/)).toBeVisible();
  expect(await screen.findByText("1 new email")).toBeInTheDocument();
  expect(screen.queryByText("No new emails")).toBeNull();
});

test("says when retrieving found no new emails", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp("/emails");

  await userEvent.click(await retrieveButton());

  expect(await screen.findByText("No new emails")).toBeInTheDocument();
});

test("shows an error when retrieving fails unexpectedly", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  api.failWith("POST /mail/sync", 429);
  renderApp(messagePath);

  await userEvent.click(await retrieveButton());

  expect(await screen.findByRole("alert")).toHaveTextContent("The emails could not be retrieved.");
});

test("shows emails retrieved in the background without a reload and announces them", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const api = createFakeMailApi(mailAccountFixture);
  renderApp("/emails");
  await screen.findByRole("heading", { name: "No emails yet" });

  api.receiveMail(newMail);
  await vi.advanceTimersByTimeAsync(30_000);

  expect(await messageCard(/^Neue Nachricht/)).toBeVisible();
  expect(await screen.findByText("1 new email")).toBeInTheDocument();
});

test("announces new emails on other pages too, but not the existing ones", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs");
  const inboxLinks = await screen.findAllByRole("link", { name: /^Emails/ });
  await waitFor(() => expect(inboxLinks[0]).toHaveTextContent("Emails1"));
  expect(screen.queryByText(/new email/)).toBeNull();

  api.receiveMail(newMail);
  await vi.advanceTimersByTimeAsync(30_000);

  expect(await screen.findByText("1 new email")).toBeInTheDocument();
  await waitFor(() => expect(inboxLinks[0]).toHaveTextContent("Emails2"));
});

test("shows the number of emails to review in the active color on the inbox page", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp(messagePath);

  const [link] = await screen.findAllByRole("link", { name: /^Emails/ });
  await waitFor(() => expect(link).toHaveTextContent("Emails1"));

  expect(within(link!).getByText("1")).toHaveAttribute("data-tone", "active");
});

test("shows the number of emails to review in the info color on other pages", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs");

  const [link] = await screen.findAllByRole("link", { name: /^Emails/ });
  await waitFor(() => expect(link).toHaveTextContent("Emails1"));

  expect(within(link!).getByText("1")).toHaveAttribute("data-tone", "info");
});

test("only counts the emails still to review", async () => {
  createFakeMailApi(mailAccountFixture, [{ ...mailMessageFixture, status: "assigned" }]);
  renderApp("/jobs");

  const [link] = await screen.findAllByRole("link", { name: /^Emails/ });
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(link!.textContent).toBe("Emails");
});

test("marks new emails in the mobile navigation", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs", { viewport: "mobile" });

  expect(await screen.findByRole("link", { name: "Emails, 1 to review" })).toBeVisible();
});

test("marks a suggestion in the list and accepts it in one step", async () => {
  const api = createFakeMailApi(mailAccountFixture, [
    {
      ...mailMessageFixture,
      hasSuggestion: true,
      suggestion: {
        application: { id: application.id, position: application.position },
        activityType: "interviewScheduled",
        appointmentAt: "2026-11-10T13:00:00.000Z",
        dueDate: null,
        responseDeadline: null,
      },
    },
  ]);
  renderApp(messagePath);

  expect(await messageCard()).toHaveTextContent("AI suggestion");
  const detail = await screen.findByRole("article");
  expect(detail).toHaveTextContent(
    `AI suggestion: “Interview scheduled” at ${application.position}`,
  );

  await userEvent.click(within(detail).getByRole("button", { name: "Accept suggestion" }));

  await waitFor(() => expect(api.requestsWith("POST")).toHaveLength(1));
  expect(api.requestsWith("POST")[0]!.body).toMatchObject({
    applicationId: application.id,
    activity: {
      type: "interviewScheduled",
      appointmentAt: "2026-11-10T13:00:00.000Z",
      attachments: [{ kind: "email", subject: "Einladung zum Gespräch" }],
    },
  });
  expect(await screen.findByText("Activity added")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Accept suggestion" })).toBeNull(),
  );
});

test("shows an error when accepting a suggestion fails", async () => {
  const api = createFakeMailApi(mailAccountFixture, [
    {
      ...mailMessageFixture,
      suggestion: {
        application: { id: application.id, position: application.position },
        activityType: "other",
        appointmentAt: null,
        dueDate: null,
        responseDeadline: null,
      },
    },
  ]);
  api.failWith(`POST /mail/messages/${mailMessageFixture.id}/assignment`, 500);
  renderApp(messagePath);

  await userEvent.click(await screen.findByRole("button", { name: "Accept suggestion" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The suggestion could not be accepted.",
  );
});

test("undoes an automatic assignment after a confirmation", async () => {
  const api = createFakeMailApi(mailAccountFixture, [
    {
      ...mailMessageFixture,
      status: "autoAssigned",
      application: { id: application.id, position: "Automatic position" },
    },
  ]);
  renderApp(messagePath);

  expect(await messageCard()).toHaveTextContent("Assigned automatically");
  expect(await screen.findByRole("link", { name: "Automatic position" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Assign to application" })).toBeNull();

  await userEvent.click(screen.getByRole("button", { name: "Undo assignment" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Undo assignment?" });
  expect(dialog).toHaveTextContent("will be permanently deleted");
  await userEvent.click(within(dialog).getByRole("button", { name: "Undo" }));

  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(api.requestsWith("DELETE")[0]!.path).toBe(
    `/mail/messages/${mailMessageFixture.id}/assignment`,
  );
  expect(screen.getByText("Assignment undone")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Assign to application" })).toBeVisible();
});

test("announces automatically assigned emails instead of new ones", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp(messagePath);
  await messageCard();

  api.receiveMail({ ...newMail, status: "autoAssigned" });
  await vi.advanceTimersByTimeAsync(30_000);

  expect(await screen.findByText("1 email assigned automatically")).toBeInTheDocument();
  expect(screen.queryByText(/new email/)).toBeNull();
});

test("hides the emails page from the navigation without an inbox", async () => {
  createFakeMailApi();
  renderApp("/jobs");

  const [navigation] = await screen.findAllByRole("navigation", { name: "Main navigation" });
  await waitFor(() =>
    expect(within(navigation!).getByRole("link", { name: "Jobs" })).toBeVisible(),
  );
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(within(navigation!).queryByRole("link", { name: /^Emails/ })).toBeNull();
});

test("doesn't ask for new emails without an inbox", async () => {
  const api = createFakeMailApi();
  renderApp("/jobs");

  await waitFor(() => expect(api.requestsWith("GET").length).toBeGreaterThan(0));
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(api.requestsWith("GET").map(({ path }) => path)).toEqual(["/mail/account"]);
});

test("shows the emails page in the navigation once an inbox is connected", async () => {
  createFakeMailApi();
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: "Add inbox access" }));
  const drawer = await screen.findByRole("dialog", { name: "Add inbox access" });
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Provider" }));
  await userEvent.click(await screen.findByRole("option", { name: "GMX" }));
  await userEvent.type(within(drawer).getByLabelText("Username"), "bewerbung@gmx.de");
  await userEvent.type(within(drawer).getByLabelText("Password"), "secret");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  const [navigation] = await screen.findAllByRole("navigation", { name: "Main navigation" });
  expect(await within(navigation!).findByRole("link", { name: /^Emails/ })).toBeVisible();
});
