import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { IconMail } from "@tabler/icons-react";
import { ToastProvider, useInfoToast, useSuccessToast } from "./Toast.tsx";

function SaveButton() {
  const showSuccess = useSuccessToast();
  return <Button onClick={() => showSuccess("Job added")}>Save</Button>;
}

test("shows a success message", async () => {
  render(
    <ToastProvider>
      <SaveButton />
    </ToastProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Job added")).toBeInTheDocument();
});

function NotifyButton() {
  const showInfo = useInfoToast();
  return <Button onClick={() => showInfo("1 new email", IconMail)}>Notify</Button>;
}

test("shows an information with its own icon instead of the check mark", async () => {
  render(
    <ToastProvider>
      <NotifyButton />
    </ToastProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Notify" }));

  const message = await screen.findByText("1 new email");
  const icon = message.parentElement!.querySelector("svg")!;
  expect(icon).toHaveClass("tabler-icon-mail");
  expect(icon.parentElement).toHaveAttribute("data-type", "info");
});
