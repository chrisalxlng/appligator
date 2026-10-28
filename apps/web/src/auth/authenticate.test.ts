import { beforeEach, expect, test, vi } from "vite-plus/test";
import { authenticate } from "./authenticate.ts";

const keycloak = vi.hoisted(() => ({
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  updateToken: vi.fn(),
  onTokenExpired: undefined as (() => void) | undefined,
  token: undefined as string | undefined,
  tokenParsed: undefined as Record<string, unknown> | undefined,
}));

vi.mock("keycloak-js", () => ({
  default: vi.fn(function () {
    return keycloak;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  keycloak.init.mockResolvedValue(true);
  keycloak.tokenParsed = { name: "Jane Doe", email: "jane@example.com" };
  keycloak.token = "access-token";
});

test("requires a login before the app starts", async () => {
  await authenticate();

  expect(keycloak.init).toHaveBeenCalledWith({ onLoad: "login-required" });
});

test("provides the logged in user", async () => {
  const { user } = await authenticate();

  expect(user).toEqual({ name: "Jane Doe", email: "jane@example.com" });
});

test("logs out and returns to the app", async () => {
  const { logout } = await authenticate();

  await logout();

  expect(keycloak.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin });
});

test("refreshes an expired token", async () => {
  keycloak.updateToken.mockResolvedValue(true);
  await authenticate();

  keycloak.onTokenExpired?.();

  expect(keycloak.updateToken).toHaveBeenCalled();
});

test("asks for a new login when the session has ended", async () => {
  keycloak.updateToken.mockRejectedValue(new Error("Session expired"));
  await authenticate();

  keycloak.onTokenExpired?.();

  await vi.waitFor(() => expect(keycloak.login).toHaveBeenCalled());
});

test("provides a fresh token for API requests", async () => {
  keycloak.updateToken.mockResolvedValue(true);
  const { getToken } = await authenticate();

  await expect(getToken()).resolves.toBe("access-token");
  expect(keycloak.updateToken).toHaveBeenCalledWith(30);
});

test("asks for a new login when no fresh token can be obtained", async () => {
  keycloak.updateToken.mockRejectedValue(new Error("Session expired"));
  const { getToken } = await authenticate();

  await getToken();

  expect(keycloak.login).toHaveBeenCalled();
});
