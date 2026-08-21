import { invariant } from "./errors";

export interface ExtractionField {
  key: string;
  value: string;
  confidence?: string;
  warnings?: readonly string[];
  evidence?: {
    page: number;
    text: string;
    tableCoordinates?: { table: number; row: number; column: number };
  };
}

export interface ExtractionResult {
  provider: string;
  providerVersion: string;
  documentSha256: string;
  textBlocks: readonly { page: number; text: string }[];
  tables: readonly {
    page: number;
    cells: readonly (readonly string[])[];
  }[];
  fields: readonly ExtractionField[];
}

export interface ExtractionProvider {
  readonly name: string;
  extract(input: {
    documentSha256: string;
    documentType: string;
    bytes: Uint8Array;
    configuredFields: readonly string[];
    approvedMimeType?: string;
  }): Promise<ExtractionResult>;
}

export class DeterministicDevelopmentExtractor implements ExtractionProvider {
  readonly name = "deterministic-development";

  async extract(input: {
    documentSha256: string;
    documentType: string;
    bytes: Uint8Array;
    configuredFields: readonly string[];
    approvedMimeType?: string;
  }): Promise<ExtractionResult> {
    invariant(input.bytes.length > 0, "Document is empty", "empty_document");
    invariant(
      input.configuredFields.length > 0,
      "Configured document fields are required",
      "document_schema_required",
    );
    return Object.freeze({
      provider: this.name,
      providerVersion: "1",
      documentSha256: input.documentSha256,
      textBlocks: Object.freeze([]),
      tables: Object.freeze([]),
      fields: Object.freeze(
        input.configuredFields.map((key) =>
          Object.freeze({
            key,
            value: "",
            confidence: "0",
            warnings: Object.freeze(["manual entry and source evidence required"]),
            evidence: undefined,
          }),
        ),
      ),
    });
  }
}

export function approveExtraction(input: {
  result: ExtractionResult;
  corrections: Readonly<Record<string, string>>;
  correctionEvidence?: Readonly<Record<string, { page: number; text: string; reason: string }>>;
  requiredFields?: readonly string[];
  reviewerId: string;
  reviewedAt: string;
}) {
  invariant(input.reviewerId.trim() !== "", "Reviewer is required", "reviewer_required");
  invariant(
    !Number.isNaN(Date.parse(input.reviewedAt)),
    "Review timestamp is invalid",
    "invalid_review_timestamp",
  );
  const fields = input.result.fields.map((field) => {
    const corrected = Object.hasOwn(input.corrections, field.key);
    const approvedValue = input.corrections[field.key] ?? field.value;
    const correctionEvidence = input.correctionEvidence?.[field.key];
    const evidence = correctionEvidence
      ? { page: correctionEvidence.page, text: correctionEvidence.text }
      : field.evidence;
    if (approvedValue.trim() !== "") {
      invariant(
        evidence?.page && evidence.page > 0 && evidence.text.trim() !== "",
        `Source evidence is required for ${field.key}`,
        "extraction_evidence_required",
        {
          field: field.key,
        },
      );
    }
    if (corrected) {
      invariant(
        Boolean(correctionEvidence?.reason.trim()),
        `Correction reason is required for ${field.key}`,
        "extraction_correction_reason_required",
        {
          field: field.key,
        },
      );
    }
    return {
      ...field,
      approvedValue,
      evidence,
      corrected,
      correctionReason: correctionEvidence?.reason,
    };
  });
  for (const requiredField of input.requiredFields ?? []) {
    const field = fields.find((candidate) => candidate.key === requiredField);
    invariant(
      field && field.approvedValue.trim() !== "",
      `Required document field ${requiredField} is missing`,
      "required_extraction_field_missing",
      { field: requiredField },
    );
    invariant(
      field.evidence,
      `Required document field ${requiredField} has no source evidence`,
      "extraction_evidence_required",
      { field: requiredField },
    );
  }
  return Object.freeze({
    status: "approved" as const,
    authoritativeSource: "approved_document_and_human_review" as const,
    sourceResult: input.result,
    fields: Object.freeze(fields),
    reviewerId: input.reviewerId,
    reviewedAt: input.reviewedAt,
  });
}

export type DocumentPostingEntity =
  "contract" | "dcr" | "part" | "program" | "supplier" | "recovery_rate" | "accrual";

export function buildDocumentPostingPlan(input: {
  approval: ReturnType<typeof approveExtraction>;
  mappings: Readonly<Record<string, { entityType: DocumentPostingEntity; targetField: string }>>;
}) {
  invariant(
    input.approval.status === "approved",
    "Extraction approval is required",
    "extraction_not_approved",
  );
  return Object.freeze(
    input.approval.fields
      .filter((field) => field.approvedValue.trim() !== "")
      .map((field) => {
        const mapping = input.mappings[field.key];
        invariant(
          mapping,
          `No approved destination mapping exists for ${field.key}`,
          "document_destination_mapping_required",
          {
            field: field.key,
          },
        );
        invariant(
          field.evidence,
          `Approved field ${field.key} has no source evidence`,
          "extraction_evidence_required",
        );
        return Object.freeze({
          ...mapping,
          fieldKey: field.key,
          approvedValue: field.approvedValue,
          evidence: field.evidence,
          documentSha256: input.approval.sourceResult.documentSha256,
          extractionProvider: input.approval.sourceResult.provider,
          reviewerId: input.approval.reviewerId,
          reviewedAt: input.approval.reviewedAt,
        });
      }),
  );
}
