import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
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
