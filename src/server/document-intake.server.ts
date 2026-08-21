import { invariant } from "@/domain/errors";
import type { ExtractionProvider, ExtractionResult } from "@/domain/documents";

const DEFAULT_ALLOWED_MIME_TYPES = Object.freeze(["application/pdf", "image/png", "image/jpeg"]);

export interface DocumentScanResult {
  status: "clean" | "infected" | "unavailable";
  provider: string;
  providerVersion: string;
  scannedAt: string;
  reference?: string;
}

export interface DocumentSafetyScanner {
  scan(input: {
    documentSha256: string;
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  }): Promise<DocumentScanResult>;
}

export interface ApprovedDocumentIntake {
  filename: string;
  mimeType: string;
  byteLength: number;
  documentSha256: string;
  scan: DocumentScanResult;
}

export async function approveDocumentIntake(input: {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  scanner: DocumentSafetyScanner;
  allowedMimeTypes?: readonly string[];
  maximumBytes?: number;
}): Promise<ApprovedDocumentIntake> {
  const maximumBytes = input.maximumBytes ?? 25 * 1024 * 1024;
  invariant(
    input.filename.length > 0 &&
      input.filename.length <= 255 &&
      !/[\\/]/.test(input.filename) &&
      [...input.filename].every((character) => character.charCodeAt(0) >= 32),
    "Document filename is invalid",
    "invalid_document_filename",
  );
  invariant(input.bytes.byteLength > 0, "Document is empty", "empty_document");
  invariant(
    Number.isInteger(maximumBytes) && maximumBytes > 0 && input.bytes.byteLength <= maximumBytes,
    "Document exceeds the configured size limit",
    "document_too_large",
    { maximumBytes },
  );
  const allowedMimeTypes = input.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  invariant(
    allowedMimeTypes.includes(input.mimeType),
    "Document MIME type is not allowed",
    "document_mime_type_denied",
    { mimeType: input.mimeType },
  );
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(input.bytes));
  const documentSha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const scan = await input.scanner.scan({
    documentSha256,
    filename: input.filename,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });
  invariant(
    scan.provider.trim() !== "" && scan.providerVersion.trim() !== "",
    "Document scanner provenance is required",
    "document_scanner_provenance_required",
  );
  invariant(
    !Number.isNaN(Date.parse(scan.scannedAt)),
    "Document scan timestamp is invalid",
    "invalid_document_scan_timestamp",
  );
  invariant(
    scan.status === "clean",
    scan.status === "infected"
      ? "Document failed malware scanning"
      : "Document scanning is unavailable",
    scan.status === "infected" ? "document_infected" : "document_scan_unavailable",
  );
  return Object.freeze({
    filename: input.filename,
    mimeType: input.mimeType,
    byteLength: input.bytes.byteLength,
    documentSha256,
    scan: Object.freeze({ ...scan }),
  });
}

export async function extractApprovedDocument(input: {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  documentType: string;
  configuredFields: readonly string[];
  scanner: DocumentSafetyScanner;
  extractor: ExtractionProvider;
  allowedMimeTypes?: readonly string[];
  maximumBytes?: number;
}): Promise<{ intake: ApprovedDocumentIntake; extraction: ExtractionResult }> {
  const intake = await approveDocumentIntake(input);
  const extraction = await input.extractor.extract({
    documentSha256: intake.documentSha256,
    documentType: input.documentType,
    bytes: input.bytes,
    configuredFields: input.configuredFields,
    approvedMimeType: intake.mimeType,
  });
  invariant(
    extraction.documentSha256 === intake.documentSha256,
    "Extraction result does not match the approved document",
    "document_extraction_hash_mismatch",
  );
  return Object.freeze({ intake, extraction });
}
