import { describe, expect, it } from "vitest";

import {
  advanceIngestionStatus,
  createPostingDecision,
  deriveEligiblePartUnits,
  detectIngestionExceptions,
  normalizeErpRecord,
  reconcileIngestionCounts,
  type VehicleVolumeCandidate,
} from "@/domain/ingestion";

const mappedRecord: VehicleVolumeCandidate = {
  rawRecordId: "raw-1",
  providerKey: "ihs",
  sourceRecordId: "source-1",
  sourceRecordSha256: "a".repeat(64),
  economicEventKey: "MODEL-A:PLANT-A:2026-08",
  dataKind: "actual",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  sourceUnits: "1000",
  mappingVersionId: "map-1",
  mapping: {
    oemId: "oem-1",
    programId: "program-1",
    vehicleModelId: "model-1",
    plantId: "plant-1",
    regionId: "region-1",
    relevantPartIds: ["part-1"],
  },
};

describe("shared ingestion lifecycle", () => {
  it("requires review and approval permissions and prevents lifecycle skips", () => {
    expect(() =>
      advanceIngestionStatus({
        from: "mapped",
        to: "approved",
        actorId: "user-1",
        occurredAt: "2026-08-21T12:00:00Z",
        canReview: true,
        canApprove: true,
        canPost: false,
      }),
    ).toThrow(/Invalid ingestion transition/);
    expect(
      advanceIngestionStatus({
        from: "reviewed",
        to: "approved",
        actorId: "user-1",
        occurredAt: "2026-08-21T12:00:00Z",
        canReview: true,
        canApprove: true,
        canPost: false,
      }).to,
    ).toBe("approved");
  });

  it("surfaces duplicates, missing mappings, conflicting sources, and material revisions", () => {
    const exceptions = detectIngestionExceptions([
      mappedRecord,
      { ...mappedRecord, rawRecordId: "raw-2" },
      {
        ...mappedRecord,
        rawRecordId: "raw-3",
        sourceRecordSha256: "b".repeat(64),
        sourceUnits: "1200",
      },
      {
        ...mappedRecord,
        rawRecordId: "raw-4",
        providerKey: "afs",
        sourceRecordId: "afs-1",
        sourceRecordSha256: "c".repeat(64),
        sourceUnits: "1100",
        mapping: { relevantPartIds: [] },
      },
    ]);
    expect(new Set(exceptions.map((exception) => exception.type))).toEqual(
      new Set(["duplicate", "material_revision", "conflicting_source", "missing_mapping"]),
    );
  });

  it("derives eligible part units only from approved actual vehicle-production policy", () => {
    expect(
      deriveEligiblePartUnits({
        candidate: mappedRecord,
        policy: {
          id: "policy-1",
          version: 1,
          status: "approved",
          basis: "vehicle_production",
          effectiveFrom: "2026-01-01",
        },
        rule: {
          id: "rule-1",
          status: "approved",
          effectiveFrom: "2026-01-01",
          partsPerVehicle: "2",
          takeRate: "0.75",
          allocation: "0.8",
        },
      }).eligiblePartUnits,
    ).toBe("1200");
    expect(() =>
      deriveEligiblePartUnits({
        candidate: { ...mappedRecord, dataKind: "forecast" },
        policy: {
          id: "policy-1",
          version: 1,
          status: "approved",
          basis: "vehicle_production",
          effectiveFrom: "2026-01-01",
        },
        rule: {
          id: "rule-1",
          status: "approved",
          effectiveFrom: "2026-01-01",
          partsPerVehicle: "2",
          takeRate: "0.75",
          allocation: "0.8",
        },
      }),
    ).toThrow(/cannot post/);
  });

  it("prevents a second posting for the same economic event", () => {
    expect(() =>
      createPostingDecision({
        candidateStatus: "approved",
        candidateId: "candidate-2",
        economicEventKey: mappedRecord.economicEventKey,
        destinationType: "volume_event",
        destinationId: "event-2",
        existingEconomicEventKeys: new Set([mappedRecord.economicEventKey]),
      }),
    ).toThrow(/already posted/);
  });

  it("preserves ERP source values without inferring recoverability", () => {
    const record = normalizeErpRecord({
      sourceSystem: "sap-customer-a",
      sourceTransactionId: "MAT-42",
      transactionType: "cost",
      transactionDate: "2026-08-21",
      originalValue: "1250.5000",
      originalCurrency: "EUR",
      originalSourceField: "WRBTR",
      sourceTimestamp: "2026-08-21T11:00:00Z",
      mappingVersionId: "sap-map-3",
      recoveryEligible: null,
    });
    expect(record).toMatchObject({ originalValue: "1250.5000", recoveryEligible: null });
  });

  it("reconciles source, duplicate, candidate, exception, and posting counts", () => {
    expect(
      reconcileIngestionCounts({
        sourceRecordCount: 10,
        candidateCount: 9,
        postedCount: 9,
        duplicateCount: 1,
        exceptionCount: 0,
      }),
    ).toMatchObject({
      status: "approved",
      sourceToCandidateDifference: 0,
      candidateToPostingDifference: 0,
    });
    expect(
      reconcileIngestionCounts({
        sourceRecordCount: 10,
        candidateCount: 8,
        postedCount: 7,
        duplicateCount: 1,
        exceptionCount: 2,
      }).status,
    ).toBe("review_required");
    expect(
      reconcileIngestionCounts({
        sourceRecordCount: 2,
        candidateCount: 3,
        postedCount: 3,
        duplicateCount: 0,
        exceptionCount: 0,
      }).status,
    ).toBe("failed");
  });
});
