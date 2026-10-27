import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "./Button.tsx";

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
