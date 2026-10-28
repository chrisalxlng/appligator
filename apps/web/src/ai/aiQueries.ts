import type { AiSettingsInput } from "@appligator/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createApiClient } from "../api/apiClient.ts";
import { useAuth } from "../auth/useAuth.ts";
import { createAiApi } from "./aiApi.ts";

const aiKeys = {
  models: ["ai", "models"] as const,
  settings: ["ai", "settings"] as const,
};

export function useAiApi() {
  const { getToken } = useAuth();
  return useMemo(() => createAiApi(createApiClient(getToken)), [getToken]);
}

export function useAiModels() {
  const aiApi = useAiApi();
  return useQuery({ queryKey: aiKeys.models, queryFn: aiApi.getModels, staleTime: 60 * 60 * 1000 });
}

export function useAiSettings() {
  const aiApi = useAiApi();
  return useQuery({ queryKey: aiKeys.settings, queryFn: aiApi.getSettings });
}

export function useSaveAiSettings() {
  const aiApi = useAiApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AiSettingsInput) => aiApi.saveSettings(input),
    onSuccess: (settings) => queryClient.setQueryData(aiKeys.settings, settings),
  });
}

export function useDeleteAiSettings() {
  const aiApi = useAiApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: aiApi.deleteSettings,
    onSuccess: () => queryClient.setQueryData(aiKeys.settings, null),
  });
}
