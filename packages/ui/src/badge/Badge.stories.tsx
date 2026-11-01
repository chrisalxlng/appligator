import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge.tsx";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Open" },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: { tone: "neutral" },
};

export const Success: Story = {
  args: { tone: "success", children: "Applied" },
};

export const Active: Story = {
  args: { tone: "active" },
};

export const Highlight: Story = {
  args: { tone: "highlight", children: "Offer" },
};

export const Negative: Story = {
  args: { tone: "negative", children: "Rejected" },
};
