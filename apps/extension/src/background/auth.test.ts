import { beforeEach, expect, test, vi } from "vite-plus/test";
import { readSession, saveSession, type Session } from "../session.ts";
import { installFakeChrome } from "../testing/fakeChrome.ts";
import { completeLogin, getAccessToken, LoggedOutError, login, logout } from "./auth.ts";

const endpoint = "http://localhost:8080/realms/apps/protocol/openid-connect";
const now = new Date("2026-10-29T12:00:00Z").getTime();
const fetchMock = vi.fn<typeof fetch>();
let fakeChrome: ReturnType<typeof installFakeChrome>;

const activeSession: Session = {
  accessToken: "access-token",
  accessTokenExpiresAt: now + 300_000,
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: now + 1_800_000,
};

function tokenResponse(accessToken = "new-access-token") {
  return Response.json({
    access_token: accessToken,
    expires_in: 300,
    refresh_token: "new-refresh-token",
    refresh_expires_in: 1800,
  });
}

function requestBody(call: number) {
  return new URLSearchParams(fetchMock.mock.calls[call]![1]!.body as URLSearchParams);
}

beforeEach(() => {
  vi.useFakeTimers({ now, toFake: ["Date"] });
  fakeChrome = installFakeChrome();
  fetchMock.mockReset().mockResolvedValue(tokenResponse());
  vi.stubGlobal("fetch", fetchMock);
});

const redirectUri = "chrome-extension://extension-id/auth-callback.html";

async function startLogin() {
  await login();
  const { url, ...window } = fakeChrome.windows.create.mock.calls[0]![0];
  return { authUrl: new URL(url as string), window };
}

function callbackUrl(params: Record<string, string>) {
  return `${redirectUri}?${new URLSearchParams(params)}`;
}

test("opens the login in a window of a fixed size", async () => {
  const { authUrl, window } = await startLogin();

  expect(`${authUrl.origin}${authUrl.pathname}`).toBe(`${endpoint}/auth`);
  expect(Object.fromEntries(authUrl.searchParams)).toMatchObject({
    client_id: "appligator-app",
    redirect_uri: redirectUri,
    response_type: "code",
    code_challenge_method: "S256",
  });
  expect(window).toEqual({ type: "popup", width: 480, height: 720 });
});

test("completes the login with the authorization code and the PKCE verifier", async () => {
  const { authUrl } = await startLogin();

  await completeLogin(
    callbackUrl({ state: authUrl.searchParams.get("state")!, code: "auth-code" }),
  );

  expect(fetchMock.mock.calls[0]![0]).toBe(`${endpoint}/token`);
  const body = requestBody(0);
  expect(body.get("grant_type")).toBe("authorization_code");
  expect(body.get("code")).toBe("auth-code");
  expect(body.get("redirect_uri")).toBe(redirectUri);
  const challenge = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body.get("code_verifier")!),
  );
  expect(authUrl.searchParams.get("code_challenge")).toBe(
    btoa(String.fromCharCode(...new Uint8Array(challenge)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  );
  expect(await readSession()).toEqual({
    accessToken: "new-access-token",
    accessTokenExpiresAt: now + 300_000,
    refreshToken: "new-refresh-token",
    refreshTokenExpiresAt: now + 1_800_000,
  });
});

test.each([
  ["another state", { state: "forged", code: "auth-code" }],
  ["an error", { error: "access_denied" }],
])("rejects a login callback with %s", async (_case, params) => {
  await startLogin();

  await expect(completeLogin(callbackUrl(params))).rejects.toThrow("Login was not completed");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(await readSession()).toBeUndefined();
});

test("rejects a login callback without a started login", async () => {
  await expect(completeLogin(callbackUrl({ state: "state", code: "auth-code" }))).rejects.toThrow(
    "Login was not completed",
  );
});

test("accepts a login callback only once", async () => {
  const { authUrl } = await startLogin();
  const url = callbackUrl({ state: authUrl.searchParams.get("state")!, code: "auth-code" });
  await completeLogin(url);

  await expect(completeLogin(url)).rejects.toThrow("Login was not completed");
});

test("provides the stored access token while it is valid", async () => {
  await saveSession(activeSession);

  await expect(getAccessToken()).resolves.toBe("access-token");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("refreshes an expiring access token", async () => {
  await saveSession({ ...activeSession, accessTokenExpiresAt: now + 10_000 });

  await expect(getAccessToken()).resolves.toBe("new-access-token");
  expect(requestBody(0).get("grant_type")).toBe("refresh_token");
  expect(requestBody(0).get("refresh_token")).toBe("refresh-token");
  expect((await readSession())?.refreshToken).toBe("new-refresh-token");
});

test("ends the session when the refresh is rejected", async () => {
  await saveSession({ ...activeSession, accessTokenExpiresAt: now });
  fetchMock.mockResolvedValue(new Response(null, { status: 400 }));

  await expect(getAccessToken()).rejects.toBeInstanceOf(LoggedOutError);
  expect(await readSession()).toBeUndefined();
});

test("keeps the session when the refresh fails for other reasons", async () => {
  await saveSession({ ...activeSession, accessTokenExpiresAt: now });
  fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

  await expect(getAccessToken()).rejects.not.toBeInstanceOf(LoggedOutError);
  expect(await readSession()).toBeDefined();
});

test.each([
  ["no session", undefined],
  ["an expired session", { ...activeSession, refreshTokenExpiresAt: now }],
])("requires a login with %s", async (_case, session) => {
  if (session) await saveSession(session);

  await expect(getAccessToken()).rejects.toBeInstanceOf(LoggedOutError);
});

test("logs out at Keycloak and forgets the session", async () => {
  await saveSession(activeSession);

  await logout();

  expect(await readSession()).toBeUndefined();
  expect(fetchMock.mock.calls[0]![0]).toBe(`${endpoint}/logout`);
  expect(requestBody(0).get("refresh_token")).toBe("refresh-token");
});

test("forgets the session even when Keycloak is unreachable", async () => {
  await saveSession(activeSession);
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

  await logout();

  expect(await readSession()).toBeUndefined();
});
