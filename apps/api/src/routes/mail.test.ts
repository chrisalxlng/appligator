import { eq } from "drizzle-orm";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { mailAccounts } from "../db/schema.ts";
import type { VerifyMailAccess } from "../mail/mailAccess.ts";
import { buildTestApp, signToken, testMailPasswordCipher } from "../testAuth.ts";
import { createTestDatabase } from "../testDatabase.ts";

const db = await createTestDatabase();
const verifyMailAccess = vi.fn<VerifyMailAccess>();
const app = buildTestApp({ db, mail: { verifyMailAccess } });

const input = {
  host: "imap.example.com",
  username: "bewerbung@example.com",
  password: " app password ",
};

beforeEach(async () => {
  await db.delete(mailAccounts);
  verifyMailAccess.mockReset().mockResolvedValue(undefined);
});

async function request(
  method: "GET" | "PUT" | "DELETE",
  { body, userId = "user-id" }: { body?: object; userId?: string } = {},
) {
  return app.inject({
    method,
    url: "/mail/account",
    headers: { authorization: `Bearer ${await signToken({ sub: userId })}` },
    ...(body && { payload: body }),
  });
}

async function storedRow(userId = "user-id") {
  const [row] = await db.select().from(mailAccounts).where(eq(mailAccounts.userId, userId));
  return row;
}

test("GET /mail/account returns null without an account", async () => {
  const response = await request("GET");

  expect(response.statusCode).toBe(200);
  expect(response.json()).toBeNull();
});

test("PUT /mail/account verifies and stores the access without returning the password", async () => {
  const response = await request("PUT", { body: input });

  expect(response.statusCode).toBe(200);
  expect(verifyMailAccess).toHaveBeenCalledWith(input);
  expect(response.json()).toEqual({
    host: "imap.example.com",
    username: "bewerbung@example.com",
    accessUpdatedAt: expect.any(String),
  });
  expect(response.body).not.toContain("app password");

  const row = await storedRow();
  expect(row!.encryptedPassword).not.toContain("app password");
  expect(testMailPasswordCipher.decrypt(row!.encryptedPassword, "user-id")).toBe(" app password ");
});

test("PUT /mail/account normalizes the host", async () => {
  await request("PUT", { body: { ...input, host: " IMAP.Example.COM " } });

  expect((await storedRow())!.host).toBe("imap.example.com");
});

test.each(["127.0.0.1", "[::1]", "imap.example.com:143", "imap.example.com.", "", "imap_.test"])(
  "PUT /mail/account rejects the host %j without connecting",
  async (host) => {
    const response = await request("PUT", { body: { ...input, host } });

    expect(response.statusCode).toBe(400);
    expect(verifyMailAccess).not.toHaveBeenCalled();
  },
);

test("PUT /mail/account requires a password", async () => {
  const { password: _password, ...withoutPassword } = input;

  const response = await request("PUT", { body: withoutPassword });

  expect(response.statusCode).toBe(400);
  expect(verifyMailAccess).not.toHaveBeenCalled();
});

test.each(["loginRejected", "connectionFailed"] as const)(
  "PUT /mail/account does not store an access that fails with %s",
  async (error) => {
    verifyMailAccess.mockResolvedValue(error);

    const response = await request("PUT", { body: input });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error });
    expect(await storedRow()).toBeUndefined();
  },
);

test("PUT /mail/account keeps the stored access when the new one fails", async () => {
  await request("PUT", { body: input });
  verifyMailAccess.mockResolvedValue("loginRejected");

  await request("PUT", { body: { ...input, username: "other@example.com" } });

  expect((await storedRow())!.username).toBe("bewerbung@example.com");
});

test("PUT /mail/account replaces the stored access", async () => {
  await request("PUT", { body: input });

  const response = await request("PUT", {
    body: { host: "mail.example.org", username: "other@example.org", password: "new" },
  });

  expect(response.json()).toMatchObject({
    host: "mail.example.org",
    username: "other@example.org",
  });
  expect(await db.select().from(mailAccounts)).toHaveLength(1);
  expect(testMailPasswordCipher.decrypt((await storedRow())!.encryptedPassword, "user-id")).toBe(
    "new",
  );
});

test("accounts are separated by user", async () => {
  await request("PUT", { body: input });

  expect((await request("GET", { userId: "other-user-id" })).json()).toBeNull();
  expect((await request("DELETE", { userId: "other-user-id" })).statusCode).toBe(404);
  expect(await storedRow()).toBeDefined();
});

test("DELETE /mail/account removes the stored access", async () => {
  await request("PUT", { body: input });

  const response = await request("DELETE");

  expect(response.statusCode).toBe(204);
  expect(await storedRow()).toBeUndefined();
});

test("DELETE /mail/account responds with 404 without an account", async () => {
  expect((await request("DELETE")).statusCode).toBe(404);
});

test("PUT /mail/account limits how often connections are attempted", async () => {
  const limitedApp = buildTestApp({ db, mail: { verifyMailAccess } });
  const token = await signToken({ sub: "rate-limited-user" });
  const attempt = () =>
    limitedApp.inject({
      method: "PUT",
      url: "/mail/account",
      headers: { authorization: `Bearer ${token}` },
      payload: input,
    });

  for (let count = 0; count < 10; count++) expect((await attempt()).statusCode).toBe(200);

  expect((await attempt()).statusCode).toBe(429);
});
