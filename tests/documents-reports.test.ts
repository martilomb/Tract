import { describe, expect, it } from "vitest";

import {
  approveExtraction,
  buildDocumentPostingPlan,
  DeterministicDevelopmentExtractor,
} from "@/domain/documents";
import { createEvidenceManifest, safeSpreadsheetCell, toCsv } from "@/domain/reports";

describe("documents and reports", () => {
  it("preserves extraction provenance and reviewer corrections", async () => {
    const provider = new DeterministicDevelopmentExtractor();
    const result = await provider.extract({
      documentSha256: "abc",
      documentType: "contract",
      bytes: new Uint8Array([1]),
      configuredFields: ["rate"],
    });
    const approval = approveExtraction({
      result,
      corrections: { rate: "0.125" },
      correctionEvidence: {
        rate: { page: 4, text: "Piece-price recovery: $0.125", reason: "Manual document review" },
      },
      reviewerId: "reviewer",
      reviewedAt: "2026-08-21T12:00:00Z",
    });
    expect(approval.fields[0]).toMatchObject({
      key: "rate",
      approvedValue: "0.125",
      corrected: true,
    });
    expect(approval.sourceResult.documentSha256).toBe("abc");
    const posting = buildDocumentPostingPlan({
      approval,
      mappings: { rate: { entityType: "recovery_rate", targetField: "per_unit_rate" } },
    });
    expect(posting[0]).toMatchObject({
      entityType: "recovery_rate",
      approvedValue: "0.125",
      reviewerId: "reviewer",
    });
  });

  it("will not approve a populated extracted value without document evidence", () => {
    expect(() =>
      approveExtraction({
        result: {
          provider: "test",
          providerVersion: "1",
          documentSha256: "abc",
          textBlocks: [],
          tables: [],
          fields: [{ key: "currency", value: "USD", confidence: "0.9" }],
        },
        corrections: {},
        reviewerId: "reviewer",
        reviewedAt: "2026-08-21T12:00:00Z",
      }),
    ).toThrow(/evidence/i);
  });

  it("neutralizes spreadsheet formulas and emits a reproducible manifest", () => {
    expect(safeSpreadsheetCell("=cmd|' /C calc'!A0")).toMatch(/^'/);
    expect(toCsv([{ part: "P-1", comment: "+unsafe" }])).toContain('"\'+unsafe"');
    const manifest = createEvidenceManifest({
      organizationId: "org-a",
      reportType: "recovery-evidence",
      generatedAt: "2026-08-21T12:00:00Z",
      generatedBy: "u1",
      policyVersions: ["p:2", "p:1"],
      calculationRunIds: ["r2", "r1"],
      documentHashes: ["b", "a"],
    });
    expect(manifest.policyVersions).toEqual(["p:1", "p:2"]);
  });
});
