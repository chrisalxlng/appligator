import { Autocomplete } from "@base-ui/react/autocomplete";
import { IconSearch } from "@tabler/icons-react";
import type { ReactNode, RefObject } from "react";
import controlStyles from "../field/control.module.css";
import styles from "./SearchList.module.css";

export interface SearchListProps<Item> {
  items: readonly Item[];
  search: string;
  onSearchChange: (search: string) => void;
  onSelect: (item: Item) => void;
  itemKey: (item: Item) => string;
  renderItem: (item: Item) => ReactNode;
  inputLabel: string;
  placeholder: string;
  listLabel: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  status?: ReactNode;
}

// The list stays open and highlights the first item, so Enter selects it right away.
export function SearchList<Item>({
  items,
  search,
  onSearchChange,
  onSelect,
  itemKey,
  renderItem,
  inputLabel,
  placeholder,
  listLabel,
  inputRef,
  status,
}: SearchListProps<Item>) {
  return (
    <Autocomplete.Root
      open
      inline
      items={items}
      filter={null}
      autoHighlight="always"
      keepHighlight
      itemToStringValue={itemKey}
      value={search}
      onValueChange={(value, { reason }) => {
        if (reason !== "item-press") onSearchChange(value);
      }}
    >
      <Autocomplete.InputGroup className={styles.inputGroup}>
        <IconSearch className={styles.searchIcon} size={20} stroke={2} aria-hidden />
        <Autocomplete.Input
          ref={inputRef}
          className={`${controlStyles.singleLine} ${styles.input}`}
          aria-label={inputLabel}
          placeholder={placeholder}
        />
      </Autocomplete.InputGroup>
      {status ? (
        <div className={styles.status}>{status}</div>
      ) : (
        <Autocomplete.List className={styles.list} aria-label={listLabel}>
          {(item: Item) => (
            <Autocomplete.Item
              key={itemKey(item)}
              value={item}
              className={styles.item}
              onClick={() => onSelect(item)}
            >
              {renderItem(item)}
            </Autocomplete.Item>
          )}
        </Autocomplete.List>
      )}
    </Autocomplete.Root>
  );
}
