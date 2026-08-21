import { invariant } from "./errors";
import type { VolumeEventType } from "./recovery";

export interface VolumeImportMapping {
  organizationId: string;
  source: string;
  columns: {
    externalId: string;
    occurredOn: string;
    eventType: string;
    units: string;
    programCode?: string;
    partNumber?: string;
  };
  allowedEventTypes: readonly VolumeEventType[];
}

export interface StagedVolumeRow {
  rowNumber: number;
  valid: boolean;
  errors: readonly string[];
  normalized?: {
    externalId: string;
    occurredOn: string;
    eventType: VolumeEventType;
    signedEligibleUnits: string;
    programCode?: string;
    partNumber?: string;
    source: string;
    organizationId: string;
  };
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

export function stageVolumeRows(
  rows: readonly Readonly<Record<string, string>>[],
  mapping: VolumeImportMapping,
): readonly StagedVolumeRow[] {
  invariant(mapping.organizationId.trim() !== "", "Organization is required", "invalid_mapping");
  invariant(mapping.source.trim() !== "", "Source is required", "invalid_mapping");
  const seen = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const externalId = row[mapping.columns.externalId] ?? "";
    const occurredOn = row[mapping.columns.occurredOn] ?? "";
    const eventType = row[mapping.columns.eventType] as VolumeEventType | undefined;
    const units = row[mapping.columns.units] ?? "";
    if (!externalId) errors.push("external id is required");
    if (seen.has(externalId)) errors.push("duplicate external id in file");
    seen.add(externalId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) errors.push("date must use YYYY-MM-DD");
    if (!eventType || !mapping.allowedEventTypes.includes(eventType))
      errors.push("event type is not allowed");
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(units)) errors.push("units must be a decimal number");

    const valid = errors.length === 0;
    return Object.freeze({
      rowNumber: index + 2,
      valid,
      errors: Object.freeze(errors),
      normalized: valid
        ? Object.freeze({
            externalId,
            occurredOn,
            eventType: eventType as VolumeEventType,
            signedEligibleUnits: units,
            programCode: mapping.columns.programCode
              ? row[mapping.columns.programCode] || undefined
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
