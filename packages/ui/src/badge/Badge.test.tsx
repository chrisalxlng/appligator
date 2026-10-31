import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { Badge } from "./Badge.tsx";

test("renders its label with the given tone", () => {
  render(<Badge tone="success">Applied</Badge>);

  expect(screen.getByText("Applied")).toHaveAttribute("data-tone", "success");
});

test("is neutral by default", () => {
  render(<Badge>Open</Badge>);

  expect(screen.getByText("Open")).toHaveAttribute("data-tone", "neutral");
});
