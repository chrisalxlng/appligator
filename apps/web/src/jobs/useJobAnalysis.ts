import type { AiErrorCode, JobExtraction } from "@appligator/shared";
import { useEffect, useRef, useState } from "react";
import { useAiApi, useAiSettings } from "../ai/aiQueries.ts";
import { ApiError } from "../api/apiClient.ts";
import type { ExtractedField } from "../details/detailsForm.ts";

const minPastedLength = 100;

const analysisErrors = [
  "notConfigured",
  "accessRejected",
  "rateLimited",
  "providerUnavailable",
  "extractionFailed",
] as const satisfies readonly AiErrorCode[];

export type AnalysisError = (typeof analysisErrors)[number] | "failed";

export type JobAnalysis =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "done"; filledFields: ExtractedField[] }
  | { status: "failed"; error: AnalysisError };

function toAnalysisError(error: unknown): AnalysisError {
  const code = error instanceof ApiError ? error.code : undefined;
  return analysisErrors.find((analysisError) => analysisError === code) ?? "failed";
}

function textLength(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent.trim().length;
}

export function useJobAnalysis(applyExtraction: (extraction: JobExtraction) => ExtractedField[]) {
  const aiApi = useAiApi();
  const settings = useAiSettings();
  const [analysis, setAnalysis] = useState<JobAnalysis>({ status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  async function analyze(description: string) {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setAnalysis({ status: "analyzing" });

    try {
      const extraction = await aiApi.extractJob(description, abortController.signal);
      if (abortController.signal.aborted) return;
      setAnalysis({ status: "done", filledFields: applyExtraction(extraction) });
    } catch (error) {
      if (abortController.signal.aborted) return;
      setAnalysis({ status: "failed", error: toAnalysisError(error) });
    }
  }

  return {
    analysis,
    analyzePaste: (previousDescription: string, description: string) => {
      const isAiConfigured = Boolean(settings.data);
      const pastedLength = textLength(description) - textLength(previousDescription);
      if (isAiConfigured && pastedLength >= minPastedLength) void analyze(description);
    },
    retry: (description: string) => void analyze(description),
    dismiss: () => setAnalysis({ status: "idle" }),
  };
}
