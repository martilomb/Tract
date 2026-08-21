import Decimal from "decimal.js";

import { invariant } from "./errors";

export type IngestionDomain = "vehicle_volume" | "document" | "erp";
export type IngestionTransport = "csv" | "excel" | "rest" | "odata" | "file_drop";
export type IngestionStatus =
  | "received"
  | "staged"
  | "validated"
  | "mapped"
  | "reviewed"
  | "approved"
  | "posted"
  | "rejected"
  | "failed";
export type VehicleVolumeKind = "actual" | "forecast" | "revised" | "scenario";
export type EligibleVolumeBasis =
  "part_shipments" | "vehicle_production" | "invoiced_units" | "manual_approved";

export interface SourceEnvelope {
  organizationId: string;
  batchId: string;
  domain: IngestionDomain;
  providerKey: string;
  transport: IngestionTransport;
  sourceRecordId: string;
  sourceRecordSha256: string;
  receivedAt: string;
  sourceTimestamp?: string;
  payload: Readonly<Record<string, unknown>>;
}

export interface IngestionAdapter {
  readonly providerKey: string;
  readonly domain: IngestionDomain;
  readonly transports: readonly IngestionTransport[];
  receive(input: { batchId: string; bytes?: Uint8Array }): Promise<readonly SourceEnvelope[]>;
}

export interface IngestionTransition {
  from: IngestionStatus;
  to: IngestionStatus;
  actorId: string;
  occurredAt: string;
  reason?: string;
}

const transitions: Readonly<Record<IngestionStatus, readonly IngestionStatus[]>> = {
  received: ["staged", "failed", "rejected"],
  staged: ["validated", "failed", "rejected"],
  validated: ["mapped", "failed", "rejected"],
  mapped: ["reviewed", "failed", "rejected"],
  reviewed: ["mapped", "approved", "rejected"],
  approved: ["posted"],
  posted: [],
  rejected: ["staged"],
  failed: ["staged"],
};

export function advanceIngestionStatus(input: {
  from: IngestionStatus;
  to: IngestionStatus;
  actorId: string;
  occurredAt: string;
  reason?: string;
  canReview: boolean;
  canApprove: boolean;
  canPost: boolean;
}): IngestionTransition {
  invariant(
    transitions[input.from].includes(input.to),
    "Invalid ingestion transition",
    "invalid_ingestion_transition",
    {
      from: input.from,
      to: input.to,
    },
  );
  invariant(
    input.actorId.trim() !== "",
    "Transition actor is required",
    "ingestion_actor_required",
  );
  invariant(
    !Number.isNaN(Date.parse(input.occurredAt)),
    "Transition timestamp is invalid",
    "invalid_ingestion_timestamp",
  );
  if (input.to === "reviewed") {
    invariant(input.canReview, "Review permission is required", "ingestion_review_denied");
  }
  if (input.to === "approved") {
    invariant(input.canApprove, "Approval permission is required", "ingestion_approval_denied");
  }
  if (input.to === "posted") {
    invariant(input.canPost, "Posting permission is required", "ingestion_post_denied");
  }
  if (input.to === "rejected" || input.to === "failed") {
    invariant(
      Boolean(input.reason?.trim()),
      "A failure or rejection reason is required",
      "ingestion_reason_required",
    );
  }
  return Object.freeze({
    from: input.from,
    to: input.to,
    actorId: input.actorId,
    occurredAt: input.occurredAt,
    reason: input.reason,
  });
}

export interface VehicleVolumeCandidate {
  rawRecordId: string;
  providerKey: string;
  sourceRecordId: string;
  sourceRecordSha256: string;
  economicEventKey: string;
  dataKind: VehicleVolumeKind;
  periodStart: string;
  periodEnd: string;
  sourceUnits: string;
  mappingVersionId: string;
  mapping: {
    oemId?: string;
    programId?: string;
    vehicleModelId?: string;
    plantId?: string;
    regionId?: string;
    relevantPartIds: readonly string[];
  };
}

export type IngestionExceptionType =
  "duplicate" | "missing_mapping" | "conflicting_source" | "material_revision";

export interface IngestionException {
  type: IngestionExceptionType;
  economicEventKey: string;
  rawRecordIds: readonly string[];
  detail: string;
}

function asDecimal(value: string, field: string): Decimal {
  invariant(value.trim() !== "", `${field} is required`, "invalid_ingestion_decimal");
  const parsed = new Decimal(value);
  invariant(parsed.isFinite(), `${field} must be finite`, "invalid_ingestion_decimal");
  return parsed;
}

export function detectIngestionExceptions(
  records: readonly VehicleVolumeCandidate[],
  materialRevisionFraction = "0.05",
): readonly IngestionException[] {
  const exceptions: IngestionException[] = [];
  const materialThreshold = asDecimal(materialRevisionFraction, "materialRevisionFraction");
  invariant(
    materialThreshold.greaterThanOrEqualTo(0),
    "Material threshold cannot be negative",
    "invalid_material_threshold",
  );

  for (const record of records) {
    const missing = Object.entries({
      oem: record.mapping.oemId,
      program: record.mapping.programId,
      vehicle_model: record.mapping.vehicleModelId,
      plant: record.mapping.plantId,
      region: record.mapping.regionId,
    })
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (record.mapping.relevantPartIds.length === 0) missing.push("relevant_part");
    if (missing.length > 0) {
      exceptions.push({
        type: "missing_mapping",
        economicEventKey: record.economicEventKey,
        rawRecordIds: [record.rawRecordId],
        detail: `Missing mappings: ${missing.join(", ")}`,
      });
    }
  }

  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    const left = records[leftIndex];
    if (!left) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const right = records[rightIndex];
      if (!right) continue;
      const rawRecordIds = [left.rawRecordId, right.rawRecordId] as const;
      if (left.providerKey === right.providerKey && left.sourceRecordId === right.sourceRecordId) {
        if (left.sourceRecordSha256 === right.sourceRecordSha256) {
          exceptions.push({
            type: "duplicate",
            economicEventKey: left.economicEventKey,
            rawRecordIds,
            detail: "Provider record id and content hash were received more than once",
          });
        } else {
          const previous = asDecimal(left.sourceUnits, "sourceUnits").abs();
          const revision = asDecimal(right.sourceUnits, "sourceUnits")
            .minus(left.sourceUnits)
            .abs();
          const fraction = previous.isZero()
            ? revision.isZero()
              ? new Decimal(0)
              : new Decimal(1)
            : revision.div(previous);
          if (fraction.greaterThanOrEqualTo(materialThreshold)) {
            exceptions.push({
              type: "material_revision",
              economicEventKey: right.economicEventKey,
              rawRecordIds,
              detail: `Source revision changed units by ${fraction.mul(100).toFixed(4)}%`,
            });
          }
        }
      }
      if (
        left.economicEventKey === right.economicEventKey &&
        left.providerKey !== right.providerKey &&
        !asDecimal(left.sourceUnits, "sourceUnits").equals(right.sourceUnits)
      ) {
        exceptions.push({
          type: "conflicting_source",
          economicEventKey: left.economicEventKey,
          rawRecordIds,
          detail: "Providers reported different values for the same mapped economic event",
        });
      }
    }
  }
  return Object.freeze(exceptions.map((exception) => Object.freeze(exception)));
}

export interface EligibleVolumePolicy {
  id: string;
  version: number;
  status: "draft" | "approved" | "superseded";
  basis: EligibleVolumeBasis;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface PartVehicleRule {
  id: string;
  status: "draft" | "approved" | "superseded";
  effectiveFrom: string;
  effectiveTo?: string;
  partsPerVehicle: string;
  takeRate: string;
  allocation: string;
}

export function deriveEligiblePartUnits(input: {
  candidate: VehicleVolumeCandidate;
  policy: EligibleVolumePolicy;
  rule: PartVehicleRule;
}): { sourceUnits: string; eligiblePartUnits: string; policyId: string; ruleId: string } {
  invariant(
    input.policy.status === "approved",
    "Eligible-volume policy must be approved",
    "unapproved_volume_policy",
  );
  invariant(
    input.rule.status === "approved",
    "Part-per-vehicle rule must be approved",
    "unapproved_part_vehicle_rule",
  );
  invariant(
    input.policy.basis === "vehicle_production",
    "Policy does not use vehicle production",
    "volume_basis_mismatch",
  );
  invariant(
    input.candidate.dataKind === "actual",
    "Forecast, revised, and scenario values cannot post as actual eligible volume",
    "non_actual_volume_post",
  );
  invariant(
    input.candidate.periodStart >= input.policy.effectiveFrom &&
      (!input.policy.effectiveTo || input.candidate.periodStart <= input.policy.effectiveTo),
    "Eligible-volume policy is not effective for the source period",
    "volume_policy_not_effective",
  );
  invariant(
    input.candidate.periodStart >= input.rule.effectiveFrom &&
      (!input.rule.effectiveTo || input.candidate.periodStart <= input.rule.effectiveTo),
    "Part-per-vehicle rule is not effective for the source period",
    "part_vehicle_rule_not_effective",
  );
  const sourceUnits = asDecimal(input.candidate.sourceUnits, "sourceUnits");
  const partsPerVehicle = asDecimal(input.rule.partsPerVehicle, "partsPerVehicle");
  const takeRate = asDecimal(input.rule.takeRate, "takeRate");
  const allocation = asDecimal(input.rule.allocation, "allocation");
  invariant(
    partsPerVehicle.greaterThanOrEqualTo(0),
    "Parts per vehicle cannot be negative",
    "invalid_part_vehicle_rule",
  );
  invariant(
    takeRate.greaterThanOrEqualTo(0) && takeRate.lessThanOrEqualTo(1),
    "Take rate must be between 0 and 1",
    "invalid_part_vehicle_rule",
  );
  invariant(
    allocation.greaterThanOrEqualTo(0) && allocation.lessThanOrEqualTo(1),
    "Allocation must be between 0 and 1",
    "invalid_part_vehicle_rule",
  );
  return Object.freeze({
    sourceUnits: sourceUnits.toFixed(),
    eligiblePartUnits: sourceUnits.mul(partsPerVehicle).mul(takeRate).mul(allocation).toFixed(),
    policyId: input.policy.id,
    ruleId: input.rule.id,
  });
}

export function createPostingDecision(input: {
  candidateStatus: IngestionStatus;
  candidateId: string;
  economicEventKey: string;
  destinationType: string;
  destinationId: string;
  existingEconomicEventKeys: ReadonlySet<string>;
}) {
  invariant(
    input.candidateStatus === "approved",
    "Only approved candidates may be posted",
    "candidate_not_approved",
  );
  invariant(
    !input.existingEconomicEventKeys.has(input.economicEventKey),
    "Economic event is already posted",
    "duplicate_economic_event",
  );
  return Object.freeze({
    candidateId: input.candidateId,
    economicEventKey: input.economicEventKey,
    destinationType: input.destinationType,
    destinationId: input.destinationId,
  });
}

export interface CanonicalErpRecord {
  sourceSystem: string;
  sourceTransactionId: string;
  transactionType:
    | "shipment"
    | "purchase_order"
    | "invoice"
    | "material_document"
    | "cost"
    | "correction"
    | "reversal"
    | "return";
  transactionDate: string;
  signedQuantity?: string;
  originalValue?: string;
  originalCurrency?: string;
  originalSourceField?: string;
  sourceTimestamp: string;
  mappingVersionId: string;
  recoveryClassification?: string;
  recoveryEligible: boolean | null;
}

export function normalizeErpRecord(record: CanonicalErpRecord): CanonicalErpRecord {
  invariant(
    record.sourceSystem.trim() !== "",
    "ERP source system is required",
    "invalid_erp_record",
  );
  invariant(
    record.sourceTransactionId.trim() !== "",
    "ERP transaction id is required",
    "invalid_erp_record",
  );
  invariant(
    /^\d{4}-\d{2}-\d{2}$/.test(record.transactionDate),
    "ERP transaction date must use YYYY-MM-DD",
    "invalid_erp_record",
  );
  if (record.signedQuantity !== undefined) asDecimal(record.signedQuantity, "signedQuantity");
  if (record.originalValue !== undefined) {
    asDecimal(record.originalValue, "originalValue");
    invariant(
      Boolean(record.originalSourceField?.trim()),
      "Original ERP source field is required for values",
      "invalid_erp_record",
    );
    invariant(
      Boolean(record.originalCurrency?.match(/^[A-Z]{3}$/)),
      "Original ERP currency must be ISO 4217",
      "invalid_erp_record",
    );
  }
  invariant(
    record.recoveryEligible !== true || Boolean(record.recoveryClassification?.trim()),
    "Recoverable classification is required before an ERP value can be eligible",
    "unclassified_erp_value",
  );
  return Object.freeze({ ...record });
}
