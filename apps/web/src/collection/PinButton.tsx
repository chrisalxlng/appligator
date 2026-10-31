import { IconButton } from "@appligator/ui";
import { IconPin, IconPinFilled } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface PinButtonProps {
  pinned: boolean;
  pin: UseMutationResult<void, Error, boolean>;
}

// Shows the requested state while it is being saved, so the pin responds to the click at once.
export function PinButton({ pinned, pin }: PinButtonProps) {
  const { t } = useTranslation();
  const isPinned = pin.isPending ? pin.variables : pinned;

  return (
    <IconButton
      variant="surface"
      label={t(isPinned ? "common.unpin" : "common.pin")}
      onClick={() => pin.mutate(!isPinned)}
    >
      {isPinned ? (
        <IconPinFilled size={20} aria-hidden />
      ) : (
        <IconPin size={20} stroke={2} aria-hidden />
      )}
    </IconButton>
  );
}
