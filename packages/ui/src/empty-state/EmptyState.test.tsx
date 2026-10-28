import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { EmptyState } from "./EmptyState.tsx";

test("shows title, description and action", () => {
  render(
    <EmptyState
      illustration={<svg aria-hidden />}
      title="No jobs yet"
      description="Add your first job."
      action={<Button>Add</Button>}
    />,
  );

  expect(screen.getByRole("heading", { name: "No jobs yet" })).toBeInTheDocument();
  expect(screen.getByText("Add your first job.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
});
