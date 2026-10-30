import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, onTestFinished, test, vi } from "vite-plus/test";
import { scrollObservedElementsIntoView } from "../testing/fakeIntersectionObserver.ts";
import { createFakeJobsApi, fakePageSize, jobFixture, jobWith } from "../testing/fakeJobsApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const olderJob = jobWith({
  id: "2b7e4c10-5a3d-4e8f-9b21-0c4d5e6f7a8b",
  company: "Initech GmbH",
  position: "Frontend Developer",
  salary: null,
  locations: [],
  workModel: null,
  employmentType: null,
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
  createFakeJobsApi();
  renderApp("/jobs");

  expect(await screen.findByRole("heading", { name: "No jobs yet" })).toBeInTheDocument();
  expect(screen.getByText("Add your first job.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
});

test("lists the jobs with their creation day", async () => {
  createFakeJobsApi([jobFixture, olderJob]);
  renderApp("/jobs");

  const [newest, older] = await screen.findAllByRole("link", { name: /Developer/ });

  expect(newest).toHaveTextContent("Lead Developer FrontendRandstad Digital Germany AGToday");
  expect(older).toHaveTextContent("Frontend DeveloperInitech GmbHYesterday");
  expect(document.title).toBe("Jobs · Appligator");
});

function manyJobs(count: number) {
  return Array.from({ length: count }, (_, index) =>
    jobWith({ id: crypto.randomUUID(), position: `Position ${index + 1}` }),
  );
}

const findPositionLinks = () => screen.findAllByRole("link", { name: /^Position \d+/ });

test("loads more jobs when scrolling to the end of the list", async () => {
  const api = createFakeJobsApi(manyJobs(fakePageSize + 5));
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
  const api = createFakeJobsApi(manyJobs(fakePageSize + 1));
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
  createFakeJobsApi(manyJobs(3));
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
  createFakeJobsApi([first!, opened!]);
  renderApp(`/jobs/${opened!.id}`);
  await screen.findByRole("article");

  await tabIntoJobList();

  expect(screen.getByRole("link", { name: /^Position 2/ })).toHaveFocus();
});

test("opens the first job on desktop", async () => {
  createFakeJobsApi([jobFixture, olderJob]);
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
  const api = createFakeJobsApi([jobFixture, olderJob]);
  renderApp("/jobs");

  await screen.findByRole("heading", { level: 2, name: "Lead Developer Frontend" });

  expect(api.requestsWith("GET").filter(({ path }) => path === "/jobs")).toHaveLength(1);
});

test("shows the list and an opened job one at a time on medium screens", async () => {
  createFakeJobsApi([jobFixture]);
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
  createFakeJobsApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);

  const detail = await screen.findByRole("article");
  const property = (name: string) =>
    within(detail).getByText(name, { selector: "dt" }).nextElementSibling;

  expect(within(detail).getByText("Randstad Digital Germany AG")).toBeInTheDocument();
  expect(property("Salary")).toHaveTextContent("€65,000 – €75,000 / year");
  expect(property("Locations")).toHaveTextContent("Düsseldorf, Hamburg");
  expect(property("Work model")).toHaveTextContent("Hybrid");
  expect(property("Employment type")).toHaveTextContent("Full-time");
  expect(property("Application deadline")).toHaveTextContent("Dec 31, 2026");
  expect(document.title).toBe("Lead Developer Frontend · Appligator");
  expect(within(detail).getByText("Lead position with a focus on Angular.")).toBeInTheDocument();
  expect(within(detail).getByRole("heading", { name: "Introduction" })).toBeInTheDocument();
  expect(within(detail).getByRole("link", { name: "stepstone.de" })).toHaveAttribute(
    "href",
    jobFixture.link,
  );
});

test("marks missing details as not specified", async () => {
  createFakeJobsApi([olderJob]);
  renderApp(`/jobs/${olderJob.id}`);

  const detail = await screen.findByRole("article");

  expect(within(detail).getAllByText("Not specified")).toHaveLength(5);
  expect(within(detail).queryByRole("link")).not.toBeInTheDocument();
});

test("shows that a job does not exist", async () => {
  createFakeJobsApi([jobFixture]);
  renderApp("/jobs/00000000-0000-4000-8000-000000000000");

  expect(await screen.findByRole("heading", { name: "Job not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to jobs" })).toHaveAttribute("href", "/jobs");
  expect(document.title).toBe("Job not found · Appligator");
});

test("retries loading the jobs after an error", async () => {
  const api = createFakeJobsApi([jobFixture]);
  api.failWith("GET", 500);
  renderApp("/jobs");

  const alert = await screen.findByRole("alert");
  expect(within(alert).getByRole("heading", { name: "Jobs could not be loaded" })).toBeVisible();

  api.recover();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(await screen.findByRole("link", { name: /Lead Developer Frontend/ })).toBeInTheDocument();
});

test("shows the list on mobile and closes an opened job", async () => {
  createFakeJobsApi([jobFixture]);
  const router = renderApp("/jobs", { viewport: "mobile" });

  await userEvent.click(await screen.findByRole("link", { name: /Lead Developer Frontend/ }));
  expect(await screen.findByRole("article")).toBeInTheDocument();
  expect(document.title).toBe("Lead Developer Frontend · Appligator");

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/jobs"));
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(document.title).toBe("Jobs · Appligator");
});

test("adds a job and opens it", async () => {
  const api = createFakeJobsApi();
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
  const api = createFakeJobsApi();
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

test("focuses the first field when adding a job", async () => {
  createFakeJobsApi();
  renderApp("/jobs");
  const drawer = await openAddDrawer();

  await waitFor(() => expect(within(drawer).getByRole("textbox", { name: "Link" })).toHaveFocus());
});

test("focuses the drawer instead of a field when editing a job", async () => {
  createFakeJobsApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);
  const drawer = await openEditDrawer();

  await waitFor(() => expect(drawer).toHaveFocus());
});

test("validates the job before saving it", async () => {
  const api = createFakeJobsApi();
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
  const api = createFakeJobsApi();
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
  const api = createFakeJobsApi([olderJob]);
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

test("edits a job", async () => {
  const api = createFakeJobsApi([jobFixture]);
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
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = jobFixture;
  expect(api.requestsWith("PUT")[0]?.body).toEqual({ ...input, position: "Staff Engineer" });
  expect(screen.getByText("Job updated")).toBeInTheDocument();
});

test("shows the update as pending and saves only once", async () => {
  const api = createFakeJobsApi([jobFixture]);
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
  const api = createFakeJobsApi([jobFixture, olderJob]);
  const router = renderApp(`/jobs/${jobFixture.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
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
  const api = createFakeJobsApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(api.requestsWith("DELETE")).toHaveLength(0);
});

test("shows an error when deleting fails", async () => {
  const api = createFakeJobsApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);
  await screen.findByRole("article");
  api.failWith("DELETE", 500);

  await userEvent.click(screen.getByRole("button", { name: "More actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "The job could not be deleted. Please try again.",
  );
});

test("opens the add drawer with Alt+N and shows the shortcut", async () => {
  createFakeJobsApi([jobFixture]);
  renderApp("/jobs");

  const addButton = await screen.findByRole("button", { name: "Add" });
  await userEvent.hover(addButton);
  expect(await screen.findByText("Alt+N")).toBeInTheDocument();
  await userEvent.keyboard("{Alt>}n{/Alt}");

  const drawer = await screen.findByRole("dialog", { name: "Add job" });
  expect(within(drawer).getByRole("button", { name: "Add" })).toHaveTextContent("Ctrl+Enter");
});

test("edits a job with Alt+E and saves it with Ctrl+Enter", async () => {
  const api = createFakeJobsApi([jobFixture]);
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
  const api = createFakeJobsApi([jobFixture]);
  renderApp(`/jobs/${jobFixture.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
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
  createFakeJobsApi();
  renderApp("/jobs");

  const drawer = await openAddDrawer();

  expect(within(drawer).getByRole("button", { name: "Add" }).textContent).toBe("Add");
});
