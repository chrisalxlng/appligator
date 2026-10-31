import type { ApplicationStatus } from "@appligator/shared";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { JobPicker } from "../applications/JobPicker.tsx";
import { useApplications, useApplicationCounts } from "../applications/applicationQueries.ts";
import { useApplicationStatus } from "../applications/useApplicationStatus.ts";
import { CardList } from "../collection/CardList.tsx";
import { CollectionPage } from "../collection/CollectionPage.tsx";
import { StatusFilter } from "../collection/StatusFilter.tsx";
import { useStatusFilter } from "../collection/useStatusFilter.ts";

export function ApplicationsPage() {
  const { t } = useTranslation();
  const { applicationId } = useParams({ strict: false });
  const counts = useApplicationCounts();
  const [filter, setFilter] = useStatusFilter<ApplicationStatus>(counts.data);
  const applications = useApplications(filter);
  const applicationStatus = useApplicationStatus();

  return (
    <CollectionPage
      title={t("navigation.applications")}
      texts={{
        loading: t("applications.loading"),
        loadingMore: t("applications.loadingMore"),
        loadError: t("applications.loadError", { returnObjects: true }),
        loadMoreError: t("applications.loadMoreError", { returnObjects: true }),
        empty: t("applications.empty", { returnObjects: true }),
      }}
      query={applications}
      openedId={applicationId}
      action={<JobPicker />}
      filter={
        <StatusFilter
          counts={counts.data}
          selected={filter}
          onSelect={setFilter}
          statusLabel={(status) => applicationStatus(status).label}
        />
      }
      renderList={(items, onEndReached) => (
        <CardList
          items={items}
          openedId={applicationId}
          status={(application) => applicationStatus(application.status)}
          renderLink={(application, props) => (
            <Link
              to="/applications/$applicationId"
              params={{ applicationId: application.id }}
              {...props}
            />
          )}
          onEndReached={onEndReached}
        />
      )}
    />
  );
}
