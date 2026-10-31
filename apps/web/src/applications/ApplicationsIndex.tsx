import { Navigate } from "@tanstack/react-router";
import { useIsWide } from "../shell/useMediaQuery.ts";
import { useApplications } from "./applicationQueries.ts";

export function ApplicationsIndex() {
  const isWide = useIsWide();
  const firstApplicationId = useApplications().data?.[0]?.id;

  if (!isWide || !firstApplicationId) return null;
  return (
    <Navigate
      to="/applications/$applicationId"
      params={{ applicationId: firstApplicationId }}
      replace
    />
  );
}
