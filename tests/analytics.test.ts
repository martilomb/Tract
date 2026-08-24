import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANALYSIS_SCOPE,
  analysisCsv,
  assertSnapshotReconciles,
  buildAnalysisSnapshot,
} from "../src/domain/analytics";
import { parts, programModelYears, programs } from "../src/lib/demo-data";

const book = { programs, parts, programModelYears };

describe("canonical analysis snapshot", () => {
  it("reconciles part lines, programs, OEMs, chart completion, and metrics", () => {
    const snapshot = buildAnalysisSnapshot(book, DEFAULT_ANALYSIS_SCOPE);
    expect(() => assertSnapshotReconciles(snapshot)).not.toThrow();
    expect(snapshot.metrics.totalRecoverableCost).toBe(
      parts.reduce((total, part) => total + part.totalAmortized, 0),
    );
  });

  it("honors OEM, program, model-year, and part scope together", () => {
    const part = parts[0];
    const year = programModelYears[part.programId][0];
    const snapshot = buildAnalysisSnapshot(book, {
      ...DEFAULT_ANALYSIS_SCOPE,
      dimension: "part",
      oem: part.oem,
      programId: part.programId,
      modelYear: year,
      partId: part.id,
    });
    expect(snapshot.lines).not.toHaveLength(0);
    expect(snapshot.lines.every((line) => line.oem === part.oem)).toBe(true);
    expect(snapshot.lines.every((line) => line.programId === part.programId)).toBe(true);
    expect(snapshot.lines.every((line) => line.modelYear === year)).toBe(true);
    expect(snapshot.lines.every((line) => line.partId === part.id)).toBe(true);
    expect(() => assertSnapshotReconciles(snapshot)).not.toThrow();
  });

  it("allocates every part exactly across its linked model years", () => {
    const part = parts[7];
    const snapshots = programModelYears[part.programId].map((modelYear) =>
      buildAnalysisSnapshot(book, {
        ...DEFAULT_ANALYSIS_SCOPE,
        dimension: "part",
        programId: part.programId,
        modelYear,
        partId: part.id,
      }),
    );
    expect(snapshots.reduce((total, item) => total + item.metrics.totalRecoverableCost, 0)).toBe(
      part.totalAmortized,
    );
    expect(snapshots.reduce((total, item) => total + item.metrics.recoveredToDate, 0)).toBe(
      part.recoveredToDate,
    );
  });

  it("derives variance and remaining recovery from the same direct values", () => {
    const snapshot = buildAnalysisSnapshot(book, DEFAULT_ANALYSIS_SCOPE);
    expect(snapshot.metrics.projectedVariance).toBe(
      snapshot.metrics.forecastAtCompletion - snapshot.metrics.totalRecoverableCost,
    );
    expect(snapshot.metrics.remainingRecovery).toBe(
      snapshot.lines.reduce((total, line) => total + line.remainingRecovery, 0),
    );
    expect(snapshot.metrics.overRecovery - snapshot.metrics.underRecovery).toBeCloseTo(
      snapshot.metrics.projectedVariance,
      5,
    );
  });

  it("exports current scope and exact displayed record values with provenance", () => {
    const snapshot = buildAnalysisSnapshot(book, {
      ...DEFAULT_ANALYSIS_SCOPE,
      oem: "Ford",
    });
    const csv = analysisCsv(snapshot);
    expect(csv).toContain("Program analysis · Ford");
    expect(csv).toContain(snapshot.provenance.calculationVersion);
    expect(csv).toContain(snapshot.provenance.forecastVersion);
    expect(csv).toContain(snapshot.records[0].totalRecoverableCost.toFixed(2));
    expect(csv).not.toContain("Toyota RAV4");
  });

  it("produces alerts only from versioned materiality rules", () => {
    const snapshot = buildAnalysisSnapshot(book, DEFAULT_ANALYSIS_SCOPE);
    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(snapshot.alerts.every((alert) => alert.ruleId.startsWith("materiality-"))).toBe(true);
    expect(snapshot.alerts.every((alert) => alert.reason.includes("materiality rule"))).toBe(true);
  });

  it("fails closed instead of relabelling unchanged data as an unknown forecast version", () => {
    expect(() =>
      buildAnalysisSnapshot(book, {
        ...DEFAULT_ANALYSIS_SCOPE,
        forecastVersion: "unapproved-scenario",
      }),
    ).toThrow("Unsupported forecast version");
  });

  it("keeps each part total equal to its program contribution", () => {
    const snapshot = buildAnalysisSnapshot(book, DEFAULT_ANALYSIS_SCOPE);
    for (const program of snapshot.programRecords.slice(0, 25)) {
      const partsInProgram = snapshot.partRecords.filter(
        (part) => part.programId === program.programId,
      );
      expect(partsInProgram.reduce((total, part) => total + part.totalRecoverableCost, 0)).toBe(
        program.totalRecoverableCost,
      );
      expect(
        partsInProgram.reduce((total, part) => total + part.forecastAtCompletion, 0),
      ).toBeCloseTo(program.forecastAtCompletion, 5);
    }
  });
});
