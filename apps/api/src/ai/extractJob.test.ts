import type { AiLanguage } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { respondingModel } from "../testLanguageModel.ts";
import { extractJob } from "./extractJob.ts";

const modelOutput = {
  company: " Initech GmbH ",
  position: "Frontend Developer",
  summary: "Initech builds software.\n\nThe team works <remotely> & in Munich.",
  salary: { currency: "EUR", period: "year", min: 75_000.4, max: 60_000 },
  locations: ["München", " ", "München", "Hamburg"],
  workModel: "hybrid",
  employmentType: "fullTime",
  applicationDeadline: "2026-12-31",
};

const today = new Date("2026-10-28T12:00:00Z");

async function extract(
  output: object,
  {
    language = "de",
    description = "<p>Ad</p>",
  }: { language?: AiLanguage; description?: string } = {},
) {
  const model = respondingModel(JSON.stringify(output));
  const extraction = await extractJob({ model, description, language, today });
  return { extraction, call: model.doGenerateCalls[0]! };
}

test("returns the extracted job information cleaned up", async () => {
  const { extraction } = await extract(modelOutput);

  expect(extraction).toEqual({
    company: "Initech GmbH",
    position: "Frontend Developer",
    summary:
      "<p>Initech builds software.</p><p>The team works &lt;remotely&gt; &amp; in Munich.</p>",
    salary: { currency: "EUR", period: "year", min: 60_000, max: 75_000 },
    locations: ["München", "Hamburg"],
    workModel: "hybrid",
    employmentType: "fullTime",
    applicationDeadline: "2026-12-31",
  });
});

test("returns empty values for missing information", async () => {
  const { extraction } = await extract({
    ...modelOutput,
    company: " ",
    position: null,
    summary: "",
    salary: null,
    locations: [],
    workModel: null,
    employmentType: null,
    applicationDeadline: "end of November",
  });

  expect(extraction).toEqual({
    company: null,
    position: null,
    summary: "",
    salary: null,
    locations: [],
    workModel: null,
    employmentType: null,
    applicationDeadline: null,
  });
});

test("drops an implausible salary", async () => {
  const { extraction } = await extract({
    ...modelOutput,
    salary: { currency: "EUR", period: "year", min: -1, max: 1 },
  });

  expect(extraction.salary).toBeNull();
});

test("sends the ad as plain text and asks for the configured language", async () => {
  const { call } = await extract(modelOutput, {
    language: "en",
    description: "<h2>Über uns</h2><p>Wir bauen <strong>Software</strong>.</p>",
  });

  const [system, user] = call.prompt;
  expect(system).toMatchObject({ role: "system" });
  expect(system!.content).toContain("Write the summary and the locations in English");
  expect(system!.content).toContain("Today is 2026-10-28.");
  expect(user).toMatchObject({
    role: "user",
    content: [{ type: "text", text: "Über uns\nWir bauen Software." }],
  });
  expect(call.responseFormat).toMatchObject({ type: "json" });
});
