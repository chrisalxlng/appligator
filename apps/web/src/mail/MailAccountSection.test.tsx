import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vite-plus/test";
import { createFakeAiApi } from "../testing/fakeAiApi.ts";
import { createFakeApi } from "../testing/fakeApi.ts";
import { createFakeMailApi, mailAccountFixture } from "../testing/fakeMailApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

beforeEach(() => {
  createFakeApi();
  createFakeAiApi();
});

function mailSection() {
  return screen.findByRole("region", { name: "Email inbox" });
}

async function openAddDrawer() {
  await userEvent.click(await screen.findByRole("button", { name: "Add inbox" }));
  return screen.findByRole("dialog", { name: "Add inbox" });
}

async function chooseProvider(drawer: HTMLElement, provider: string) {
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Provider" }));
  await userEvent.click(await screen.findByRole("option", { name: provider }));
}

test("offers to add an inbox when none is connected", async () => {
  createFakeMailApi();
  renderApp("/profile");

  expect(
    await within(await mailSection()).findByRole("button", { name: "Add inbox" }),
  ).toBeVisible();
});

test("shows the connected inbox without a password", async () => {
  createFakeMailApi(mailAccountFixture);
  renderApp("/profile");

  const section = await mailSection();

  expect(
    await within(section).findByRole("button", { name: /^bewerbung@example.com/ }),
  ).toHaveTextContent("bewerbung@example.comimap.example.comUpdated 1 month ago");
});

test("warns about the access to the whole inbox before adding it", async () => {
  createFakeMailApi();
  renderApp("/profile");

  const drawer = await openAddDrawer();

  expect(drawer).toHaveTextContent("Appligator can read all emails in this inbox");
});

test("adds a preset provider with its known server", async () => {
  const api = createFakeMailApi();
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await chooseProvider(drawer, "GMX");
  expect(drawer).toHaveTextContent("Enable IMAP in the GMX settings");
  expect(within(drawer).queryByLabelText("IMAP server")).toBeNull();
  await userEvent.type(within(drawer).getByLabelText("Username"), "bewerbung@gmx.de");
  await userEvent.type(within(drawer).getByLabelText("Password"), "secret");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
  expect(api.requestsWith("PUT")[0]!.body).toEqual({
    host: "imap.gmx.net",
    username: "bewerbung@gmx.de",
    password: "secret",
  });
  expect(screen.getByText("Inbox added")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /^bewerbung@gmx.de/ })).toBeVisible();
});

test("adds another provider with a custom server", async () => {
  const api = createFakeMailApi();
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await chooseProvider(drawer, "Other provider");
  await userEvent.type(within(drawer).getByLabelText("IMAP server"), "imap.my-domain.de");
  await userEvent.type(within(drawer).getByLabelText("Username"), "bewerbung@my-domain.de");
  await userEvent.type(within(drawer).getByLabelText("Password"), "secret");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
  expect(api.requestsWith("PUT")[0]!.body).toMatchObject({ host: "imap.my-domain.de" });
});

test("shows the errors of invalid input without sending it", async () => {
  const api = createFakeMailApi();
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(within(drawer).getByText("Please select a provider.")).toBeVisible();
  expect(within(drawer).getByText("Please enter the username.")).toBeVisible();
  expect(within(drawer).getByText("Please enter the password.")).toBeVisible();
  expect(api.requestsWith("PUT")).toHaveLength(0);
});

test.each([
  ["loginRejected", "The server rejected the login."],
  ["connectionFailed", "The connection to the server failed."],
  [undefined, "The inbox could not be saved."],
])("explains the failed save %s and keeps the drawer open", async (error, message) => {
  const api = createFakeMailApi();
  api.failWith("PUT", error ? 422 : 500, error);
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await chooseProvider(drawer, "WEB.DE");
  await userEvent.type(within(drawer).getByLabelText("Username"), "bewerbung@web.de");
  await userEvent.type(within(drawer).getByLabelText("Password"), "wrong");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(await within(drawer).findByRole("alert")).toHaveTextContent(message);
});

test("edits the inbox and asks for the password again", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: /^bewerbung@example.com/ }));
  const drawer = await screen.findByRole("dialog", { name: "Edit inbox" });

  expect(within(drawer).getByLabelText("IMAP server")).toHaveValue("imap.example.com");
  expect(within(drawer).getByLabelText("Username")).toHaveValue("bewerbung@example.com");
  expect(within(drawer).getByLabelText("Password")).toHaveValue("");

  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));
  expect(within(drawer).getByText("Please enter the password.")).toBeVisible();
  expect(api.requestsWith("PUT")).toHaveLength(0);

  await userEvent.type(within(drawer).getByLabelText("Password"), "new-secret");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
  expect(screen.getByText("Inbox updated")).toBeInTheDocument();
});

test("removes the inbox after a confirmation", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: "Remove inbox" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Remove inbox?" });
  expect(dialog).toHaveTextContent("bewerbung@example.com");
  await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(api.requestsWith("DELETE")).toHaveLength(1);
  expect(screen.getByText("Inbox removed")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Add inbox" })).toBeVisible();
});

test("keeps the inbox and shows an error when removing it fails", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  api.failWith("DELETE", 500);
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: "Remove inbox" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Remove inbox?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

  expect(
    await within(dialog).findByText("The inbox could not be removed. Please try again."),
  ).toBeVisible();
});

test("shows a load error with a retry", async () => {
  const api = createFakeMailApi(mailAccountFixture);
  api.failWith("GET", 500);
  renderApp("/profile");

  const section = await mailSection();
  await within(section).findByText("Email inbox could not be loaded");
  api.recover();
  await userEvent.click(within(section).getByRole("button", { name: /try again|retry/i }));

  expect(
    await within(section).findByRole("button", { name: /^bewerbung@example.com/ }),
  ).toBeVisible();
});
