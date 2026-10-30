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
import styles from "./LocationList.module.css";

interface LocationListProps {
  locations: string[];
  onChange: (locations: string[]) => void;
}

export function LocationList({ locations, onChange }: LocationListProps) {
  const { t } = useTranslation();
  const [drawer, setDrawer] = useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const editedLocation = drawer.index === null ? "" : locations[drawer.index];

  function save(location: string) {
    onChange(
      drawer.index === null
        ? [...locations, location]
        : locations.map((current, index) => (index === drawer.index ? location : current)),
    );
    setDrawer((current) => ({ ...current, open: false }));
  }

  return (
    <Fieldset legend={t("jobs.form.locations")}>
      {locations.length > 0 && (
        <ul className={styles.list}>
          {locations.map((location, index) => (
            <li key={`${index}-${location}`} className={styles.item}>
              <button
                type="button"
                className={styles.itemButton}
                onClick={() => setDrawer({ open: true, index })}
              >
                {location}
              </button>
              <IconButton
                variant="surface"
                label={t("jobs.location.remove", { location })}
                onClick={() => onChange(locations.filter((_, current) => current !== index))}
              >
                <IconTrash size={20} stroke={2} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {locations.length < jobLimits.locations && (
        <button
          type="button"
          className={styles.addButton}
          aria-label={t("jobs.location.addTitle")}
          onClick={() => setDrawer({ open: true, index: null })}
        >
          <IconPlus size={20} stroke={2.4} aria-hidden />
          {t("jobs.location.add")}
        </button>
      )}
      <Drawer
        title={t(drawer.index === null ? "jobs.location.addTitle" : "jobs.location.editTitle")}
        closeLabel={t("jobs.close")}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
        initialFocus={inputRef}
      >
        <LocationForm
          inputRef={inputRef}
          initialValue={editedLocation ?? ""}
          isEditing={drawer.index !== null}
          onSave={save}
        />
      </Drawer>
    </Fieldset>
  );
}

type LocationError = "required" | "tooLong";

function locationError(location: string): LocationError | undefined {
  if (!location) return "required";
  return location.length > jobLimits.textLength ? "tooLong" : undefined;
}

interface LocationFormProps {
  inputRef: RefObject<HTMLInputElement | null>;
  initialValue: string;
  isEditing: boolean;
  onSave: (location: string) => void;
}

function LocationForm({ inputRef, initialValue, isEditing, onSave }: LocationFormProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<LocationError>();
  const shortcutHints = useShortcutHints();

  function submit(event: FormEvent) {
    event.preventDefault();
    // The drawer is portaled, but React still bubbles the submit to the surrounding job form.
    event.stopPropagation();
    const location = value.trim();
    const invalid = locationError(location);
    if (invalid) setError(invalid);
    else onSave(location);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t("jobs.location.label")} error={error && t(`jobs.location.${error}`)}>
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
        {t(isEditing ? "jobs.location.update" : "jobs.location.add")}
      </Button>
    </form>
  );
}
