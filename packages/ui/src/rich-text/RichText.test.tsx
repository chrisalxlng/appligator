import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { RichText } from "./RichText.tsx";

test("renders the supported formatting", () => {
  render(
    <RichText html="<h2>Tasks</h2><p><strong>Bold</strong> <em>italic</em></p><ul><li><p>Item</p></li></ul>" />,
  );

  expect(screen.getByRole("heading", { level: 2, name: "Tasks" })).toBeInTheDocument();
  expect(screen.getByText("Bold").tagName).toBe("STRONG");
  expect(screen.getByText("italic").tagName).toBe("EM");
  expect(screen.getByRole("listitem")).toHaveTextContent("Item");
});

test("drops unsupported and unsafe markup", () => {
  const { container } = render(
    <RichText
      html={`<p>Text<img src="x" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">link</a></p>`}
    />,
  );

  expect(container.querySelector("img, script, a, [onerror]")).toBeNull();
  expect(container).toHaveTextContent("Textlink");
});

test("is not editable", () => {
  render(<RichText html="<p>Text</p>" />);

  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
