import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./apiClient.ts";

const maxRetries = 3;
const staleTimeMs = 30_000;

function isClientError(error: Error) {
  return error instanceof ApiError && error.status < 500;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleTimeMs,
        retry: (failureCount, error) => !isClientError(error) && failureCount < maxRetries,
      },
    },
  });
}
