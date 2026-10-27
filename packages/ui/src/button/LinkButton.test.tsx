import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { LinkButton } from "./LinkButton.tsx";

test("renders a link with button styling", () => {
  render(<LinkButton href="/jobs">Stellen</LinkButton>);

  expect(screen.getByRole("link", { name: "Stellen" })).toHaveAttribute("href", "/jobs");
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
      Weiter
    </LinkButton>,
  );

  expect(screen.getByRole("link", { name: "Weiter" })).toHaveAttribute("data-custom");
});
