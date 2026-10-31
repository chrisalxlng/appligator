const clientId = "appligator";

export const maxFileSize = 10_000_000;

export class StashError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Stash request failed with status ${status}`);
    this.status = status;
  }
}

export type StashClient = ReturnType<typeof createStashClient>;

export function createStashClient(getToken: () => Promise<string>) {
  async function send(fileId: string, init: RequestInit = {}) {
    const response = await fetch(
      `${import.meta.env.VITE_STASH_URL}/v1/clients/${clientId}/files/${fileId}`,
      { ...init, headers: { authorization: `Bearer ${await getToken()}` } },
    );
    if (!response.ok) throw new StashError(response.status);
    return response;
  }

  return {
    async upload(fileId: string, file: File) {
      const body = new FormData();
      body.append("file", file);
      await send(fileId, { method: "POST", body });
    },
    async download(fileId: string) {
      return (await send(fileId)).blob();
    },
    async remove(fileId: string) {
      await send(fileId, { method: "DELETE" });
    },
  };
}
