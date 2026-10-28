import type { KeyboardEvent } from "react";

export const submitKeyShortcuts = "Control+Enter Meta+Enter";

export function isSubmitShortcut(event: KeyboardEvent) {
  return event.key === "Enter" && (event.metaKey || event.ctrlKey);
}
