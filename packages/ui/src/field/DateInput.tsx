import { Input } from "@base-ui/react/input";
import { useRef } from "react";
import { ClearableControl, type ClearableProps } from "./ClearableControl.tsx";
import styles from "./control.module.css";

export type DateInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  "aria-label"?: string;
} & ClearableProps;

export function DateInput(props: DateInputProps) {
  const { value, onValueChange, "aria-label": ariaLabel } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  const input = (
    <Input
      ref={inputRef}
      type="date"
      className={styles.control}
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
    />
  );

  if (!props.clearable) return input;

  return (
    <ClearableControl
      canClear={value !== ""}
      clearLabel={props.clearLabel}
      onClear={() => {
        onValueChange("");
        inputRef.current?.focus();
      }}
    >
      {input}
    </ClearableControl>
  );
}
