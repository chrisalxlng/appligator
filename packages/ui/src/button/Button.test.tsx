import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { Button } from "./Button.tsx";

test("calls onClick when clicked", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Save</Button>);

  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onClick).toHaveBeenCalledOnce();
});

test("ignores clicks when disabled", async () => {
  const onClick = vi.fn();
  render(
    <Button onClick={onClick} disabled>
      Save
    </Button>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onClick).not.toHaveBeenCalled();
});
