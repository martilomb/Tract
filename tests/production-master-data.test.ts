import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/database.types";
import {
  createPartInputSchema,
  masterDataCsv,
  masterDataQuerySchema,
  parseProductionMasterDataWorkspace,
} from "@/domain/production-master-data";
import {
  createGovernedAlias,
  createGovernedPart,
  createGovernedProgram,
  loadProductionMasterDataWorkspace,
} from "@/server/repositories/master-data.server";

const organizationId = "20000000-0000-0000-0000-000000000001";
const programId = "40000000-0000-0000-0000-000000000001";
const modelYearId = "61000000-0000-0000-0000-000000000001";
const partId = "41000000-0000-0000-0000-000000000001";
const revisionId = "62000000-0000-0000-0000-000000000001";

function fixture() {
  return {
    organization_id: organizationId,
    generated_at: "2026-08-29T12:00:00Z",
    as_of_date: "2026-08-29",
    source: "tenant_persistence",
    projection_version: "program-parts-v1",
    view: "parts",
    search: "P2",
    sort_field: "part_number",
    sort_direction: "asc",
    limit: 50,
    offset: 0,
    program_count: 1,
    part_count: 1,
    oems: [{ id: "50000000-0000-0000-0000-000000000001", name: "Controlled OEM" }],
    models: [
      {
        id: "52000000-0000-0000-0000-000000000001",
        oem_id: "50000000-0000-0000-0000-000000000001",
        make_id: null,
        code: "MODEL",
        name: "Controlled model",
        effective_from: "2026-01-01",
        effective_to: null,
        provider_key: null,
        provider_identifier: null,
        provenance_status: "tenant_managed",
      },
    ],
    model_years: [
      {
        id: modelYearId,
        program_id: programId,
        model_year: 2027,
        start_date: "2026-08-01",
        end_date: null,
        provider_key: null,
        provider_identifier: null,
      },
    ],
    program_choices: [{ id: programId, code: "P2", name: "P2 Program" }],
    programs: [
      {
        id: programId,
        code: "P2",
        name: "P2 Program",
        oem_id: "50000000-0000-0000-0000-000000000001",
        oem_name: "Controlled OEM",
        model_id: "52000000-0000-0000-0000-000000000001",
        model_code: "MODEL",
        model_name: "Controlled model",
        start_date: "2026-08-01",
        end_date: null,
        creation_path: "admin_exception",
        provider_key: null,
        provider_identifier: null,
        updated_at: "2026-08-29T12:00:00Z",
        model_years: [2027],
        part_count: 1,
        active_agreement_count: 1,
        approved_recovery_by_currency: [
          { currency: "USD", approved_recoverable_cost: "125000.250000000000000000" },
        ],
      },
    ],
    parts: [
      {
        id: partId,
        part_number: "P2-PART",
        description: "Controlled part",
        status: "active",
        program_id: programId,
        program_code: "P2",
        program_name: "P2 Program",
        updated_at: "2026-08-29T12:00:00Z",
        current_revision: {
          id: revisionId,
          revision_code: "A",
          description: "Initial revision",
          effective_from: "2026-08-01",
          effective_to: null,
          status: "approved",
          source_dcr_id: null,
        },
        active_agreement_count: 1,
        approved_recovery_by_currency: [
          { currency: "USD", approved_recoverable_cost: "125000.250000000000000000" },
        ],
      },
    ],
    selected_program: null,
    selected_part: null,
  };
}

describe("production Programs/Parts domain", () => {
  it("preserves persisted hierarchy, effective revision, and exact amounts through CSV", () => {
    const workspace = parseProductionMasterDataWorkspace(fixture());
    const csv = masterDataCsv({ organizationName: "Staging Organization", workspace });

    expect(workspace.parts[0]?.current_revision?.id).toBe(revisionId);
    expect(workspace.parts[0]?.approved_recovery_by_currency[0]?.approved_recoverable_cost).toBe(
      "125000.250000000000000000",
    );
    expect(csv).toContain('"organization","Staging Organization"');
    expect(csv).toContain('"as_of_date","2026-08-29"');
    expect(csv).toContain('"projection_version","program-parts-v1"');
    expect(csv).toContain(partId);
    expect(csv).toContain(revisionId);
    expect(csv).toContain("125000.250000000000000000");
  });

  it("accepts bounded effective-date queries and rejects unsupported sort fields", () => {
    expect(
      masterDataQuerySchema.parse({
        view: "parts",
        q: "P2",
        asOf: "2026-08-29",
        sort: "part_number",
        direction: "asc",
        limit: 50,
        offset: 0,
      }),
    ).toMatchObject({ view: "parts", limit: 50 });
    expect(() =>
      masterDataQuerySchema.parse({
        view: "parts",
        asOf: "2026-08-29",
        sort: "recoverable_cost",
      }),
    ).toThrow(/sort must be one of/i);
    expect(() =>
      createPartInputSchema.parse({
        mode: "new_revision",
        programId,
        modelYearId,
        partId,
        revisionCode: "",
        effectiveFrom: "2027-01-01",
        exceptionReason: "Governed revision",
      }),
    ).toThrow();
  });
});

describe("production Programs/Parts repository", () => {
  it("uses only the server-selected tenant and bounded RPCs", async () => {
    const calls: { name: string; args: Record<string, unknown> }[] = [];
    const client = {
      async rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        if (name === "get_program_parts_workspace") return { data: fixture(), error: null };
        return { data: {}, error: null };
      },
    } as unknown as SupabaseClient<Database>;

    await loadProductionMasterDataWorkspace({
      client,
      organizationId,
      query: {
        view: "parts",
        q: "P2",
        asOf: "2026-08-29",
        sort: "part_number",
        direction: "asc",
        limit: 50,
        offset: 0,
      },
    });
    await createGovernedProgram({
      client,
      organizationId,
      payload: {
        oemId: "50000000-0000-0000-0000-000000000001",
        modelId: "52000000-0000-0000-0000-000000000001",
        programCode: "P3",
        programName: "P3 Program",
        modelYear: 2028,
        effectiveFrom: "2027-01-01",
        exceptionReason: "Approved confidential program",
      },
    });
    await createGovernedPart({
      client,
      organizationId,
      payload: {
        mode: "new_revision",
        programId,
        modelYearId,
        partId,
        revisionCode: "B",
        effectiveFrom: "2027-01-01",
        exceptionReason: "Approved engineering revision",
      },
    });
    await createGovernedAlias({
      client,
      organizationId,
      payload: {
        entityType: "part",
        entityId: partId,
        alias: "LEGACY-P2",
        reason: "Legacy ERP identifier",
      },
    });

    expect(calls.map((call) => call.name)).toEqual([
      "get_program_parts_workspace",
      "create_program_master_data",
      "create_part_master_data",
      "create_master_data_alias",
    ]);
    expect(calls.every((call) => call.args.target_organization_id === organizationId)).toBe(true);
    expect(calls.every((call) => !("actor_id" in call.args))).toBe(true);
  });
});

describe("production Programs/Parts boundary", () => {
  it("has no demo or browser-local persistence and states the real analysis boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "components", "production-master-data.tsx"),
      "utf8",
    );
    expect(source).not.toContain("@/lib/demo-data");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("buildAnalysisSnapshot");
    expect(source).toContain("No production values are synthesized");
    expect(source).toContain("Export current scope");
  });
});
