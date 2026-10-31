import { Navigate } from "@tanstack/react-router";
import { firstVisibleId, usePinnedCollapsed } from "../collection/usePinnedCollapsed.ts";
import { useIsWide } from "../shell/useMediaQuery.ts";
import { useApplications } from "./applicationQueries.ts";

export function ApplicationsIndex() {
  const isWide = useIsWide();
  const [pinnedCollapsed] = usePinnedCollapsed("applications");
  const firstApplicationId = firstVisibleId(useApplications().data ?? [], pinnedCollapsed);

  if (!isWide || !firstApplicationId) return null;
  return (
    <Navigate
      to="/applications/$applicationId"
      params={{ applicationId: firstApplicationId }}
      replace
    />
  );
}
