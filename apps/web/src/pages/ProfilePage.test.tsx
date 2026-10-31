import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { afterEach, beforeEach, expect, test } from "vite-plus/test";
import { aiSettingsFixture, createFakeAiApi } from "../testing/fakeAiApi.ts";
import { createFakeApi } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

beforeEach(() => {
  createFakeApi();
});

afterEach(async () => {
  await i18n.changeLanguage("en");
});

function aiSection() {
  return screen.findByRole("region", { name: "AI features" });
}

async function choose(container: HTMLElement, field: string, option: string) {
  await userEvent.click(within(container).getByRole("combobox", { name: field }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

async function openAddDrawer() {
  await userEvent.click(await screen.findByRole("button", { name: "Add AI access" }));
  return screen.findByRole("dialog", { name: "Add AI access" });
}

async function openEditDrawer() {
  await userEvent.click(await screen.findByRole("button", { name: /^OpenAI/ }));
  return screen.findByRole("dialog", { name: "Edit AI access" });
}

test("offers to add an AI access when none is configured", async () => {
  createFakeAiApi();
  renderApp("/profile");

  const section = await aiSection();

  expect(section).toHaveTextContent("Connect your own API key");
  expect(await within(section).findByRole("button", { name: "Add AI access" })).toBeVisible();
  expect(within(section).queryByRole("button", { name: /German|English/ })).toBeNull();
});

test("shows the configured AI access and language", async () => {
  createFakeAiApi(aiSettingsFixture);
  renderApp("/profile");

  const section = await aiSection();

  expect(await within(section).findByRole("button", { name: /^OpenAI/ })).toHaveTextContent(
    "OpenAIgpt-6-astraUpdated 1 month ago",
  );
  expect(within(section).getByRole("button", { name: /^German/ })).toBeVisible();
  expect(within(section).queryByRole("button", { name: "Add AI access" })).toBeNull();
});

test("adds an AI access with the UI language", async () => {
  const api = createFakeAiApi();
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await choose(drawer, "Provider", "Anthropic");
  await choose(drawer, "Model", "claude-sonnet-5-5");
  await userEvent.type(within(drawer).getByLabelText("Key"), "sk-ant-secret");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
  expect(api.requestsWith("PUT")[0]!.body).toEqual({
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    apiKey: "sk-ant-secret",
    language: "en",
  });
  expect(screen.getByText("AI access added")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /^Anthropic/ })).toHaveTextContent(
    "Anthropicclaude-sonnet-5-5Updated now",
  );
});

test("validates the AI access before saving", async () => {
  const api = createFakeAiApi();
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(within(drawer).getByText("Please select a provider.")).toBeVisible();
  expect(within(drawer).getByText("Please select a model.")).toBeVisible();
  expect(within(drawer).getByText("Please enter the key.")).toBeVisible();
  expect(api.requestsWith("PUT")).toHaveLength(0);
});

test("offers only the models of the selected provider and resets the model on change", async () => {
  createFakeAiApi();
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await choose(drawer, "Provider", "OpenAI");
  await choose(drawer, "Model", "gpt-6-sol");
  await choose(drawer, "Provider", "Google");
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Model" }));

  expect(within(drawer).getByRole("combobox", { name: "Model" })).toHaveTextContent(
    "Please select",
  );
  const options = await screen.findAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual(["gemini-4-argon"]);
});

test("shows why the provider rejected the AI access", async () => {
  const api = createFakeAiApi();
  api.failWith("PUT /ai/settings", 422, "accessRejected");
  renderApp("/profile");

  const drawer = await openAddDrawer();
  await choose(drawer, "Provider", "OpenAI");
  await choose(drawer, "Model", "gpt-6-sol");
  await userEvent.type(within(drawer).getByLabelText("Key"), "sk-invalid");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(await within(drawer).findByRole("alert")).toHaveTextContent(
    "The provider rejected the key or the model. Please check your input.",
  );
});

test("asks for the key again when the stored one is no longer usable", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  api.failWith("PUT /ai/settings", 422, "apiKeyRequired");
  renderApp("/profile");

  const drawer = await openEditDrawer();
  await choose(drawer, "Model", "gpt-6-sol");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  expect(await within(drawer).findByRole("alert")).toHaveTextContent("Please enter the key.");
});

test("edits the model while keeping the stored key", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  renderApp("/profile");

  const drawer = await openEditDrawer();
  expect(within(drawer).getByLabelText("Key")).toHaveValue("");
  await choose(drawer, "Model", "gpt-6-sol");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
  expect(api.requestsWith("PUT")[0]!.body).toEqual({
    provider: "openai",
    model: "gpt-6-sol",
    language: "de",
  });
  expect(screen.getByText("AI access updated")).toBeInTheDocument();
});

test("requires a new key when changing the provider", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  renderApp("/profile");

  const drawer = await openEditDrawer();
  await choose(drawer, "Provider", "Mistral");
  await choose(drawer, "Model", "mistral-large-4");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  expect(within(drawer).getByText("Please enter the key for the new provider.")).toBeVisible();
  expect(api.requestsWith("PUT")).toHaveLength(0);
});

test("changes the AI language", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: /^German/ }));
  const drawer = await screen.findByRole("dialog", { name: "Edit AI language" });
  await choose(drawer, "Language", "English");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  await waitFor(() => expect(drawer).not.toBeInTheDocument());
  expect(api.requestsWith("PUT")[0]!.body).toEqual({
    provider: "openai",
    model: "gpt-6-astra",
    language: "en",
  });
  expect(screen.getByText("AI language updated")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /^English/ })).toBeVisible();
});

test("checks the connection of the stored AI access", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  const release = api.holdResponses("POST /ai/settings/verification");
  renderApp("/profile");

  const check = await screen.findByRole("button", { name: "Check connection" });
  await userEvent.click(check);

  expect(check).toHaveAttribute("aria-busy", "true");
  release();
  expect(await screen.findByText("Connection works")).toBeInTheDocument();
  expect(api.requestsWith("POST")).toEqual([
    expect.objectContaining({ path: "/ai/settings/verification" }),
  ]);
  expect(screen.queryByRole("alert")).toBeNull();
});

test.each([
  ["accessRejected", "The provider rejected the key or the model. Please update the AI access."],
  ["apiKeyRequired", "The stored key can no longer be used. Please enter it again."],
  [undefined, "The connection could not be checked. Please try again."],
])("shows why checking the connection failed with %s", async (error, message) => {
  const api = createFakeAiApi(aiSettingsFixture);
  api.failWith("POST /ai/settings/verification", error ? 422 : 500, error);
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: "Check connection" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(message);
});

test("clears a failed connection check once the AI access is updated", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  api.failWith("POST /ai/settings/verification", 422, "accessRejected");
  renderApp("/profile");
  await userEvent.click(await screen.findByRole("button", { name: "Check connection" }));
  await screen.findByRole("alert");

  const drawer = await openEditDrawer();
  await userEvent.type(within(drawer).getByLabelText("Key"), "sk-new");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  expect(await screen.findByText("AI access updated")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("deletes the AI access after confirmation", async () => {
  createFakeAiApi(aiSettingsFixture);
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: "Delete AI access" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Delete AI access?" });
  expect(dialog).toHaveTextContent("Your OpenAI key will be deleted permanently.");
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByText("AI access deleted")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Add AI access" })).toBeVisible();
  expect(screen.queryByRole("button", { name: /^German/ })).toBeNull();
});

test("offers to retry when the AI settings cannot be loaded", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  api.failWith("GET /ai/settings", 500);
  renderApp("/profile");

  const section = await aiSection();
  const loadError = await within(section).findByRole("alert");
  expect(
    within(loadError).getByRole("heading", { name: "The AI settings could not be loaded" }),
  ).toBeVisible();
  expect(loadError).toHaveTextContent("Check your connection and try again.");

  api.recover();
  await userEvent.click(within(section).getByRole("button", { name: "Try again" }));

  expect(await within(section).findByRole("button", { name: /^OpenAI/ })).toBeVisible();
});

test("names the AI languages in the UI language", async () => {
  await i18n.changeLanguage("de");
  createFakeAiApi(aiSettingsFixture);
  renderApp("/profile");

  await userEvent.click(await screen.findByRole("button", { name: /^Deutsch/ }));
  const drawer = await screen.findByRole("dialog", { name: "KI-Sprache bearbeiten" });
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Sprache" }));

  const options = await screen.findAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual(["Deutsch", "Englisch"]);
});

test("shows the AI section in German", async () => {
  await i18n.changeLanguage("de");
  createFakeAiApi(aiSettingsFixture);
  renderApp("/profile");

  const section = await screen.findByRole("region", { name: "KI-Funktionen" });

  expect(await within(section).findByRole("button", { name: /^OpenAI/ })).toHaveTextContent(
    "Vor 1 Monat aktualisiert",
  );
});
