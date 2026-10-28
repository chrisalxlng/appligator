export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API request failed with status ${status}`);
    this.status = status;
  }
}

interface Schema<T> {
  parse: (data: unknown) => T;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(getToken: () => Promise<string>) {
  async function send(path: string, { method = "GET", body }: RequestOptions) {
    const headers = new Headers({ authorization: `Bearer ${await getToken()}` });
    if (body !== undefined) headers.set("content-type", "application/json");

    const response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new ApiError(response.status);
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
