import { invariant } from "./errors";
import type { VehicleVolumeKind } from "./ingestion";

export interface VehicleVolumeImportMapping {
  organizationId: string;
  source: string;
  columns: {
    externalId: string;
    periodStart: string;
    periodEnd?: string;
    dataKind: string;
    units: string;
    oemCode?: string;
    programCode?: string;
    vehicleModelCode?: string;
    plantCode?: string;
    regionCode?: string;
    partNumber?: string;
  };
  allowedDataKinds: readonly VehicleVolumeKind[];
}

export interface StagedVehicleVolumeRow {
  rowNumber: number;
  sourceExternalId: string;
  valid: boolean;
  errors: readonly string[];
  normalized?: {
    externalId: string;
    periodStart: string;
    periodEnd: string;
    dataKind: VehicleVolumeKind;
    sourceUnits: string;
    oemCode?: string;
    programCode?: string;
    vehicleModelCode?: string;
    plantCode?: string;
    regionCode?: string;
    partNumber?: string;
    source: string;
    organizationId: string;
  };
}

export type ImportRunStatus =
  "uploaded" | "staged" | "validated" | "committed" | "failed" | "cancelled";

export interface ImportRunControl {
  id: string;
  status: ImportRunStatus;
  attempt: number;
  failureReason?: string;
}

export interface ImportCommitPlan {
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  partial: boolean;
  committableRowNumbers: readonly number[];
  rejected: readonly { rowNumber: number; errors: readonly string[] }[];
}

export function parseCsv(input: string): readonly Readonly<Record<string, string>>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  invariant(!quoted, "CSV contains an unterminated quoted field", "invalid_csv");
  if (value !== "" || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  invariant(rows.length > 0, "CSV is empty", "invalid_csv");
  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  invariant(
    headers.length > 0 && headers.every(Boolean),
    "CSV headers are required",
    "invalid_csv",
  );
  invariant(new Set(headers).size === headers.length, "CSV headers must be unique", "invalid_csv");
  return rows
    .slice(1)
    .filter((cells) => cells.some((cell) => cell.trim() !== ""))
    .map((cells) =>
      Object.freeze(
        Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""])),
      ),
    );
}

export function stageVehicleVolumeRows(
  rows: readonly Readonly<Record<string, string>>[],
  mapping: VehicleVolumeImportMapping,
): readonly StagedVehicleVolumeRow[] {
  invariant(mapping.organizationId.trim() !== "", "Organization is required", "invalid_mapping");
  invariant(mapping.source.trim() !== "", "Source is required", "invalid_mapping");
  const seen = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const externalId = row[mapping.columns.externalId] ?? "";
    const periodStart = row[mapping.columns.periodStart] ?? "";
    const periodEnd = mapping.columns.periodEnd
      ? row[mapping.columns.periodEnd] || periodStart
      : periodStart;
    const dataKind = row[mapping.columns.dataKind] as VehicleVolumeKind | undefined;
    const units = row[mapping.columns.units] ?? "";
    if (!externalId) errors.push("external id is required");
    if (seen.has(externalId)) errors.push("duplicate external id in file");
    seen.add(externalId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) errors.push("period start must use YYYY-MM-DD");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) errors.push("period end must use YYYY-MM-DD");
    if (periodEnd < periodStart) errors.push("period end cannot precede period start");
    if (!dataKind || !mapping.allowedDataKinds.includes(dataKind))
      errors.push("data kind is not allowed");
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(units)) errors.push("units must be a decimal number");

    const valid = errors.length === 0;
    return Object.freeze({
      rowNumber: index + 2,
      sourceExternalId: externalId,
      valid,
      errors: Object.freeze(errors),
      normalized: valid
        ? Object.freeze({
            externalId,
            periodStart,
            periodEnd,
            dataKind: dataKind as VehicleVolumeKind,
            sourceUnits: units,
            oemCode: mapping.columns.oemCode
              ? row[mapping.columns.oemCode] || undefined
              : undefined,
            programCode: mapping.columns.programCode
              ? row[mapping.columns.programCode] || undefined
              : undefined,
            vehicleModelCode: mapping.columns.vehicleModelCode
              ? row[mapping.columns.vehicleModelCode] || undefined
              : undefined,
            plantCode: mapping.columns.plantCode
              ? row[mapping.columns.plantCode] || undefined
              : undefined,
            regionCode: mapping.columns.regionCode
              ? row[mapping.columns.regionCode] || undefined
              : undefined,
            partNumber: mapping.columns.partNumber
              ? row[mapping.columns.partNumber] || undefined
              : undefined,
            source: mapping.source,
            organizationId: mapping.organizationId,
          })
        : undefined,
    });
  });
}

export function planImportCommit(input: {
  rows: readonly StagedVehicleVolumeRow[];
  allowPartial: boolean;
  actorCanApprovePartial: boolean;
}): ImportCommitPlan {
  invariant(input.rows.length > 0, "Import has no staged rows", "empty_import");
  const valid = input.rows.filter((row) => row.valid);
  const rejected = input.rows.filter((row) => !row.valid);
  invariant(valid.length > 0, "Import has no valid rows to commit", "import_no_valid_rows");
  if (rejected.length > 0) {
    invariant(input.allowPartial, "Import contains rejected rows", "import_partial_not_allowed", {
      rejectedRows: rejected.length,
    });
    invariant(
      input.actorCanApprovePartial,
      "Partial import approval permission is required",
      "import_partial_approval_denied",
    );
  }
  return Object.freeze({
    totalRows: input.rows.length,
    validRows: valid.length,
    rejectedRows: rejected.length,
    partial: rejected.length > 0,
    committableRowNumbers: Object.freeze(valid.map((row) => row.rowNumber)),
    rejected: Object.freeze(
      rejected.map((row) =>
        Object.freeze({ rowNumber: row.rowNumber, errors: Object.freeze([...row.errors]) }),
      ),
    ),
  });
}

export function failImportRun(run: ImportRunControl, failureReason: string): ImportRunControl {
  invariant(
    !["committed", "cancelled"].includes(run.status),
    "A terminal import cannot fail",
    "import_terminal",
  );
  invariant(
    failureReason.trim() !== "",
    "Import failure reason is required",
    "import_reason_required",
  );
  return Object.freeze({ ...run, status: "failed", failureReason });
}

export function retryImportRun(run: ImportRunControl): ImportRunControl {
  invariant(run.status === "failed", "Only a failed import can be retried", "import_retry_denied");
  invariant(
    Number.isInteger(run.attempt) && run.attempt > 0,
    "Import attempt is invalid",
    "invalid_import_attempt",
  );
  return Object.freeze({ id: run.id, status: "staged", attempt: run.attempt + 1 });
}

export function cancelImportRun(input: {
  run: ImportRunControl;
  reason: string;
  actorCanCancel: boolean;
}): ImportRunControl {
  invariant(
    input.actorCanCancel,
    "Import cancellation permission is required",
    "import_cancel_denied",
  );
  invariant(
    !["committed", "cancelled"].includes(input.run.status),
    "A terminal import cannot be cancelled",
    "import_terminal",
  );
  invariant(
    input.reason.trim() !== "",
    "Import cancellation reason is required",
    "import_reason_required",
  );
  return Object.freeze({ ...input.run, status: "cancelled", failureReason: input.reason });
}

export async function importFingerprint(input: {
  organizationId: string;
  connectorId: string;
  bytes: Uint8Array;
}): Promise<string> {
  const prefix = new TextEncoder().encode(`${input.organizationId}:${input.connectorId}:`);
  const combined = new Uint8Array(prefix.length + input.bytes.length);
  combined.set(prefix);
  combined.set(input.bytes, prefix.length);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
