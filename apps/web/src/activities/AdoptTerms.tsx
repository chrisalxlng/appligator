import { applicationInputSchema, type Activity, type Application } from "@appligator/shared";
import { Button, Checkbox, Drawer, submitKeyShortcuts, useSuccessToast } from "@appligator/ui";
import { IconArrowRight, IconArrowsDiff, IconCheck } from "@tabler/icons-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSaveApplication } from "../applications/applicationQueries.ts";
import { NotSpecified } from "../collection/DetailView.tsx";
import { useDetails } from "../details/DetailsSection.tsx";
import formStyles from "../details/form.module.css";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { useReviewDetails } from "./activityQueries.ts";
import styles from "./AdoptTerms.module.css";
import { collectDifferences, type TermsDifference } from "./termsDifferences.ts";
import { useActivityDateLabel } from "./useActivityDateLabel.ts";

interface AdoptTermsProps {
  application: Application;
  activities: Activity[];
}

function differencesOf({ application, activities }: AdoptTermsProps) {
  return collectDifferences(activities, application);
}

export function AdoptTermsHint(props: AdoptTermsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = differencesOf(props).length;

  if (count === 0) return null;

  return (
    <div className={styles.hint}>
      <IconArrowsDiff size={20} stroke={2} aria-hidden />
      <p className={styles.hintText}>{t("activities.adopt.hint", { count })}</p>
      <Button variant="highlightSecondary" onClick={() => setOpen(true)}>
        {t("activities.adopt.action")}
      </Button>
      <AdoptTermsDrawer {...props} open={open} onOpenChange={setOpen} />
    </div>
  );
}

interface AdoptTermsDrawerProps extends AdoptTermsProps {
  /** Opens only if this activity contributes a difference, e.g. right after it was saved. */
  openFor?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Opens only while values of the details would change; values for empty details are taken over anyway. */
export function AdoptTermsDrawer({ openFor, open, onOpenChange, ...props }: AdoptTermsDrawerProps) {
  const { t } = useTranslation();
  const differences = differencesOf(props);
  const isRelevant =
    openFor === undefined || differences.some(({ activity }) => activity.id === openFor);

  return (
    <Drawer
      title={t("activities.adopt.title")}
      closeLabel={t("common.close")}
      open={open && isRelevant && differences.length > 0}
      onOpenChange={onOpenChange}
    >
      {differences.length > 0 && (
        <AdoptTermsForm
          application={props.application}
          differences={differences}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Drawer>
  );
}

interface AdoptTermsFormProps {
  application: Application;
  differences: TermsDifference[];
  onDone: () => void;
}

function useDetailValues(details: Application) {
  const entries = useDetails(details);
  return (key: string): ReactNode =>
    key === "position"
      ? details.position
      : (entries.find((entry) => entry.key === key)?.value ?? <NotSpecified />);
}

function AdoptTermsForm({ application, differences, onDone }: AdoptTermsFormProps) {
  const { t } = useTranslation();
  const save = useSaveApplication(application.id);
  const review = useReviewDetails(application.id);
  const dateLabel = useActivityDateLabel();
  const sourceIds = [...new Set(differences.map(({ activity }) => activity.id))];
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();
  const [selected, setSelected] = useState(() => new Set(differences.map(({ key }) => key)));
  const adopted: Application = Object.assign(
    {},
    application,
    ...differences.map(({ changes }) => changes),
  );
  const currentValue = useDetailValues(application);
  const adoptedValue = useDetailValues(adopted);
  const adoptedLabels = useDetails(adopted);
  const isPending = save.isPending || review.isPending;

  function label(key: string) {
    if (key === "position") return t("fields.position");
    return adoptedLabels.find((entry) => entry.key === key)!.label;
  }

  function toggle(key: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (selected.size > 0 && !isPending) void adopt().catch(() => {});
  }

  async function adopt() {
    const changes = differences
      .filter(({ key }) => selected.has(key))
      .map(({ changes: groupChanges }) => groupChanges);
    await save.mutateAsync(
      applicationInputSchema.parse(Object.assign({}, application, ...changes)),
    );
    await review.mutateAsync(sourceIds);
    showSuccess(t("activities.adopt.toast"));
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.description}>{t("activities.adopt.description")}</p>
      <ul className={styles.differences}>
        {differences.map(({ key, activity }) => (
          <li key={key}>
            <Checkbox
              checked={selected.has(key)}
              onCheckedChange={(checked) => toggle(key, checked)}
            >
              <span className={styles.difference}>
                <span className={styles.label}>{label(key)}</span>
                <span className={styles.change}>
                  <span className={styles.current}>{currentValue(key)}</span>
                  <IconArrowRight size={16} stroke={2} aria-label={t("activities.adopt.becomes")} />
                  <span>{adoptedValue(key)}</span>
                </span>
                <span className={styles.source}>
                  {t(`activities.types.${activity.type}.label`)} • {dateLabel(activity.occurredAt)}
                </span>
              </span>
            </Checkbox>
          </li>
        ))}
      </ul>
      {(save.isError || review.isError) && (
        <p role="alert" className={styles.error}>
          {t("activities.adopt.error")}
        </p>
      )}
      <div className={formStyles.actions}>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => void review.mutateAsync(sourceIds).then(onDone, () => {})}
        >
          {t("activities.adopt.ignore")}
        </Button>
        <Button
          type="submit"
          pending={isPending}
          disabled={selected.size === 0}
          shortcutHint={shortcutHints?.submit}
          aria-keyshortcuts={submitKeyShortcuts}
        >
          <IconCheck size={20} stroke={2.4} aria-hidden />
          {t("activities.adopt.submit")}
        </Button>
      </div>
    </form>
  );
}
