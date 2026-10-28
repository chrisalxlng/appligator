import { Navigate } from "@tanstack/react-router";
import { useIsDesktop } from "../shell/useIsDesktop.ts";
import { useJobs } from "./jobQueries.ts";

export function JobsIndex() {
  const isDesktop = useIsDesktop();
  const firstJobId = useJobs().data?.[0]?.id;

  if (!isDesktop || !firstJobId) return null;
  return <Navigate to="/jobs/$jobId" params={{ jobId: firstJobId }} replace />;
}
