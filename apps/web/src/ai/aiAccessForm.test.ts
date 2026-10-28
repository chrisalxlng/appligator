import type { AiSettings } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { toAiAccessFormValues, validateAiAccessForm } from "./aiAccessForm.ts";

const settings: AiSettings = {
  provider: "openai",
  model: "gpt-6-astra",
  language: "en",
  accessUpdatedAt: "2026-10-01T12:00:00.000Z",
};

test("starts empty without settings and prefilled without the key for settings", () => {
  expect(toAiAccessFormValues()).toEqual({ provider: null, model: null, apiKey: "" });
  expect(toAiAccessFormValues(settings)).toEqual({
    provider: "openai",
    model: "gpt-6-astra",
    apiKey: "",
  });
});

test("requires provider, model and key for a new access", () => {
  expect(validateAiAccessForm(toAiAccessFormValues(), { language: "de" })).toEqual({
    errors: {
      provider: "providerRequired",
      model: "modelRequired",
      apiKey: "apiKeyRequired",
    },
  });
});

test("creates the input with the trimmed key and the given language", () => {
  const values = { provider: "anthropic" as const, model: "claude-sonnet-5-5", apiKey: " sk " };

  expect(validateAiAccessForm(values, { language: "de" })).toEqual({
    input: { provider: "anthropic", model: "claude-sonnet-5-5", apiKey: "sk", language: "de" },
  });
});

test("keeps the stored key and language when editing without a new key", () => {
  const values = { ...toAiAccessFormValues(settings), model: "gpt-6-sol" };

  expect(validateAiAccessForm(values, { settings, language: "de" })).toEqual({
    input: { provider: "openai", model: "gpt-6-sol", language: "en" },
  });
});

test("requires a new key when changing the provider", () => {
  const values = { provider: "google" as const, model: "gemini-4-argon", apiKey: "" };

  expect(validateAiAccessForm(values, { settings, language: "de" })).toEqual({
    errors: { apiKey: "apiKeyRequiredForProvider" },
  });
});
