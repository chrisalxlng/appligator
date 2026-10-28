import { Select as BaseSelect } from "@base-ui/react/select";
import { IconCaretDownFilled, IconCheck } from "@tabler/icons-react";
import styles from "./Select.module.css";

export interface SelectItem<Value extends string> {
  value: Value;
  label: string;
}

export interface SelectProps<Value extends string> {
  items: SelectItem<Value>[];
  value: Value | null;
  onValueChange: (value: Value | null) => void;
  placeholder: string;
  "aria-label"?: string;
}

export function Select<Value extends string>({
  items,
  value,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
}: SelectProps<Value>) {
  return (
    <BaseSelect.Root items={items} value={value} onValueChange={onValueChange}>
      <BaseSelect.Trigger className={styles.trigger} aria-label={ariaLabel}>
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
}
