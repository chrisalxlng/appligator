import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "./Button.tsx";
import styles from "./Button.stories.module.css";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Add" },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Sign out" },
};

export const Surface: Story = {
  args: { variant: "surface" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
};

export const HighlightSecondary: Story = {
  args: { variant: "highlightSecondary", children: "Dismiss" },
  decorators: [
    (Story) => (
      <div className={styles.highlightSurface}>
        <Story />
      </div>
    ),
  ],
};

export const DestructiveSecondary: Story = {
  args: { variant: "destructiveSecondary", children: "Try again" },
  decorators: [
    (Story) => (
      <div className={styles.destructiveSurface}>
        <Story />
      </div>
    ),
  ],
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <IconPlus size={20} stroke={2.4} aria-hidden />
        Add
      </>
    ),
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Pending: Story = {
  args: { pending: true },
};

export const WithShortcutHint: Story = {
  args: { shortcutHint: "⌘ ↵", children: "Save" },
};
