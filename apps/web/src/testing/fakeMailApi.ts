import {
  mailMessageStatuses,
  type MailAccount,
  type MailAccountInput,
  type MailAssignmentInput,
  type MailMessage,
} from "@appligator/shared";
import { vi } from "vite-plus/test";

export const mailAccountFixture: MailAccount = {
  host: "imap.example.com",
  username: "bewerbung@example.com",
  accessUpdatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  lastSyncedAt: null,
  syncError: null,
  aiAssignment: false,
};

export const mailMessageFixture: MailMessage = {
  id: "5b1f6a44-2f0c-4c55-9a0d-3f3a3f8c7e11",
  folder: "inbox",
  subject: "Einladung zum Gespräch",
  from: "jobs@acme.example",
  to: "bewerbung@example.com",
  sentAt: "2026-10-30T09:14:00.000Z",
  status: "pending",
  attachmentCount: 0,
  hasSuggestion: false,
  createdAt: "2026-10-30T09:20:00.000Z",
  body: "<p>Wir laden Sie ein.</p>",
  application: null,
  suggestion: null,
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

  function statusCounts() {
    return mailMessageStatuses
      .map((status) => ({
        status,
        count: messages.filter((message) => message.status === status).length,
      }))
      .filter(({ count }) => count > 0);
  }

  function handleMessages(method: string, path: string, assignment?: MailAssignmentInput) {
    const { pathname, searchParams } = new URL(path, location.origin);
    if (pathname === "/mail/sync") {
      const newMails = incoming.length;
      messages = [...incoming, ...messages];
      incoming = [];
      return json({ newMails });
    }
    if (pathname === "/mail/messages/status-counts") return json(statusCounts());
    if (pathname === "/mail/messages") {
      const status = searchParams.get("status");
      return json({
        items: messages
          .filter((message) => !status || message.status === status)
          .map(({ body: _body, application: _application, ...message }) => message),
        nextCursor: null,
      });
    }

    const id = pathname.split("/")[3]!;
    const message = messages.find((other) => other.id === id);
    if (!message) return json({ error: "Not Found" }, 404);
    if (method === "GET") return json(message);

    const update = (changes: Partial<MailMessage>) => {
      messages = messages.map((other) => (other.id === id ? { ...other, ...changes } : other));
    };
    if (method === "DELETE" && pathname.endsWith("/assignment")) {
      update({ status: "pending", application: null });
      return new Response(null, { status: 204 });
    }
    if (method === "DELETE") {
      update({ status: "dismissed" });
      return new Response(null, { status: 204 });
    }
    update({
      status: "assigned",
      application: { id: assignment!.applicationId, position: "Assigned application" },
      suggestion: null,
      hasSuggestion: false,
    });
    return json(
      {
        id: "0d2f8f5e-8d4b-4a56-8c55-0b1f3d2e7a90",
        type: "interviewScheduled",
        occurredAt: message.createdAt,
        terms: null,
        detailsReviewed: false,
        automatic: false,
        appointmentAt: null,
        dueDate: null,
        responseDeadline: null,
        notes: "",
        attachments: [],
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
      },
      201,
    );
  }

  function handleAiAssignment(enabled: boolean) {
    account = { ...account!, aiAssignment: enabled };
    return json(account);
  }

  function handle(path: string, init?: RequestInit) {
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, body });

    const failure = failures.get(`${method} ${path}`);
    if (failure) return json(failure.error ? { error: failure.error } : null, failure.status);

    if (path === "/mail/account/ai-assignment") return handleAiAssignment(body.enabled);
    if (path.startsWith("/mail/messages") || path === "/mail/sync") {
      return handleMessages(method, path, body);
    }
    if (method === "GET") return json(account);
    if (method === "PUT") {
      const { password: _password, ...input } = body as MailAccountInput;
      account = {
        ...input,
        accessUpdatedAt: new Date().toISOString(),
        lastSyncedAt: null,
        syncError: null,
        aiAssignment: false,
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
