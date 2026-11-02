import { activityInputFromMail, type MailMessage } from "@appligator/shared";
import { Button, useSuccessToast } from "@appligator/ui";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "../activities/AdoptTerms.module.css";
import formStyles from "../details/form.module.css";
import { useAssignMailMessage } from "./mailQueries.ts";

interface MailSuggestionHintProps {
  message: MailMessage;
  suggestion: NonNullable<MailMessage["suggestion"]>;
}

export function MailSuggestionHint({
  message,
  suggestion: { application, activityType },
}: MailSuggestionHintProps) {
  const { t } = useTranslation();
  const assign = useAssignMailMessage(message.id, application.id);
  const showSuccess = useSuccessToast();

  function accept() {
    assign.mutate(activityInputFromMail(activityType, message, message.createdAt), {
      onSuccess: () => showSuccess(t("activities.toast.added")),
    });
  }

  return (
    <>
      <div className={styles.hint}>
        <IconSparkles size={20} stroke={2} aria-hidden />
        <p className={styles.hintText}>
          {t("emails.suggestion.hint", {
            type: t(`activities.types.${activityType}.label`),
            position: application.position,
          })}
        </p>
        <Button variant="highlightSecondary" pending={assign.isPending} onClick={accept}>
          {t("emails.suggestion.accept")}
        </Button>
      </div>
      {assign.isError && (
        <p role="alert" className={formStyles.saveError}>
          {t("emails.suggestion.error")}
        </p>
      )}
    </>
  );
}
