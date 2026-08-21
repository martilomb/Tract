const FORMULA_PREFIX = /^[=+\-@\t\r]/;

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
