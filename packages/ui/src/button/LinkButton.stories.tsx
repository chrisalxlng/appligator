import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconArrowRight } from "@tabler/icons-react";
import { LinkButton } from "./LinkButton.tsx";

const meta = {
  title: "Components/LinkButton",
  component: LinkButton,
  args: {
    href: "#",
    children: (
      <>
        <IconArrowRight size={20} stroke={2.4} aria-hidden />
        Startseite öffnen
      </>
    ),
  },
} satisfies Meta<typeof LinkButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary" },
};
