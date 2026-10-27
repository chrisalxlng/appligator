import { LogoMark } from "@appligator/ui";
import styles from "./Brand.module.css";
import { HomeLink } from "./HomeLink.tsx";

export function Brand() {
  return (
    <HomeLink>
      <LogoMark />
      <span className={styles.name}>Appligator</span>
    </HomeLink>
  );
}
