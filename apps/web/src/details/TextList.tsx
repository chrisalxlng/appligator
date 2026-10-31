import { jobLimits } from "@appligator/shared";
import {
  Button,
  Drawer,
  Field,
  Fieldset,
  IconButton,
  submitKeyShortcuts,
  TextInput,
} from "@appligator/ui";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import styles from "./list.module.css";

type TextListKind = "location" | "bonus" | "benefit";

interface TextListProps {
  kind: TextListKind;
  legend: string;
  items: string[];
  onChange: (items: string[]) => void;
}

export function TextList({ kind, legend, items, onChange }: TextListProps) {
  const { t } = useTranslation();
  const [drawer, setDrawer] = useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const editedItem = drawer.index === null ? "" : items[drawer.index];

  function save(item: string) {
    onChange(
      drawer.index === null
        ? [...items, item]
        : items.map((current, index) => (index === drawer.index ? item : current)),
    );
    setDrawer((current) => ({ ...current, open: false }));
  }

  return (
    <Fieldset legend={legend}>
      {items.length > 0 && (
        <ul className={styles.list}>
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className={styles.item}>
              <button
                type="button"
                className={styles.itemButton}
                onClick={() => setDrawer({ open: true, index })}
              >
                {item}
              </button>
              <IconButton
                variant="surface"
                className={styles.itemAction}
                label={t(`textList.${kind}.remove`, { item })}
                onClick={() => onChange(items.filter((_, current) => current !== index))}
              >
                <IconTrash size={20} stroke={2} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {items.length < jobLimits.listItems && (
        <button
          type="button"
          className={styles.addButton}
          aria-label={t(`textList.${kind}.addTitle`)}
          onClick={() => setDrawer({ open: true, index: null })}
        >
          <IconPlus size={20} stroke={2.4} aria-hidden />
          {t("textList.add")}
        </button>
      )}
      <Drawer
        title={t(
          drawer.index === null ? `textList.${kind}.addTitle` : `textList.${kind}.editTitle`,
        )}
        closeLabel={t("common.close")}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
        initialFocus={inputRef}
      >
        <TextForm
          kind={kind}
          inputRef={inputRef}
          initialValue={editedItem ?? ""}
          isEditing={drawer.index !== null}
          onSave={save}
        />
      </Drawer>
    </Fieldset>
  );
}

type TextError = "required" | "tooLong";

function textError(text: string): TextError | undefined {
  if (!text) return "required";
  return text.length > jobLimits.textLength ? "tooLong" : undefined;
}

interface TextFormProps {
  kind: TextListKind;
  inputRef: RefObject<HTMLInputElement | null>;
  initialValue: string;
  isEditing: boolean;
  onSave: (text: string) => void;
}

function TextForm({ kind, inputRef, initialValue, isEditing, onSave }: TextFormProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<TextError>();
  const shortcutHints = useShortcutHints();

  function submit(event: FormEvent) {
    event.preventDefault();
    // The drawer is portaled, but React still bubbles the submit to the surrounding job form.
    event.stopPropagation();
    const text = value.trim();
    const invalid = textError(text);
    if (invalid) setError(invalid);
    else onSave(text);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t(`textList.${kind}.label`)} error={error && t(`textList.${kind}.${error}`)}>
        <TextInput ref={inputRef} value={value} onValueChange={setValue} />
      </Field>
      <Button
        type="submit"
        shortcutHint={shortcutHints?.submit}
        aria-keyshortcuts={submitKeyShortcuts}
      >
        {isEditing ? (
          <IconPencil size={20} stroke={2.4} aria-hidden />
        ) : (
          <IconPlus size={20} stroke={2.4} aria-hidden />
        )}
        {t(isEditing ? "textList.update" : "textList.add")}
      </Button>
    </form>
  );
}
