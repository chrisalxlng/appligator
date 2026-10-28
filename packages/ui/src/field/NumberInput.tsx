import { NumberField } from "@base-ui/react/number-field";
import styles from "./control.module.css";

export interface NumberInputProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  locale?: Intl.LocalesArgument;
  "aria-label"?: string;
}

export function NumberInput({ "aria-label": ariaLabel, ...props }: NumberInputProps) {
  return (
    <NumberField.Root format={{ maximumFractionDigits: 0 }} {...props}>
      <NumberField.Input className={styles.singleLine} aria-label={ariaLabel} />
    </NumberField.Root>
  );
}
