import type { Job, JobInput } from "@appligator/shared";
import { vi } from "vite-plus/test";

interface RecordedRequest {
  method: string;
  path: string;
  body?: JobInput;
}

export const jobFixture: Job = {
  id: "8f9c1a52-7d1e-4b8a-9a43-1c2d3e4f5a6b",
  link: "https://www.stepstone.de/jobs/view/123",
  description: "<h2>Introduction</h2><p>We build <strong>software</strong>.</p>",
  summary: "<p>Lead position with a focus on Angular.</p>",
  company: "Randstad Digital Germany AG",
  position: "Lead Developer Frontend",
  salary: { currency: "EUR", period: "year", min: 65_000, max: 75_000 },
  locations: ["Düsseldorf", "Hamburg"],
  workModel: "hybrid",
  employmentType: "fullTime",
  applicationDeadline: "2026-12-31",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function jobWith(overrides: Partial<Job>): Job {
  return { ...jobFixture, ...overrides };
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function createFakeJobsApi(initialJobs: Job[] = []) {
  let jobs = [...initialJobs];
  const requests: RecordedRequest[] = [];
  const failures = new Map<string, number>();

  async function handle(url: string, init?: RequestInit): Promise<Response> {
    const method = init?.method ?? "GET";
    const path = url.replace(/^\/api/, "");
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as JobInput) : undefined;
    requests.push({ method, path, body });

    const failure = failures.get(method);
    if (failure) return new Response(null, { status: failure });

    const id = path.match(/^\/jobs\/(.+)$/)?.[1];
    const job = jobs.find((current) => current.id === id);
    const now = new Date().toISOString();

    if (path === "/jobs" && method === "GET") {
      return json(
        jobs.map(({ id, company, position, createdAt }) => ({ id, company, position, createdAt })),
      );
    }
    if (path === "/jobs" && method === "POST") {
      const created = { ...body!, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      jobs = [created, ...jobs];
      return json(created, 201);
    }
    if (!job) return json({ error: "Not Found" }, 404);
    if (method === "GET") return json(job);
    if (method === "PUT") {
      const updated = { ...job, ...body!, updatedAt: now };
      jobs = jobs.map((current) => (current.id === id ? updated : current));
      return json(updated);
    }
    jobs = jobs.filter((current) => current.id !== id);
    return new Response(null, { status: 204 });
  }

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => handle(url, init)),
  );

  return {
    requests,
    requestsWith: (method: string) => requests.filter((request) => request.method === method),
    failWith: (method: string, status: number) => failures.set(method, status),
    recover: () => failures.clear(),
  };
}
