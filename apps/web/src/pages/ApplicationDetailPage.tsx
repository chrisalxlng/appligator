import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApplicationDetail } from "../applications/ApplicationDetail.tsx";
import { useApplication } from "../applications/applicationQueries.ts";
import { DetailPage } from "../collection/DetailPage.tsx";

export function ApplicationDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { applicationId } = useParams({ from: "/shell/applications/$applicationId" });

  return (
    <DetailPage
      title={t("navigation.applications")}
      texts={{
        loading: t("applications.loadingApplication"),
        notFound: t("applications.notFound", { returnObjects: true }),
        loadError: t("applications.detailLoadError", { returnObjects: true }),
      }}
      query={useApplication(applicationId)}
      onClose={() => void navigate({ to: "/applications" })}
      backLink={<Link to="/applications" />}
    >
      {(application) => <ApplicationDetail application={application} />}
    </DetailPage>
  );
}
