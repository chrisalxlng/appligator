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

beforeEach(() => {
  createFakeApi([jobFixture], [application]);
});

afterEach(() => {
  vi.useRealTimers();
});

async function openMessage() {
  await userEvent.click(await screen.findByRole("button", { name: /^Einladung zum Gespräch/ }));
  return screen.findByRole("dialog", { name: "Einladung zum Gespräch" });
}

test("offers to add an access when no inbox is connected", async () => {
  createFakeMailApi();
  renderApp("/inbox");

  expect(await screen.findByRole("heading", { name: "No inbox connected" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Add inbox access" })).toHaveAttribute(
    "href",
    "/profile",
  );
});

test("shows an empty state without emails to review", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp("/inbox");

  expect(await screen.findByRole("heading", { name: "No emails to review" })).toBeVisible();
});

test("lists the emails with sender, sent marker and skipped files", async () => {
  createFakeMailApi(mailAccountFixture, [
    { ...mailMessageFixture, attachmentCount: 2 },
    {
      ...mailMessageFixture,
      id: "7a1f6a44-2f0c-4c55-9a0d-3f3a3f8c7e12",
      folder: "sent",
      subject: "",
      to: "hr@acme.example",
    },
  ]);
  renderApp("/inbox");

  const received = await screen.findByRole("button", { name: /^Einladung zum Gespräch/ });
  expect(received).toHaveTextContent("jobs@acme.example");
  expect(received).toHaveTextContent("2 files not imported");

  const sent = screen.getByRole("button", { name: /^\(No subject\)/ });
  expect(sent).toHaveTextContent("hr@acme.example");
  expect(sent).toHaveTextContent("Sent");
  expect(sent).not.toHaveTextContent("not imported");
});

test("says when not all emails are listed", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  const fetchWithoutLimit = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const response = await fetchWithoutLimit(url, init);
    if (!url.endsWith("/mail/messages")) return response;
    return Response.json({ ...(await response.json()), total: 120 });
  }) as typeof fetch;
  renderApp("/inbox");

  expect(await screen.findByText("Showing the newest 1 of 120 emails.")).toBeVisible();
  expect(api.requestsWith("GET").length).toBeGreaterThan(0);
});

test("warns about a disrupted retrieval and links to the profile", async () => {
  createFakeMailApi({ ...mailAccountFixture, syncError: "connectionFailed" });
  renderApp("/inbox");

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("The server can't be reached.");
  expect(within(alert).getByRole("link", { name: "Check inbox access" })).toHaveAttribute(
    "href",
    "/profile",
  );
});

test("shows a load error with a retry", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  api.failWith("GET /mail/messages", 500);
  renderApp("/inbox");

  expect(await screen.findByRole("heading", { name: "Emails could not be loaded" })).toBeVisible();

  api.recover();
  await userEvent.click(screen.getByRole("button", { name: /try again|retry/i }));

  expect(await screen.findByRole("button", { name: /^Einladung zum Gespräch/ })).toBeVisible();
});

test("shows the number of emails to review in the navigation", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs");

  const [navigation] = await screen.findAllByRole("navigation", { name: "Main navigation" });
  await waitFor(() =>
    expect(within(navigation!).getByRole("link", { name: /^Inbox/ })).toHaveTextContent("Inbox1"),
  );
});

test("marks new emails in the mobile navigation", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs", { viewport: "mobile" });

  expect(await screen.findByRole("link", { name: "Inbox, 1 to review" })).toBeVisible();
});

test("opens an email with its content", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/inbox");

  const drawer = await openMessage();

  expect(await within(drawer).findByText("Wir laden Sie ein.")).toBeVisible();
  expect(within(drawer).getByText("jobs@acme.example")).toBeVisible();
});

test("dismisses an email after a confirmation", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/inbox");

  const drawer = await openMessage();
  await userEvent.click(await within(drawer).findByRole("button", { name: "Dismiss email" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Dismiss email?" });
  expect(dialog).toHaveTextContent("It remains unchanged in your inbox.");
  await userEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
  expect(api.requestsWith("DELETE")[0]!.path).toBe(`/mail/messages/${mailMessageFixture.id}`);
  expect(screen.getByText("Email dismissed")).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "No emails to review" })).toBeVisible();
});

test("keeps the email and shows an error when dismissing fails", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  api.failWith(`DELETE /mail/messages/${mailMessageFixture.id}`, 500);
  renderApp("/inbox");

  const drawer = await openMessage();
  await userEvent.click(await within(drawer).findByRole("button", { name: "Dismiss email" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Dismiss email?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }));

  expect(
    await within(dialog).findByText("The email could not be dismissed. Please try again."),
  ).toBeVisible();
});

test("assigns an email to an application as an activity with the email attached", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/inbox");

  const drawer = await openMessage();
  await userEvent.click(
    await within(drawer).findByRole("button", { name: "Assign to application" }),
  );
  const picker = await screen.findByRole("dialog", { name: "Assign to application" });
  await userEvent.click(
    await within(picker).findByRole("option", { name: new RegExp(application.position) }),
  );
  const types = await screen.findByRole("dialog", { name: "Add activity" });
  await userEvent.click(await within(types).findByRole("button", { name: /^Interview scheduled/ }));
  const form = await screen.findByRole("dialog", { name: "Interview scheduled" });
  expect(within(form).getByText("Einladung zum Gespräch")).toBeVisible();
  await userEvent.click(within(form).getByRole("button", { name: "Add" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
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
  expect(await screen.findByRole("heading", { name: "No emails to review" })).toBeVisible();
  const detailPath = `/mail/messages/${mailMessageFixture.id}`;
  expect(api.requestsWith("GET").filter(({ path }) => path === detailPath)).toHaveLength(1);
});

const newMail = {
  ...mailMessageFixture,
  id: "9c1f6a44-2f0c-4c55-9a0d-3f3a3f8c7e13",
  subject: "Neue Nachricht",
};

test("does not offer to retrieve emails without a connected inbox", async () => {
  createFakeMailApi();
  renderApp("/inbox");

  await screen.findByRole("heading", { name: "No inbox connected" });

  expect(screen.queryByRole("button", { name: "Retrieve emails" })).toBeNull();
});

test("retrieves emails on request and announces the new ones", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  api.prepareNewMail(newMail);
  renderApp("/inbox");

  await userEvent.click(await screen.findByRole("button", { name: "Retrieve emails" }));

  expect(await screen.findByRole("button", { name: /^Neue Nachricht/ })).toBeVisible();
  expect(await screen.findByText("1 new email")).toBeInTheDocument();
  expect(screen.queryByText("No new emails")).toBeNull();
});

test("says when retrieving found no new emails", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp("/inbox");

  await userEvent.click(await screen.findByRole("button", { name: "Retrieve emails" }));

  expect(await screen.findByText("No new emails")).toBeInTheDocument();
});

test("shows an error when retrieving fails unexpectedly", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  api.failWith("POST /mail/sync", 429);
  renderApp("/inbox");

  await userEvent.click(await screen.findByRole("button", { name: "Retrieve emails" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("The emails could not be retrieved.");
});

test("shows the reason of the account when the mailbox can't be read", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  api.failWith("POST /mail/sync", 422, "connectionFailed");
  renderApp("/inbox");

  await userEvent.click(await screen.findByRole("button", { name: "Retrieve emails" }));

  await waitFor(() => expect(api.requestsWith("POST")).toHaveLength(1));
  expect(screen.queryByText("The emails could not be retrieved.")).toBeNull();
});

test("shows emails retrieved in the background without a reload and announces them", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const api = createFakeMailApi(mailAccountFixture);
  renderApp("/inbox");
  await screen.findByRole("heading", { name: "No emails to review" });

  api.receiveMail(newMail);
  await vi.advanceTimersByTimeAsync(30_000);

  expect(await screen.findByRole("button", { name: /^Neue Nachricht/ })).toBeVisible();
  expect(await screen.findByText("1 new email")).toBeInTheDocument();
});

test("announces new emails on other pages too, but not the existing ones", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs");
  const inboxLinks = await screen.findAllByRole("link", { name: /^Inbox/ });
  await waitFor(() => expect(inboxLinks[0]).toHaveTextContent("Inbox1"));
  expect(screen.queryByText(/new email/)).toBeNull();

  api.receiveMail(newMail);
  await vi.advanceTimersByTimeAsync(30_000);

  expect(await screen.findByText("1 new email")).toBeInTheDocument();
  await waitFor(() => expect(inboxLinks[0]).toHaveTextContent("Inbox2"));
});

test("does not announce anything when the number of emails goes down", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/inbox");

  const drawer = await openMessage();
  await userEvent.click(await within(drawer).findByRole("button", { name: "Dismiss email" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Dismiss email?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }));

  await screen.findByRole("heading", { name: "No emails to review" });
  expect(api.requestsWith("DELETE")).toHaveLength(1);
  expect(screen.queryByText(/new email/)).toBeNull();
});
