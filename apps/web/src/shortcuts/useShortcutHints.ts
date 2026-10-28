import { useTranslation } from "react-i18next";
import { useHasFinePointer } from "../shell/useMediaQuery.ts";
import type { ShortcutLetter } from "./useAltShortcut.ts";

const isApple = /Mac|iPhone|iPad/.test(navigator.userAgent);

export function useShortcutHints() {
  const { t } = useTranslation();
  const hasFinePointer = useHasFinePointer();
  if (!hasFinePointer) return undefined;

  return {
    submit: isApple ? "⌘↵" : t("shortcuts.submit"),
    alt: (letter: ShortcutLetter) => (isApple ? `⌥${letter}` : `Alt+${letter}`),
  };
}
