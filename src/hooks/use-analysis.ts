import { useMemo } from "react";

import {
  buildAnalysisSnapshot,
  type AnalysisScope,
  type AnalysisSnapshot,
} from "@/domain/analytics";
import { useDataset } from "@/lib/commodity";
import { programModelYears } from "@/lib/demo-data";

export function useAnalysis(scope: AnalysisScope): AnalysisSnapshot {
  const { programs, parts } = useDataset();
  return useMemo(
    () => buildAnalysisSnapshot({ programs, parts, programModelYears }, scope),
    [parts, programs, scope],
  );
}
