import { Button, EmptyState } from "@appligator/ui";
import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import errorIllustration from "../assets/error.svg";
import styles from "./LoadError.module.css";

interface LoadErrorProps {
  title: string;
  description: string;
  onRetry: () => void;
  headingLevel?: 2 | 3 | 4;
}

export function LoadError({ title, description, onRetry, headingLevel }: LoadErrorProps) {
  const { t } = useTranslation();

  return (
    <div role="alert" className={styles.loadError}>
      <EmptyState
        illustration={<img src={errorIllustration} alt="" width={225} height={224} />}
        title={title}
        description={description}
        headingLevel={headingLevel}
        action={
          <Button onClick={onRetry}>
            <IconRefresh size={20} stroke={2.4} aria-hidden />
            {t("loadError.retry")}
          </Button>
        }
      />
    </div>
  );
}
