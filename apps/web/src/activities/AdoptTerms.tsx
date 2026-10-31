import { applicationInputSchema, type Activity, type Application } from "@appligator/shared";
import { Button, Checkbox, Drawer, useSuccessToast } from "@appligator/ui";
import { IconArrowRight, IconArrowsDiff, IconCheck } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSaveApplication } from "../applications/applicationQueries.ts";
import { NotSpecified } from "../collection/DetailView.tsx";
import { useDetails } from "../details/DetailsSection.tsx";
import { useReviewDetails } from "./activityQueries.ts";
import styles from "./AdoptTerms.module.css";
import type { TermsDifference } from "./termsDifferences.ts";

interface AdoptTermsProps {
  application: Application;
  activity: Activity;
  differences: TermsDifference[];
}

export function AdoptTermsHint(props: AdoptTermsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.hint}>
      <IconArrowsDiff size={20} stroke={2} aria-hidden />
      <p className={styles.hintText}>
        {t("activities.adopt.hint", { count: props.differences.length })}
      </p>
      <Button variant="highlightSecondary" onClick={() => setOpen(true)}>
        {t("activities.adopt.action")}
      </Button>
      <Drawer
        title={t("activities.adopt.title")}
        closeLabel={t("common.close")}
        open={open}
        onOpenChange={setOpen}
      >
        <AdoptTermsForm {...props} onDone={() => setOpen(false)} />
      </Drawer>
    </div>
  );
}

interface AdoptTermsFormProps extends AdoptTermsProps {
  onDone: () => void;
}

function useDetailValues(details: Application) {
  const entries = useDetails(details);
  return (key: string): ReactNode =>
    key === "position"
      ? details.position
      : (entries.find((entry) => entry.key === key)?.value ?? <NotSpecified />);
}

function AdoptTermsForm({ application, activity, differences, onDone }: AdoptTermsFormProps) {
  const { t } = useTranslation();
  const save = useSaveApplication(application.id);
  const review = useReviewDetails(application.id, activity.id);
  const showSuccess = useSuccessToast();
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

  async function adopt() {
    const changes = differences
      .filter(({ key }) => selected.has(key))
      .map(({ changes: groupChanges }) => groupChanges);
    await save.mutateAsync(
      applicationInputSchema.parse(Object.assign({}, application, ...changes)),
    );
    await review.mutateAsync(undefined);
    showSuccess(t("activities.adopt.toast"));
    onDone();
  }

  return (
    <div className={styles.form}>
      <p className={styles.description}>{t("activities.adopt.description")}</p>
      <ul className={styles.differences}>
        {differences.map(({ key }) => (
          <li key={key}>
            <Checkbox
              checked={selected.has(key)}
              onCheckedChange={(checked) => toggle(key, checked)}
            >
              <span className={styles.label}>{label(key)}</span>
              <span className={styles.change}>
                <span className={styles.current}>{currentValue(key)}</span>
                <IconArrowRight size={16} stroke={2} aria-label={t("activities.adopt.becomes")} />
                <span>{adoptedValue(key)}</span>
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
      <Button
        pending={isPending}
        disabled={selected.size === 0}
        onClick={() => void adopt().catch(() => {})}
      >
        <IconCheck size={20} stroke={2.4} aria-hidden />
        {t("activities.adopt.submit", { count: selected.size })}
      </Button>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => void review.mutateAsync(undefined).then(onDone, () => {})}
      >
        {t("activities.adopt.ignore")}
      </Button>
    </div>
  );
}
