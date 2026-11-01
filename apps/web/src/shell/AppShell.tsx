import { Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./AppShell.module.css";
import { FloatingActionsSlotContext } from "./FloatingActions.tsx";
import { Footer } from "./Footer.tsx";
import { RouteAnnouncer } from "./RouteAnnouncer.tsx";
import { ScrollToTop } from "./ScrollToTop.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { TabBar } from "./TabBar.tsx";
import { useHideBarsOnScroll } from "./useHideBarsOnScroll.ts";
import { useIsDesktop } from "./useMediaQuery.ts";

export function AppShell() {
  const { t } = useTranslation();
  const pathname = useLocation({ select: (location) => location.pathname });
  const mainRef = useRef<HTMLElement>(null);
  const [floatingActionsSlot, setFloatingActionsSlot] = useState<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  useHideBarsOnScroll(shellRef, !isDesktop);

  // Only for keyboard use, because the skip link must stay the first tab stop after loading a page.
  const usesKeyboard = useRef(false);
  useEffect(() => {
    const markKeyboardUse = () => {
      usesKeyboard.current = true;
    };
    window.addEventListener("keydown", markKeyboardUse);
    return () => window.removeEventListener("keydown", markKeyboardUse);
  }, []);

  useEffect(() => {
    if (usesKeyboard.current && document.activeElement === document.body) {
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div ref={shellRef} className={styles.shell}>
      <a
        className={styles.skipLink}
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t("navigation.skipToContent")}
      </a>
      <RouteAnnouncer />
      <Sidebar />
      <main ref={mainRef} id="main" tabIndex={-1} className={styles.main}>
        <FloatingActionsSlotContext value={floatingActionsSlot}>
          <Outlet />
        </FloatingActionsSlotContext>
        <Footer className={styles.footer} />
        {isDesktop && <ScrollToTop scrollsWith="window" className={styles.scrollToTop} />}
      </main>
      <TabBar floatingActionsRef={setFloatingActionsSlot} />
    </div>
  );
}
