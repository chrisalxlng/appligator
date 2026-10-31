import { activityTermsSchema } from "@appligator/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { activityWith, applicationFor, createFakeApi, jobFixture } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const application = applicationFor(jobFixture);
const jobTerms = activityTermsSchema.parse(jobFixture);
const submission = activityWith({
  occurredAt: "2026-10-17T08:00:00.000Z",
  terms: { ...jobTerms, vacationDays: 25 },
});
const offer = activityWith({
  type: "offerReceived",
  occurredAt: "2026-10-29T09:00:00.000Z",
  terms: {
    ...jobTerms,
    salary: { currency: "EUR", period: "year", min: 80_000, max: 80_000 },
    vacationDays: 30,
    probationMonths: 6,
  },
});

function renderAdoption(activities = [offer, submission]) {
  const api = createFakeApi([jobFixture], [application], { [application.id]: activities });
  renderApp(`/applications/${application.id}`);
  return api;
}

async function findLog() {
  return screen.findByRole("region", { name: "Activities" });
}

async function openAdoption() {
  const log = await findLog();
  await userEvent.click(await within(log).findByRole("button", { name: "Take over values" }));
  return screen.findByRole("dialog", { name: "Take over values" });
}

test("hints at the values of the latest terms that differ from the details", async () => {
  renderAdoption();
  const log = await findLog();

  expect(await within(log).findByText("2 values differ from the details")).toBeVisible();
  expect(within(log).getAllByRole("button", { name: "Take over values" })).toHaveLength(1);
});

test("lists the differing values with their current and new value", async () => {
  renderAdoption();

  const drawer = await openAdoption();

  const salary = within(drawer).getByRole("checkbox", { name: /^Salary/ });
  expect(salary).toBeChecked();
  expect(salary.closest("label")).toHaveTextContent("Salary€65,000 – €75,000 / year€80,000 / year");
  expect(
    within(drawer)
      .getByRole("checkbox", { name: /^Probation/ })
      .closest("label"),
  ).toHaveTextContent("Probation3 months6 months");
});

test("takes over the chosen values into the details", async () => {
  const api = renderAdoption();
  const drawer = await openAdoption();

  await userEvent.click(within(drawer).getByRole("checkbox", { name: /^Probation/ }));
  await userEvent.click(within(drawer).getByRole("button", { name: "Take over 1 value" }));

  expect(await screen.findByText("Values taken over")).toBeInTheDocument();
  expect(api.requestsWith("PUT")).toEqual([
    expect.objectContaining({
      path: `/applications/${application.id}`,
      body: expect.objectContaining({ salary: offer.terms!.salary, probationMonths: 3 }),
    }),
    expect.objectContaining({
      path: `/applications/${application.id}/activities/${offer.id}/details-review`,
    }),
  ]);
  const detail = await screen.findByRole("article");
  await waitFor(() => expect(detail).toHaveTextContent("Salary€80,000 / year"));
  expect(within(await findLog()).queryByText(/differ from the details/)).not.toBeInTheDocument();
});

test("ignores the differing values without changing the details", async () => {
  const api = renderAdoption();
  const drawer = await openAdoption();

  await userEvent.click(within(drawer).getByRole("button", { name: "Ignore" }));

  await waitFor(() =>
    expect(within(drawer).queryByRole("button", { name: "Ignore" })).not.toBeInTheDocument(),
  );
  expect(api.requestsWith("PUT")).toEqual([
    expect.objectContaining({
      path: `/applications/${application.id}/activities/${offer.id}/details-review`,
    }),
  ]);
  await waitFor(async () =>
    expect(within(await findLog()).queryByText(/differ from the details/)).not.toBeInTheDocument(),
  );
});

test("gives no hint once the latest terms are reviewed", async () => {
  renderAdoption([{ ...offer, detailsReviewed: true }, submission]);
  const log = await findLog();

  expect(await within(log).findByRole("heading", { name: "Offer received" })).toBeVisible();
  expect(within(log).queryByText(/differ from the details/)).not.toBeInTheDocument();
});
