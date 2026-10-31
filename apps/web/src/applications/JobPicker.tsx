import type { JobListItem } from "@appligator/shared";
import { Button, Drawer, Popover, SearchList, Spinner } from "@appligator/ui";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useCreatedLabel } from "../collection/useCreatedLabel.ts";
import { useOpenJobSearch } from "../jobs/jobQueries.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import { ShortcutTooltip } from "../shortcuts/ShortcutTooltip.tsx";
import { useAltShortcut } from "../shortcuts/useAltShortcut.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { ApplyDrawer } from "./ApplyDrawer.tsx";
import styles from "./JobPicker.module.css";

export function JobPicker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [apply, setApply] = useState<{ job: JobListItem | null; open: boolean }>({
    job: null,
    open: false,
  });
  const shortcutHints = useShortcutHints();
  useAltShortcut("N", () => setOpen(true));

  function select(job: JobListItem) {
    setOpen(false);
    setApply({ job, open: true });
  }

  const popupProps = {
    title: t("applications.picker.title"),
    closeLabel: t("common.close"),
    open,
    onOpenChange: setOpen,
    initialFocus: inputRef,
    children: <JobSearch inputRef={inputRef} onSelect={select} />,
  };

  return (
    <>
      <ShortcutTooltip hint={shortcutHints?.alt("N")}>
        <Button ref={buttonRef} onClick={() => setOpen(true)} aria-keyshortcuts="Alt+N">
          <IconPlayerPlay size={20} stroke={2.4} aria-hidden />
          {t("applications.apply")}
        </Button>
      </ShortcutTooltip>
      {isDesktop ? <Popover anchor={buttonRef} {...popupProps} /> : <Drawer {...popupProps} />}
      <ApplyDrawer
        job={apply.job}
        open={apply.open}
        onOpenChange={(nextOpen) => setApply((current) => ({ ...current, open: nextOpen }))}
        onApplied={(application) =>
          void navigate({
            to: "/applications/$applicationId",
            params: { applicationId: application.id },
          })
        }
      />
    </>
  );
}

interface JobSearchProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (job: JobListItem) => void;
}

function JobSearch({ inputRef, onSelect }: JobSearchProps) {
  const { t } = useTranslation();
  const createdLabel = useCreatedLabel();
  const [search, setSearch] = useState("");
  const trimmedSearch = useDeferredValue(search.trim());
  const jobs = useOpenJobSearch(trimmedSearch);

  return (
    <SearchList
      items={jobs.data ?? []}
      search={search}
      onSearchChange={setSearch}
      onSelect={onSelect}
      itemKey={(job) => job.id}
      renderItem={(job) => (
        <>
          <span className={styles.position}>{job.position}</span>
          <span className={styles.meta}>
            {job.company} • {createdLabel(job.createdAt)}
          </span>
        </>
      )}
      inputLabel={t("applications.picker.search")}
      placeholder={t("applications.picker.searchPlaceholder")}
      listLabel={t("applications.picker.title")}
      inputRef={inputRef}
      status={searchStatus()}
    />
  );

  function searchStatus() {
    if (jobs.isPending) return <Spinner label={t("applications.picker.loading")} />;

    if (jobs.isError) {
      return (
        <LoadError
          title={t("applications.picker.loadError.title")}
          description={t("applications.picker.loadError.description")}
          onRetry={() => void jobs.refetch()}
        />
      );
    }

    if (jobs.data.length > 0) return null;

    if (trimmedSearch)
      return <p>{t("applications.picker.noMatches", { search: trimmedSearch })}</p>;

    return (
      <>
        <p className={styles.statusTitle}>{t("applications.picker.noOpenJobs.title")}</p>
        <p>{t("applications.picker.noOpenJobs.description")}</p>
      </>
    );
  }
}
