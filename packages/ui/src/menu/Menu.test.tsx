import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { Menu, MenuItem } from "./Menu.tsx";

test("runs the action of the chosen item", async () => {
  const onDelete = vi.fn();
  render(
    <Menu trigger={<Button>More</Button>}>
      <MenuItem variant="destructive" onClick={onDelete}>
        Delete
      </MenuItem>
    </Menu>,
  );

  expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "More" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

  expect(onDelete).toHaveBeenCalledOnce();
});
