import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Select } from "../select/Select.tsx";
import { DateInput } from "./DateInput.tsx";
import { Field } from "./Field.tsx";
import { Fieldset } from "./Fieldset.tsx";
import { NumberInput } from "./NumberInput.tsx";
import { TextInput } from "./TextInput.tsx";
import styles from "./Field.stories.module.css";

const meta = {
  title: "Components/Field",
  component: Field,
  args: { label: "Company", children: <TextInput defaultValue="Initech GmbH" /> },
  decorators: [
    (Story) => (
      <div className={styles.container}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Text: Story = {};

export const WithError: Story = {
  args: { error: "Please enter a company.", children: <TextInput /> },
};

function DeadlineField() {
  const [deadline, setDeadline] = useState("2026-11-30");

  return (
    <Field label="Deadline">
      <DateInput value={deadline} onValueChange={setDeadline} clearable clearLabel="Clear" />
    </Field>
  );
}

export const Date: Story = {
  render: () => <DeadlineField />,
};

function SalaryFieldset() {
  const [currency, setCurrency] = useState<string | null>("EUR");
  const [min, setMin] = useState<number | null>(65_000);
  const [max, setMax] = useState<number | null>(75_000);

  return (
    <Fieldset legend="Salary">
      <div className={styles.row}>
        <Select
          aria-label="Currency"
          placeholder="Select"
          items={["EUR", "USD"].map((value) => ({ value, label: value }))}
          value={currency}
          onValueChange={setCurrency}
        />
        <NumberInput aria-label="From" locale="de-DE" value={min} onValueChange={setMin} />
        <span>to</span>
        <NumberInput aria-label="To" locale="de-DE" value={max} onValueChange={setMax} />
      </div>
    </Fieldset>
  );
}

export const GroupedControls: Story = {
  render: () => <SalaryFieldset />,
};
