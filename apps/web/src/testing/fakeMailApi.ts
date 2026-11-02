import type { MailAccount, MailAccountInput } from "@appligator/shared";
import { vi } from "vite-plus/test";

export const mailAccountFixture: MailAccount = {
  host: "imap.example.com",
  username: "bewerbung@example.com",
  accessUpdatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function createFakeMailApi(initialAccount: MailAccount | null = null) {
  let account = initialAccount;
  const requests: { method: string; body?: MailAccountInput }[] = [];
  const failures = new Map<string, { status: number; error?: string }>();
  const otherFetch = globalThis.fetch;

  function handle(init?: RequestInit) {
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, body });

    const failure = failures.get(method);
    if (failure) return json(failure.error ? { error: failure.error } : null, failure.status);

    if (method === "GET") return json(account);
    if (method === "PUT") {
      const { password: _password, ...input } = body as MailAccountInput;
      account = { ...input, accessUpdatedAt: new Date().toISOString() };
      return json(account);
    }
    account = null;
    return new Response(null, { status: 204 });
  }

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) =>
      url.endsWith("/mail/account") ? handle(init) : otherFetch(url, init),
    ),
  );

  return {
    requestsWith: (method: string) => requests.filter((request) => request.method === method),
    failWith: (method: string, status: number, error?: string) =>
      failures.set(method, { status, error }),
    recover: () => failures.clear(),
  };
}
