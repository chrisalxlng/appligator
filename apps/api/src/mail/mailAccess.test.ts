import { beforeEach, expect, test, vi } from "vite-plus/test";
import { createMailAccessVerifier } from "./mailAccess.ts";
import { resolvePublicAddress } from "./publicAddress.ts";

const imap = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  close: vi.fn(),
  on: vi.fn(),
  options: vi.fn(),
}));

vi.mock("imapflow", () => ({
  ImapFlow: class {
    connect = imap.connect;
    close = imap.close;
    on = imap.on;
    constructor(options: unknown) {
      imap.options(options);
    }
  },
}));

vi.mock("./publicAddress.ts", () => ({ resolvePublicAddress: vi.fn() }));

const access = { host: "imap.example.com", username: "user", password: "secret" };

beforeEach(() => {
  vi.mocked(resolvePublicAddress).mockReset().mockResolvedValue("93.184.216.34");
  imap.connect.mockReset().mockResolvedValue();
  imap.close.mockClear();
  imap.options.mockClear();
});

test("connects to the checked address and verifies the certificate against the host", async () => {
  expect(await createMailAccessVerifier()(access)).toBeUndefined();

  expect(imap.options).toHaveBeenCalledWith(
    expect.objectContaining({
      host: "93.184.216.34",
      servername: "imap.example.com",
      port: 993,
      secure: true,
      tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      auth: { user: "user", pass: "secret" },
      logger: false,
    }),
  );
  expect(imap.close).toHaveBeenCalled();
});

test("does not connect to a host without a public address", async () => {
  vi.mocked(resolvePublicAddress).mockResolvedValue(undefined);

  expect(await createMailAccessVerifier()(access)).toBe("connectionFailed");
  expect(imap.options).not.toHaveBeenCalled();
});

test("fails when the host can't be resolved", async () => {
  vi.mocked(resolvePublicAddress).mockRejectedValue(new Error("ENOTFOUND"));

  expect(await createMailAccessVerifier()(access)).toBe("connectionFailed");
});

test("reports a rejected login and closes the connection", async () => {
  imap.connect.mockRejectedValue(
    Object.assign(new Error("Command failed"), { authenticationFailed: true }),
  );

  expect(await createMailAccessVerifier()(access)).toBe("loginRejected");
  expect(imap.close).toHaveBeenCalled();
});

test("reports every other failure as a failed connection", async () => {
  imap.connect.mockRejectedValue(new Error("certificate has expired"));

  expect(await createMailAccessVerifier()(access)).toBe("connectionFailed");
});

test("exempts only localhost on the local development port from the checks", async () => {
  const verify = createMailAccessVerifier({ localDevPort: 3993 });

  await verify({ ...access, host: "localhost" });

  expect(resolvePublicAddress).not.toHaveBeenCalled();
  expect(imap.options).toHaveBeenCalledWith(
    expect.objectContaining({
      host: "localhost",
      port: 3993,
      tls: expect.objectContaining({ rejectUnauthorized: false }),
    }),
  );

  imap.options.mockClear();
  await verify(access);

  expect(imap.options).toHaveBeenCalledWith(
    expect.objectContaining({
      port: 993,
      tls: expect.objectContaining({ rejectUnauthorized: true }),
    }),
  );
});

test("treats localhost like any other host without the local development port", async () => {
  await createMailAccessVerifier()({ ...access, host: "localhost" });

  expect(resolvePublicAddress).toHaveBeenCalledWith("localhost");
});
