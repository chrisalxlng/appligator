import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test } from "vite-plus/test";
import { DateInput } from "./DateInput.tsx";

function Deadline({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <DateInput
      aria-label="Deadline"
      value={value}
      onValueChange={setValue}
      clearable
      clearLabel="Clear"
    />
  );
}

test("offers clearing only when a date is entered", () => {
  render(<Deadline initialValue="" />);

  expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
});

test("clears the date and focuses the input", async () => {
  render(<Deadline initialValue="2026-11-30" />);

  await userEvent.click(screen.getByRole("button", { name: "Clear" }));

  const input = screen.getByLabelText("Deadline");
  expect(input).toHaveValue("");
  expect(input).toHaveFocus();
  expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
});

test("is not clearable by default", () => {
  render(<DateInput aria-label="Deadline" value="2026-11-30" onValueChange={() => {}} />);

  expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
});

test("takes a time along with the date", () => {
  render(
    <DateInput aria-label="Time" value="2026-11-09T10:30" onValueChange={() => {}} withTime />,
  );

  expect(screen.getByLabelText("Time")).toHaveValue("2026-11-09T10:30");
});
