export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.code = code;
  }
}

async function errorCode(response: Response) {
  try {
    const body: unknown = await response.json();
    const error = typeof body === "object" && body !== null && "error" in body && body.error;
    return typeof error === "string" ? error : undefined;
  } catch {
    return undefined;
  }
}

interface Schema<T> {
  parse: (data: unknown) => T;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(getToken: () => Promise<string>) {
  async function send(path: string, { method = "GET", body, signal }: RequestOptions) {
    const headers = new Headers({ authorization: `Bearer ${await getToken()}` });
    if (body !== undefined) headers.set("content-type", "application/json");

    const response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    if (!response.ok) throw new ApiError(response.status, await errorCode(response));
    return response;
  }

  return {
    async request<T>(path: string, schema: Schema<T>, options: RequestOptions = {}) {
      const response = await send(path, options);
      return schema.parse(await response.json());
    },
    async requestWithoutContent(path: string, options: RequestOptions) {
      await send(path, options);
    },
  };
}
