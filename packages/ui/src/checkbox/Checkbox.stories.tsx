import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./Checkbox.tsx";

function ControlledCheckbox({ initialChecked }: { initialChecked: boolean }) {
  const [checked, setChecked] = useState(initialChecked);

  return (
    <Checkbox checked={checked} onCheckedChange={setChecked}>
      Salary
    </Checkbox>
  );
}

const meta = {
  title: "Components/Checkbox",
  component: ControlledCheckbox,
  args: { initialChecked: true },
} satisfies Meta<typeof ControlledCheckbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checked: Story = {};

export const Unchecked: Story = {
  args: { initialChecked: false },
};
