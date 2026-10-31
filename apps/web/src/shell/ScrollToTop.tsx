import { IconButton } from "@appligator/ui";
import { IconArrowUp } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./ScrollToTop.module.css";
import { useIsScrolledFar, type ScrollSource } from "./useIsScrolledFar.ts";

interface ScrollToTopProps {
  scrollsWith: "window" | "parent";
  className?: string;
}

function scrollToTop(source: ScrollSource) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  source.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
}

export function ScrollToTop({ scrollsWith, className }: ScrollToTopProps) {
  const { t } = useTranslation();
  const [parent, setParent] = useState<HTMLElement | null>(null);
  const attach = useCallback(
    (node: HTMLElement | null) => setParent(node?.parentElement ?? null),
    [],
  );
  const source = scrollsWith === "window" ? window : parent;
  const isVisible = useIsScrolledFar(source);
  const classNames = [scrollsWith === "parent" && styles.parent, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={scrollsWith === "parent" ? attach : undefined} className={classNames}>
      {isVisible && source && (
        <IconButton
          variant="surface"
          label={t("common.scrollToTop")}
          className={styles.button}
          onClick={() => scrollToTop(source)}
        >
          <IconArrowUp size={20} stroke={2.4} aria-hidden />
        </IconButton>
      )}
    </div>
  );
}
