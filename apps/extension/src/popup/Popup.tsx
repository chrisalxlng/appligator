import { isActive, sessionKey, type Session } from "../session.ts";
import { JobImportView } from "./JobImportView.tsx";
import { LoginView } from "./LoginView.tsx";
import { useStoredValue } from "./useStoredValue.ts";
import styles from "./Popup.module.css";

export function Popup() {
  const session = useStoredValue<Session>("local", sessionKey);
  if (!session.isLoaded) return null;

  return (
    <main className={styles.popup}>
      {isActive(session.value) ? <JobImportView /> : <LoginView />}
    </main>
  );
}
