import { Outlet } from "@tanstack/react-router";
import { useRef, useState } from "react";
import styles from "./AppShell.module.css";
import { FloatingActionsSlotContext } from "./FloatingActions.tsx";
import { Footer } from "./Footer.tsx";
import { ScrollToTop } from "./ScrollToTop.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { TabBar } from "./TabBar.tsx";
import { useHideBarsOnScroll } from "./useHideBarsOnScroll.ts";
import { useIsDesktop } from "./useMediaQuery.ts";

export function AppShell() {
  const [floatingActionsSlot, setFloatingActionsSlot] = useState<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  useHideBarsOnScroll(shellRef, !isDesktop);

  return (
    <div ref={shellRef} className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
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
