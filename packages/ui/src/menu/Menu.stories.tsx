import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { IconButton } from "../button/IconButton.tsx";
import { Menu, MenuItem } from "./Menu.tsx";

const meta = {
  title: "Components/Menu",
  component: Menu,
  args: {
    trigger: (
      <IconButton variant="surface" label="More actions">
        <IconDots size={20} stroke={2.4} aria-hidden />
      </IconButton>
    ),
    children: (
      <>
        <MenuItem icon={<IconPencil size={18} aria-hidden />} onClick={() => {}}>
          Edit
        </MenuItem>
        <MenuItem
          icon={<IconTrash size={18} aria-hidden />}
          variant="destructive"
          onClick={() => {}}
        >
          Delete
        </MenuItem>
      </>
    ),
  },
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
