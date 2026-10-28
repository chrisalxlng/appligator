import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import styles from "./AppShell.module.css";
import { FloatingActionsSlotContext } from "./FloatingActions.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { TabBar } from "./TabBar.tsx";

export function AppShell() {
  const [floatingActionsSlot, setFloatingActionsSlot] = useState<HTMLElement | null>(null);

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <FloatingActionsSlotContext value={floatingActionsSlot}>
          <Outlet />
        </FloatingActionsSlotContext>
      </main>
      <TabBar floatingActionsRef={setFloatingActionsSlot} />
    </div>
  );
}
