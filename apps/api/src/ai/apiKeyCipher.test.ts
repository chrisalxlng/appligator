import { randomBytes } from "node:crypto";
import { expect, test } from "vite-plus/test";
import { createApiKeyCipher } from "./apiKeyCipher.ts";

const cipher = createApiKeyCipher(randomBytes(32).toString("base64"));

test("decrypts what it encrypted", () => {
  const encrypted = cipher.encrypt("sk-secret", "user-id");

  expect(cipher.decrypt(encrypted, "user-id")).toBe("sk-secret");
});

test("does not contain the plain API key and differs on every encryption", () => {
  const first = cipher.encrypt("sk-secret", "user-id");
  const second = cipher.encrypt("sk-secret", "user-id");

  expect(first).not.toContain("sk-secret");
  expect(first).not.toBe(second);
});

test("rejects an API key encrypted for another user", () => {
  const encrypted = cipher.encrypt("sk-secret", "user-id");

  expect(() => cipher.decrypt(encrypted, "other-user-id")).toThrow();
});

test("rejects a tampered ciphertext", () => {
  const [version, iv, authTag, ciphertext] = cipher.encrypt("sk-secret", "user-id").split(".");
  const tampered = Buffer.from(ciphertext!, "base64url");
  tampered[0]! ^= 1;

  expect(() =>
    cipher.decrypt([version, iv, authTag, tampered.toString("base64url")].join("."), "user-id"),
  ).toThrow();
});

test("rejects an API key encrypted with another key", () => {
  const otherCipher = createApiKeyCipher(randomBytes(32).toString("base64"));

  expect(() => otherCipher.decrypt(cipher.encrypt("sk-secret", "user-id"), "user-id")).toThrow();
});

test("requires a 32 byte key", () => {
  expect(() => createApiKeyCipher(randomBytes(16).toString("base64"))).toThrow(
    "The API key encryption key must be 32 bytes (base64)",
  );
});
