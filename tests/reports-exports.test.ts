import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { DEFAULT_ANALYSIS_SCOPE, buildAnalysisSnapshot } from "@/domain/analytics";
import { REPORT_FAMILIES, buildCurrentScopeReport, toCsv } from "@/domain/reports";
import { currentScopeCsv, currentScopeXlsxBuffer } from "@/lib/report-download";
import { parts, programModelYears, programs } from "@/lib/demo-data";

const snapshot = buildAnalysisSnapshot(
  { programs, parts, programModelYears },
  { ...DEFAULT_ANALYSIS_SCOPE, dimension: "part", oem: "Ford" },
);

describe("current-scope report exports", () => {
  it.each(REPORT_FAMILIES)(
    "%s derives current-scope rows from the reconciled canonical snapshot with filters and provenance",
    (family) => {
      const report = buildCurrentScopeReport(family, snapshot);
      const csv = toCsv(report.rows);

      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.metadata).toMatchObject({
        "OEM filter": "Ford",
        "Program filter": "all",
        "Model year filter": "all",
        "Part filter": "all",
        "Calculation version": snapshot.provenance.calculationVersion,
        "Forecast version": snapshot.provenance.forecastVersion,
        "Source version": snapshot.provenance.sourceVersion,
      });
      expect(csv).toMatch(/"OEM filter"[^\r\n]*\r\n[^\r\n]*"Ford"/);
      expect(csv).toMatch(
        new RegExp(
          `"Calculation version"[^\\r\\n]*\\r\\n[^\\r\\n]*"${snapshot.provenance.calculationVersion}"`,
        ),
      );
    },
  );

  it("writes a reviewable XLSX metadata sheet and current-scope data sheet", async () => {
    const report = buildCurrentScopeReport("recovery-position", snapshot);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await currentScopeXlsxBuffer(report));

    const metadata = workbook.getWorksheet("Report metadata");
    const data = workbook.getWorksheet("Current scope data");
    expect(metadata?.getCell("A2").value).toBe("Demo data");
    expect(metadata?.getCell("B5").value).toBe("Ford");
    expect(data?.rowCount).toBe(report.rows.length + 1);
    expect(data?.getRow(1).values).toContain("Calculation version");
  });

  it("keeps filters and provenance in a CSV when a current scope has no data rows", () => {
    const report = buildCurrentScopeReport("recovery-position", snapshot);
    const csv = currentScopeCsv({ ...report, rows: [] });

    expect(csv).toContain('"OEM filter"');
    expect(csv).toContain('"Ford"');
    expect(csv).toContain('"Calculation version"');
  });
});
