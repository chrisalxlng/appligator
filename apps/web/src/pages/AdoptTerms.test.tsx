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

async function addInterviewWithVacationDays(days: string) {
  const log = await findLog();
  await within(log).findByRole("heading", { name: "Offer received" });
  await userEvent.click(screen.getByRole("button", { name: "Add activity" }));
  const picker = await screen.findByRole("dialog", { name: "Add activity" });
  await userEvent.click(within(picker).getByRole("button", { name: "Show more" }));
  await userEvent.click(within(picker).getByRole("button", { name: /^Interview held/ }));
  const form = await screen.findByRole("dialog", { name: "Interview held" });
  await userEvent.click(within(form).getByRole("button", { name: "Add terms" }));
  const terms = await screen.findByRole("dialog", { name: "Add terms" });
  await userEvent.type(within(terms).getByRole("textbox", { name: "Vacation days" }), days);
  await userEvent.click(within(terms).getByRole("button", { name: "Add" }));
  await userEvent.click(within(form).getByRole("button", { name: "Add" }));
}

test("takes over terms into empty details without asking", async () => {
  const api = createFakeApi([jobFixture], [{ ...application, vacationDays: null }], {
    [application.id]: [{ ...offer, detailsReviewed: true }],
  });
  renderApp(`/applications/${application.id}`);

  await addInterviewWithVacationDays("28");

  const detail = await screen.findByRole("article");
  await waitFor(() => expect(detail).toHaveTextContent("Vacation days28"));
  expect(screen.queryByRole("dialog", { name: "Take over values" })).not.toBeInTheDocument();
  expect(api.requestsWith("PUT")).toEqual([]);
});

test("asks right after adding an activity whose terms would change the details", async () => {
  renderAdoption([{ ...offer, detailsReviewed: true }]);

  await addInterviewWithVacationDays("28");

  const drawer = await screen.findByRole("dialog", { name: "Take over values" });
  expect(
    within(drawer)
      .getByRole("checkbox", { name: /^Vacation days/ })
      .closest("label"),
  ).toHaveTextContent("Vacation days3028");
});

test("asks after editing the terms of an activity, but not after other changes", async () => {
  renderAdoption([{ ...offer, detailsReviewed: true }]);
  const log = await findLog();
  const edit = async () => {
    await userEvent.click(await within(log).findByRole("button", { name: /Edit Offer received$/ }));
    return screen.findByRole("dialog", { name: "Offer received" });
  };

  const notesForm = await edit();
  await userEvent.click(within(notesForm).getByRole("button", { name: "Update" }));
  expect(await screen.findByText("Activity updated")).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Take over values" })).not.toBeInTheDocument();

  const termsForm = await edit();
  await userEvent.click(within(termsForm).getByRole("button", { name: "Edit terms" }));
  const terms = await screen.findByRole("dialog", { name: "Edit terms" });
  await userEvent.clear(within(terms).getByRole("textbox", { name: "Vacation days" }));
  await userEvent.type(within(terms).getByRole("textbox", { name: "Vacation days" }), "28");
  await userEvent.click(within(terms).getByRole("button", { name: "Update" }));
  await userEvent.click(within(termsForm).getByRole("button", { name: "Update" }));

  expect(await screen.findByRole("dialog", { name: "Take over values" })).toBeVisible();
});

test("keeps the hint when the drawer is closed without ignoring", async () => {
  const api = renderAdoption();
  const drawer = await openAdoption();

  await userEvent.click(within(drawer).getByRole("button", { name: "Close" }));

  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Take over values" })).not.toBeInTheDocument(),
  );
  expect(within(await findLog()).getByText("2 values differ from the details")).toBeVisible();
  expect(api.requestsWith("PUT")).toEqual([]);
});
