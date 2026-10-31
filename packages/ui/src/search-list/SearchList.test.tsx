import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vite-plus/test";
import { SearchList } from "./SearchList.tsx";

const jobs = ["Frontend Developer", "Backend Developer", "Designer"];

function Demo({ onSelect }: { onSelect: (job: string) => void }) {
  const [search, setSearch] = useState("");
  return (
    <SearchList
      items={jobs.filter((job) => job.toLowerCase().includes(search.toLowerCase()))}
      search={search}
      onSearchChange={setSearch}
      onSelect={onSelect}
      itemKey={(job) => job}
      renderItem={(job) => job}
      inputLabel="Search jobs"
      placeholder="Search …"
      listLabel="Jobs"
    />
  );
}

test("selects the first item with Enter right away", async () => {
  const onSelect = vi.fn();
  render(<Demo onSelect={onSelect} />);

  await userEvent.click(screen.getByRole("combobox", { name: "Search jobs" }));
  await userEvent.keyboard("{Enter}");

  expect(onSelect).toHaveBeenCalledWith("Frontend Developer");
});

test("moves the highlight with the arrow keys", async () => {
  const onSelect = vi.fn();
  render(<Demo onSelect={onSelect} />);

  await userEvent.click(screen.getByRole("combobox", { name: "Search jobs" }));
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{Enter}");

  expect(onSelect).toHaveBeenCalledWith("Backend Developer");
});

test("highlights the first match of a search", async () => {
  const onSelect = vi.fn();
  render(<Demo onSelect={onSelect} />);

  await userEvent.type(screen.getByRole("combobox", { name: "Search jobs" }), "design");
  await userEvent.keyboard("{Enter}");

  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(onSelect).toHaveBeenCalledWith("Designer");
});

test("selects an item by click", async () => {
  const onSelect = vi.fn();
  render(<Demo onSelect={onSelect} />);

  await userEvent.click(screen.getByRole("option", { name: "Designer" }));

  expect(onSelect).toHaveBeenCalledWith("Designer");
});

test("shows the status instead of the list", () => {
  render(
    <SearchList
      items={[]}
      search=""
      onSearchChange={() => {}}
      onSelect={() => {}}
      itemKey={(job: string) => job}
      renderItem={(job) => job}
      inputLabel="Search jobs"
      placeholder="Search …"
      listLabel="Jobs"
      status="No jobs"
    />,
  );

  expect(screen.getByText("No jobs")).toBeVisible();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
