import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { expect, test } from "vite-plus/test";
import { Popover } from "./Popover.tsx";

function Demo() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchorRef} onClick={() => setOpen(true)}>
        Apply
      </button>
      <Popover
        title="Select job"
        closeLabel="Close"
        open={open}
        onOpenChange={setOpen}
        anchor={anchorRef}
      >
        <p>Content</p>
      </Popover>
    </>
  );
}

test("opens with its title and content", async () => {
  render(<Demo />);

  await userEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(await screen.findByRole("dialog", { name: "Select job" })).toHaveTextContent("Content");
});

test("closes with the close button and returns the focus to its anchor", async () => {
  render(<Demo />);
  await userEvent.click(screen.getByRole("button", { name: "Apply" }));

  await userEvent.click(await screen.findByRole("button", { name: "Close" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply" })).toHaveFocus();
});
