import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button/Button.tsx";
import { ToastProvider, useSuccessToast } from "./Toast.tsx";

function ToastDemo() {
  const showSuccess = useSuccessToast();
  return <Button onClick={() => showSuccess("Job added")}>Show toast</Button>;
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
