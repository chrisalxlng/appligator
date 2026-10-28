import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { Field } from "../field/Field.tsx";
import { Select } from "./Select.tsx";

const items = [
  { value: "onSite", label: "On-site" },
  { value: "remote", label: "Remote" },
];

test("shows the placeholder until a value is selected", () => {
  render(
    <Field label="Work model">
      <Select items={items} value={null} onValueChange={() => {}} placeholder="Please select" />
    </Field>,
  );

  expect(screen.getByRole("combobox", { name: "Work model" })).toHaveTextContent("Please select");
});

test("shows the label of the selected value", () => {
  render(
    <Select
      aria-label="Work model"
      items={items}
      value="remote"
      onValueChange={() => {}}
      placeholder="Please select"
    />,
  );

  expect(screen.getByRole("combobox", { name: "Work model" })).toHaveTextContent("Remote");
});

test("selects an option", async () => {
  const onValueChange = vi.fn();
  render(
    <Select
      aria-label="Work model"
      items={items}
      value={null}
      onValueChange={onValueChange}
      placeholder="Please select"
    />,
  );

  await userEvent.click(screen.getByRole("combobox", { name: "Work model" }));
  await userEvent.click(await screen.findByRole("option", { name: "Remote" }));

  expect(onValueChange).toHaveBeenCalledWith("remote", expect.anything());
});
