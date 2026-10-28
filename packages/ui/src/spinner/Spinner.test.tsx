import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { Spinner } from "./Spinner.tsx";

test("announces its label as a status", () => {
  render(<Spinner label="Loading jobs" />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading jobs");
});
