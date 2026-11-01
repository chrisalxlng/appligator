import { Button, submitKeyShortcuts } from "@appligator/ui";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useShortcutHints } from "./useShortcutHints.ts";

interface SubmitButtonProps {
  icon: Icon;
  pending?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function SubmitButton({ icon: SubmitIcon, children, ...props }: SubmitButtonProps) {
  const shortcutHints = useShortcutHints();

  return (
    <Button
      type="submit"
      shortcutHint={shortcutHints?.submit}
      aria-keyshortcuts={submitKeyShortcuts}
      {...props}
    >
      <SubmitIcon size={20} stroke={2.4} aria-hidden />
      {children}
    </Button>
  );
}
