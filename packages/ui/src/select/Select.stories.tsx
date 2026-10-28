import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Field } from "../field/Field.tsx";
import { Select } from "./Select.tsx";
import styles from "./Select.stories.module.css";

const workModels = [
  { value: "onSite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

function SelectDemo({ initialValue }: { initialValue: string | null }) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className={styles.container}>
      <Field label="Work model">
        <Select
          items={workModels}
          value={value}
          onValueChange={setValue}
          placeholder="Please select"
        />
      </Field>
    </div>
  );
}

const meta = {
  title: "Components/Select",
  component: SelectDemo,
} satisfies Meta<typeof SelectDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { initialValue: null },
};

export const Selected: Story = {
  args: { initialValue: "hybrid" },
};
