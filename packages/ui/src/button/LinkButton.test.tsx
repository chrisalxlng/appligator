import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { LinkButton } from "./LinkButton.tsx";

test("renders a link with button styling", () => {
  render(<LinkButton href="/jobs">Jobs</LinkButton>);

  expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
});

test("renders the element passed via render", () => {
  render(
    <LinkButton
      href="/custom"
      render={({ children, ...props }) => (
        <a {...props} data-custom>
          {children}
        </a>
      )}
    >
      Continue
    </LinkButton>,
  );

  expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("data-custom");
});
