import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button/Button.tsx";
import { Tooltip } from "./Tooltip.tsx";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  args: { label: "Saves your changes", children: <Button>Save</Button> },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
