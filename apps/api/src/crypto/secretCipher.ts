import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const version = "v1";
const ivLength = 12;

export type SecretCipher = ReturnType<typeof createSecretCipher>;

function deriveKey(encryptionKey: string, purpose: string) {
  return Buffer.from(hkdfSync("sha256", encryptionKey, "", purpose, 32));
}

export function createSecretCipher(encryptionKey: string, purpose: string) {
  const key = deriveKey(encryptionKey, purpose);

  return {
    encrypt(secret: string, userId: string) {
      const iv = randomBytes(ivLength);
      const cipher = createCipheriv(algorithm, key, iv).setAAD(Buffer.from(userId));
      const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
      return [version, iv, cipher.getAuthTag(), ciphertext]
        .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
        .join(".");
    },

    decrypt(encrypted: string, userId: string) {
      const [encryptedVersion, iv, authTag, ciphertext] = encrypted.split(".");
      if (encryptedVersion !== version || !iv || !authTag || !ciphertext) {
        throw new Error("Unsupported encrypted secret format");
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
