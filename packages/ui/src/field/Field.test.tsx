import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vite-plus/test";
import { Field } from "./Field.tsx";
import { Fieldset } from "./Fieldset.tsx";
import { NumberInput } from "./NumberInput.tsx";
import { TextInput } from "./TextInput.tsx";

test("labels its control", async () => {
  render(
    <Field label="Company">
      <TextInput />
    </Field>,
  );

  await userEvent.type(screen.getByRole("textbox", { name: "Company" }), "Initech");

  expect(screen.getByRole("textbox", { name: "Company" })).toHaveValue("Initech");
});

test("marks its control as invalid and shows the error", () => {
  render(
    <Field label="Company" error="Please enter a company.">
      <TextInput />
    </Field>,
  );

  expect(screen.getByRole("textbox", { name: "Company" })).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("Please enter a company.")).toBeInTheDocument();
});

test("groups controls under a legend and shows the error", () => {
  render(
    <Fieldset legend="Salary" error="The minimum must not exceed the maximum.">
      <TextInput aria-label="From" />
    </Fieldset>,
  );

  expect(screen.getByRole("group", { name: "Salary" })).toContainElement(
    screen.getByRole("textbox", { name: "From" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("The minimum must not exceed the maximum.");
});

test("parses and formats numbers in the given locale", async () => {
  const onValueChange = vi.fn();
  function Demo() {
    const [value, setValue] = useState<number | null>(null);
    return (
      <NumberInput
        aria-label="Salary"
        locale="de-DE"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange(next);
        }}
      />
    );
  }
  render(<Demo />);
  const input = screen.getByRole("textbox", { name: "Salary" });

  await userEvent.type(input, "65000");
  await userEvent.tab();

  expect(onValueChange).toHaveBeenLastCalledWith(65_000);
  expect(input).toHaveValue("65.000");
});
