import type { MailAccountInput, MailErrorCode } from "@appligator/shared";
import { ImapFlow } from "imapflow";
import { resolvePublicAddress } from "./publicAddress.ts";

const imapsPort = 993;
const localDevHost = "localhost";

export type VerifyMailAccess = (access: MailAccountInput) => Promise<MailErrorCode | undefined>;
export type OpenMailbox = (access: MailAccountInput) => Promise<ImapFlow>;

interface ImapTarget {
  address: string;
  servername: string;
  port: number;
  verifyCertificate: boolean;
}

export function toMailErrorCode(error: unknown): MailErrorCode {
  const rejected =
    error instanceof Error && "authenticationFailed" in error && !!error.authenticationFailed;
  return rejected ? "loginRejected" : "connectionFailed";
}

async function loginToImap(
  { address, servername, port, verifyCertificate }: ImapTarget,
  { username, password }: Pick<MailAccountInput, "username" | "password">,
) {
  const client = new ImapFlow({
    host: address,
    servername,
    port,
    secure: true,
    tls: { rejectUnauthorized: verifyCertificate, minVersion: "TLSv1.2" },
    auth: { user: username, pass: password },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 60_000,
  });
  // ImapFlow also emits connection failures as events, which would crash the process unhandled.
  client.on("error", () => {});

  try {
    await client.connect();
    return client;
  } catch (error) {
    client.close();
    throw error;
  }
}

export function createMailboxOpener({ localDevPort }: { localDevPort?: number } = {}): OpenMailbox {
  async function targetFor(host: string): Promise<ImapTarget> {
    if (localDevPort && host === localDevHost) {
      return {
        address: localDevHost,
        servername: localDevHost,
        port: localDevPort,
        verifyCertificate: false,
      };
    }

    const address = await resolvePublicAddress(host);
    if (!address) throw new Error("The mail host has no public address");

    return { address, servername: host, port: imapsPort, verifyCertificate: true };
  }

  return async ({ host, username, password }) =>
    loginToImap(await targetFor(host), { username, password });
}

export function createMailAccessVerifier(openMailbox: OpenMailbox): VerifyMailAccess {
  return async (access) => {
    try {
      const client = await openMailbox(access);
      client.close();
      return undefined;
    } catch (error) {
      return toMailErrorCode(error);
    }
  };
}
