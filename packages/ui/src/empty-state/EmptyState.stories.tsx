import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "../button/Button.tsx";
import { LogoMark } from "../logo-mark/LogoMark.tsx";
import { EmptyState } from "./EmptyState.tsx";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  args: {
    illustration: <LogoMark />,
    title: "No jobs yet",
    description: "Add your first job.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: (
      <Button>
        <IconPlus size={20} stroke={2.4} aria-hidden />
        Add
      </Button>
    ),
  },
};
