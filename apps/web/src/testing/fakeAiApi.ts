import type { AiModelCatalog, AiSettings, AiSettingsInput } from "@appligator/shared";
import { vi } from "vite-plus/test";

interface RecordedRequest {
  method: string;
  path: string;
  body?: AiSettingsInput;
}

export const aiSettingsFixture: AiSettings = {
  provider: "openai",
  model: "gpt-6-astra",
  language: "de",
  accessUpdatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
};

export const aiModelsFixture: AiModelCatalog = {
  openai: ["gpt-6-sol", "gpt-6-astra"],
  anthropic: ["claude-sonnet-5-5", "claude-haiku-5-5"],
  google: ["gemini-4-argon"],
  mistral: ["mistral-large-4"],
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function createFakeAiApi(initialSettings: AiSettings | null = null) {
  let settings = initialSettings;
  const requests: RecordedRequest[] = [];
  const failures = new Map<string, { status: number; error?: string }>();
  const otherFetch = globalThis.fetch;

  async function handle(path: string, init?: RequestInit): Promise<Response> {
    const method = init?.method ?? "GET";
    const body =
      typeof init?.body === "string" ? (JSON.parse(init.body) as AiSettingsInput) : undefined;
    requests.push({ method, path, body });

    const failure = failures.get(`${method} ${path}`);
    if (failure) return json(failure.error ? { error: failure.error } : null, failure.status);

    if (path === "/ai/models") return json(aiModelsFixture);
    if (method === "GET") return json(settings);
    if (method === "PUT") {
      const { apiKey: _apiKey, ...input } = body!;
      const changesAccess =
        !settings ||
        body!.apiKey !== undefined ||
        input.provider !== settings.provider ||
        input.model !== settings.model;
      const accessUpdatedAt = changesAccess ? new Date().toISOString() : settings!.accessUpdatedAt;
      settings = { ...input, accessUpdatedAt };
      return json(settings);
    }
    if (!settings) return json({ error: "Not Found" }, 404);
    settings = null;
    return new Response(null, { status: 204 });
  }

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const path = url.replace(/^\/api/, "");
      return path.startsWith("/ai/") ? handle(path, init) : otherFetch(url, init);
    }),
  );

  return {
    requests,
    requestsWith: (method: string) => requests.filter((request) => request.method === method),
    failWith: (request: string, status: number, error?: string) =>
      failures.set(request, { status, error }),
    recover: () => failures.clear(),
  };
}
