import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { applicationFor, createFakeApi, jobFixture, jobWith } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const olderJob = jobWith({
  id: "2b7e4c10-5a3d-4e8f-9b21-0c4d5e6f7a8b",
  company: "Initech GmbH",
  position: "Frontend Developer",
  createdAt: yesterday,
});
const oldestJob = jobWith({
  id: "5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
  company: "Serviceware SE",
  position: "Junior Developer",
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
});
const application = applicationFor(jobFixture, { createdAt: new Date().toISOString() });

async function openPicker() {
  await userEvent.click(await screen.findByRole("button", { name: "Apply" }));
  return screen.findByRole("dialog", { name: "Select job" });
}

test("shows an empty state with an apply button when there are no applications", async () => {
  createFakeApi();
  renderApp("/applications");

  expect(await screen.findByRole("heading", { name: "No applications yet" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
});

test("lists the applications and opens the first one on desktop", async () => {
  createFakeApi([jobFixture], [application]);
  const router = renderApp("/applications");

  const card = await screen.findByRole("link", { name: /Lead Developer Frontend/ });
  expect(card).toHaveTextContent("Lead Developer FrontendRandstad Digital Germany AGTodayApplied");
  await waitFor(() =>
    expect(router.state.location.pathname).toBe(`/applications/${application.id}`),
  );
});

test("shows the details of an application", async () => {
  createFakeApi([jobFixture], [application]);
  renderApp(`/applications/${application.id}`);

  const detail = await screen.findByRole("article");
  const property = (name: string) =>
    within(detail).getByText(name, { selector: "dt > span" }).parentElement!.nextElementSibling;

  expect(within(detail).getByRole("heading", { name: "Lead Developer Frontend" })).toBeVisible();
  expect(property("Status")).toHaveTextContent("Applied");
  expect(property("Received")).toHaveTextContent("October 30, 2026");
  expect(within(property("Job") as HTMLElement).getByRole("link")).toHaveAttribute(
    "href",
    `/jobs/${jobFixture.id}`,
  );
  expect(property("Salary")).toHaveTextContent("€65,000 – €75,000 / year");
  expect(within(detail).queryByRole("region", { name: "Description" })).not.toBeInTheDocument();
  expect(document.title).toBe("Lead Developer Frontend • Appligator");
});

test("shows that an application does not exist", async () => {
  createFakeApi();
  renderApp("/applications/00000000-0000-4000-8000-000000000000");

  expect(await screen.findByRole("heading", { name: "Application not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Show all applications" })).toHaveAttribute(
    "href",
    "/applications",
  );
});

test("offers the open jobs, newest first, with the first one highlighted", async () => {
  createFakeApi([jobFixture, olderJob, oldestJob], [application]);
  renderApp("/applications");

  const picker = await openPicker();

  const search = within(picker).getByRole("combobox", { name: "Search jobs" });
  await waitFor(() => expect(search).toHaveFocus());
  const options = await within(picker).findAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual([
    "Frontend DeveloperInitech GmbH • Yesterday",
    expect.stringMatching(/^Junior DeveloperServiceware SE • /),
  ]);
  expect(options[0]).toHaveAttribute("data-highlighted");
});

test("applies for the highlighted job with Enter and opens the application", async () => {
  const api = createFakeApi([jobFixture, olderJob, oldestJob]);
  const router = renderApp("/applications");
  const picker = await openPicker();
  await within(picker).findAllByRole("option");

  await userEvent.keyboard("{ArrowDown}{Enter}");

  expect(await screen.findByText("Application created")).toBeInTheDocument();
  expect(api.requestsWith("POST")[0]?.body).toMatchObject({ jobId: olderJob.id });
  await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/applications\/[\w-]+$/));
  expect(
    await screen.findByRole("heading", { level: 2, name: "Frontend Developer" }),
  ).toBeVisible();
  expect(screen.queryByRole("dialog", { name: "Select job" })).not.toBeInTheDocument();
});

test("searches the open jobs by company and position", async () => {
  const api = createFakeApi([jobFixture, olderJob, oldestJob]);
  renderApp("/applications");
  const picker = await openPicker();

  await userEvent.type(within(picker).getByRole("combobox", { name: "Search jobs" }), "service");

  await waitFor(() =>
    expect(
      within(picker)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([expect.stringMatching(/^Junior Developer/)]),
  );
  expect(api.requests.at(-1)?.path).toBe("/jobs?status=open&search=service&limit=20");
});

test("explains when no open job matches the search", async () => {
  createFakeApi([jobFixture]);
  renderApp("/applications");
  const picker = await openPicker();

  await userEvent.type(within(picker).getByRole("combobox", { name: "Search jobs" }), "xyz");

  expect(await within(picker).findByText("No open job matches “xyz”.")).toBeInTheDocument();
});

test("explains when there are no open jobs", async () => {
  createFakeApi([jobFixture], [application]);
  renderApp("/applications");
  const picker = await openPicker();

  expect(await within(picker).findByText("No open jobs")).toBeInTheDocument();
  expect(within(picker).queryByRole("option")).not.toBeInTheDocument();
});

test("keeps the picker open and shows an error when applying fails", async () => {
  const api = createFakeApi([olderJob]);
  api.failWith("POST", 500);
  renderApp("/applications");
  const picker = await openPicker();
  await userEvent.click(await within(picker).findByRole("option", { name: /Frontend Developer/ }));

  expect(await within(picker).findByRole("alert")).toHaveTextContent(
    "The application could not be created. Please try again.",
  );
});

test("opens the picker as a drawer on mobile", async () => {
  createFakeApi([olderJob]);
  renderApp("/applications", { viewport: "mobile" });

  const picker = await openPicker();

  expect(await within(picker).findByRole("option", { name: /Frontend Developer/ })).toBeVisible();
});

test("edits an application", async () => {
  const api = createFakeApi([jobFixture], [application]);
  renderApp(`/applications/${application.id}`);
  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const drawer = await screen.findByRole("dialog", { name: "Edit application" });

  const position = within(drawer).getByRole("textbox", { name: "Position" });
  await userEvent.clear(position);
  await userEvent.type(position, "Staff Engineer");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  expect(
    await screen.findByRole("heading", { level: 2, name: "Staff Engineer" }),
  ).toBeInTheDocument();
  expect(api.requestsWith("PUT")[0]?.body).toMatchObject({
    company: "Randstad Digital Germany AG",
    position: "Staff Engineer",
    salary: jobFixture.salary,
  });
  expect(screen.getByText("Application updated")).toBeInTheDocument();
});

test("requires a position when editing an application", async () => {
  const api = createFakeApi([jobFixture], [application]);
  renderApp(`/applications/${application.id}`);
  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const drawer = await screen.findByRole("dialog", { name: "Edit application" });

  await userEvent.clear(within(drawer).getByRole("textbox", { name: "Position" }));
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));

  expect(await within(drawer).findByText("Please enter a position.")).toBeVisible();
  expect(api.requestsWith("PUT")).toHaveLength(0);
});

test("deletes an application after confirmation", async () => {
  const api = createFakeApi([jobFixture], [application]);
  const router = renderApp(`/applications/${application.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Show more actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Delete application?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByText("Application deleted")).toBeInTheDocument();
  expect(api.requestsWith("DELETE")[0]?.path).toBe(`/applications/${application.id}`);
  await waitFor(() => expect(router.state.location.pathname).toBe("/applications"));
});
