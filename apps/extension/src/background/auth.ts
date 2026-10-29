import { z } from "zod";
import { keycloak } from "../config.ts";
import { isActive, readSession, removeSession, saveSession } from "../session.ts";

const endpoint = `${keycloak.url}/realms/${keycloak.realm}/protocol/openid-connect`;
const minTokenValidityMs = 30_000;
const rejectedStatusCodes = new Set([400, 401]);
const loginWindowSize = { width: 480, height: 720 };
const pendingLoginKey = "pendingLogin";

interface PendingLogin {
  state: string;
  codeVerifier: string;
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  refresh_expires_in: z.number(),
});

export class LoggedOutError extends Error {
  constructor() {
    super("The user is not logged in");
  }
}

class TokenRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Token request failed with status ${status}`);
    this.status = status;
  }
}

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function codeChallenge(codeVerifier: string) {
  return base64Url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier)));
}

function redirectUri() {
  return chrome.runtime.getURL("auth-callback.html");
}

async function requestTokens(params: Record<string, string>) {
  const response = await fetch(`${endpoint}/token`, {
    method: "POST",
    body: new URLSearchParams({ client_id: keycloak.clientId, ...params }),
  });
  if (!response.ok) throw new TokenRequestError(response.status);

  const tokens = tokenResponseSchema.parse(await response.json());
  const now = Date.now();
  const session = {
    accessToken: tokens.access_token,
    accessTokenExpiresAt: now + tokens.expires_in * 1000,
    refreshToken: tokens.refresh_token,
    refreshTokenExpiresAt: now + tokens.refresh_expires_in * 1000,
  };
  await saveSession(session);
  return session;
}

export async function login() {
  const codeVerifier = randomString();
  const state = randomString();
  const authUrl = new URL(`${endpoint}/auth`);
  authUrl.search = new URLSearchParams({
    client_id: keycloak.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid",
    state,
    code_challenge: await codeChallenge(codeVerifier),
    code_challenge_method: "S256",
  }).toString();

  await chrome.storage.session.set({ [pendingLoginKey]: { state, codeVerifier } });
  await chrome.windows.create({ url: authUrl.href, type: "popup", ...loginWindowSize });
}

export async function completeLogin(callbackUrl: string) {
  const { [pendingLoginKey]: pendingLogin } = await chrome.storage.session.get<{
    pendingLogin?: PendingLogin;
  }>(pendingLoginKey);
  await chrome.storage.session.remove(pendingLoginKey);

  const params = new URL(callbackUrl).searchParams;
  const code = params.get("code");
  if (!pendingLogin || params.get("state") !== pendingLogin.state || !code) {
    throw new Error("Login was not completed");
  }

  await requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: pendingLogin.codeVerifier,
  });
}

export async function getAccessToken() {
  const session = await readSession();
  if (!isActive(session)) throw new LoggedOutError();
  if (session.accessTokenExpiresAt - minTokenValidityMs > Date.now()) return session.accessToken;

  try {
    const refreshed = await requestTokens({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    });
    return refreshed.accessToken;
  } catch (error) {
    if (!(error instanceof TokenRequestError && rejectedStatusCodes.has(error.status))) throw error;
    await removeSession();
    throw new LoggedOutError();
  }
}

export async function logout() {
  const session = await readSession();
  await removeSession();
  if (!session) return;

  await fetch(`${endpoint}/logout`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: keycloak.clientId,
      refresh_token: session.refreshToken,
    }),
  }).catch(() => undefined);
}
