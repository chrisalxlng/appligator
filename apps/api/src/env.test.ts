import { afterEach, expect, test, vi } from "vite-plus/test";
import { requireEnv } from "./env.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("returns the value of a set environment variable", () => {
  vi.stubEnv("DATABASE_URL", "postgres://localhost/test");

  expect(requireEnv("DATABASE_URL")).toBe("postgres://localhost/test");
});

test("throws when the environment variable is missing or empty", () => {
  vi.stubEnv("DATABASE_URL", "");

  expect(() => requireEnv("DATABASE_URL")).toThrow("Environment variable DATABASE_URL is not set");
});
