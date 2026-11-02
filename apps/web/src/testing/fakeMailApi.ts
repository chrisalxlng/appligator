import type {
  MailAccount,
  MailAccountInput,
  MailAssignmentInput,
  MailMessage,
} from "@appligator/shared";
import { vi } from "vite-plus/test";

export const mailAccountFixture: MailAccount = {
  host: "imap.example.com",
  username: "bewerbung@example.com",
  accessUpdatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  lastSyncedAt: null,
  syncError: null,
};

export const mailMessageFixture: MailMessage = {
  id: "5b1f6a44-2f0c-4c55-9a0d-3f3a3f8c7e11",
  folder: "inbox",
  subject: "Einladung zum Gespräch",
  from: "jobs@acme.example",
  to: "bewerbung@example.com",
  sentAt: "2026-10-30T09:14:00.000Z",
  attachmentCount: 0,
  receivedAt: "2026-10-30T09:20:00.000Z",
  body: "<p>Wir laden Sie ein.</p>",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function createFakeMailApi(
  initialAccount: MailAccount | null = null,
  initialMessages: MailMessage[] = [],
) {
  let account = initialAccount;
  let messages = initialMessages;
  let incoming: MailMessage[] = [];
  const requests: {
    method: string;
    path: string;
    body?: MailAccountInput & MailAssignmentInput;
  }[] = [];
  const failures = new Map<string, { status: number; error?: string }>();
  const otherFetch = globalThis.fetch;

  function handleMessages(method: string, path: string) {
    if (path === "/mail/sync") {
      const newMails = incoming.length;
      messages = [...incoming, ...messages];
      incoming = [];
      return json({ newMails });
    }
    if (path === "/mail/messages/count") return json({ count: messages.length });
    if (path === "/mail/messages") {
      return json({
        items: messages.map(({ body: _body, ...message }) => message),
        total: messages.length,
      });
    }

    const id = path.split("/")[3]!;
    const message = messages.find((other) => other.id === id);
    if (!message) return json({ error: "Not Found" }, 404);
    if (method === "GET") return json(message);

    messages = messages.filter((other) => other.id !== id);
    if (method === "DELETE") return new Response(null, { status: 204 });
    return json(
      {
        id: "0d2f8f5e-8d4b-4a56-8c55-0b1f3d2e7a90",
        type: "interviewScheduled",
        occurredAt: message.receivedAt,
        terms: null,
        detailsReviewed: false,
        appointmentAt: null,
        dueDate: null,
        responseDeadline: null,
        notes: "",
        attachments: [],
        createdAt: message.receivedAt,
        updatedAt: message.receivedAt,
      },
      201,
    );
  }

  function handle(path: string, init?: RequestInit) {
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, body });

    const failure = failures.get(`${method} ${path}`);
    if (failure) return json(failure.error ? { error: failure.error } : null, failure.status);

    if (path.startsWith("/mail/messages") || path === "/mail/sync") {
      return handleMessages(method, path);
    }
    if (method === "GET") return json(account);
    if (method === "PUT") {
      const { password: _password, ...input } = body as MailAccountInput;
      account = {
        ...input,
        accessUpdatedAt: new Date().toISOString(),
        lastSyncedAt: null,
        syncError: null,
      };
      return json(account);
    }
    account = null;
    return new Response(null, { status: 204 });
  }

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace(import.meta.env.VITE_API_URL, "");
      return path.startsWith("/mail/") ? handle(path, init) : otherFetch(url, init);
    }),
  );

  return {
    requestsWith: (method: string) => requests.filter((request) => request.method === method),
    failWith: (request: string, status: number, error?: string) =>
      failures.set(request, { status, error }),
    recover: () => failures.clear(),
    prepareNewMail: (message: MailMessage) => void incoming.push(message),
    receiveMail: (message: MailMessage) => {
      messages = [message, ...messages];
    },
  };
}
