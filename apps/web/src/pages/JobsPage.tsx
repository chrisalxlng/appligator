import type { JobStatus } from "@appligator/shared";
import { Button } from "@appligator/ui";
import { IconPlus } from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CardList } from "../collection/CardList.tsx";
import { CollectionPage } from "../collection/CollectionPage.tsx";
import { StatusFilter } from "../collection/StatusFilter.tsx";
import { useStatusFilter } from "../collection/useStatusFilter.ts";
import { JobFormDrawer } from "../jobs/JobFormDrawer.tsx";
import { useJobs, useJobCounts } from "../jobs/jobQueries.ts";
import { useJobStatus } from "../jobs/useJobStatus.ts";
import { ShortcutTooltip } from "../shortcuts/ShortcutTooltip.tsx";
import { useAltShortcut } from "../shortcuts/useAltShortcut.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";

export function JobsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { jobId } = useParams({ strict: false });
  const counts = useJobCounts();
  const [filter, setFilter] = useStatusFilter<JobStatus>(counts.data);
  const jobs = useJobs(filter);
  const jobStatus = useJobStatus();
  const [isAdding, setIsAdding] = useState(false);
  const shortcutHints = useShortcutHints();
  useAltShortcut("N", () => setIsAdding(true));

  return (
    <CollectionPage
      title={t("navigation.jobs")}
      texts={{
        loading: t("jobs.loading"),
        loadingMore: t("jobs.loadingMore"),
        loadError: t("jobs.loadError", { returnObjects: true }),
        loadMoreError: t("jobs.loadMoreError", { returnObjects: true }),
        empty: t("jobs.empty", { returnObjects: true }),
      }}
      query={jobs}
      openedId={jobId}
      action={
        <ShortcutTooltip hint={shortcutHints?.alt("N")}>
          <Button onClick={() => setIsAdding(true)} aria-keyshortcuts="Alt+N">
            <IconPlus size={20} stroke={2.4} aria-hidden />
            {t("jobs.add")}
          </Button>
        </ShortcutTooltip>
      }
      filter={
        <StatusFilter
          counts={counts.data}
          selected={filter}
          onSelect={setFilter}
          statusLabel={(status) => jobStatus(status).label}
        />
      }
      renderList={(items, onEndReached) => (
        <CardList
          items={items}
          openedId={jobId}
          status={(job) => jobStatus(job.status)}
          renderLink={(job, props) => (
            <Link to="/jobs/$jobId" params={{ jobId: job.id }} {...props} />
          )}
          onEndReached={onEndReached}
        />
      )}
    >
      <JobFormDrawer
        open={isAdding}
        onOpenChange={setIsAdding}
        onSaved={(job) => void navigate({ to: "/jobs/$jobId", params: { jobId: job.id } })}
      />
    </CollectionPage>
  );
}
