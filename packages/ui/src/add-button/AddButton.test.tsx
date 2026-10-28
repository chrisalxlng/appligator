import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { AddButton } from "./AddButton.tsx";

test("renders a non-submitting button that reports clicks", async () => {
  const onClick = vi.fn();
  render(<AddButton onClick={onClick}>Add</AddButton>);

  const button = screen.getByRole("button", { name: "Add" });
  await userEvent.click(button);

  expect(button).toHaveAttribute("type", "button");
  expect(onClick).toHaveBeenCalledOnce();
});
