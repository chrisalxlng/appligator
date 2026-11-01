import { MenuItem, useSuccessToast } from "@appligator/ui";
import { IconPin, IconPinFilled } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export interface PinMenuItemProps {
  pinned: boolean;
  pin: UseMutationResult<void, Error, boolean>;
}

// Shows the requested state while it is being saved, so reopening the menu never offers a repeat.
export function PinMenuItem({ pinned, pin }: PinMenuItemProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const isPinned = pin.isPending ? pin.variables : pinned;

  return (
    <MenuItem
      icon={
        isPinned ? (
          <IconPinFilled size={18} aria-hidden />
        ) : (
          <IconPin size={18} stroke={2} aria-hidden />
        )
      }
      onClick={() =>
        pin.mutate(!isPinned, {
          onSuccess: () =>
            showSuccess(t(isPinned ? "common.toast.unpinned" : "common.toast.pinned")),
        })
      }
    >
      {t(isPinned ? "common.unpin" : "common.pin")}
    </MenuItem>
  );
}
