import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { IconButton } from "./IconButton.tsx";

test("is named by its label", async () => {
  const onClick = vi.fn();
  render(
    <IconButton label="Sign out" onClick={onClick}>
      <svg aria-hidden />
    </IconButton>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

  expect(onClick).toHaveBeenCalledOnce();
});

test("shows its label as a tooltip", async () => {
  render(
    <IconButton label="Sign out">
      <svg aria-hidden />
    </IconButton>,
  );

  await userEvent.hover(screen.getByRole("button", { name: "Sign out" }));

  expect(await screen.findByText("Sign out")).toBeInTheDocument();
});
