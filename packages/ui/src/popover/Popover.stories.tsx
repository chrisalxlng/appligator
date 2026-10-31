import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { Button } from "../button/Button.tsx";
import { Popover } from "./Popover.tsx";
import styles from "./Popover.stories.module.css";

function JobPopover() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={anchorRef} onClick={() => setOpen(true)}>
        Apply
      </Button>
      <Popover
        title="Select job"
        closeLabel="Close"
        open={open}
        onOpenChange={setOpen}
        anchor={anchorRef}
      >
        <p className={styles.content}>Pick one of your open jobs.</p>
      </Popover>
    </>
  );
}

const meta = {
  title: "Components/Popover",
  component: JobPopover,
} satisfies Meta<typeof JobPopover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
