import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { ToastProvider, useSuccessToast } from "./Toast.tsx";

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
