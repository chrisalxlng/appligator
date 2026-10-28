import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { Drawer } from "../drawer/Drawer.tsx";
import { Field } from "../field/Field.tsx";
import { normalizeHeadings } from "./extensions.ts";
import { RichTextEditor } from "./RichTextEditor.tsx";

const formatLabels = {
  bold: "Bold",
  italic: "Italic",
  heading: "Heading",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
};

test("is labelled by its field and shows the value", () => {
  render(
    <Field label="Description">
      <RichTextEditor
        value="<p><strong>Bold</strong></p>"
        onValueChange={() => {}}
        formatLabels={formatLabels}
      />
    </Field>,
  );

  expect(screen.getByRole("textbox", { name: "Description" })).toContainHTML(
    "<strong>Bold</strong>",
  );
});

test("replaces its content when the value changes", () => {
  const onValueChange = vi.fn();
  const { rerender } = render(
    <RichTextEditor
      aria-label="Description"
      value="<p>Old</p>"
      onValueChange={onValueChange}
      formatLabels={formatLabels}
    />,
  );

  rerender(
    <RichTextEditor
      aria-label="Description"
      value="<p>New</p>"
      onValueChange={onValueChange}
      formatLabels={formatLabels}
    />,
  );

  expect(screen.getByRole("textbox", { name: "Description" })).toHaveTextContent("New");
  expect(onValueChange).not.toHaveBeenCalled();
});

test("turns every heading level into the supported heading", () => {
  expect(normalizeHeadings('<h1 class="a">A</h1><H3>B</H3><h6>C</h6><p>h1</p>')).toBe(
    '<h2 class="a">A</h2><h2>B</h2><h2>C</h2><p>h1</p>',
  );
});

test("shows the format bar with tooltips when text is selected", async () => {
  render(
    <RichTextEditor
      aria-label="Description"
      value="<p>Text</p>"
      onValueChange={() => {}}
      formatLabels={formatLabels}
    />,
  );

  screen.getByRole("textbox", { name: "Description" }).focus();
  await userEvent.keyboard("{Control>}a{/Control}");
  await userEvent.hover(await screen.findByRole("button", { name: "Heading" }));

  expect(await screen.findByText("Heading")).toBeInTheDocument();
});

test("closes the format bar with Escape before closing a surrounding drawer", async () => {
  render(
    <Drawer title="Edit job" closeLabel="Close" trigger={<Button>Edit</Button>}>
      <RichTextEditor
        aria-label="Description"
        value="<p>Text</p>"
        onValueChange={() => {}}
        formatLabels={formatLabels}
      />
    </Drawer>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  (await screen.findByRole("textbox", { name: "Description" })).focus();
  await userEvent.keyboard("{Control>}a{/Control}");
  expect(await screen.findByRole("toolbar")).toBeInTheDocument();

  await userEvent.keyboard("{Escape}");

  expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Edit job" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Description" })).toHaveFocus();

  await userEvent.keyboard("{Escape}");

  expect(screen.queryByRole("dialog", { name: "Edit job" })).not.toBeInTheDocument();
});

test("closes the format bar with Escape from one of its buttons", async () => {
  render(
    <RichTextEditor
      aria-label="Description"
      value="<p>Text</p>"
      onValueChange={() => {}}
      formatLabels={formatLabels}
    />,
  );
  screen.getByRole("textbox", { name: "Description" }).focus();
  await userEvent.keyboard("{Control>}a{/Control}");
  (await screen.findByRole("button", { name: "Bold" })).focus();

  await userEvent.keyboard("{Escape}");

  expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Description" })).toHaveFocus();
});

test("leaves the submit shortcut to the surrounding drawer form", async () => {
  const onValueChange = vi.fn();
  const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
  render(
    <Drawer title="Edit job" closeLabel="Close" open>
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <RichTextEditor
          aria-label="Description"
          value="<p>Text</p>"
          onValueChange={onValueChange}
          formatLabels={formatLabels}
        />
        <Button type="submit">Update</Button>
      </form>
    </Drawer>,
  );

  (await screen.findByRole("textbox", { name: "Description" })).focus();
  await userEvent.keyboard("{Control>}{Enter}{/Control}");

  expect(onSubmit).toHaveBeenCalledOnce();
  expect(onValueChange).not.toHaveBeenCalled();
});
