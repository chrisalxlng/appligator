import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vite-plus/test";
import { aiSettingsFixture, createFakeAiApi } from "../testing/fakeAiApi.ts";
import { createFakeApi, jobWith } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const jobAd =
  "Initech GmbH is hiring a Frontend Developer (m/w/d) in Munich. " +
  "You build our React apps remotely and earn 60,000 to 70,000 EUR per year.";

beforeEach(() => {
  createFakeApi();
});

async function openAddDrawer() {
  renderApp("/jobs");
  await userEvent.click(await screen.findByRole("button", { name: "Add" }));
  return screen.findByRole("dialog", { name: "Add job" });
}

async function pasteDescription(drawer: HTMLElement, text = jobAd) {
  const description = within(drawer).getByRole("textbox", { name: "Description" });
  act(() => description.focus());
  await userEvent.paste(text);
}

function analysisStatus(drawer: HTMLElement) {
  return within(drawer).getByRole("status");
}

test("fills the empty fields after pasting a job ad", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  const drawer = await openAddDrawer();

  await pasteDescription(drawer);

  expect(await within(drawer).findByText("AI filled in 9 fields")).toBeVisible();
  expect(analysisStatus(drawer)).toHaveTextContent(
    "Summary, Company, Position, Salary, Benefits, Employment type, Work model, " +
      "Working hours, and Locations. Please check the information.",
  );
  expect(within(drawer).getByRole("textbox", { name: "Company" })).toHaveValue("Initech GmbH");
  expect(within(drawer).getByRole("textbox", { name: "Position" })).toHaveValue(
    "Frontend Developer",
  );
  expect(within(drawer).getByRole("textbox", { name: "Summary" })).toHaveTextContent(
    "Initech is looking for a frontend developer.",
  );
  expect(within(drawer).getByRole("combobox", { name: "Work model" })).toHaveTextContent("Remote");
  expect(within(drawer).getByRole("button", { name: "Munich" })).toBeVisible();
  expect(within(drawer).getByRole("button", { name: "Job bike" })).toBeVisible();
  expect(within(drawer).getByRole("textbox", { name: "Working hours" })).toHaveValue("40 hr");
  expect(within(drawer).getByRole("textbox", { name: "Description" })).toHaveTextContent(jobAd);
  expect(api.requestsWith("POST")[0]!.body).toEqual({ description: `<p>${jobAd}</p>` });
});

test("does not overwrite fields the user already filled in", async () => {
  createFakeAiApi(aiSettingsFixture);
  const drawer = await openAddDrawer();

  await userEvent.type(within(drawer).getByRole("textbox", { name: "Company" }), "Own name");
  await pasteDescription(drawer);

  expect(await within(drawer).findByText("AI filled in 8 fields")).toBeVisible();
  expect(within(drawer).getByRole("textbox", { name: "Company" })).toHaveValue("Own name");
});

test("tells the user when all fields were already filled in", async () => {
  createFakeApi([jobWith({ description: "" })]);
  createFakeAiApi(aiSettingsFixture);
  renderApp("/jobs");
  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const drawer = await screen.findByRole("dialog", { name: "Edit job" });

  await pasteDescription(drawer);

  expect(await within(drawer).findByText("AI did not fill in any fields")).toBeVisible();
  expect(within(drawer).getByRole("textbox", { name: "Company" })).toHaveValue(
    "Randstad Digital Germany AG",
  );
});

test("shows the analysis in progress and lets the user keep editing", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  const release = api.holdResponses("POST /ai/job-extraction");
  const drawer = await openAddDrawer();

  await pasteDescription(drawer);

  expect(await within(drawer).findByText("AI is analyzing the job ad …")).toBeVisible();
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Position" }), "Lead");

  release();
  expect(await within(drawer).findByText("AI filled in 8 fields")).toBeVisible();
  expect(within(drawer).getByRole("textbox", { name: "Position" })).toHaveValue("Lead");
});

test("cancels the previous analysis when pasting again", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  api.holdResponses("POST /ai/job-extraction");
  const drawer = await openAddDrawer();

  await pasteDescription(drawer);
  await pasteDescription(drawer, ` ${jobAd}`);

  const [first, second] = api.requestsWith("POST");
  expect(first!.signal?.aborted).toBe(true);
  expect(second!.signal?.aborted).toBe(false);
});

test("does not analyze without an AI access", async () => {
  const api = createFakeAiApi();
  const drawer = await openAddDrawer();
  await waitFor(() => expect(api.requestsWith("GET").length).toBeGreaterThan(0));

  await pasteDescription(drawer);

  expect(api.requestsWith("POST")).toHaveLength(0);
  expect(analysisStatus(drawer)).toBeEmptyDOMElement();
});

test("does not analyze short pasted text", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  const drawer = await openAddDrawer();

  await pasteDescription(drawer, "Munich");

  expect(api.requestsWith("POST")).toHaveLength(0);
});

test("shows why the analysis failed and retries it", async () => {
  const api = createFakeAiApi(aiSettingsFixture);
  api.failWith("POST /ai/job-extraction", 422, "accessRejected");
  const drawer = await openAddDrawer();

  await pasteDescription(drawer);

  expect(await within(drawer).findByText("AI could not analyze the job ad")).toBeVisible();
  expect(analysisStatus(drawer)).toHaveTextContent(
    "The provider rejected your AI access. Check it in your profile.",
  );

  api.recover();
  await userEvent.click(within(drawer).getByRole("button", { name: "Try again" }));

  expect(await within(drawer).findByText("AI filled in 9 fields")).toBeVisible();
});

test("dismisses the analysis result", async () => {
  createFakeAiApi(aiSettingsFixture);
  const drawer = await openAddDrawer();

  await pasteDescription(drawer);
  await userEvent.click(await within(drawer).findByRole("button", { name: "Dismiss" }));

  expect(analysisStatus(drawer)).toBeEmptyDOMElement();
});
