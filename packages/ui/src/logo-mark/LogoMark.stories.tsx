import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogoMark } from "./LogoMark.tsx";

const meta = {
  title: "Brand/LogoMark",
  component: LogoMark,
} satisfies Meta<typeof LogoMark>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
