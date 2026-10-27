import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconLogout, IconPlus } from "@tabler/icons-react";
import { IconButton } from "./IconButton.tsx";

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  args: { label: "Add", children: <IconPlus size={20} stroke={2.4} aria-hidden /> },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary" },
};

export const Surface: Story = {
  args: {
    variant: "surface",
    label: "Sign out",
    children: <IconLogout size={20} stroke={2.4} aria-hidden />,
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
