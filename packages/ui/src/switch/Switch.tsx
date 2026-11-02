import { Switch as BaseSwitch } from "@base-ui/react/switch";
import styles from "./Switch.module.css";

export type SwitchProps = Pick<
  BaseSwitch.Root.Props,
  "checked" | "onCheckedChange" | "aria-label" | "aria-labelledby" | "aria-describedby"
>;

export function Switch(props: SwitchProps) {
  return (
    <BaseSwitch.Root className={styles.switch} {...props}>
      <BaseSwitch.Thumb className={styles.thumb} />
    </BaseSwitch.Root>
  );
}
