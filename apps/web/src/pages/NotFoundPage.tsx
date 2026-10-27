import { LinkButton } from "@appligator/ui";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import notFoundIllustration from "../assets/not-found.svg";
import { StatusPage } from "./StatusPage.tsx";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <StatusPage
      illustration={notFoundIllustration}
      title={t("notFound.title")}
      description={t("notFound.description")}
      action={
        <LinkButton render={<Link to="/" />}>
          <IconArrowRight size={20} stroke={2.4} aria-hidden />
          {t("notFound.openHomePage")}
        </LinkButton>
      }
    />
  );
}
