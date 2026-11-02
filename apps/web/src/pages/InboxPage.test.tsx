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
const messagePath = `/inbox/${mailMessageFixture.id}`;
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
  return screen.findByRole("button", { name: "Retrieve emails" });
}

test("offers to add an access when no inbox is connected", async () => {
  createFakeMailApi();
  renderApp("/inbox");

  expect(await screen.findByRole("heading", { name: "No inbox connected" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Add inbox access" })).toHaveAttribute(
    "href",
    "/profile",
  );
  expect(screen.queryByRole("button", { name: "Retrieve emails" })).toBeNull();
});

test("shows an empty state with the option to retrieve emails", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp("/inbox");

  expect(await screen.findByRole("heading", { name: "No emails yet" })).toBeVisible();
  expect(await retrieveButton()).toBeVisible();
});

test("explains a disrupted retrieval without emails", async () => {
  createFakeMailApi({ ...mailAccountFixture, syncError: "connectionFailed" });
  renderApp("/inbox");

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
  const router = renderApp("/inbox");

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

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss email" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Dismiss email?" });
  expect(dialog).toHaveTextContent("It remains unchanged in your inbox");
  await userEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }));

  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(api.requestsWith("DELETE")[0]!.path).toBe(`/mail/messages/${mailMessageFixture.id}`);
  expect(screen.getByText("Email dismissed")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("button", { name: "Dismiss email" })).toBeNull());
  expect(screen.getByRole("button", { name: "Assign to application" })).toBeVisible();
});

test("offers to dismiss an email in the menu on mobile", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp(messagePath, { viewport: "mobile" });

  await screen.findByRole("article");
  expect(screen.queryByRole("button", { name: "Dismiss email" })).toBeNull();

  await userEvent.click(await screen.findByRole("button", { name: "Show more actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Dismiss email" }));

  expect(await screen.findByRole("alertdialog", { name: "Dismiss email?" })).toBeVisible();
});

test("keeps the email and shows an error when dismissing fails", async () => {
  const api = createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  api.failWith(`DELETE /mail/messages/${mailMessageFixture.id}`, 500);
  renderApp(messagePath);

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss email" }));
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
  expect(screen.queryByRole("button", { name: "Dismiss email" })).toBeNull();
});

test("retrieves emails on request and announces the new ones", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  api.prepareNewMail(newMail);
  renderApp("/inbox");

  await userEvent.click(await retrieveButton());

  expect(await messageCard(/^Neue Nachricht/)).toBeVisible();
  expect(await screen.findByText("1 new email")).toBeInTheDocument();
  expect(screen.queryByText("No new emails")).toBeNull();
});

test("says when retrieving found no new emails", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp("/inbox");

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
  renderApp("/inbox");
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
  const inboxLinks = await screen.findAllByRole("link", { name: /^Inbox/ });
  await waitFor(() => expect(inboxLinks[0]).toHaveTextContent("Inbox1"));
  expect(screen.queryByText(/new email/)).toBeNull();

  api.receiveMail(newMail);
  await vi.advanceTimersByTimeAsync(30_000);

  expect(await screen.findByText("1 new email")).toBeInTheDocument();
  await waitFor(() => expect(inboxLinks[0]).toHaveTextContent("Inbox2"));
});

test("shows the number of emails to review in the active color on the inbox page", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp(messagePath);

  const [link] = await screen.findAllByRole("link", { name: /^Inbox/ });
  await waitFor(() => expect(link).toHaveTextContent("Inbox1"));

  expect(within(link!).getByText("1")).toHaveAttribute("data-tone", "active");
});

test("shows the number of emails to review in the info color on other pages", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs");

  const [link] = await screen.findAllByRole("link", { name: /^Inbox/ });
  await waitFor(() => expect(link).toHaveTextContent("Inbox1"));

  expect(within(link!).getByText("1")).toHaveAttribute("data-tone", "info");
});

test("only counts the emails still to review", async () => {
  createFakeMailApi(mailAccountFixture, [{ ...mailMessageFixture, status: "assigned" }]);
  renderApp("/jobs");

  const [link] = await screen.findAllByRole("link", { name: /^Inbox/ });
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(link!.textContent).toBe("Inbox");
});

test("marks new emails in the mobile navigation", async () => {
  createFakeMailApi(mailAccountFixture, [mailMessageFixture]);
  renderApp("/jobs", { viewport: "mobile" });

  expect(await screen.findByRole("link", { name: "Inbox, 1 to review" })).toBeVisible();
});
