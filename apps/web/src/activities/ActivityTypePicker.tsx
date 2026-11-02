import type { ActivityType } from "@appligator/shared";
import { Button } from "@appligator/ui";
import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./ActivityTypePicker.module.css";

const mostRelevantCount = 5;

interface ActivityTypePickerProps {
  rankedTypes: ActivityType[];
  onSelect: (type: ActivityType) => void;
}

export function ActivityTypePicker({ rankedTypes, onSelect }: ActivityTypePickerProps) {
  const { t } = useTranslation();
  const [showsAll, setShowsAll] = useState(false);
  const shownTypes = showsAll ? rankedTypes : rankedTypes.slice(0, mostRelevantCount);

  return (
    <div className={styles.picker}>
      <ul className={styles.types}>
        {shownTypes.map((type) => (
          <li key={type}>
            <button type="button" className={styles.type} onClick={() => onSelect(type)}>
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
  );
}
