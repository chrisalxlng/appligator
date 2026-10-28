import { Select as BaseSelect } from "@base-ui/react/select";
import { IconCaretDownFilled, IconCheck } from "@tabler/icons-react";
import { useRef } from "react";
import { ClearableControl, type ClearableProps } from "../field/ClearableControl.tsx";
import styles from "./Select.module.css";

export interface SelectItem<Value extends string> {
  value: Value;
  label: string;
}

export type SelectProps<Value extends string> = {
  items: SelectItem<Value>[];
  value: Value | null;
  onValueChange: (value: Value | null) => void;
  placeholder: string;
  "aria-label"?: string;
} & ClearableProps;

export function Select<Value extends string>(props: SelectProps<Value>) {
  const { items, value, onValueChange, placeholder, "aria-label": ariaLabel } = props;
  const triggerRef = useRef<HTMLButtonElement>(null);

  const select = (
    <BaseSelect.Root items={items} value={value} onValueChange={onValueChange}>
      <BaseSelect.Trigger ref={triggerRef} className={styles.trigger} aria-label={ariaLabel}>
        <BaseSelect.Value className={styles.value} placeholder={placeholder} />
        <BaseSelect.Icon className={styles.icon}>
          <IconCaretDownFilled size={16} aria-hidden />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className={styles.positioner} sideOffset={4}>
          <BaseSelect.Popup className={styles.popup}>
            <BaseSelect.List>
              {items.map((item) => (
                <BaseSelect.Item key={item.value} value={item.value} className={styles.item}>
                  <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className={styles.indicator}>
                    <IconCheck size={16} stroke={2.4} aria-hidden />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );

  if (!props.clearable) return select;

  return (
    <ClearableControl
      canClear={value !== null}
      clearLabel={props.clearLabel}
      onClear={() => {
        onValueChange(null);
        triggerRef.current?.focus();
      }}
    >
      {select}
    </ClearableControl>
  );
}
