import { useEffect, useEffectEvent } from "react";

export type ShortcutLetter = "N" | "E";

function isInsideDialog(target: EventTarget | null) {
  return target instanceof Element && target.closest('[role="dialog"], [role="alertdialog"]');
}

export function useAltShortcut(letter: ShortcutLetter, onPress: () => void) {
  const handlePress = useEffectEvent(onPress);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const hasOnlyAlt = event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey;
      // On macOS, Option turns letters into other characters, so the physical key is matched.
      if (!hasOnlyAlt || event.code !== `Key${letter}` || isInsideDialog(event.target)) return;

      event.preventDefault();
      handlePress();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [letter]);
}
