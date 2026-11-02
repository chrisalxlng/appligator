import type { MailAccountInput, MailErrorCode } from "@appligator/shared";
import { ImapFlow } from "imapflow";
import { resolvePublicAddress } from "./publicAddress.ts";

const imapsPort = 993;
const localDevHost = "localhost";

export type VerifyMailAccess = (access: MailAccountInput) => Promise<MailErrorCode | undefined>;

interface ImapTarget {
  address: string;
  servername: string;
  port: number;
  verifyCertificate: boolean;
}

function isAuthenticationFailure(error: unknown) {
  return error instanceof Error && "authenticationFailed" in error && !!error.authenticationFailed;
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
    socketTimeout: 15_000,
  });
  // ImapFlow also emits connection failures as events, which would crash the process unhandled.
  client.on("error", () => {});

  try {
    await client.connect();
  } finally {
    client.close();
  }
}

export function createMailAccessVerifier({
  localDevPort,
}: { localDevPort?: number } = {}): VerifyMailAccess {
  async function targetFor(host: string): Promise<ImapTarget | undefined> {
    if (localDevPort && host === localDevHost) {
      return {
        address: localDevHost,
        servername: localDevHost,
        port: localDevPort,
        verifyCertificate: false,
      };
    }

    const address = await resolvePublicAddress(host);
    if (!address) return undefined;

    return { address, servername: host, port: imapsPort, verifyCertificate: true };
  }

  return async ({ host, username, password }) => {
    try {
      const target = await targetFor(host);
      if (!target) return "connectionFailed";

      await loginToImap(target, { username, password });
      return undefined;
    } catch (error) {
      return isAuthenticationFailure(error) ? "loginRejected" : "connectionFailed";
    }
  };
}
