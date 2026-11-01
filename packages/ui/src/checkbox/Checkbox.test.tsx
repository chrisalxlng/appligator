import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test } from "vite-plus/test";
import { Checkbox } from "./Checkbox.tsx";

function Salary() {
  const [checked, setChecked] = useState(true);

  return (
    <Checkbox checked={checked} onCheckedChange={setChecked}>
      Salary
    </Checkbox>
  );
}

test("toggles when its label is clicked", async () => {
  render(<Salary />);
  const checkbox = screen.getByRole("checkbox", { name: "Salary" });
  expect(checkbox).toBeChecked();

  await userEvent.click(screen.getByText("Salary"));

  expect(checkbox).not.toBeChecked();
});
