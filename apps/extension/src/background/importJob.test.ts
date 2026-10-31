import { beforeEach, expect, test, vi } from "vite-plus/test";
import { jobImportKey, type JobImport } from "../jobImport.ts";
import { readSession, saveSession } from "../session.ts";
import { installFakeChrome } from "../testing/fakeChrome.ts";
import { importJob } from "./importJob.ts";

const tabId = 7;
const link = "https://www.stepstone.de/stellenangebote--frontend-developer";
const html = "<html><head><title>Frontend Developer</title></head></html>";
const jobId = "0b6f7d6e-2f4e-4c55-9a1f-0f1c2d3e4f5a";
const now = new Date("2026-10-29T12:00:00Z").getTime();
const fetchMock = vi.fn<typeof fetch>();
let fakeChrome: ReturnType<typeof installFakeChrome>;

beforeEach(async () => {
  vi.useFakeTimers({ now, toFake: ["Date"] });
  fakeChrome = installFakeChrome();
  fakeChrome.scripting.executeScript.mockResolvedValue([{ result: html }]);
  fetchMock.mockReset().mockResolvedValue(Response.json({ id: jobId }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  await saveSession({
    accessToken: "access-token",
    accessTokenExpiresAt: now + 300_000,
    refreshToken: "refresh-token",
    refreshTokenExpiresAt: now + 1_800_000,
  });
});

async function storedImport() {
  const key = jobImportKey(link);
  const items = await chrome.storage.session.get<Record<string, JobImport>>(key);
  return items[key];
}

function lastBadge() {
  return fakeChrome.action.setBadgeText.mock.calls.at(-1)?.[0];
}

test("sends the page to the API and stores the imported job", async () => {
  await importJob(tabId, link);

  expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/ai/job-import", {
    method: "POST",
    headers: { authorization: "Bearer access-token", "content-type": "application/json" },
    body: JSON.stringify({ link, html }),
  });
  expect(await storedImport()).toEqual({ status: "done", jobId });
  expect(lastBadge()).toEqual({ tabId, text: "✓" });
});

test("shows the import as running until the API responds", async () => {
  let respond!: (response: Response) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => (respond = resolve)));

  const running = importJob(tabId, link);

  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(await storedImport()).toEqual({ status: "importing", startedAt: now });
  expect(lastBadge()).toEqual({ tabId, text: "…" });
  respond(Response.json({ id: jobId }, { status: 201 }));
  await running;
});

test.each([
  ["a known API error", Response.json({ error: "noJobFound" }, { status: 422 }), "noJobFound"],
  ["an unexpected API error", new Response("Bad Gateway", { status: 502 }), "failed"],
  [
    "an API error the import never causes",
    Response.json({ error: "apiKeyRequired" }, { status: 422 }),
    "failed",
  ],
])("reports %s", async (_case, response, error) => {
  fetchMock.mockResolvedValue(response);

  await importJob(tabId, link);

  expect(await storedImport()).toEqual({ status: "failed", error });
  expect(lastBadge()).toEqual({ tabId, text: "!" });
});

test("reports an unreachable API", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

  await importJob(tabId, link);

  expect(await storedImport()).toEqual({ status: "failed", error: "failed" });
});

test("reports a page that cannot be read", async () => {
  fakeChrome.scripting.executeScript.mockRejectedValue(new Error("Cannot access contents"));

  await importJob(tabId, link);

  expect(await storedImport()).toEqual({ status: "failed", error: "pageUnreadable" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("ends the session when the API rejects the token", async () => {
  fetchMock.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

  await importJob(tabId, link);

  expect(await storedImport()).toEqual({ status: "failed", error: "loggedOut" });
  expect(await readSession()).toBeUndefined();
});

test("requires a login without a session", async () => {
  await chrome.storage.local.remove("session");

  await importJob(tabId, link);

  expect(await storedImport()).toEqual({ status: "failed", error: "loggedOut" });
  expect(fetchMock).not.toHaveBeenCalled();
});
