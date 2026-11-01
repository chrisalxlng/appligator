import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vite-plus/test";
import { saveJobImport } from "../jobImport.ts";
import { saveSession } from "../session.ts";
import { installFakeChrome } from "../testing/fakeChrome.ts";
import { Popup } from "./Popup.tsx";

const link = "https://www.stepstone.de/stellenangebote--frontend-developer";
const tab = { id: 7, title: "Lead Developer Frontend - Hybrid (m/w/d)", url: link };
const now = Date.now();
let fakeChrome: ReturnType<typeof installFakeChrome>;

async function logIn() {
  await saveSession({
    accessToken: "access-token",
    accessTokenExpiresAt: now + 300_000,
    refreshToken: "refresh-token",
    refreshTokenExpiresAt: now + 1_800_000,
  });
}

beforeEach(() => {
  fakeChrome = installFakeChrome();
  fakeChrome.tabs.query.mockResolvedValue([tab]);
});

test("asks for a login without a session", async () => {
  render(<Popup />);

  await userEvent.click(await screen.findByRole("button", { name: "Log in" }));

  expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
  expect(fakeChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "login" });
});

test("switches to the job import after the login", async () => {
  render(<Popup />);
  await screen.findByRole("button", { name: "Log in" });

  await act(logIn);

  expect(await screen.findByRole("heading", { name: "Submit job" })).toBeInTheDocument();
});

test("shows the page title and the host name of the active tab", async () => {
  await logIn();

  render(<Popup />);

  expect(await screen.findByText(tab.title)).toBeInTheDocument();
  expect(screen.getByText("stepstone.de")).toBeInTheDocument();
});

test("submits the active tab and shows the running import", async () => {
  await logIn();
  render(<Popup />);

  await userEvent.click(await screen.findByRole("button", { name: "Submit" }));

  expect(fakeChrome.runtime.sendMessage).toHaveBeenCalledWith({
    type: "importJob",
    tabId: 7,
    link,
  });
  expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByText(/You can close this window/)).toBeInTheDocument();
});

test("links the imported job", async () => {
  await logIn();
  await saveJobImport(link, { status: "done", jobId: "job-id" });

  render(<Popup />);

  expect(await screen.findByText("Job imported")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Open in Appligator/ })).toHaveAttribute(
    "href",
    "http://localhost:5173/jobs/job-id",
  );
  expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
});

test("updates when the import finishes", async () => {
  await logIn();
  await saveJobImport(link, { status: "importing", startedAt: now });
  render(<Popup />);
  await screen.findByText(/You can close this window/);

  await act(() => saveJobImport(link, { status: "failed", error: "noJobFound" }));

  expect(screen.getByRole("alert")).toHaveTextContent("No job ad was found on this page.");
  expect(screen.getByRole("button", { name: "Submit" })).not.toHaveAttribute("aria-busy");
});

test("hides the error while a retry starts", async () => {
  await logIn();
  await saveJobImport(link, { status: "failed", error: "providerUnavailable" });
  render(<Popup />);

  await userEvent.click(await screen.findByRole("button", { name: "Submit" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("aria-busy", "true");
});

test("reports an import that stopped without a result", async () => {
  await logIn();
  await saveJobImport(link, { status: "importing", startedAt: now - 3 * 60_000 });

  render(<Popup />);

  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
});

test("does not offer the import on pages other than websites", async () => {
  await logIn();
  fakeChrome.tabs.query.mockResolvedValue([{ ...tab, url: "chrome://extensions/" }]);

  render(<Popup />);

  expect(await screen.findByText("Jobs cannot be submitted from this page.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
});

test("logs out", async () => {
  await logIn();
  render(<Popup />);

  await userEvent.click(await screen.findByRole("button", { name: "Log out" }));

  expect(fakeChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "logout" });
});

test("renders nothing while the session is loading", () => {
  fakeChrome.storage.local.get.mockReturnValue(new Promise(() => {}));

  const { container } = render(<Popup />);

  expect(container).toBeEmptyDOMElement();
});
