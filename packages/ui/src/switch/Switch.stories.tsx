import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Switch } from "./Switch.tsx";

function ControlledSwitch({ initialChecked }: { initialChecked: boolean }) {
  const [checked, setChecked] = useState(initialChecked);

  return <Switch checked={checked} onCheckedChange={setChecked} aria-label="Assign with AI" />;
}

const meta = {
  title: "Components/Switch",
  component: ControlledSwitch,
  args: { initialChecked: true },
} satisfies Meta<typeof ControlledSwitch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checked: Story = {};

export const Unchecked: Story = {
  args: { initialChecked: false },
};
