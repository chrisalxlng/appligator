import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button/Button.tsx";
import { IconMail } from "@tabler/icons-react";
import { ToastProvider, useInfoToast, useSuccessToast } from "./Toast.tsx";

function ToastDemo() {
  const showSuccess = useSuccessToast();
  const showInfo = useInfoToast();
  return (
    <>
      <Button onClick={() => showSuccess("Job added")}>Show toast</Button>
      <Button onClick={() => showInfo("1 new email", IconMail)}>Show info toast</Button>
    </>
  );
}

const meta = {
  title: "Components/Toast",
  component: ToastDemo,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof ToastDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {};
