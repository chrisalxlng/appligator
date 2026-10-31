import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { LinkChip } from "./LinkChip.tsx";

test("renders a link with its label and badge", () => {
  render(
    <LinkChip href="/applications/1" badge={<span>Applied</span>}>
      Lead Developer Frontend
    </LinkChip>,
  );

  const link = screen.getByRole("link", { name: /Lead Developer Frontend/ });
  expect(link).toHaveAttribute("href", "/applications/1");
  expect(link).toHaveTextContent("Applied");
});

test("renders the element passed via render", () => {
  render(
    <LinkChip
      href="/custom"
      render={({ children, ...props }) => (
        <a {...props} data-custom>
          {children}
        </a>
      )}
    >
      Job
    </LinkChip>,
  );

  expect(screen.getByRole("link", { name: "Job" })).toHaveAttribute("data-custom");
});
