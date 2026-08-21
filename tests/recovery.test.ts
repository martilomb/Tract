import { describe, expect, it } from "vitest";

import {
  calculateRecovery,
  createRecoveryReplay,
  settleAmount,
  type RecoveryPolicy,
} from "@/domain/recovery";

const policy: RecoveryPolicy = {
  id: "default",
  version: 1,
  effectiveFrom: "2026-01-01",
  eligibleEventTypes: ["actual", "correction", "return"],
  settlementScale: 2,
  settlementRounding: "half-even",
};

const terms = {
  accrualId: "accrual-1",
  organizationId: "org-a",
  approvedRecoverableCost: "1000.005",
  approvedAdjustments: "10.005",
  settlementCurrency: "USD",
};

const rates = [
  {
    id: "rate-1",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    approved: true,
    perUnitRate: "0.125",
  },
  {
    id: "rate-2",
    effectiveFrom: "2026-07-01",
    approved: true,
    perUnitRate: "0.250",
  },
];

describe("recovery calculation", () => {
  it("uses effective-dated rates and keeps exact precision until settlement", () => {
    const result = calculateRecovery({
      terms,
      policy,
      ratePeriods: rates,
      volumeEvents: [
        {
          id: "v1",
          organizationId: "org-a",
          occurredOn: "2026-06-30",
          eventType: "actual",
          signedEligibleUnits: "3",
          source: "csv",
        },
        {
          id: "v2",
          organizationId: "org-a",
          occurredOn: "2026-07-01",
          eventType: "actual",
          signedEligibleUnits: "2",
          source: "csv",
        },
      ],
    });

    expect(result.recoveredAmount).toBe("0.875");
    expect(result.remainingAmount).toBe("1009.135");
    expect(result.underRecovery).toBe("1009.135");
    expect(result.overRecovery).toBe("0");
    expect(settleAmount(result.remainingAmount, policy)).toBe("1009.14");
  });

  it("records corrections and returns as signed events", () => {
    const result = calculateRecovery({
      terms: { ...terms, approvedRecoverableCost: "1", approvedAdjustments: "0" },
      policy,
      ratePeriods: rates,
      volumeEvents: [
        {
          id: "v1",
          organizationId: "org-a",
          occurredOn: "2026-07-01",
          eventType: "actual",
          signedEligibleUnits: "10",
          source: "csv",
        },
        {
          id: "v2",
          organizationId: "org-a",
          occurredOn: "2026-07-02",
          eventType: "return",
          signedEligibleUnits: "-2",
          source: "csv",
        },
      ],
    });
    expect(result.recoveredAmount).toBe("2");
    expect(result.remainingAmount).toBe("-1");
    expect(result.underRecovery).toBe("0");
    expect(result.overRecovery).toBe("1");
    expect(result.lines).toHaveLength(2);
  });

  it("rejects duplicate and cross-tenant source events", () => {
    const event = {
      id: "v1",
      organizationId: "org-a",
      occurredOn: "2026-07-01",
      eventType: "actual" as const,
      signedEligibleUnits: "1",
      source: "csv",
    };
    expect(() =>
      calculateRecovery({ terms, policy, ratePeriods: rates, volumeEvents: [event, event] }),
    ).toThrow(/Duplicate/);
    expect(() =>
      calculateRecovery({
        terms,
        policy,
        ratePeriods: rates,
        volumeEvents: [{ ...event, organizationId: "org-b" }],
      }),
    ).toThrow(/Cross-tenant/);
  });

  it("rejects overlapping approved rate periods and missing rates", () => {
    expect(() =>
      calculateRecovery({
        terms,
        policy,
        ratePeriods: [rates[0]!, { ...rates[1]!, effectiveFrom: "2026-06-01" }],
        volumeEvents: [],
      }),
    ).toThrow(/overlap/);
    expect(() =>
      calculateRecovery({
        terms,
        policy,
        ratePeriods: rates,
        volumeEvents: [
          {
            id: "v1",
            organizationId: "org-a",
            occurredOn: "2025-01-01",
            eventType: "actual",
            signedEligibleUnits: "1",
            source: "csv",
          },
        ],
      }),
    ).toThrow(/exactly one/);
  });

  it("replays canonical inputs to the same hash, exact lines, and policy version", async () => {
    const events = [
      {
        id: "v2",
        organizationId: "org-a",
        occurredOn: "2026-07-02",
        eventType: "return" as const,
        signedEligibleUnits: "-2",
        source: "erp",
      },
      {
        id: "v1",
        organizationId: "org-a",
        occurredOn: "2026-07-01",
        eventType: "actual" as const,
        signedEligibleUnits: "10",
        source: "erp",
      },
    ];
    const first = await createRecoveryReplay(
      { terms, policy, ratePeriods: [...rates].reverse(), volumeEvents: events },
      "2026-08-21T12:00:00Z",
    );
    const replay = await createRecoveryReplay(
      { terms, policy, ratePeriods: rates, volumeEvents: [...events].reverse() },
      "2026-08-22T12:00:00Z",
    );

    expect(replay.inputHash).toBe(first.inputHash);
    expect(replay.result).toEqual(first.result);
    expect(replay.result.policyVersion).toBe(1);
    expect(replay.result.lines.map((line) => line.volumeEventId)).toEqual(["v1", "v2"]);

    const changed = await createRecoveryReplay(
      { terms, policy: { ...policy, version: 2 }, ratePeriods: rates, volumeEvents: events },
      "2026-08-22T12:00:00Z",
    );
    expect(changed.inputHash).not.toBe(first.inputHash);
  });
});
