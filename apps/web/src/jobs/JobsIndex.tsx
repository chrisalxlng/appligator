import { Navigate } from "@tanstack/react-router";
import { firstVisibleId, usePinnedCollapsed } from "../collection/usePinnedCollapsed.ts";
import { useIsWide } from "../shell/useMediaQuery.ts";
import { useJobs } from "./jobQueries.ts";

export function JobsIndex() {
  const isWide = useIsWide();
  const [pinnedCollapsed] = usePinnedCollapsed("jobs");
  const firstJobId = firstVisibleId(useJobs().data ?? [], pinnedCollapsed);

  if (!isWide || !firstJobId) return null;
  return <Navigate to="/jobs/$jobId" params={{ jobId: firstJobId }} replace />;
}
