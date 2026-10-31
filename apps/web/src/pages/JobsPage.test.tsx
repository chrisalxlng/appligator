import { jobLimits } from "@appligator/shared";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, onTestFinished, test, vi } from "vite-plus/test";
import { scrollObservedElementsIntoView } from "../testing/fakeIntersectionObserver.ts";
import {
  applicationFor,
  createFakeApi,
  fakePageSize,
  jobFixture,
  jobWith,
} from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const olderJob = jobWith({
  id: "2b7e4c10-5a3d-4e8f-9b21-0c4d5e6f7a8b",
  company: "Initech GmbH",
  position: "Frontend Developer",
  companyType: null,
  employeeCount: null,
  salary: null,
  bonuses: [],
  benefits: [],
  employmentType: null,
  workModel: null,
  homeOfficePercentage: null,
  workingHours: null,
  locations: [],
  commuteDistance: null,
  commuteDuration: null,
  vacationDays: null,
  startDate: null,
  contractTerm: null,
  probationMonths: null,
  noticePeriod: null,
  notes: "",
  applicationDeadline: null,
  link: null,
  summary: "",
  description: "",
  createdAt: yesterday,
});

async function openAddDrawer() {
  await userEvent.click(await screen.findByRole("button", { name: "Add" }));
  return screen.findByRole("dialog", { name: "Add job" });
}

async function openEditDrawer() {
  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  return screen.findByRole("dialog", { name: "Edit job" });
}

test("shows an empty state with an add button when there are no jobs", async () => {
  createFakeApi();
  renderApp("/jobs");

  expect(await screen.findByRole("heading", { name: "No jobs yet" })).toBeInTheDocument();
  expect(screen.getByText("Add your first job.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
});

test("lists the jobs with their creation day", async () => {
  createFakeApi([jobFixture, olderJob]);
  renderApp("/jobs");

  const [newest, older] = await screen.findAllByRole("link", { name: /Developer/ });

  expect(newest).toHaveTextContent("Lead Developer FrontendRandstad Digital Germany AGToday");
  expect(older).toHaveTextContent("Frontend DeveloperInitech GmbHYesterday");
  expect(document.title).toBe("Jobs • Appligator");
});

function manyJobs(count: number) {
  return Array.from({ length: count }, (_, index) =>
    jobWith({ id: crypto.randomUUID(), position: `Position ${index + 1}` }),
  );
}

const findPositionLinks = () => screen.findAllByRole("link", { name: /^Position \d+/ });

test("loads more jobs when scrolling to the end of the list", async () => {
  const api = createFakeApi(manyJobs(fakePageSize + 5));
  renderApp("/jobs", { viewport: "mobile" });

  expect(await findPositionLinks()).toHaveLength(fakePageSize);

  act(scrollObservedElementsIntoView);

  expect(await screen.findByRole("link", { name: /^Position 35/ })).toBeInTheDocument();
  expect(await findPositionLinks()).toHaveLength(fakePageSize + 5);

  act(scrollObservedElementsIntoView);

  const nextPageRequests = api.requestsWith("GET").filter(({ path }) => path.includes("cursor"));
  expect(nextPageRequests).toHaveLength(1);
});

test("retries loading more jobs after an error", async () => {
  const api = createFakeApi(manyJobs(fakePageSize + 1));
  renderApp("/jobs", { viewport: "mobile" });
  await findPositionLinks();

  api.failWith("GET", 500);
  act(scrollObservedElementsIntoView);

  const alert = await screen.findByRole("alert");
  expect(
    within(alert).getByRole("heading", { name: "More jobs could not be loaded" }),
  ).toBeVisible();
  expect(await findPositionLinks()).toHaveLength(fakePageSize);

  api.recover();
  await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

  expect(await screen.findByRole("link", { name: /^Position 31/ })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

async function tabIntoJobList() {
  for (let step = 0; step < 20 && !document.activeElement?.matches("ul a"); step++) {
    await userEvent.tab();
  }
}

test("makes the job list a single tab stop that is navigated with arrow keys", async () => {
  createFakeApi(manyJobs(3));
  renderApp("/jobs", { viewport: "tablet" });
  const [first, second, third] = await findPositionLinks();

  await tabIntoJobList();
  expect(first).toHaveFocus();

  await userEvent.keyboard("{ArrowDown}");
  expect(second).toHaveFocus();
  await userEvent.keyboard("{End}{ArrowDown}");
  expect(third).toHaveFocus();
  await userEvent.keyboard("{Home}{ArrowUp}");
  expect(first).toHaveFocus();

  await userEvent.keyboard("{ArrowDown}");
  await userEvent.tab();
  expect(document.activeElement).not.toBeOneOf([first, second, third]);

  await userEvent.tab({ shift: true });
  expect(first).toHaveFocus();
});

test("enters the job list at the opened job", async () => {
  const [first, opened] = manyJobs(2);
  createFakeApi([first!, opened!]);
  renderApp(`/jobs/${opened!.id}`);
  await screen.findByRole("article");

  await tabIntoJobList();

  expect(screen.getByRole("link", { name: /^Position 2/ })).toHaveFocus();
});

test("opens the first job on desktop", async () => {
  createFakeApi([jobFixture, olderJob]);
  const router = renderApp("/jobs");

  expect(
    await screen.findByRole("heading", { level: 2, name: "Lead Developer Frontend" }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe(`/jobs/${jobFixture.id}`);
  expect(screen.getByRole("link", { name: /Lead Developer Frontend/ })).toHaveAttribute(
    "data-status",
    "active",
  );
});

test("loads the jobs only once when opening the first job", async () => {
  const api = createFakeApi([jobFixture, olderJob]);
  renderApp("/jobs");

  await screen.findByRole("heading", { level: 2, name: "Lead Developer Frontend" });

  expect(api.requestsWith("GET").filter(({ path }) => path === "/jobs")).toHaveLength(1);
});

test("shows the list and an opened job one at a time on medium screens", async () => {
  createFakeApi([jobFixture]);
  const router = renderApp("/jobs", { viewport: "tablet" });

  await userEvent.click(await screen.findByRole("link", { name: /Lead Developer Frontend/ }));

  expect(await screen.findByRole("article")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(router.state.location.pathname).toBe("/jobs"));
});

test("shows a spinner while the jobs take long to load", async () => {
  vi.stubGlobal("fetch", () => new Promise(() => {}));
  renderApp("/jobs");

  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(await screen.findByRole("status")).toHaveTextContent("Loading jobs …");
});

test("shows the details of a job", async () => {
  createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);

  const detail = await screen.findByRole("article");
  const property = (name: string) =>
    within(detail).getByText(name, { selector: "dt > span" }).parentElement!.nextElementSibling;

  expect(within(detail).getByText("Randstad Digital Germany AG")).toBeInTheDocument();
  expect(property("Application deadline")).toHaveTextContent("December 31, 2026");
  const details = within(detail).getByRole("region", { name: "Details" });
  expect(
    within(details)
      .getAllByRole("term")
      .map((term) => term.textContent),
  ).toEqual([
    "Company",
    "Salary",
    "Bonuses",
    "Benefit",
    "Employment type",
    "Work model",
    "Home office",
    "Working hours",
    "Locations",
    "Commute",
    "Vacation days",
    "Start date",
    "Contract term",
    "Probation",
    "Notice period",
    "Notes",
  ]);
  expect(property("Company")).toHaveTextContent("Corporation • about 60,000 employees");
  expect(property("Salary")).toHaveTextContent("€65,000 – €75,000 / year");
  expect(property("Bonuses")).toHaveTextContent("13. Monatsgehalt, Erfolgsbeteiligung");
  expect(property("Benefit")).toHaveTextContent("50 € Brutto-Netto-Auszahlung");
  expect(property("Employment type")).toHaveTextContent("Full-time");
  expect(property("Work model")).toHaveTextContent("Hybrid");
  expect(property("Home office")).toHaveTextContent("80%");
  expect(property("Working hours")).toHaveTextContent("38.5 h / week");
  expect(property("Locations")).toHaveTextContent("Düsseldorf, Hamburg");
  expect(property("Commute")).toHaveTextContent("17 km, 25 min");
  expect(property("Vacation days")).toHaveTextContent("30");
  expect(property("Start date")).toHaveTextContent("February 1, 2027");
  expect(property("Contract term")).toHaveTextContent("Permanent");
  expect(property("Probation")).toHaveTextContent("3 months");
  expect(property("Notice period")).toHaveTextContent("4 weeks to the end of the month");
  expect(property("Notes")).toHaveTextContent("Training budget of €2,000 per year");
  expect(document.title).toBe("Lead Developer Frontend • Appligator");
  expect(within(detail).getByText("Lead position with a focus on Angular.")).toBeInTheDocument();
  const description = within(detail).getByRole("region", { name: "Description" });
  expect(within(description).getByRole("heading", { name: "Introduction" })).toBeInTheDocument();
  expect(within(detail).getByRole("link", { name: "stepstone.de" })).toHaveAttribute(
    "href",
    jobFixture.link,
  );
});

test("marks missing details as not specified", async () => {
  createFakeApi([olderJob]);
  renderApp(`/jobs/${olderJob.id}`);

  const detail = await screen.findByRole("article");

  expect(within(detail).getByText("Application deadline", { selector: "dt > span" })).toBeVisible();
  expect(within(detail).getByText("Application", { selector: "dt > span" })).toBeVisible();
  expect(within(detail).getAllByText("Not specified")).toHaveLength(2);
  expect(within(detail).queryByRole("region")).not.toBeInTheDocument();
  expect(within(detail).queryByRole("link")).not.toBeInTheDocument();
});

test.each([
  [
    { kind: "months", months: 1 },
    { amount: 1, unit: "months", endOf: null },
    "Fixed term of 1 month",
    "1 month",
  ],
  [
    { kind: "until", date: "2028-01-31" },
    { amount: 2, unit: "weeks", endOf: "quarter" },
    "Fixed term until January 31, 2028",
    "2 weeks to the end of the quarter",
  ],
] as const)(
  "shows the contract term %o and notice period %o",
  async (contractTerm, noticePeriod, term, notice) => {
    const job = jobWith({
      contractTerm,
      noticePeriod,
      locations: ["Hamburg"],
      commuteDistance: null,
      companyType: null,
      employeeCount: 1,
    });
    createFakeApi([job]);
    renderApp(`/jobs/${job.id}`);

    const detail = await screen.findByRole("article");
    const property = (name: string) =>
      within(detail).getByText(name, { selector: "dt > span" }).parentElement!.nextElementSibling;

    expect(property("Contract term")).toHaveTextContent(term);
    expect(property("Notice period")).toHaveTextContent(notice);
    expect(property("Location")).toHaveTextContent("Hamburg");
    expect(property("Commute")?.textContent).toBe("25 min");
    expect(property("Company")?.textContent).toBe("about 1 employee");
  },
);

test("shows that a job does not exist", async () => {
  createFakeApi([jobFixture]);
  renderApp("/jobs/00000000-0000-4000-8000-000000000000");

  expect(await screen.findByRole("heading", { name: "Job not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Show all jobs" })).toHaveAttribute("href", "/jobs");
  expect(document.title).toBe("Job not found • Appligator");
});

test("retries loading the jobs after an error", async () => {
  const api = createFakeApi([jobFixture]);
  api.failWith("GET", 500);
  renderApp("/jobs");

  const alert = await screen.findByRole("alert");
  expect(within(alert).getByRole("heading", { name: "Jobs could not be loaded" })).toBeVisible();

  api.recover();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(await screen.findByRole("link", { name: /Lead Developer Frontend/ })).toBeInTheDocument();
});

test("shows the list on mobile and closes an opened job", async () => {
  createFakeApi([jobFixture]);
  const router = renderApp("/jobs", { viewport: "mobile" });

  await userEvent.click(await screen.findByRole("link", { name: /Lead Developer Frontend/ }));
  expect(await screen.findByRole("article")).toBeInTheDocument();
  expect(document.title).toBe("Lead Developer Frontend • Appligator");

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/jobs"));
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(document.title).toBe("Jobs • Appligator");
});

test("adds a job and opens it", async () => {
  const api = createFakeApi();
  const router = renderApp("/jobs");
  const drawer = await openAddDrawer();

  await userEvent.type(within(drawer).getByRole("textbox", { name: "Link" }), "stepstone.de/1");
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Company" }), "Initech GmbH");
  await userEvent.type(
    within(drawer).getByRole("textbox", { name: "Position" }),
    "Frontend Developer",
  );
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Work model" }));
  await userEvent.click(await screen.findByRole("option", { name: "Remote" }));
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(
    await screen.findByRole("heading", { level: 2, name: "Frontend Developer" }),
  ).toBeInTheDocument();
  expect(api.requestsWith("POST")[0]?.body).toMatchObject({
    link: "https://stepstone.de/1",
    company: "Initech GmbH",
    position: "Frontend Developer",
    workModel: "remote",
    salary: null,
  });
  expect(router.state.location.pathname).toMatch(/^\/jobs\/[\w-]+$/);
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Add job" })).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Job added")).toBeInTheDocument();
});

test("enters a salary range", async () => {
  const api = createFakeApi();
  renderApp("/jobs");
  const drawer = await openAddDrawer();

  await userEvent.type(within(drawer).getByRole("textbox", { name: "Company" }), "Initech");
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Position" }), "Developer");
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Currency" }));
  await userEvent.click(await screen.findByRole("option", { name: "EUR" }));
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Minimum salary" }), "65000");
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Maximum salary" }), "75000");
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Period" }));
  await userEvent.click(await screen.findByRole("option", { name: "Per year" }));
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  await waitFor(() =>
    expect(api.requestsWith("POST")[0]?.body?.salary).toEqual({
      currency: "EUR",
      period: "year",
      min: 65_000,
      max: 75_000,
    }),
  );
});

test("enters the details of a job", async () => {
  const api = createFakeApi();
  renderApp("/jobs");
  const drawer = await openAddDrawer();
  const textbox = (name: string) => within(drawer).getByRole("textbox", { name });
  async function choose(combobox: string, option: string) {
    await userEvent.click(within(drawer).getByRole("combobox", { name: combobox }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
  }

  await userEvent.type(textbox("Company"), "Initech");
  await userEvent.type(textbox("Position"), "Developer");
  await choose("Company type", "Startup");
  await userEvent.type(textbox("Employees"), "25");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add bonus" }));
  const addBonus = await screen.findByRole("dialog", { name: "Add bonus" });
  await userEvent.type(within(addBonus).getByRole("textbox", { name: "Bonus" }), "Profit sharing");
  await userEvent.click(within(addBonus).getByRole("button", { name: "Add" }));
  await userEvent.type(textbox("Home office"), "60");
  await userEvent.type(textbox("Working hours"), "38.5");
  await choose("Working hours period", "Per month");
  await userEvent.type(textbox("Distance"), "17");
  await userEvent.type(textbox("Travel time"), "25");
  await choose("Contract term", "Fixed term (duration)");
  await userEvent.type(textbox("Duration in months"), "24");
  await userEvent.type(textbox("Duration"), "3");
  await choose("End of period", "To the end of the quarter");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  await waitFor(() =>
    expect(api.requestsWith("POST")[0]?.body).toMatchObject({
      companyType: "startup",
      employeeCount: 25,
      bonuses: ["Profit sharing"],
      homeOfficePercentage: 60,
      workingHours: { hours: 38.5, period: "month" },
      commuteDistance: 17,
      commuteDuration: 25,
      contractTerm: { kind: "months", months: 24 },
      noticePeriod: { amount: 3, unit: "months", endOf: "quarter" },
    }),
  );
});

test("requires the duration of a fixed-term contract", async () => {
  const api = createFakeApi();
  renderApp("/jobs");
  const drawer = await openAddDrawer();

  await userEvent.type(within(drawer).getByRole("textbox", { name: "Company" }), "Initech");
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Position" }), "Developer");
  await userEvent.click(within(drawer).getByRole("combobox", { name: "Contract term" }));
  await userEvent.click(await screen.findByRole("option", { name: "Fixed term (end date)" }));
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(await within(drawer).findByText("Please enter the end date.")).toBeVisible();
  expect(api.requestsWith("POST")).toHaveLength(0);
});

test("focuses the first field when adding a job", async () => {
  createFakeApi();
  renderApp("/jobs");
  const drawer = await openAddDrawer();

  await waitFor(() => expect(within(drawer).getByRole("textbox", { name: "Link" })).toHaveFocus());
});

test("focuses the drawer instead of a field when editing a job", async () => {
  createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);
  const drawer = await openEditDrawer();

  await waitFor(() => expect(drawer).toHaveFocus());
});

test("validates the job before saving it", async () => {
  const api = createFakeApi();
  renderApp("/jobs");
  const drawer = await openAddDrawer();

  await userEvent.type(within(drawer).getByRole("textbox", { name: "Minimum salary" }), "50000");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(within(drawer).getByText("Please enter a company.")).toBeInTheDocument();
  expect(within(drawer).getByText("Please enter a position.")).toBeInTheDocument();
  expect(within(drawer).getByRole("alert")).toHaveTextContent(
    "Please enter currency, amount and period.",
  );
  expect(api.requestsWith("POST")).toHaveLength(0);
});

test("keeps the drawer open and shows an error when saving fails", async () => {
  const api = createFakeApi();
  api.failWith("POST", 500);
  renderApp("/jobs");
  const drawer = await openAddDrawer();

  await userEvent.type(within(drawer).getByRole("textbox", { name: "Company" }), "Initech");
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Position" }), "Developer");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(await within(drawer).findByRole("alert")).toHaveTextContent(
    "The job could not be saved. Please try again.",
  );
});

test("adds, edits and removes locations in a nested drawer", async () => {
  const api = createFakeApi([olderJob]);
  renderApp(`/jobs/${olderJob.id}`);
  const drawer = await openEditDrawer();

  await userEvent.click(within(drawer).getByRole("button", { name: "Add location" }));
  const addLocation = await screen.findByRole("dialog", { name: "Add location" });
  await waitFor(() =>
    expect(within(addLocation).getByRole("textbox", { name: "Location" })).toHaveFocus(),
  );
  await userEvent.click(within(addLocation).getByRole("button", { name: "Add" }));
  expect(within(addLocation).getByText("Please enter a location.")).toBeInTheDocument();
  await userEvent.type(within(addLocation).getByRole("textbox", { name: "Location" }), "Bonn");
  await userEvent.click(within(addLocation).getByRole("button", { name: "Add" }));

  await userEvent.click(await within(drawer).findByRole("button", { name: "Bonn" }));
  const editLocation = await screen.findByRole("dialog", { name: "Edit location" });
  const input = within(editLocation).getByRole("textbox", { name: "Location" });
  expect(input).toHaveValue("Bonn");
  await waitFor(() => expect(input).toHaveFocus());
  await userEvent.clear(input);
  await userEvent.type(input, "Köln");
  await userEvent.click(within(editLocation).getByRole("button", { name: "Update" }));

  await userEvent.click(await within(drawer).findByRole("button", { name: "Add location" }));
  const secondLocation = await screen.findByRole("dialog", { name: "Add location" });
  await userEvent.type(within(secondLocation).getByRole("textbox", { name: "Location" }), "Bonn");
  await userEvent.click(within(secondLocation).getByRole("button", { name: "Add" }));
  await userEvent.click(await within(drawer).findByRole("button", { name: "Remove Köln" }));

  expect(api.requestsWith("PUT")).toHaveLength(0);
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));
  await waitFor(() => expect(api.requestsWith("PUT")[0]?.body?.locations).toEqual(["Bonn"]));
});

test("rejects a location longer than a job allows", async () => {
  createFakeApi([olderJob]);
  renderApp(`/jobs/${olderJob.id}`);
  const drawer = await openEditDrawer();

  await userEvent.click(within(drawer).getByRole("button", { name: "Add location" }));
  const addLocation = await screen.findByRole("dialog", { name: "Add location" });
  await userEvent.click(within(addLocation).getByRole("textbox", { name: "Location" }));
  await userEvent.paste("x".repeat(jobLimits.textLength + 1));
  await userEvent.click(within(addLocation).getByRole("button", { name: "Add" }));

  expect(
    within(addLocation).getByText("This location is too long. Please shorten it."),
  ).toBeInTheDocument();
});

test("offers no further location once a job has the most locations it allows", async () => {
  const locations = Array.from({ length: jobLimits.listItems }, (_, index) => `City ${index}`);
  createFakeApi([{ ...olderJob, locations }]);
  renderApp(`/jobs/${olderJob.id}`);
  const drawer = await openEditDrawer();

  expect(within(drawer).getByRole("button", { name: "City 0" })).toBeInTheDocument();
  expect(within(drawer).queryByRole("button", { name: "Add location" })).not.toBeInTheDocument();
});

test("edits a job", async () => {
  const api = createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);
  const drawer = await openEditDrawer();

  const position = within(drawer).getByRole("textbox", { name: "Position" });
  expect(position).toHaveValue("Lead Developer Frontend");
  expect(within(drawer).getByRole("textbox", { name: "Minimum salary" })).toHaveValue("65,000");
  await userEvent.clear(position);
  await userEvent.type(position, "Staff Engineer");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  expect(
    await screen.findByRole("heading", { level: 2, name: "Staff Engineer" }),
  ).toBeInTheDocument();
  const {
    id: _id,
    status: _status,
    application: _application,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...input
  } = jobFixture;
  expect(api.requestsWith("PUT")[0]?.body).toEqual({ ...input, position: "Staff Engineer" });
  expect(screen.getByText("Job updated")).toBeInTheDocument();
});

test("shows the update as pending and saves only once", async () => {
  const api = createFakeApi([jobFixture]);
  const releaseUpdate = api.holdResponses("PUT");
  renderApp(`/jobs/${jobFixture.id}`);
  const drawer = await openEditDrawer();

  const position = within(drawer).getByRole("textbox", { name: "Position" });
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));
  await userEvent.type(position, "{Enter}");

  expect(within(drawer).getByRole("button", { name: "Update" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(api.requestsWith("PUT")).toHaveLength(1);
  releaseUpdate();
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Edit job" })).not.toBeInTheDocument(),
  );
});

test("deletes a job after confirmation", async () => {
  const api = createFakeApi([jobFixture, olderJob]);
  const router = renderApp(`/jobs/${jobFixture.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Show more actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Delete job?" });
  expect(dialog).toHaveTextContent(
    "“Lead Developer Frontend” at Randstad Digital Germany AG will be deleted permanently.",
  );
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(router.state.location.pathname).toBe(`/jobs/${olderJob.id}`));
  expect(api.requestsWith("DELETE")).toEqual([
    { method: "DELETE", path: `/jobs/${jobFixture.id}`, body: undefined },
  ]);
  expect(screen.queryByRole("link", { name: /Lead Developer Frontend/ })).not.toBeInTheDocument();
  expect(screen.getByText("Job deleted")).toBeInTheDocument();
});

test("keeps the job when deleting is cancelled", async () => {
  const api = createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Show more actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(api.requestsWith("DELETE")).toHaveLength(0);
});

test("shows an error when deleting fails", async () => {
  const api = createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);
  await screen.findByRole("article");
  api.failWith("DELETE", 500);

  await userEvent.click(screen.getByRole("button", { name: "Show more actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "The job could not be deleted. Please try again.",
  );
});

test("opens the add drawer with Alt+N and shows the shortcut", async () => {
  createFakeApi([jobFixture]);
  renderApp("/jobs");

  const addButton = await screen.findByRole("button", { name: "Add" });
  await userEvent.hover(addButton);
  expect(await screen.findByText("Alt+N")).toBeInTheDocument();
  await userEvent.keyboard("{Alt>}n{/Alt}");

  const drawer = await screen.findByRole("dialog", { name: "Add job" });
  expect(within(drawer).getByRole("button", { name: "Add" })).toHaveTextContent("Ctrl+Enter");
});

test("edits a job with Alt+E and saves it with Ctrl+Enter", async () => {
  const api = createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);
  await screen.findByRole("button", { name: "Edit" });

  await userEvent.keyboard("{Alt>}e{/Alt}");
  const drawer = await screen.findByRole("dialog", { name: "Edit job" });
  await userEvent.keyboard("{Alt>}n{/Alt}");
  await userEvent.keyboard("{Control>}{Enter}{/Control}");

  await waitFor(() => expect(api.requestsWith("PUT")).toHaveLength(1));
  expect(drawer).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Add job" })).not.toBeInTheDocument();
});

test("confirms deleting with Ctrl+Enter", async () => {
  const api = createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Show more actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  await screen.findByRole("alertdialog", { name: "Delete job?" });
  await userEvent.keyboard("{Control>}{Enter}{/Control}");

  await waitFor(() => expect(api.requestsWith("DELETE")).toHaveLength(1));
});

test("hides shortcut hints on touch devices", async () => {
  const matchMedia = window.matchMedia;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: !query.includes("pointer") && matchMedia(query).matches,
    addEventListener() {},
    removeEventListener() {},
  }));
  onTestFinished(() => {
    vi.stubGlobal("matchMedia", matchMedia);
  });
  createFakeApi();
  renderApp("/jobs");

  const drawer = await openAddDrawer();

  expect(within(drawer).getByRole("button", { name: "Add" }).textContent).toBe("Add");
});

function todayIsoDate() {
  return new Date().toLocaleDateString("sv-SE");
}

test("shows the status of the jobs and filters them by status", async () => {
  const openJob = jobWith({ id: crypto.randomUUID(), position: "Open Developer" });
  createFakeApi([jobFixture, olderJob, openJob], [applicationFor(jobFixture)]);
  renderApp("/jobs/" + olderJob.id);

  const filter = await screen.findByRole("group", { name: "Filter by status" });
  expect(
    within(filter)
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual(["3 All", "2 Open", "1 Applied"]);
  expect(within(filter).getByRole("button", { name: "3 All" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("link", { name: /Lead Developer Frontend/ })).toHaveTextContent(
    "Applied",
  );

  await userEvent.click(within(filter).getByRole("button", { name: "1 Applied" }));

  await waitFor(() => expect(screen.getAllByRole("link", { name: /Developer/ })).toHaveLength(1));
  expect(screen.getByRole("link", { name: /Developer/ })).toHaveTextContent(
    "Lead Developer Frontend",
  );
});

test("hides the status filter while all jobs have the same status", async () => {
  createFakeApi([jobFixture, olderJob]);
  renderApp("/jobs");

  await screen.findAllByRole("link", { name: /Developer/ });

  expect(screen.queryByRole("group", { name: "Filter by status" })).not.toBeInTheDocument();
});

test("applies for a job from its detail view", async () => {
  const api = createFakeApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);
  const detail = await screen.findByRole("article");
  const property = (name: string) =>
    within(detail).getByText(name, { selector: "dt > span" }).parentElement!.nextElementSibling;
  expect(property("Status")).toHaveTextContent("Open");

  await userEvent.click(within(detail).getByRole("button", { name: "Apply" }));

  expect(await screen.findByText("Application created")).toBeInTheDocument();
  expect(api.requestsWith("POST")[0]?.body).toEqual({
    jobId: jobFixture.id,
    appliedAt: todayIsoDate(),
  });
  await waitFor(() => expect(property("Status")).toHaveTextContent("Applied"));
  expect(within(detail).getByRole("link", { name: /Lead Developer Frontend/ })).toHaveTextContent(
    "Applied",
  );
  expect(within(detail).getByRole("link", { name: "Open application" })).toBeVisible();
});

test("shows an error when applying fails", async () => {
  const api = createFakeApi([jobFixture]);
  api.failWith("POST", 500);
  renderApp(`/jobs/${jobFixture.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Apply" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The application could not be created. Please try again.",
  );
});

test("links an applied job to its application instead of offering to change it", async () => {
  const application = applicationFor(jobFixture);
  createFakeApi([jobFixture], [application]);
  renderApp(`/jobs/${jobFixture.id}`);
  const detail = await screen.findByRole("article");

  expect(within(detail).getByRole("link", { name: "Open application" })).toHaveAttribute(
    "href",
    `/applications/${application.id}`,
  );
  expect(
    within(detail).getByRole("link", { name: /Lead Developer Frontend.*Applied/ }),
  ).toHaveAttribute("href", `/applications/${application.id}`);
  for (const name of ["Apply", "Edit", "Show more actions"]) {
    expect(within(detail).queryByRole("button", { name })).not.toBeInTheDocument();
  }
});

test("does not open the edit drawer of an applied job with Alt+E", async () => {
  createFakeApi([jobFixture], [applicationFor(jobFixture)]);
  renderApp(`/jobs/${jobFixture.id}`);
  await screen.findByRole("article");

  await userEvent.keyboard("{Alt>}e{/Alt}");

  expect(screen.queryByRole("dialog", { name: "Edit job" })).not.toBeInTheDocument();
});
