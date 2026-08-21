import Decimal from "decimal.js";

import {
  calculateRecovery,
  type AccrualTerms,
  type RecoveryPolicy,
  type RecoveryRatePeriod,
  type VolumeEvent,
} from "./recovery";

export interface ForecastVersion {
  id: string;
  organizationId: string;
  version: number;
  asOfDate: string;
  source: string;
  status: "draft" | "approved" | "superseded";
}

export function projectRecovery(input: {
  terms: AccrualTerms;
  policy: RecoveryPolicy;
  ratePeriods: readonly RecoveryRatePeriod[];
  actualEvents: readonly VolumeEvent[];
  forecastEvents: readonly VolumeEvent[];
  forecast: ForecastVersion;
}) {
  const actualPolicy = {
    ...input.policy,
    eligibleEventTypes: ["actual", "correction", "return"] as const,
  };
  const projectedPolicy = {
    ...input.policy,
    eligibleEventTypes: ["actual", "correction", "return", "forecast"] as const,
  };
  const actual = calculateRecovery({
    terms: input.terms,
    policy: actualPolicy,
    ratePeriods: input.ratePeriods,
    volumeEvents: input.actualEvents,
  });
  const projected = calculateRecovery({
    terms: input.terms,
    policy: projectedPolicy,
    ratePeriods: input.ratePeriods,
    volumeEvents: [...input.actualEvents, ...input.forecastEvents],
  });
  return Object.freeze({
    forecastId: input.forecast.id,
    forecastVersion: input.forecast.version,
    asOfDate: input.forecast.asOfDate,
    source: input.forecast.source,
    actualRecovered: actual.recoveredAmount,
    projectedRecovered: projected.recoveredAmount,
    projectedIncrement: new Decimal(projected.recoveredAmount)
      .sub(actual.recoveredAmount)
      .toFixed(),
    projectedUnderRecovery: projected.underRecovery,
    projectedOverRecovery: projected.overRecovery,
  });
}
