import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { expect, test } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { TextInput } from "../field/TextInput.tsx";
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

test("focuses the drawer itself when it opens", async () => {
  renderDrawer();

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));

  const drawer = await screen.findByRole("dialog", { name: "Edit job" });

  await waitFor(() => expect(drawer).toHaveFocus());
});

function DrawerWithInitialFocus() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Drawer
      title="Add location"
      closeLabel="Close"
      trigger={<Button>Add</Button>}
      initialFocus={inputRef}
    >
      <TextInput ref={inputRef} aria-label="Location" />
    </Drawer>
  );
}

test("focuses the given element when it opens", async () => {
  render(<DrawerWithInitialFocus />);

  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(screen.getByRole("textbox", { name: "Location" })).toHaveFocus());
});
