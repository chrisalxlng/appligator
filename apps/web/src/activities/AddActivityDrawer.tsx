import type { Activity, ActivityType, Application } from "@appligator/shared";
import { Button, Drawer, useSuccessToast } from "@appligator/ui";
import { IconChevronRight, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityForm } from "./ActivityForm.tsx";
import { useAddActivity, useDiffersFromDetails } from "./activityQueries.ts";
import { rankActivityTypes } from "./activityRelevance.ts";
import { AdoptTermsDrawer } from "./AdoptTerms.tsx";
import styles from "./AddActivityDrawer.module.css";

const mostRelevantCount = 5;

interface AddActivityDrawerProps {
  application: Application;
  activities: Activity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddActivityDrawer({
  application,
  activities,
  open,
  onOpenChange,
}: AddActivityDrawerProps) {
  const { t } = useTranslation();
  const [showsAll, setShowsAll] = useState(false);
  const [selected, setSelected] = useState<{ type: ActivityType | null; open: boolean }>({
    type: null,
    open: false,
  });
  const differsFromDetails = useDiffersFromDetails(application.id);
  const [isAdopting, setIsAdopting] = useState(false);
  const rankedTypes = rankActivityTypes(activities.map(({ type }) => type));
  const shownTypes = showsAll ? rankedTypes : rankedTypes.slice(0, mostRelevantCount);

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setShowsAll(false);
    onOpenChange(nextOpen);
  }

  return (
    <>
      <Drawer
        title={t("activities.form.addTitle")}
        closeLabel={t("common.close")}
        open={open}
        onOpenChange={changeOpen}
      >
        <div className={styles.picker}>
          <ul className={styles.types}>
            {shownTypes.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  className={styles.type}
                  onClick={() => setSelected({ type, open: true })}
                >
                  <span className={styles.typeText}>
                    <span className={styles.typeLabel}>{t(`activities.types.${type}.label`)}</span>
                    <span className={styles.typeDescription}>
                      {t(`activities.types.${type}.description`)}
                    </span>
                  </span>
                  <IconChevronRight size={20} stroke={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => setShowsAll((current) => !current)}>
            {t(showsAll ? "activities.picker.showLess" : "activities.picker.showMore")}
          </Button>
        </div>
        <Drawer
          title={selected.type ? t(`activities.types.${selected.type}.label`) : ""}
          closeLabel={t("common.close")}
          open={selected.open}
          onOpenChange={(nextOpen) => setSelected((current) => ({ ...current, open: nextOpen }))}
        >
          {selected.type && (
            <NewActivityForm
              key={selected.type}
              applicationId={application.id}
              type={selected.type}
              onSaved={(activity) => {
                setSelected((current) => ({ ...current, open: false }));
                changeOpen(false);
                setIsAdopting(differsFromDetails(activity.id));
              }}
            />
          )}
        </Drawer>
      </Drawer>
      <AdoptTermsDrawer
        application={application}
        activities={activities}
        open={isAdopting}
        onOpenChange={setIsAdopting}
      />
    </>
  );
}

interface NewActivityFormProps {
  applicationId: string;
  type: ActivityType;
  onSaved: (activity: Activity) => void;
}

function NewActivityForm({ applicationId, type, onSaved }: NewActivityFormProps) {
  const { t } = useTranslation();
  const add = useAddActivity(applicationId);
  const showSuccess = useSuccessToast();

  return (
    <ActivityForm
      type={type}
      save={add}
      onSaved={(activity) => {
        onSaved(activity);
        showSuccess(t("activities.toast.added"));
      }}
      submit={{ label: t("activities.form.add"), icon: IconPlus }}
    />
  );
}
