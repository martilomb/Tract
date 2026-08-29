import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/database.types";
import {
  parseProductionRecoveryWorkspace,
  recoveryAgreementCsv,
  recoveryAgreementDraftInputSchema,
} from "@/domain/production-contracts";
import {
  loadProductionRecoveryWorkspace,
  reviewAndActivateProductionRecovery,
  saveProductionRecoveryAgreementDraft,
} from "@/server/repositories/recovery-agreements.server";

const organizationId = "20000000-0000-0000-0000-000000000001";
const agreementId = "63000000-0000-0000-0000-000000000001";
const programId = "40000000-0000-0000-0000-000000000001";
const modelYearId = "61000000-0000-0000-0000-000000000001";
const partId = "41000000-0000-0000-0000-000000000001";
const revisionId = "62000000-0000-0000-0000-000000000001";

function workspaceFixture() {
  return {
    organization_id: organizationId,
    as_of: "2026-08-29T12:00:00Z",
    source: "tenant_persistence",
    calculation_version: "contract-activation-v1",
    oems: [],
    makes: [],
    models: [],
    programs: [{ id: programId, oem_id: null, model_id: null, code: "P2", name: "P2" }],
    model_years: [{ id: modelYearId, program_id: programId, model_year: 2027 }],
    parts: [
      {
        id: partId,
        program_id: programId,
        part_number: "P2-PART",
        description: "Controlled part",
        status: "active",
      },
    ],
    revisions: [
      {
        id: revisionId,
        part_id: partId,
        revision_code: "A",
        description: "Initial revision",
        effective_from: "2026-08-01",
        effective_to: null,
        status: "approved",
      },
    ],
    dcrs: [],
    agreements: [
      {
        id: agreementId,
        agreement_number: "P2-AGR-001",
        title: "P2 agreement",
        status: "active",
        settlement_currency: "USD",
        recoverable_cost: "125000.250000000000000000",
        eligible_volume_basis: "part_shipments",
        effective_from: "2026-08-01",
        effective_to: "2027-08-01",
        expires_on: null,
        rounding_scale: 2,
        rounding_mode: "half_even",
        forecast_assumptions_version: "forecast-v1",
        forecast_assumptions: { basis: "approved volume" },
        contractual_limit_amount: "125000.250000000000000000",
        evidence_review_method: "manual_attestation",
        evidence_reference: "controlled-register",
        evidence_summary: "Reviewed outside the inactive provider.",
        evidence_reviewed_by: "10000000-0000-0000-0000-000000000001",
        evidence_reviewed_at: "2026-08-29T12:00:00Z",
        approved_by: "10000000-0000-0000-0000-000000000001",
        approved_at: "2026-08-29T12:00:00Z",
        created_at: "2026-08-29T11:00:00Z",
        updated_at: "2026-08-29T12:00:00Z",
        program_ids: [programId],
        model_year_ids: [modelYearId],
        part_links: [{ part_id: partId, part_revision_id: revisionId }],
        dcr_ids: [],
        rate_periods: [
          {
            id: "63300000-0000-0000-0000-000000000001",
            effective_from: "2026-08-01",
            effective_to: "2027-08-01",
            per_unit_rate: "12.500000000000000000",
            currency: "USD",
          },
        ],
        accruals: [
          {
            id: "65000000-0000-0000-0000-000000000001",
            active: true,
            approved_recoverable_cost: "125000.250000000000000000",
            settlement_currency: "USD",
            program_id: programId,
            part_id: partId,
            dcr_id: null,
          },
        ],
        approvals: [],
        audit: [
          {
            id: 42,
            action: "UPDATE",
            entity_type: "recovery_agreements",
            actor_id: "10000000-0000-0000-0000-000000000001",
            occurred_at: "2026-08-29T12:00:00Z",
          },
        ],
      },
    ],
  };
}

describe("production recovery response and export", () => {
  it("preserves exact persisted decimals from detail through scoped CSV", () => {
    const workspace = parseProductionRecoveryWorkspace(workspaceFixture());
    const agreement = workspace.agreements[0]!;
    const csv = recoveryAgreementCsv({
      organizationName: "Staging Organization",
      workspace,
      agreement,
    });

    expect(agreement.recoverable_cost).toBe("125000.250000000000000000");
    expect(agreement.rate_periods[0]?.per_unit_rate).toBe("12.500000000000000000");
    expect(csv).toContain('"recoverable_cost","125000.250000000000000000"');
    expect(csv).toContain('"contractual_limit_amount","125000.250000000000000000"');
    expect(csv).toContain("12.500000000000000000");
    expect(csv).toContain('"evidence_reference","controlled-register"');
    expect(csv).toContain(revisionId);
    expect(csv).toContain('"active_accruals"');
    expect(csv).toContain('"audit_event_ids","42"');
    expect(csv).toContain('"source","tenant_persistence"');
  });

  it("rejects mismatched currencies and overlapping rate periods before persistence", () => {
    const base = {
      agreementNumber: "P2-AGR",
      title: "Agreement",
      settlementCurrency: "USD",
      recoverableCost: "100.00",
      eligibleVolumeBasis: "part_shipments" as const,
      roundingScale: 2 as const,
      roundingMode: "half_even" as const,
    };
    expect(() =>
      recoveryAgreementDraftInputSchema.parse({
        ...base,
        ratePeriods: [{ effectiveFrom: "2026-08-01", perUnitRate: "1.25", currency: "EUR" }],
      }),
    ).toThrow(/settlement currency/i);
    expect(() =>
      recoveryAgreementDraftInputSchema.parse({
        ...base,
        ratePeriods: [
          {
            effectiveFrom: "2026-08-01",
            effectiveTo: "2026-08-31",
            perUnitRate: "1.25",
            currency: "USD",
          },
          { effectiveFrom: "2026-08-31", perUnitRate: "1.5", currency: "USD" },
        ],
      }),
    ).toThrow(/overlap/i);
  });
});

describe("production recovery repository", () => {
  it("uses only the server-selected organization for load and draft persistence", async () => {
    const calls: { name: string; args: Record<string, unknown> }[] = [];
    const client = {
      async rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        if (name === "get_recovery_workspace") return { data: workspaceFixture(), error: null };
        return { data: agreementId, error: null };
      },
    } as unknown as SupabaseClient<Database>;

    await loadProductionRecoveryWorkspace({ client, organizationId });
    await saveProductionRecoveryAgreementDraft({
      client,
      organizationId,
      payload: {
        agreementNumber: "P2-AGR",
        title: "Agreement",
        settlementCurrency: "USD",
        recoverableCost: "100.00",
        eligibleVolumeBasis: "part_shipments",
        roundingScale: 2,
        roundingMode: "half_even",
        ratePeriods: [],
      },
    });

    expect(calls.map((call) => call.name)).toEqual([
      "get_recovery_workspace",
      "save_recovery_agreement_draft",
    ]);
    expect(calls.every((call) => call.args.target_organization_id === organizationId)).toBe(true);
    expect(calls[1]?.args).not.toHaveProperty("actor_id");
  });

  it("calls only the bounded public atomic activation RPC", async () => {
    const calls: string[] = [];
    const client = {
      async rpc(name: string) {
        calls.push(name);
        return { data: agreementId, error: null };
      },
    } as unknown as SupabaseClient<Database>;

    await reviewAndActivateProductionRecovery({ client, agreementId });
    expect(calls).toEqual(["review_and_activate_recovery_agreement"]);
  });
});

describe("production Contracts boundary", () => {
  it("contains no demo fixture import and names the disabled provider inputs", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "components", "production-contracts.tsx"),
      "utf8",
    );
    expect(source).not.toContain("@/lib/demo-data");
    expect(source).not.toContain("localStorage");
    expect(source).toContain("approved malware scanner");
    expect(source).toContain("Manual agreement evidence");
    expect(source).toContain("Review and activate atomically");
  });
});
