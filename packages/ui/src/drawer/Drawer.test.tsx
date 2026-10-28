import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { Drawer } from "./Drawer.tsx";

function renderDrawer() {
  render(
    <Drawer title="Edit job" closeLabel="Close" trigger={<Button>Edit</Button>}>
      <Drawer title="Edit location" closeLabel="Close location" trigger={<Button>Location</Button>}>
        <p>Location form</p>
      </Drawer>
    </Drawer>,
  );
}

test("opens from its trigger and closes with the close button", async () => {
  renderDrawer();

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(await screen.findByRole("dialog", { name: "Edit job" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(screen.queryByRole("dialog", { name: "Edit job" })).not.toBeInTheDocument();
});

test("opens a nested drawer on top of the parent drawer", async () => {
  renderDrawer();

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  await userEvent.click(await screen.findByRole("button", { name: "Location" }));

  expect(await screen.findByRole("dialog", { name: "Edit location" })).toHaveTextContent(
    "Location form",
  );

  await userEvent.click(screen.getByRole("button", { name: "Close location" }));

  expect(screen.queryByRole("dialog", { name: "Edit location" })).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Edit job" })).toBeInTheDocument();
});
