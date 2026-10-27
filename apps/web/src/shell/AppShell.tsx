import { Outlet } from "@tanstack/react-router";
import styles from "./AppShell.module.css";
import { Sidebar } from "./Sidebar.tsx";
import { TabBar } from "./TabBar.tsx";

export function AppShell() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
