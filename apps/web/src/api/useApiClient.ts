import { useMemo } from "react";
import { useAuth } from "../auth/useAuth.ts";
import { createApiClient } from "./apiClient.ts";

export function useApiClient() {
  const { getToken } = useAuth();
  return useMemo(() => createApiClient(getToken), [getToken]);
}
