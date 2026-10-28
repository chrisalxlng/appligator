import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const version = "v1";
const ivLength = 12;

export type ApiKeyCipher = ReturnType<typeof createApiKeyCipher>;

export function createApiKeyCipher(base64Key: string) {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("The API key encryption key must be 32 bytes (base64)");

  return {
    encrypt(apiKey: string, userId: string) {
      const iv = randomBytes(ivLength);
      const cipher = createCipheriv(algorithm, key, iv).setAAD(Buffer.from(userId));
      const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
      return [version, iv, cipher.getAuthTag(), ciphertext]
        .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
        .join(".");
    },

    decrypt(encrypted: string, userId: string) {
      const [encryptedVersion, iv, authTag, ciphertext] = encrypted.split(".");
      if (encryptedVersion !== version || !iv || !authTag || !ciphertext) {
        throw new Error("Unsupported encrypted API key format");
      }

      const decipher = createDecipheriv(algorithm, key, Buffer.from(iv, "base64url"))
        .setAAD(Buffer.from(userId))
        .setAuthTag(Buffer.from(authTag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}
