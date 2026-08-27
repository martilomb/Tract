import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_ANALYSIS_SCOPE,
  assertSnapshotReconciles,
  buildAnalysisSnapshot,
} from "@/domain/analytics";
import { buildBoundedTablePage } from "@/domain/bounded-table";
import type { Part, Program } from "@/lib/demo-data";

const SCALE_PROGRAM_COUNT = 200;
const SCALE_PART_COUNT = 17_000;

function scaleFixture() {
  const programs: Program[] = Array.from({ length: SCALE_PROGRAM_COUNT }, (_, index) => ({
    id: `program-${index + 1}`,
    code: `P-${String(index + 1).padStart(3, "0")}`,
    name: `Scale program ${index + 1}`,
    oem: index % 2 ? "Ford" : "GM",
    platform: "Synthetic architecture",
    sop: "2025-01-01",
    eop: "2030-12-31",
    totalAmortized: 100_000,
    recoveredToDate: 50_000,
    forecastRecovery: 105_000,
    contractedVolume: 10_000,
    actualVolume: 5_000,
    forecastVolume: 10_500,
    status: "over",
    partsCount: Math.ceil(SCALE_PART_COUNT / SCALE_PROGRAM_COUNT),
  }));
  const parts: Part[] = Array.from({ length: SCALE_PART_COUNT }, (_, index) => {
    const program = programs[index % programs.length]!;
    return {
      id: `part-${index + 1}`,
      partNumber: `SCALE-${String(SCALE_PART_COUNT - index).padStart(5, "0")}`,
      description: "Long-overlay regression fixture",
      programId: program.id,
      programName: program.name,
      oem: program.oem,
      piecePrice: 1,
      amortizedPerPiece: 2,
      contractedVolume: 1_000,
      shippedVolume: 500,
      forecastVolume: 1_100,
      totalAmortized: 2_000,
      recoveredToDate: 1_000,
      status: "over",
      breakEvenDate: "2028-01-15",
    };
  });
  return {
    programs,
    parts,
    programModelYears: Object.fromEntries(programs.map((program) => [program.id, [2026]])),
  };
}

describe("17,000-part bounded overlay regression", () => {
  it("keeps a 200-program / 17,000-part canonical fixture reconcilable while rendering bounded pages", () => {
    const fixture = scaleFixture();
    const snapshot = buildAnalysisSnapshot(fixture, {
      ...DEFAULT_ANALYSIS_SCOPE,
      dimension: "part",
    });
    const partsPage = buildBoundedTablePage({
      rows: snapshot.partRecords,
      page: 1,
      pageSize: 100,
      direction: "ascending",
      compare: (left, right) => left.label.localeCompare(right.label),
    });
    const overlayPage = buildBoundedTablePage({
      rows: snapshot.programRecords,
      page: 1,
      pageSize: 50,
      direction: "none",
      compare: () => 0,
    });

    expect(() => assertSnapshotReconciles(snapshot)).not.toThrow();
    expect(snapshot.partRecords).toHaveLength(SCALE_PART_COUNT);
    expect(snapshot.programRecords).toHaveLength(SCALE_PROGRAM_COUNT);
    expect(partsPage.rows).toHaveLength(100);
    expect(partsPage.totalRows).toBe(SCALE_PART_COUNT);
    expect(overlayPage.rows).toHaveLength(50);
    expect(overlayPage.totalRows).toBe(SCALE_PROGRAM_COUNT);
  });

  it("uses a viewport-bounded, internally scrollable overlay that maps only its rendered page", () => {
    const dialog = readFileSync(
      new URL("../src/components/ui/dialog.tsx", import.meta.url),
      "utf8",
    );
    const overview = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const overlay = overview.slice(overview.indexOf("function KpiDetailDialog"));

    expect(dialog).toContain("max-h-[calc(100dvh-2rem)]");
    expect(dialog).toContain("overflow-y-auto");
    expect(dialog).toContain("data-tract-overlay-scroll-region");
    expect(overlay).toContain("buildBoundedTablePage");
    expect(overlay).toContain('data-overlay-render-limit="50"');
    expect(overlay).toContain("renderedRows.rows.map");
    expect(overlay).not.toContain("{rows.map");
  });
});
