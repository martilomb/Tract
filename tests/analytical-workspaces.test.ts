import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = (name: string) =>
  readFileSync(new URL(`../src/routes/${name}.tsx`, import.meta.url), "utf8");

describe("Milestone 10 analytical workspaces", () => {
  it.each(["programs", "parts", "forecasts", "recoveries", "reports"])(
    "%s uses the canonical scoped analysis and export boundary",
    (name) => {
      const source = route(name);
      expect(source).toMatch(/useAnalysis|buildAnalysisSnapshot/);
      expect(source).toMatch(/analysisCsv|toCsv|buildCurrentScopeReport/);
      expect(source).toContain("HierarchicalProgramSelector");
      expect(source).toMatch(/calculation|provenance/i);
      expect(source).not.toMatch(/TARGET_|Math\.random|Prepared demo review package/);
    },
  );

  it("routes ordinary program and part work into guided recovery setup", () => {
    for (const name of ["programs", "parts"]) {
      const source = route(name);
      expect(source).toContain("Set up / activate recovery");
      expect(source).toContain("Admin master data");
    }
  });

  it("restores focus to the part record that opened a controlled detail dialog", () => {
    const source = route("parts");
    expect(source).toContain("selectedTriggerRef");
    expect(source).toContain("selectedTriggerRef.current?.focus()");
  });

  it("restores focus to the Overview tile that opened its controlled detail dialog", () => {
    const source = route("index");
    expect(source).toContain("detailTrigger");
    expect(source).toContain("detailTrigger.current?.focus()");
  });

  it("keeps every report-family action named, current-scope, and connected to a download path", () => {
    const source = route("reports");
    expect(source).toContain("buildCurrentScopeReport");
    expect(source).toContain("downloadCurrentScopeCsv");
    expect(source).toContain("downloadCurrentScopeXlsx");
    expect(source).toContain("Print or save ${report.title} as a PDF for the current scope");
    expect(source).toContain("Generate ${report.title} CSV for the current scope");
    expect(source).toContain("Generate ${report.title} XLSX for the current scope");
    expect(source).not.toMatch(/Prepared demo review package|onClick=\{\(\) => \{\}\}/);
  });
});
