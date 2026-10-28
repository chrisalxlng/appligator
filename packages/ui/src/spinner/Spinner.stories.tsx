import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./Spinner.tsx";

const meta = {
  title: "Components/Spinner",
  component: Spinner,
  args: { label: "Loading jobs" },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
