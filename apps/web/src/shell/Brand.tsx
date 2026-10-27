import { LogoMark } from "@appligator/ui";
import styles from "./Brand.module.css";

export function Brand() {
  return (
    <div className={styles.brand}>
      <LogoMark />
      <span className={styles.name}>Appligator</span>
    </div>
  );
}
