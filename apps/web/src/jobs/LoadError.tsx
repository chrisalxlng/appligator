import { Button } from "@appligator/ui";
import { useTranslation } from "react-i18next";
import styles from "./LoadError.module.css";

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <div role="alert" className={styles.loadError}>
      <p>{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        {t("jobs.retry")}
      </Button>
    </div>
  );
}
