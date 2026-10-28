import { Input } from "@base-ui/react/input";
import styles from "./control.module.css";

export type TextInputProps = Omit<Input.Props, "className">;

export function TextInput(props: TextInputProps) {
  return <Input className={styles.control} {...props} />;
}
