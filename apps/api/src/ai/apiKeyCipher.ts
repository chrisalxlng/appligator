import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const version = "v1";
const ivLength = 12;

export type ApiKeyCipher = ReturnType<typeof createApiKeyCipher>;

function deriveKey(secret: string) {
  return Buffer.from(hkdfSync("sha256", secret, "", "appligator-api-key-encryption", 32));
}

export function createApiKeyCipher(secret: string) {
  const key = deriveKey(secret);

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
