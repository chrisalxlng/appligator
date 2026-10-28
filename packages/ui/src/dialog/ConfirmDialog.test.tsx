import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog.tsx";

function renderDialog(props: Partial<ConfirmDialogProps> = {}) {
  const handlers = { onOpenChange: vi.fn(), onConfirm: vi.fn() };
  render(
    <ConfirmDialog
      open
      title="Delete job?"
      description="The job will be deleted permanently."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

test("shows the title and description as an alert dialog", () => {
  renderDialog();

  expect(screen.getByRole("alertdialog", { name: "Delete job?" })).toHaveAccessibleDescription(
    "The job will be deleted permanently.",
  );
});

test("confirms the action", async () => {
  const { onConfirm } = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(onConfirm).toHaveBeenCalledOnce();
});

test("closes without confirming when cancelled", async () => {
  const { onConfirm, onOpenChange } = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  expect(onConfirm).not.toHaveBeenCalled();
});

test("disables confirming while the action is pending", () => {
  renderDialog({ pending: true });

  expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
});

test("shows an error", () => {
  renderDialog({ error: "The job could not be deleted." });

  expect(screen.getByRole("alert")).toHaveTextContent("The job could not be deleted.");
});
