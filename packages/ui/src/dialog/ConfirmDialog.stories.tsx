import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../button/Button.tsx";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog.tsx";

function ConfirmDialogDemo(props: Omit<ConfirmDialogProps, "open" | "onOpenChange">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

const meta = {
  title: "Components/ConfirmDialog",
  component: ConfirmDialogDemo,
  args: {
    title: "Delete job?",
    description: "The job “Lead Developer Frontend” will be deleted permanently.",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    onConfirm: () => {},
  },
} satisfies Meta<typeof ConfirmDialogDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = {
  args: { pending: true },
};
