import { Spinner } from "@appligator/ui";
import styles from "./PageSpinner.module.css";

export function PageSpinner({ label }: { label: string }) {
  return (
    <div className={styles.pageSpinner}>
      <Spinner label={label} />
    </div>
  );
}
