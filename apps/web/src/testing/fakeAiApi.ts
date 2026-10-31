import type {
  AiModelCatalog,
  AiSettings,
  AiSettingsInput,
  JobExtraction,
  JobExtractionInput,
} from "@appligator/shared";
import { vi } from "vite-plus/test";

interface RecordedRequest {
  method: string;
  path: string;
  body?: AiSettingsInput | JobExtractionInput;
  signal?: AbortSignal | null;
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

export const jobExtractionFixture: JobExtraction = {
  summary: "<p>Initech is looking for a frontend developer.</p>",
  company: "Initech GmbH",
  position: "Frontend Developer",
  companyType: null,
  employeeCount: null,
  salary: { currency: "EUR", period: "year", min: 60_000, max: 70_000 },
  bonuses: [],
  benefits: ["Job bike"],
  employmentType: "fullTime",
  workModel: "remote",
  homeOfficePercentage: null,
  workingHours: { hours: 40, period: "week" },
  locations: ["Munich"],
  vacationDays: null,
  startDate: null,
  contractTerm: null,
  probationMonths: null,
  noticePeriod: null,
  notes: "",
  applicationDeadline: null,
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function createFakeAiApi(initialSettings: AiSettings | null = null) {
  let settings = initialSettings;
  const requests: RecordedRequest[] = [];
  const failures = new Map<string, { status: number; error?: string }>();
  const holds = new Map<string, Promise<void>>();
  const otherFetch = globalThis.fetch;

  async function handle(path: string, init?: RequestInit): Promise<Response> {
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, body, signal: init?.signal });
    await holds.get(`${method} ${path}`);

    const failure = failures.get(`${method} ${path}`);
    if (failure) return json(failure.error ? { error: failure.error } : null, failure.status);

    if (path === "/ai/models") return json(aiModelsFixture);
    if (path === "/ai/job-extraction") return json(jobExtractionFixture);
    if (path === "/ai/settings/verification") return new Response(null, { status: 204 });
    if (method === "GET") return json(settings);
    if (method === "PUT") {
      const { apiKey, ...input } = body as AiSettingsInput;
      const changesAccess =
        !settings ||
        apiKey !== undefined ||
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
      const path = url.replace(import.meta.env.VITE_API_URL, "");
      return path.startsWith("/ai/") ? handle(path, init) : otherFetch(url, init);
    }),
  );

  return {
    requests,
    requestsWith: (method: string) => requests.filter((request) => request.method === method),
    failWith: (request: string, status: number, error?: string) =>
      failures.set(request, { status, error }),
    recover: () => failures.clear(),
    holdResponses: (request: string) => {
      let release = () => {};
      holds.set(request, new Promise<void>((resolve) => (release = resolve)));
      return release;
    },
  };
}
