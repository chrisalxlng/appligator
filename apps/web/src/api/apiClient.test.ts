import { afterEach, expect, test, vi } from "vite-plus/test";
import { ApiError, createApiClient } from "./apiClient.ts";

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => fetchMock.mockReset());

const identity = { parse: (data: unknown) => data };

test("sends authenticated requests to the API", async () => {
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
  const api = createApiClient(async () => "token");

  await expect(api.request("/jobs", identity)).resolves.toEqual({ ok: true });

  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe("/api/jobs");
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer token");
});

test("sends the body as JSON", async () => {
  fetchMock.mockResolvedValue(Response.json({}));
  const api = createApiClient(async () => "token");

  await api.request("/jobs", identity, { method: "POST", body: { company: "Initech" } });

  const [, init] = fetchMock.mock.calls[0]!;
  expect(init?.method).toBe("POST");
  expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
  expect(init?.body).toBe('{"company":"Initech"}');
});

test("validates the response", async () => {
  fetchMock.mockResolvedValue(Response.json({ unexpected: true }));
  const api = createApiClient(async () => "token");
  const schema = {
    parse: () => {
      throw new Error("Invalid response");
    },
  };

  await expect(api.request("/jobs", schema)).rejects.toThrow("Invalid response");
});

test("throws an API error for failed requests", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
  const api = createApiClient(async () => "token");

  await expect(api.requestWithoutContent("/jobs/1", { method: "DELETE" })).rejects.toEqual(
    new ApiError(404),
  );
});
