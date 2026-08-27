import {
  assertSnapshotReconciles,
  type AnalysisRecord,
  type AnalysisSnapshot,
} from "@/domain/analytics";

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const REPORT_FAMILIES = [
  "recovery-position",
  "actual-contract-forecast",
  "recovery-exceptions",
  "dcr-status-aging",
  "ingestion-reconciliation",
  "audit-evidence",
] as const;

export type ReportFamily = (typeof REPORT_FAMILIES)[number];

export interface CurrentScopeReport {
  id: ReportFamily;
  metadata: Readonly<Record<string, string>>;
  rows: ReadonlyArray<Readonly<Record<string, string>>>;
}

export function safeSpreadsheetCell(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function toCsv(rows: readonly Readonly<Record<string, string>>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] ?? {});
  const quote = (value: string) => `"${safeSpreadsheetCell(value).replaceAll('"', '""')}"`;
  return [
    headers.map(quote).join(","),
    ...rows.map((row) => headers.map((header) => quote(row[header] ?? "")).join(",")),
  ].join("\r\n");
}

/**
 * Produces every approved report family from the same scoped analytical snapshot.
 * The metadata deliberately repeats scope filters and versions in each data row so
 * CSV remains self-describing, while XLSX can also place it in a dedicated sheet.
 */
export function buildCurrentScopeReport(
  id: ReportFamily,
  snapshot: AnalysisSnapshot,
): CurrentScopeReport {
  assertSnapshotReconciles(snapshot);
  const metadata = reportMetadata(snapshot);
  const record = (row: AnalysisRecord) => ({
    ...metadata,
    Record: row.label,
    Context: row.secondaryLabel,
    "Recoverable cost": row.totalRecoverableCost.toFixed(2),
    "Recovered to date": row.recoveredToDate.toFixed(2),
    "Forecast at completion": row.forecastAtCompletion.toFixed(2),
    "Projected variance": row.projectedVariance.toFixed(2),
    "Evidence references": row.evidenceIds.join(" | "),
  });

  if (id === "actual-contract-forecast") {
    return {
      id,
      metadata,
      rows: snapshot.series.map((period) => ({
        ...metadata,
        Month: period.period,
        Actual: period.actual?.toFixed(2) ?? "",
        "Contract curve": period.contract.toFixed(2),
        Forecast: period.forecast.toFixed(2),
        Variance: period.variance.toFixed(2),
        "Cumulative recovery": period.cumulativeRecovery.toFixed(2),
        "Remaining recovery": period.remainingRecovery.toFixed(2),
      })),
    };
  }

  if (id === "recovery-exceptions") {
    return {
      id,
      metadata,
      rows: snapshot.records.filter((row) => row.projectedVariance !== 0).map(record),
    };
  }

  if (id === "dcr-status-aging") {
    return {
      id,
      metadata,
      rows: snapshot.records.map((row) => ({
        ...metadata,
        Record: row.label,
        "DCR data state": "Synthetic scope manifest — authenticated DCR records not loaded",
        "Linked program": row.programId,
        "Evidence references": row.evidenceIds.join(" | "),
      })),
    };
  }

  if (id === "ingestion-reconciliation") {
    return {
      id,
      metadata,
      rows: [
        {
          ...metadata,
          "Ingestion data state": "Synthetic scope manifest — authenticated import runs not loaded",
          "Scoped records": String(snapshot.records.length),
          "Recoverable cost": snapshot.metrics.totalRecoverableCost.toFixed(2),
          "Forecast at completion": snapshot.metrics.forecastAtCompletion.toFixed(2),
          Variance: snapshot.metrics.projectedVariance.toFixed(2),
        },
      ],
    };
  }

  return { id, metadata, rows: snapshot.records.map(record) };
}

function reportMetadata(snapshot: AnalysisSnapshot): Record<string, string> {
  return {
    "Demo data": "Synthetic — not persisted or live",
    Organization: snapshot.provenance.organization,
    Scope: snapshot.scopeLabel,
    "OEM filter": snapshot.scope.oem,
    "Program filter": snapshot.scope.programId,
    "Model year filter": String(snapshot.scope.modelYear),
    "Part filter": snapshot.scope.partId,
    "As of": snapshot.provenance.asOf,
    Currency: snapshot.provenance.currency,
    "Calculation version": snapshot.provenance.calculationVersion,
    "Forecast version": snapshot.provenance.forecastVersion,
    "Source version": snapshot.provenance.sourceVersion,
    Provenance: snapshot.provenance.sourceLabel,
  };
}

export function createEvidenceManifest(input: {
  organizationId: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  policyVersions: readonly string[];
  calculationRunIds: readonly string[];
  documentHashes: readonly string[];
}) {
  return Object.freeze({
    schemaVersion: 1,
    ...input,
    policyVersions: Object.freeze([...input.policyVersions].sort()),
    calculationRunIds: Object.freeze([...input.calculationRunIds].sort()),
    documentHashes: Object.freeze([...input.documentHashes].sort()),
  });
}
