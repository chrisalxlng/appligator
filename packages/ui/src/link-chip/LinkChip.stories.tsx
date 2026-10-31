import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../badge/Badge.tsx";
import { LinkChip } from "./LinkChip.tsx";

const meta = {
  title: "Components/LinkChip",
  component: LinkChip,
  args: { href: "#", children: "Lead Developer Frontend" },
} satisfies Meta<typeof LinkChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBadge: Story = {
  args: { badge: <Badge>Applied</Badge> },
};
