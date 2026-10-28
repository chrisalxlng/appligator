import type { Meta, StoryObj } from "@storybook/react-vite";
import { AddButton } from "./AddButton.tsx";

const meta = {
  title: "Components/AddButton",
  component: AddButton,
  args: { children: "Add" },
} satisfies Meta<typeof AddButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
