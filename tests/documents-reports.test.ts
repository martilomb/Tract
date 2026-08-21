import { describe, expect, it } from "vitest";

import { approveExtraction, DeterministicDevelopmentExtractor } from "@/domain/documents";
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
      reviewerId: "reviewer",
      reviewedAt: "2026-08-21T12:00:00Z",
    });
    expect(approval.fields[0]).toMatchObject({
      key: "rate",
      approvedValue: "0.125",
      corrected: true,
    });
    expect(approval.sourceResult.documentSha256).toBe("abc");
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
