import type { Activity, ActivityType, Application } from "@appligator/shared";
import { Drawer, useSuccessToast } from "@appligator/ui";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityForm } from "./ActivityForm.tsx";
import { useAddActivity, useDiffersFromDetails } from "./activityQueries.ts";
import { rankActivityTypes } from "./activityRelevance.ts";
import { ActivityTypePicker } from "./ActivityTypePicker.tsx";
import { AdoptTermsDrawer } from "./AdoptTerms.tsx";

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
  const [selected, setSelected] = useState<{ type: ActivityType | null; open: boolean }>({
    type: null,
    open: false,
  });
  const differsFromDetails = useDiffersFromDetails(application.id);
  const [isAdopting, setIsAdopting] = useState(false);

  return (
    <>
      <Drawer
        title={t("activities.form.addTitle")}
        closeLabel={t("common.close")}
        open={open}
        onOpenChange={onOpenChange}
      >
        <ActivityTypePicker
          rankedTypes={rankActivityTypes(activities.map(({ type }) => type))}
          onSelect={(type) => setSelected({ type, open: true })}
        />
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
                onOpenChange(false);
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
