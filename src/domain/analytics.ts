import type { Part, Program, RecoveryStatus } from "@/lib/demo-data";

export type AnalysisDimension = "program" | "part";

export interface AnalysisScope {
  dimension: AnalysisDimension;
  oem: string;
  programId: string;
  modelYear: number | "all";
  partId: string;
  forecastVersion: string;
}

export interface AnalysisProvenance {
  organization: string;
  asOf: string;
  currency: "USD";
  calculationVersion: string;
  forecastVersion: string;
  sourceVersion: string;
  sourceLabel: string;
}

export type MaterialityMetric =
  "under-recovery" | "over-recovery" | "forecast-at-completion" | "break-even-delay";

export interface MaterialityRule {
  id: string;
  metric: MaterialityMetric;
  absoluteAmount?: number;
  percentage?: number;
  delayMonths?: number;
  version: number;
  effectiveFrom: string;
  owner: string;
  approvalState: "approved" | "draft";
  overrideFor?: { programId?: string; agreementId?: string };
}

export interface AnalysisLine {
  partId: string;
  partNumber: string;
  description: string;
  programId: string;
  programName: string;
  programCode: string;
  oem: string;
  modelYear: number | null;
  totalRecoverableCost: number;
  recoveredToDate: number;
  forecastAtCompletion: number;
  projectedVariance: number;
  remainingRecovery: number;
  actualUnits: number;
  contractedUnits: number;
  forecastUnits: number;
  status: RecoveryStatus;
  breakEvenDate: string;
  evidenceIds: string[];
}

export interface AnalysisRecord {
  id: string;
  label: string;
  secondaryLabel: string;
  programId: string;
  partId?: string;
  oem: string;
  totalRecoverableCost: number;
  recoveredToDate: number;
  forecastAtCompletion: number;
  projectedVariance: number;
  remainingRecovery: number;
  actualUnits: number;
  contractedUnits: number;
  forecastUnits: number;
  status: RecoveryStatus;
  evidenceIds: string[];
}

export interface AnalysisPeriod {
  period: string;
  actual: number | null;
  contract: number;
  forecast: number;
  variance: number;
  cumulativeRecovery: number;
  remainingRecovery: number;
}

export interface AnalysisAlert {
  id: string;
  recordId: string;
  programId: string;
  partId?: string;
  label: string;
  metric: "under-recovery" | "over-recovery";
  amount: number;
  percentage: number;
  ruleId: string;
  reason: string;
  evidenceIds: string[];
}

export interface AnalysisSnapshot {
  scope: AnalysisScope;
  scopeLabel: string;
  provenance: AnalysisProvenance;
  metrics: {
    totalRecoverableCost: number;
    recoveredToDate: number;
    forecastAtCompletion: number;
    projectedVariance: number;
    remainingRecovery: number;
    underRecovery: number;
    overRecovery: number;
  };
  lines: AnalysisLine[];
  records: AnalysisRecord[];
  partRecords: AnalysisRecord[];
  programRecords: AnalysisRecord[];
  oemRecords: AnalysisRecord[];
  series: AnalysisPeriod[];
  breakEvenPeriod: string | null;
  alerts: AnalysisAlert[];
}

export interface AnalysisBook {
  programs: Program[];
  parts: Part[];
  programModelYears: Record<string, number[]>;
  provenance?: Partial<AnalysisProvenance>;
  materialityRules?: MaterialityRule[];
}

export const DEFAULT_ANALYSIS_SCOPE: AnalysisScope = {
  dimension: "program",
  oem: "all",
  programId: "all",
  modelYear: "all",
  partId: "all",
  forecastVersion: "development-baseline-v1",
};

export const SUPPORTED_FORECAST_VERSIONS = ["development-baseline-v1"] as const;

export const DEFAULT_MATERIALITY_RULES: MaterialityRule[] = [
  {
    id: "materiality-under-v1",
    metric: "under-recovery",
    absoluteAmount: 250_000,
    percentage: 5,
    version: 1,
    effectiveFrom: "2026-08-24",
    owner: "Finance controls",
    approvalState: "approved",
  },
  {
    id: "materiality-over-v1",
    metric: "over-recovery",
    absoluteAmount: 250_000,
    percentage: 5,
    version: 1,
    effectiveFrom: "2026-08-24",
    owner: "Finance controls",
    approvalState: "approved",
  },
];

const DEFAULT_PROVENANCE: AnalysisProvenance = {
  organization: "Tract demonstration organization",
  asOf: "2026-08-24T09:00:00.000Z",
  currency: "USD",
  calculationVersion: "recovery-policy-v1",
  forecastVersion: "development-baseline-v1",
  sourceVersion: "synthetic-book-2026.08",
  sourceLabel: "Deterministic synthetic fixtures",
};

function sum<T>(values: T[], pick: (value: T) => number): number {
  return values.reduce((total, value) => total + pick(value), 0);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function allocateInteger(total: number, count: number, index: number): number {
  if (count <= 1) return total;
  const sign = total < 0 ? -1 : 1;
  const absolute = Math.abs(Math.round(total));
  const base = Math.floor(absolute / count);
  const remainder = absolute % count;
  return sign * (base + (index < remainder ? 1 : 0));
}

function allocateMoney(total: number, count: number, index: number): number {
  return allocateInteger(Math.round(total * 100), count, index) / 100;
}

function statusFor(total: number, forecast: number): RecoveryStatus {
  if (total === 0) return "on-track";
  const percentage = ((forecast - total) / total) * 100;
  if (percentage <= -10) return "at-risk";
  if (percentage < -2) return "under";
  if (percentage > 2) return "over";
  return "on-track";
}

function partLines(book: AnalysisBook, forecastVersion: string): AnalysisLine[] {
  const programById = new Map(book.programs.map((program) => [program.id, program]));

  return book.parts.flatMap((part) => {
    const program = programById.get(part.programId);
    if (!program) return [];
    const forecastAtCompletion = part.forecastVolume * part.amortizedPerPiece;
    const years = book.programModelYears[program.id] ?? [];
    const allocations = years.length ? years : [null];

    return allocations.map((modelYear, index) => {
      const totalRecoverableCost = allocateMoney(part.totalAmortized, allocations.length, index);
      const recoveredToDate = allocateMoney(part.recoveredToDate, allocations.length, index);
      const forecast = allocateMoney(forecastAtCompletion, allocations.length, index);
      return {
        partId: part.id,
        partNumber: part.partNumber,
        description: part.description,
        programId: program.id,
        programName: program.name,
        programCode: program.code,
        oem: program.oem,
        modelYear,
        totalRecoverableCost,
        recoveredToDate,
        forecastAtCompletion: forecast,
        projectedVariance: forecast - totalRecoverableCost,
        remainingRecovery: Math.max(totalRecoverableCost - recoveredToDate, 0),
        actualUnits: allocateInteger(part.shippedVolume, allocations.length, index),
        contractedUnits: allocateInteger(part.contractedVolume, allocations.length, index),
        forecastUnits: allocateInteger(part.forecastVolume, allocations.length, index),
        status: statusFor(totalRecoverableCost, forecast),
        breakEvenDate: part.breakEvenDate,
        evidenceIds: [
          `agreement:${program.code}`,
          `part:${part.partNumber}`,
          `forecast:${forecastVersion}`,
        ],
      };
    });
  });
}

function filterLines(lines: AnalysisLine[], scope: AnalysisScope): AnalysisLine[] {
  return lines.filter(
    (line) =>
      (scope.oem === "all" || line.oem === scope.oem) &&
      (scope.programId === "all" || line.programId === scope.programId) &&
      (scope.modelYear === "all" || line.modelYear === scope.modelYear) &&
      (scope.partId === "all" || line.partId === scope.partId),
  );
}

function recordFromLines(
  id: string,
  label: string,
  secondaryLabel: string,
  lines: AnalysisLine[],
  partId?: string,
): AnalysisRecord {
  const totalRecoverableCost = sum(lines, (line) => line.totalRecoverableCost);
  const recoveredToDate = sum(lines, (line) => line.recoveredToDate);
  const forecastAtCompletion = sum(lines, (line) => line.forecastAtCompletion);
  return {
    id,
    label,
    secondaryLabel,
    programId: lines[0]?.programId ?? id,
    partId,
    oem: lines[0]?.oem ?? secondaryLabel,
    totalRecoverableCost,
    recoveredToDate,
    forecastAtCompletion,
    projectedVariance: forecastAtCompletion - totalRecoverableCost,
    remainingRecovery: sum(lines, (line) => line.remainingRecovery),
    actualUnits: sum(lines, (line) => line.actualUnits),
    contractedUnits: sum(lines, (line) => line.contractedUnits),
    forecastUnits: sum(lines, (line) => line.forecastUnits),
    status: statusFor(totalRecoverableCost, forecastAtCompletion),
    evidenceIds: unique(lines.flatMap((line) => line.evidenceIds)),
  };
}

function groupRecords(
  lines: AnalysisLine[],
  key: (line: AnalysisLine) => string,
  labels: (line: AnalysisLine) => { label: string; secondaryLabel: string; partId?: string },
): AnalysisRecord[] {
  const groups = new Map<string, AnalysisLine[]>();
  for (const line of lines) {
    const id = key(line);
    groups.set(id, [...(groups.get(id) ?? []), line]);
  }
  return [...groups.entries()]
    .map(([id, group]) => {
      const label = labels(group[0]);
      return recordFromLines(id, label.label, label.secondaryLabel, group, label.partId);
    })
    .sort((left, right) => right.totalRecoverableCost - left.totalRecoverableCost);
}

function buildSeries(metrics: AnalysisSnapshot["metrics"], asOf: string): AnalysisPeriod[] {
  const periods = 24;
  const asOfDate = new Date(asOf);
  const actualPeriods = Math.max(
    1,
    Math.min(periods - 1, (asOfDate.getUTCFullYear() - 2025) * 12 + asOfDate.getUTCMonth() + 1),
  );
  let contract = 0;
  let actual = 0;
  let forecast = 0;
  return Array.from({ length: periods }, (_, index) => {
    const date = new Date(Date.UTC(2025, index, 1));
    const period = date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
    contract += allocateMoney(metrics.totalRecoverableCost, periods, index);
    let actualValue: number | null = null;
    if (index < actualPeriods) {
      actual += allocateMoney(metrics.recoveredToDate, actualPeriods, index);
      forecast = actual;
      actualValue = actual;
    } else {
      forecast += allocateMoney(
        metrics.forecastAtCompletion - metrics.recoveredToDate,
        periods - actualPeriods,
        index - actualPeriods,
      );
    }
    const cumulativeRecovery = actualValue ?? forecast;
    return {
      period,
      actual: actualValue,
      contract,
      forecast,
      variance: forecast - contract,
      cumulativeRecovery,
      remainingRecovery: Math.max(metrics.totalRecoverableCost - cumulativeRecovery, 0),
    };
  });
}

function scopeLabel(scope: AnalysisScope, lines: AnalysisLine[]): string {
  if (!lines.length) return "No matching records";
  const first = lines[0];
  const parts = [scope.dimension === "program" ? "Program analysis" : "Part analysis"];
  if (scope.oem !== "all") parts.push(scope.oem);
  if (scope.programId !== "all") parts.push(first.programName);
  if (scope.modelYear !== "all") parts.push(`MY ${scope.modelYear}`);
  if (scope.partId !== "all") parts.push(first.partNumber);
  if (parts.length === 1) parts.push("All OEMs and records");
  return parts.join(" · ");
}

function alertsFor(records: AnalysisRecord[], rules: MaterialityRule[]): AnalysisAlert[] {
  return records.flatMap((record) => {
    if (!record.projectedVariance || !record.totalRecoverableCost) return [];
    const metric = record.projectedVariance < 0 ? "under-recovery" : "over-recovery";
    const rule = rules
      .filter(
        (candidate) =>
          candidate.metric === metric &&
          candidate.approvalState === "approved" &&
          (!candidate.overrideFor?.programId ||
            candidate.overrideFor.programId === record.programId),
      )
      .sort((left, right) => {
        const specificity = Number(Boolean(right.overrideFor)) - Number(Boolean(left.overrideFor));
        return specificity || right.version - left.version;
      })[0];
    if (!rule) return [];
    const amount = Math.abs(record.projectedVariance);
    const percentage = (amount / record.totalRecoverableCost) * 100;
    const material =
      (rule.absoluteAmount !== undefined && amount >= rule.absoluteAmount) ||
      (rule.percentage !== undefined && percentage >= rule.percentage);
    if (!material) return [];
    return [
      {
        id: `${record.id}:${rule.id}`,
        recordId: record.id,
        programId: record.programId,
        partId: record.partId,
        label: record.label,
        metric,
        amount,
        percentage,
        ruleId: rule.id,
        reason: `${metric === "under-recovery" ? "Under" : "Over"}-recovery variance exceeds materiality rule v${rule.version}. Review evidence before assigning an outcome.`,
        evidenceIds: record.evidenceIds,
      },
    ];
  });
}

export function buildAnalysisSnapshot(book: AnalysisBook, scope: AnalysisScope): AnalysisSnapshot {
  if (!(SUPPORTED_FORECAST_VERSIONS as readonly string[]).includes(scope.forecastVersion)) {
    throw new Error(`Unsupported forecast version: ${scope.forecastVersion}`);
  }
  const lines = filterLines(partLines(book, scope.forecastVersion), scope);
  const programRecords = groupRecords(
    lines,
    (line) => line.programId,
    (line) => ({ label: line.programName, secondaryLabel: `${line.oem} · ${line.programCode}` }),
  );
  const partRecords = groupRecords(
    lines,
    (line) => line.partId,
    (line) => ({
      label: line.partNumber,
      secondaryLabel: `${line.programName} · ${line.description}`,
      partId: line.partId,
    }),
  );
  const oemRecords = groupRecords(
    lines,
    (line) => line.oem,
    (line) => ({
      label: line.oem,
      secondaryLabel: `${new Set(lines.filter((item) => item.oem === line.oem).map((item) => item.programId)).size} programs`,
    }),
  );
  const totalRecoverableCost = sum(lines, (line) => line.totalRecoverableCost);
  const recoveredToDate = sum(lines, (line) => line.recoveredToDate);
  const forecastAtCompletion = sum(lines, (line) => line.forecastAtCompletion);
  const projectedVariance = forecastAtCompletion - totalRecoverableCost;
  const records = scope.dimension === "part" ? partRecords : programRecords;
  const metrics = {
    totalRecoverableCost,
    recoveredToDate,
    forecastAtCompletion,
    projectedVariance,
    remainingRecovery: sum(lines, (line) => line.remainingRecovery),
    underRecovery: sum(records, (record) => Math.max(-record.projectedVariance, 0)),
    overRecovery: sum(records, (record) => Math.max(record.projectedVariance, 0)),
  };
  const provenance = {
    ...DEFAULT_PROVENANCE,
    ...book.provenance,
    forecastVersion: scope.forecastVersion,
  };

  const series = buildSeries(metrics, provenance.asOf);
  return {
    scope,
    scopeLabel: scopeLabel(scope, lines),
    provenance,
    metrics,
    lines,
    records,
    partRecords,
    programRecords,
    oemRecords,
    series,
    breakEvenPeriod:
      series.find((period) => period.forecast >= metrics.totalRecoverableCost)?.period ?? null,
    alerts: alertsFor(records, book.materialityRules ?? DEFAULT_MATERIALITY_RULES),
  };
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function analysisCsv(snapshot: AnalysisSnapshot): string {
  const metadata = [
    ["Demo data", "Synthetic — not persisted or live"],
    ["Organization", snapshot.provenance.organization],
    ["Scope", snapshot.scopeLabel],
    ["Analyze by", snapshot.scope.dimension],
    ["OEM filter", snapshot.scope.oem],
    ["Program filter", snapshot.scope.programId],
    ["Model year filter", snapshot.scope.modelYear],
    ["Part filter", snapshot.scope.partId],
    ["As of", snapshot.provenance.asOf],
    ["Currency", snapshot.provenance.currency],
    ["Calculation version", snapshot.provenance.calculationVersion],
    ["Forecast version", snapshot.provenance.forecastVersion],
    ["Source version", snapshot.provenance.sourceVersion],
  ];
  const header = [
    "Record",
    "Context",
    "Total recoverable cost",
    "Recovered to date",
    "Forecast at completion",
    "Projected variance",
    "Remaining recovery",
    "Status",
    "Evidence references",
  ];
  const rows = snapshot.records.map((record) => [
    record.label,
    record.secondaryLabel,
    record.totalRecoverableCost.toFixed(2),
    record.recoveredToDate.toFixed(2),
    record.forecastAtCompletion.toFixed(2),
    record.projectedVariance.toFixed(2),
    record.remainingRecovery.toFixed(2),
    record.status,
    record.evidenceIds.join(" | "),
  ]);
  return [...metadata, [], header, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\r\n");
}

export function assertSnapshotReconciles(snapshot: AnalysisSnapshot): void {
  const programTotal = sum(snapshot.programRecords, (record) => record.totalRecoverableCost);
  const oemTotal = sum(snapshot.oemRecords, (record) => record.totalRecoverableCost);
  const lineTotal = sum(snapshot.lines, (line) => line.totalRecoverableCost);
  const finalSeries = snapshot.series.at(-1);
  const tolerance = 0.005;
  const checks: Array<[string, number, number]> = [
    ["line to metric total", lineTotal, snapshot.metrics.totalRecoverableCost],
    ["program to metric total", programTotal, snapshot.metrics.totalRecoverableCost],
    ["OEM to metric total", oemTotal, snapshot.metrics.totalRecoverableCost],
    [
      "line recovered to metric recovered",
      sum(snapshot.lines, (line) => line.recoveredToDate),
      snapshot.metrics.recoveredToDate,
    ],
    [
      "part recovered to metric recovered",
      sum(snapshot.partRecords, (record) => record.recoveredToDate),
      snapshot.metrics.recoveredToDate,
    ],
    [
      "program recovered to metric recovered",
      sum(snapshot.programRecords, (record) => record.recoveredToDate),
      snapshot.metrics.recoveredToDate,
    ],
    [
      "OEM recovered to metric recovered",
      sum(snapshot.oemRecords, (record) => record.recoveredToDate),
      snapshot.metrics.recoveredToDate,
    ],
    [
      "part forecast to metric forecast",
      sum(snapshot.partRecords, (record) => record.forecastAtCompletion),
      snapshot.metrics.forecastAtCompletion,
    ],
    [
      "program forecast to metric forecast",
      sum(snapshot.programRecords, (record) => record.forecastAtCompletion),
      snapshot.metrics.forecastAtCompletion,
    ],
    [
      "OEM forecast to metric forecast",
      sum(snapshot.oemRecords, (record) => record.forecastAtCompletion),
      snapshot.metrics.forecastAtCompletion,
    ],
    [
      "record variance to net variance",
      sum(snapshot.records, (record) => record.projectedVariance),
      snapshot.metrics.projectedVariance,
    ],
    [
      "over less under to net variance",
      snapshot.metrics.overRecovery - snapshot.metrics.underRecovery,
      snapshot.metrics.projectedVariance,
    ],
    [
      "line remaining to metric remaining",
      sum(snapshot.lines, (line) => line.remainingRecovery),
      snapshot.metrics.remainingRecovery,
    ],
    [
      "part remaining to metric remaining",
      sum(snapshot.partRecords, (record) => record.remainingRecovery),
      snapshot.metrics.remainingRecovery,
    ],
    [
      "program remaining to metric remaining",
      sum(snapshot.programRecords, (record) => record.remainingRecovery),
      snapshot.metrics.remainingRecovery,
    ],
    [
      "OEM remaining to metric remaining",
      sum(snapshot.oemRecords, (record) => record.remainingRecovery),
      snapshot.metrics.remainingRecovery,
    ],
    [
      "final series contract to metric total",
      finalSeries?.contract ?? 0,
      snapshot.metrics.totalRecoverableCost,
    ],
    [
      "last actual series point to metric recovered",
      [...snapshot.series].reverse().find((period) => period.actual !== null)?.actual ?? 0,
      snapshot.metrics.recoveredToDate,
    ],
    [
      "final series forecast to metric forecast",
      finalSeries?.forecast ?? 0,
      snapshot.metrics.forecastAtCompletion,
    ],
  ];
  for (const [label, left, right] of checks) {
    if (Math.abs(left - right) > tolerance) {
      throw new Error(`${label} does not reconcile: ${left} !== ${right}`);
    }
  }
}
