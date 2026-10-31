import { useMemo } from "react";
import { useAuth } from "../auth/useAuth.ts";
import { createStashClient } from "./stashClient.ts";

export function useStash() {
  const { getToken } = useAuth();
  return useMemo(() => createStashClient(getToken), [getToken]);
}
