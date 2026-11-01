import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, type ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";
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

test("focuses the given element during the opening tap, so iOS opens the keyboard", () => {
  render(<DrawerWithInitialFocus />);

  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByRole("textbox", { name: "Location" })).toHaveFocus();
});

function FormDrawer({
  onSubmit,
  children,
}: {
  onSubmit: (form: string) => void;
  children?: ReactNode;
}) {
  return (
    <Drawer title="Edit job" closeLabel="Close" open>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSubmit(event.currentTarget.name);
        }}
        name="job"
      >
        <TextInput aria-label="Position" />
        <Button type="submit">Update</Button>
      </form>
      {children}
    </Drawer>
  );
}

test("submits its form with the submit shortcut", async () => {
  const onSubmit = vi.fn();
  render(<FormDrawer onSubmit={onSubmit} />);

  await userEvent.click(await screen.findByRole("textbox", { name: "Position" }));
  await userEvent.keyboard("{Control>}{Enter}{/Control}");

  expect(onSubmit).toHaveBeenCalledWith("job");
});

test("submits only the form of the topmost drawer", async () => {
  const onSubmit = vi.fn();
  render(
    <FormDrawer onSubmit={onSubmit}>
      <Drawer title="Edit location" closeLabel="Close location" open>
        <form
          name="location"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSubmit(event.currentTarget.name);
          }}
        >
          <TextInput aria-label="Location" />
          <Button type="submit">Add</Button>
        </form>
      </Drawer>
    </FormDrawer>,
  );

  await userEvent.click(await screen.findByRole("textbox", { name: "Location" }));
  await userEvent.keyboard("{Meta>}{Enter}{/Meta}");

  expect(onSubmit.mock.calls).toEqual([["location"]]);
});
