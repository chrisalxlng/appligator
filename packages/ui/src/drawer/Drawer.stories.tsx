import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { Button } from "../button/Button.tsx";
import { Field } from "../field/Field.tsx";
import { TextInput } from "../field/TextInput.tsx";
import { Drawer } from "./Drawer.tsx";
import styles from "./Drawer.stories.module.css";

const meta = {
  title: "Components/Drawer",
  component: Drawer,
  args: {
    title: "Add location",
    closeLabel: "Close",
    trigger: <Button>Open drawer</Button>,
    children: (
      <form className={styles.form}>
        <Field label="Location">
          <TextInput />
        </Field>
        <Button type="submit">
          <IconPlus size={20} stroke={2.4} aria-hidden />
          Add
        </Button>
      </form>
    ),
  },
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Nested: Story = {
  args: {
    title: "Edit job",
    children: (
      <div className={styles.form}>
        {["Company", "Position", "Link", "Deadline"].map((label) => (
          <Field key={label} label={label}>
            <TextInput />
          </Field>
        ))}
        <Drawer
          title="Edit location"
          closeLabel="Close"
          trigger={<Button variant="secondary">Edit location</Button>}
        >
          <form className={styles.form}>
            <Field label="Location">
              <TextInput defaultValue="Düsseldorf" />
            </Field>
            <Button type="submit">
              <IconPencil size={20} stroke={2.4} aria-hidden />
              Update
            </Button>
          </form>
        </Drawer>
      </div>
    ),
  },
};
