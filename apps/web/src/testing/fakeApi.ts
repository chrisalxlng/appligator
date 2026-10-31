import {
  applicationStatuses,
  jobStatuses,
  type Application,
  type ApplicationCreate,
  type ApplicationInput,
  type Job,
  type PinInput,
  type JobInput,
} from "@appligator/shared";
import { vi } from "vite-plus/test";

interface RecordedRequest {
  method: string;
  path: string;
  body?: JobInput & ApplicationInput & ApplicationCreate & PinInput;
}

export const jobFixture: Job = {
  id: "8f9c1a52-7d1e-4b8a-9a43-1c2d3e4f5a6b",
  link: "https://www.stepstone.de/jobs/view/123",
  description: "<h2>Introduction</h2><p>We build <strong>software</strong>.</p>",
  summary: "<p>Lead position with a focus on Angular.</p>",
  company: "Randstad Digital Germany AG",
  position: "Lead Developer Frontend",
  companyType: "corporation",
  employeeCount: 60_000,
  salary: { currency: "EUR", period: "year", min: 65_000, max: 75_000 },
  bonuses: ["13. Monatsgehalt", "Erfolgsbeteiligung"],
  benefits: ["50 € Brutto-Netto-Auszahlung"],
  employmentType: "fullTime",
  workModel: "hybrid",
  homeOfficePercentage: 80,
  workingHours: { hours: 38.5, period: "week" },
  locations: ["Düsseldorf", "Hamburg"],
  commuteDistance: 17,
  commuteDuration: 25,
  vacationDays: 30,
  startDate: "2027-02-01",
  contractTerm: { kind: "permanent" },
  probationMonths: 3,
  noticePeriod: { amount: 4, unit: "weeks", endOf: "month" },
  notes: "<p>Training budget of €2,000 per year</p>",
  applicationDeadline: "2026-12-31",
  status: "open",
  isNew: false,
  pinned: false,
  application: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function jobWith(overrides: Partial<Job>): Job {
  return { ...jobFixture, ...overrides };
}

export function applicationFor(job: Job, overrides: Partial<Application> = {}): Application {
  const {
    link: _link,
    description: _description,
    summary: _summary,
    applicationDeadline: _applicationDeadline,
    status: _status,
    isNew: _isNew,
    application: _application,
    id,
    position,
    ...details
  } = job;
  return {
    ...details,
    position,
    id: crypto.randomUUID(),
    status: "applied",
    appliedAt: "2026-10-30",
    job: { id, position },
    ...overrides,
  };
}

export const fakePageSize = 30;

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function pinnedFirst<Item extends { pinned: boolean }>(items: Item[]) {
  return items.toSorted((a, b) => Number(b.pinned) - Number(a.pinned));
}

function page<Item extends { id: string }>(items: Item[], cursor: string | null, limit: number) {
  const start = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0;
  const pageItems = items.slice(start, start + limit);
  const hasMore = start + limit < items.length;
  return { pageItems, nextCursor: hasMore ? pageItems.at(-1)!.id : null };
}

function countByStatus<Status extends string>(
  items: { status: Status }[],
  statuses: readonly Status[],
) {
  return statuses
    .map((status) => ({ status, count: items.filter((item) => item.status === status).length }))
    .filter(({ count }) => count > 0);
}

export function createFakeApi(initialJobs: Job[] = [], initialApplications: Application[] = []) {
  let jobs = [...initialJobs];
  let applications = [...initialApplications];
  const requests: RecordedRequest[] = [];
  const failures = new Map<string, number>();
  const holds = new Map<string, Promise<void>>();

  function withStatus(job: Job): Job {
    const application = applications.find((current) => current.job.id === job.id);
    return {
      ...job,
      status: application ? "applied" : "open",
      application: application
        ? { id: application.id, position: application.position, status: application.status }
        : null,
    };
  }

  function listJobs(searchParams: URLSearchParams) {
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase() ?? "";
    const matches = pinnedFirst(jobs)
      .map(withStatus)
      .filter((job) => !status || job.status === status)
      .filter((job) => `${job.company} ${job.position}`.toLowerCase().includes(search));
    const limit = Number(searchParams.get("limit") ?? fakePageSize);
    const { pageItems, nextCursor } = page(matches, searchParams.get("cursor"), limit);
    return {
      items: pageItems.map(({ id, company, position, status, isNew, pinned, createdAt }) => ({
        id,
        company,
        position,
        status,
        isNew,
        pinned,
        createdAt,
      })),
      nextCursor,
    };
  }

  function listApplications(searchParams: URLSearchParams) {
    const status = searchParams.get("status");
    const matches = pinnedFirst(applications).filter(
      (application) => !status || application.status === status,
    );
    const { pageItems, nextCursor } = page(matches, searchParams.get("cursor"), fakePageSize);
    return {
      items: pageItems.map(({ id, company, position, status, pinned, createdAt }) => ({
        id,
        company,
        position,
        status,
        pinned,
        createdAt,
      })),
      nextCursor,
    };
  }

  function handleJobs(
    method: string,
    pathname: string,
    searchParams: URLSearchParams,
    body: RecordedRequest["body"],
  ) {
    const now = new Date().toISOString();
    if (pathname === "/jobs" && method === "GET") return json(listJobs(searchParams));
    if (pathname === "/jobs/status-counts") {
      return json(countByStatus(jobs.map(withStatus), jobStatuses));
    }
    if (pathname === "/jobs" && method === "POST") {
      const created: Job = {
        ...body!,
        id: crypto.randomUUID(),
        status: "open",
        isNew: false,
        pinned: false,
        application: null,
        createdAt: now,
        updatedAt: now,
      };
      jobs = [created, ...jobs];
      return json(created, 201);
    }

    const [, id, action] = pathname.match(/^\/jobs\/([^/]+)(?:\/(.+))?$/) ?? [];
    const job = jobs.find((current) => current.id === id);
    if (!job) return json({ error: "Not Found" }, 404);
    if (method === "GET") return json(withStatus(job));
    if (action) {
      const change = action === "view" ? { isNew: false } : { pinned: body!.pinned };
      jobs = jobs.map((current) => (current.id === id ? { ...current, ...change } : current));
      return new Response(null, { status: 204 });
    }
    if (withStatus(job).application) return json({ error: "applied" }, 409);
    if (method === "PUT") {
      const updated = { ...job, ...body!, updatedAt: now };
      jobs = jobs.map((current) => (current.id === id ? updated : current));
      return json(withStatus(updated));
    }
    jobs = jobs.filter((current) => current.id !== id);
    return new Response(null, { status: 204 });
  }

  function handleApplications(
    method: string,
    pathname: string,
    searchParams: URLSearchParams,
    body: RecordedRequest["body"],
  ) {
    const now = new Date().toISOString();
    if (pathname === "/applications" && method === "GET") {
      return json(listApplications(searchParams));
    }
    if (pathname === "/applications/status-counts") {
      return json(countByStatus(applications, applicationStatuses));
    }
    if (pathname === "/applications" && method === "POST") {
      const job = jobs.find((current) => current.id === body!.jobId);
      if (!job) return json({ error: "Not Found" }, 404);
      const created = applicationFor(job, {
        appliedAt: body!.appliedAt,
        createdAt: now,
        updatedAt: now,
      });
      applications = [created, ...applications];
      return json(created, 201);
    }

    const [, id, action] = pathname.match(/^\/applications\/([^/]+)(?:\/(.+))?$/) ?? [];
    const application = applications.find((current) => current.id === id);
    if (!application) return json({ error: "Not Found" }, 404);
    if (method === "GET") return json(application);
    if (action === "pin") {
      applications = applications.map((current) =>
        current.id === id ? { ...current, pinned: body!.pinned } : current,
      );
      return new Response(null, { status: 204 });
    }
    if (method === "PUT") {
      const updated = { ...application, ...body!, updatedAt: now };
      applications = applications.map((current) => (current.id === id ? updated : current));
      return json(updated);
    }
    applications = applications.filter((current) => current.id !== id);
    return new Response(null, { status: 204 });
  }

  async function handle(url: string, init?: RequestInit): Promise<Response> {
    const method = init?.method ?? "GET";
    const path = url.replace(import.meta.env.VITE_API_URL, "");
    const { pathname, searchParams } = new URL(path, location.origin);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, body });
    await holds.get(method);

    const failure = failures.get(method);
    if (failure) return new Response(null, { status: failure });

    return pathname.startsWith("/applications")
      ? handleApplications(method, pathname, searchParams, body)
      : handleJobs(method, pathname, searchParams, body);
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
    holdResponses: (method: string) => {
      let release = () => {};
      holds.set(method, new Promise<void>((resolve) => (release = resolve)));
      return release;
    },
  };
}
