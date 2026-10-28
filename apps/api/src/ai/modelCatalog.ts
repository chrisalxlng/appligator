import { aiProviders, type AiModelCatalog } from "@appligator/shared";
import { z } from "zod";

const catalogUrl = "https://models.dev/api.json";
const maxAgeMs = 24 * 60 * 60 * 1000;

const modelsDevSchema = z.record(
  z.string(),
  z.object({
    models: z.record(
      z.string(),
      z.object({
        id: z.string(),
        structured_output: z.boolean().optional(),
        status: z.string().optional(),
        release_date: z.string().optional(),
        modalities: z.object({ input: z.array(z.string()), output: z.array(z.string()) }),
      }),
    ),
  }),
);

type ModelsDev = z.infer<typeof modelsDevSchema>;
type ModelsDevModel = ModelsDev[string]["models"][string];

function isSuitable({ structured_output, status, modalities }: ModelsDevModel) {
  return (
    structured_output === true &&
    status !== "deprecated" &&
    modalities.input.includes("text") &&
    modalities.output.length === 1 &&
    modalities.output[0] === "text"
  );
}

function newestFirst(a: ModelsDevModel, b: ModelsDevModel) {
  return (b.release_date ?? "").localeCompare(a.release_date ?? "");
}

function toCatalog(modelsDev: ModelsDev): AiModelCatalog {
  return Object.fromEntries(
    aiProviders.map((provider) => [
      provider,
      Object.values(modelsDev[provider]?.models ?? {})
        .filter(isSuitable)
        .sort(newestFirst)
        .map((model) => model.id),
    ]),
  ) as AiModelCatalog;
}

export type ModelCatalog = ReturnType<typeof createModelCatalog>;

export function createModelCatalog({ fetch = globalThis.fetch, now = Date.now } = {}) {
  let cached: { catalog: AiModelCatalog; fetchedAt: number } | undefined;
  let pending: Promise<AiModelCatalog> | undefined;

  async function load() {
    const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Model catalog request failed with ${response.status}`);
    const catalog = toCatalog(modelsDevSchema.parse(await response.json()));
    cached = { catalog, fetchedAt: now() };
    return catalog;
  }

  return {
    async get() {
      if (cached && now() - cached.fetchedAt < maxAgeMs) return cached.catalog;

      pending ??= load().finally(() => (pending = undefined));
      try {
        return await pending;
      } catch (error) {
        if (cached) return cached.catalog;
        throw error;
      }
    },
  };
}
