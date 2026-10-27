import { Button } from "@appligator/ui";
import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import errorIllustration from "../assets/error.svg";
import { StatusPage } from "./StatusPage.tsx";

export function ErrorPage() {
  const { t } = useTranslation();

  return (
    <StatusPage
      illustration={errorIllustration}
      title={t("error.title")}
      description={t("error.description")}
      action={
        <Button onClick={() => window.location.reload()}>
          <IconRefresh size={20} stroke={2.4} aria-hidden />
          {t("error.reload")}
        </Button>
      }
    />
  );
}
