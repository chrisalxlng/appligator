import { Navigate } from "@tanstack/react-router";
import { useIsWide } from "../shell/useMediaQuery.ts";
import { useJobs } from "./jobQueries.ts";

export function JobsIndex() {
  const isWide = useIsWide();
  const firstJobId = useJobs().data?.[0]?.id;

  if (!isWide || !firstJobId) return null;
  return <Navigate to="/jobs/$jobId" params={{ jobId: firstJobId }} replace />;
}
