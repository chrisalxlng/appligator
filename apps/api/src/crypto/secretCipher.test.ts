import { randomBytes } from "node:crypto";
import { expect, test } from "vite-plus/test";
import { createSecretCipher } from "./secretCipher.ts";

const encryptionKey = randomBytes(32).toString("base64");
const cipher = createSecretCipher(encryptionKey, "test-purpose");

test("decrypts what it encrypted", () => {
  const encrypted = cipher.encrypt("sk-secret", "user-id");

  expect(cipher.decrypt(encrypted, "user-id")).toBe("sk-secret");
});

test("does not contain the plain secret and differs on every encryption", () => {
  const first = cipher.encrypt("sk-secret", "user-id");
  const second = cipher.encrypt("sk-secret", "user-id");

  expect(first).not.toContain("sk-secret");
  expect(first).not.toBe(second);
});

test("rejects a secret encrypted for another user", () => {
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

test("rejects a secret encrypted with another key", () => {
  const otherCipher = createSecretCipher(randomBytes(32).toString("base64"), "test-purpose");

  expect(() => otherCipher.decrypt(cipher.encrypt("sk-secret", "user-id"), "user-id")).toThrow();
});

test("accepts any secret and derives the same key from it", () => {
  const encrypted = createSecretCipher("example-key", "test-purpose").encrypt(
    "sk-secret",
    "user-id",
  );

  expect(createSecretCipher("example-key", "test-purpose").decrypt(encrypted, "user-id")).toBe(
    "sk-secret",
  );
});

test("rejects a secret encrypted for another purpose", () => {
  const otherCipher = createSecretCipher(encryptionKey, "other-purpose");

  expect(() => otherCipher.decrypt(cipher.encrypt("sk-secret", "user-id"), "user-id")).toThrow();
});
