import { expect, test, vi } from "vite-plus/test";
import { createModelCatalog } from "./modelCatalog.ts";

const textOnly = { input: ["text"], output: ["text"] };

const modelsDev = {
  openai: {
    models: {
      "gpt-old": {
        id: "gpt-old",
        structured_output: true,
        release_date: "2024-01-01",
        modalities: textOnly,
      },
      "gpt-new": {
        id: "gpt-new",
        structured_output: true,
        release_date: "2026-01-01",
        modalities: textOnly,
      },
      "gpt-unstructured": {
        id: "gpt-unstructured",
        structured_output: false,
        modalities: textOnly,
      },
      "gpt-deprecated": {
        id: "gpt-deprecated",
        structured_output: true,
        status: "deprecated",
        modalities: textOnly,
      },
      "gpt-image": {
        id: "gpt-image",
        structured_output: true,
        modalities: { input: ["text"], output: ["text", "image"] },
      },
    },
  },
  anthropic: {
    models: {
      "claude-sonnet": { id: "claude-sonnet", structured_output: true, modalities: textOnly },
    },
  },
  "unsupported-provider": {
    models: { other: { id: "other", structured_output: true, modalities: textOnly } },
  },
};

const day = 24 * 60 * 60 * 1000;

function fakeFetch(...responses: (() => Response)[]) {
  return vi.fn(async () => (responses.length > 1 ? responses.shift()! : responses[0]!)());
}

const ok = () => Response.json(modelsDev);
const unavailable = () => new Response(null, { status: 503 });

test("lists the suitable models of the supported providers, newest first", async () => {
  const catalog = createModelCatalog({ fetch: fakeFetch(ok) });

  expect(await catalog.get()).toEqual({
    openai: ["gpt-new", "gpt-old"],
    anthropic: ["claude-sonnet"],
    google: [],
    mistral: [],
  });
});

test("caches the catalog for a day", async () => {
  let now = 0;
  const fetch = fakeFetch(ok);
  const catalog = createModelCatalog({ fetch, now: () => now });

  await catalog.get();
  now = day - 1;
  await catalog.get();
  expect(fetch).toHaveBeenCalledTimes(1);

  now = day;
  await catalog.get();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("falls back to the outdated catalog when refreshing fails", async () => {
  let now = 0;
  const catalog = createModelCatalog({ fetch: fakeFetch(ok, unavailable), now: () => now });

  const fresh = await catalog.get();
  now = day;

  expect(await catalog.get()).toEqual(fresh);
});

test("fails when the catalog was never loaded", async () => {
  const catalog = createModelCatalog({ fetch: fakeFetch(unavailable) });

  await expect(catalog.get()).rejects.toThrow("Model catalog request failed with 503");
});

test("skips malformed entries of the catalog", async () => {
  const catalog = createModelCatalog({
    fetch: fakeFetch(() =>
      Response.json({
        ...modelsDev,
        other: "malformed",
        anthropic: { models: { ...modelsDev.anthropic.models, broken: { id: 1 } } },
        google: "malformed",
      }),
    ),
  });

  expect(await catalog.get()).toMatchObject({ anthropic: ["claude-sonnet"], google: [] });
});
