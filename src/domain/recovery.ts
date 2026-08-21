import Decimal from "decimal.js";

import { DomainError, invariant } from "./errors";

Decimal.set({ precision: 48, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -40, toExpPos: 40 });

export type RoundingMode = "half-even" | "half-up" | "down";
export type VolumeEventType = "actual" | "forecast" | "correction" | "return";

export interface RecoveryPolicy {
  id: string;
  version: number;
  effectiveFrom: string;
  eligibleEventTypes: readonly VolumeEventType[];
  settlementScale: number;
  settlementRounding: RoundingMode;
}

export interface AccrualTerms {
  accrualId: string;
  organizationId: string;
  approvedRecoverableCost: string;
  approvedAdjustments: string;
  settlementCurrency: string;
}

export interface RecoveryRatePeriod {
  id: string;
  effectiveFrom: string;
  effectiveTo?: string;
  approved: boolean;
  perUnitRate: string;
}

export interface VolumeEvent {
  id: string;
  organizationId: string;
  occurredOn: string;
  eventType: VolumeEventType;
  signedEligibleUnits: string;
  source: string;
  importId?: string;
}

export interface RecoveryLine {
  volumeEventId: string;
  ratePeriodId: string;
  occurredOn: string;
  signedEligibleUnits: string;
  perUnitRate: string;
  recoveredAmount: string;
}

export interface RecoveryResult {
  accrualId: string;
  organizationId: string;
  policyId: string;
  policyVersion: number;
  settlementCurrency: string;
  recoveredAmount: string;
  remainingAmount: string;
  underRecovery: string;
  overRecovery: string;
  lines: readonly RecoveryLine[];
}

export interface RecoveryCalculationInput {
  terms: AccrualTerms;
  policy: RecoveryPolicy;
  ratePeriods: readonly RecoveryRatePeriod[];
  volumeEvents: readonly VolumeEvent[];
}

export interface RecoveryReplay {
  inputHash: string;
  calculatedAt: string;
  result: RecoveryResult;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function decimal(value: string, field: string): Decimal {
  invariant(value.trim() !== "", `${field} is required`, "invalid_decimal", { field });
  try {
    const parsed = new Decimal(value);
    invariant(parsed.isFinite(), `${field} must be finite`, "invalid_decimal", { field });
    return parsed;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError(`${field} must be a decimal string`, "invalid_decimal", { field });
  }
}

function date(value: string, field: string): string {
  invariant(ISO_DATE.test(value), `${field} must use YYYY-MM-DD`, "invalid_date", { field });
  const parsed = new Date(`${value}T00:00:00Z`);
  invariant(!Number.isNaN(parsed.valueOf()), `${field} is invalid`, "invalid_date", { field });
  return value;
}

function normalize(value: Decimal): string {
  return value.isZero() ? "0" : value.toFixed();
}

function rounding(mode: RoundingMode): Decimal.Rounding {
  if (mode === "half-up") return Decimal.ROUND_HALF_UP;
  if (mode === "down") return Decimal.ROUND_DOWN;
  return Decimal.ROUND_HALF_EVEN;
}

export function validateRecoveryPolicy(policy: RecoveryPolicy): RecoveryPolicy {
  invariant(policy.id.trim() !== "", "Policy id is required", "invalid_policy");
  invariant(
    Number.isInteger(policy.version) && policy.version > 0,
    "Policy version must be positive",
    "invalid_policy",
  );
  date(policy.effectiveFrom, "effectiveFrom");
  invariant(
    policy.eligibleEventTypes.length > 0,
    "At least one event type must be eligible",
    "invalid_policy",
  );
  invariant(
    Number.isInteger(policy.settlementScale) &&
      policy.settlementScale >= 0 &&
      policy.settlementScale <= 12,
    "Settlement scale must be an integer from 0 to 12",
    "invalid_policy",
  );
  return Object.freeze({
    ...policy,
    eligibleEventTypes: Object.freeze([...new Set(policy.eligibleEventTypes)]),
  });
}

export function validateRatePeriods(
  periods: readonly RecoveryRatePeriod[],
): readonly RecoveryRatePeriod[] {
  const approved = periods.filter((period) => period.approved);
  for (const period of approved) {
    date(period.effectiveFrom, "effectiveFrom");
    if (period.effectiveTo) {
      date(period.effectiveTo, "effectiveTo");
      invariant(
        period.effectiveTo >= period.effectiveFrom,
        "Rate end date precedes start date",
        "invalid_rate_period",
        {
          ratePeriodId: period.id,
        },
      );
    }
    decimal(period.perUnitRate, "perUnitRate");
  }

  const sorted = [...approved].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    invariant(previous && current, "Rate ordering failed", "invalid_rate_period");
    invariant(
      previous.effectiveTo !== undefined && previous.effectiveTo < current.effectiveFrom,
      "Approved recovery rate periods may not overlap",
      "overlapping_rate_periods",
      { previousId: previous.id, currentId: current.id },
    );
  }
  return Object.freeze(sorted);
}

function selectRate(eventDate: string, periods: readonly RecoveryRatePeriod[]): RecoveryRatePeriod {
  const matches = periods.filter(
    (period) =>
      period.effectiveFrom <= eventDate && (!period.effectiveTo || period.effectiveTo >= eventDate),
  );
  invariant(
    matches.length === 1,
    "Each eligible volume event must match exactly one approved rate",
    "rate_not_found",
    {
      eventDate,
      matches: matches.length,
    },
  );
  return matches[0] as RecoveryRatePeriod;
}

export function calculateRecovery(input: RecoveryCalculationInput): RecoveryResult {
  const policy = validateRecoveryPolicy(input.policy);
  const rates = validateRatePeriods(input.ratePeriods);
  invariant(input.terms.organizationId.trim() !== "", "Organization is required", "invalid_terms");
  invariant(
    /^[A-Z]{3}$/.test(input.terms.settlementCurrency),
    "Currency must be an ISO 4217 code",
    "invalid_currency",
  );

  const recoverable = decimal(input.terms.approvedRecoverableCost, "approvedRecoverableCost");
  const adjustments = decimal(input.terms.approvedAdjustments, "approvedAdjustments");
  const seenEventIds = new Set<string>();
  const lines: RecoveryLine[] = [];

  const orderedEvents = [...input.volumeEvents].sort(
    (left, right) =>
      left.occurredOn.localeCompare(right.occurredOn) || left.id.localeCompare(right.id),
  );
  for (const event of orderedEvents) {
    invariant(
      event.organizationId === input.terms.organizationId,
      "Cross-tenant volume event rejected",
      "tenant_mismatch",
      {
        volumeEventId: event.id,
      },
    );
    invariant(
      !seenEventIds.has(event.id),
      "Duplicate volume event rejected",
      "duplicate_volume_event",
      {
        volumeEventId: event.id,
      },
    );
    seenEventIds.add(event.id);
    if (!policy.eligibleEventTypes.includes(event.eventType)) continue;
    date(event.occurredOn, "occurredOn");
    const rate = selectRate(event.occurredOn, rates);
    const units = decimal(event.signedEligibleUnits, "signedEligibleUnits");
    const amount = units.mul(decimal(rate.perUnitRate, "perUnitRate"));
    lines.push(
      Object.freeze({
        volumeEventId: event.id,
        ratePeriodId: rate.id,
        occurredOn: event.occurredOn,
        signedEligibleUnits: normalize(units),
        perUnitRate: normalize(decimal(rate.perUnitRate, "perUnitRate")),
        recoveredAmount: normalize(amount),
      }),
    );
  }

  const recovered = lines.reduce((sum, line) => sum.add(line.recoveredAmount), new Decimal(0));
  const remaining = recoverable.add(adjustments).sub(recovered);
  const underRecovery = Decimal.max(remaining, 0);
  const overRecovery = Decimal.max(remaining.negated(), 0);

  return Object.freeze({
    accrualId: input.terms.accrualId,
    organizationId: input.terms.organizationId,
    policyId: policy.id,
    policyVersion: policy.version,
    settlementCurrency: input.terms.settlementCurrency,
    recoveredAmount: normalize(recovered),
    remainingAmount: normalize(remaining),
    underRecovery: normalize(underRecovery),
    overRecovery: normalize(overRecovery),
    lines: Object.freeze(lines),
  });
}

function canonicalRecoveryInput(input: RecoveryCalculationInput): RecoveryCalculationInput {
  return {
    terms: { ...input.terms },
    policy: {
      ...input.policy,
      eligibleEventTypes: [...new Set(input.policy.eligibleEventTypes)].sort(),
    },
    ratePeriods: [...input.ratePeriods].sort(
      (left, right) =>
        left.effectiveFrom.localeCompare(right.effectiveFrom) || left.id.localeCompare(right.id),
    ),
    volumeEvents: [...input.volumeEvents].sort(
      (left, right) =>
        left.occurredOn.localeCompare(right.occurredOn) || left.id.localeCompare(right.id),
    ),
  };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const entries = Object.entries(value as Readonly<Record<string, unknown>>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
}

export async function createRecoveryReplay(
  input: RecoveryCalculationInput,
  calculatedAt: string,
): Promise<RecoveryReplay> {
  invariant(
    !Number.isNaN(Date.parse(calculatedAt)),
    "Calculation timestamp is invalid",
    "invalid_calculation_timestamp",
  );
  const canonical = canonicalRecoveryInput(input);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableJson(canonical)),
  );
  const inputHash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return Object.freeze({
    inputHash,
    calculatedAt,
    result: calculateRecovery(canonical),
  });
}

export function settleAmount(value: string, policy: RecoveryPolicy): string {
  const validPolicy = validateRecoveryPolicy(policy);
  return decimal(value, "amount")
    .toDecimalPlaces(validPolicy.settlementScale, rounding(validPolicy.settlementRounding))
    .toFixed(validPolicy.settlementScale);
}
