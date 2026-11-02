import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { Switch } from "./Switch.tsx";

function renderInLabel(checked = false) {
  const onCheckedChange = vi.fn();
  render(
    <label>
      <span id="title">Assign with AI</span>
      <span>Some explanation</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-labelledby="title" />
    </label>,
  );
  return onCheckedChange;
}

test("shows its state and name", () => {
  renderInLabel(true);

  expect(screen.getByRole("switch", { name: "Assign with AI" })).toBeChecked();
});

test("toggles when clicking it", async () => {
  const onCheckedChange = renderInLabel();

  await userEvent.click(screen.getByRole("switch"));

  expect(onCheckedChange).toHaveBeenCalledTimes(1);
  expect(onCheckedChange.mock.calls[0]![0]).toBe(true);
});

test("toggles when clicking anywhere in the surrounding label", async () => {
  const onCheckedChange = renderInLabel();

  await userEvent.click(screen.getByText("Some explanation"));

  expect(onCheckedChange).toHaveBeenCalledTimes(1);
});
