import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { Button } from "./Button.tsx";

test("calls onClick when clicked", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Speichern</Button>);

  await userEvent.click(screen.getByRole("button", { name: "Speichern" }));

  expect(onClick).toHaveBeenCalledOnce();
});

test("ignores clicks when disabled", async () => {
  const onClick = vi.fn();
  render(
    <Button onClick={onClick} disabled>
      Speichern
    </Button>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Speichern" }));

  expect(onClick).not.toHaveBeenCalled();
});
