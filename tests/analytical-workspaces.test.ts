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
      expect(source).toMatch(/analysisCsv|toCsv/);
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
});
