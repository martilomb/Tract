import { invariant } from "./errors";

export interface ExtractionField {
  key: string;
  value: string;
  confidence?: string;
  evidence?: { page: number; text: string };
}

export interface ExtractionResult {
  provider: string;
  providerVersion: string;
  documentSha256: string;
  fields: readonly ExtractionField[];
}

export interface ExtractionProvider {
  readonly name: string;
  extract(input: {
    documentSha256: string;
    documentType: string;
    bytes: Uint8Array;
    configuredFields: readonly string[];
  }): Promise<ExtractionResult>;
}

export class DeterministicDevelopmentExtractor implements ExtractionProvider {
  readonly name = "deterministic-development";

  async extract(input: {
    documentSha256: string;
    documentType: string;
    bytes: Uint8Array;
    configuredFields: readonly string[];
  }): Promise<ExtractionResult> {
    invariant(input.bytes.length > 0, "Document is empty", "empty_document");
    return Object.freeze({
      provider: this.name,
      providerVersion: "1",
      documentSha256: input.documentSha256,
      fields: Object.freeze(
        input.configuredFields.map((key) =>
          Object.freeze({ key, value: "", confidence: "0", evidence: undefined }),
        ),
      ),
    });
  }
}

export function approveExtraction(input: {
  result: ExtractionResult;
  corrections: Readonly<Record<string, string>>;
  reviewerId: string;
  reviewedAt: string;
}) {
  invariant(input.reviewerId.trim() !== "", "Reviewer is required", "reviewer_required");
  const fields = input.result.fields.map((field) => ({
    ...field,
    approvedValue: input.corrections[field.key] ?? field.value,
    corrected: Object.hasOwn(input.corrections, field.key),
  }));
  return Object.freeze({
    sourceResult: input.result,
    fields: Object.freeze(fields),
    reviewerId: input.reviewerId,
    reviewedAt: input.reviewedAt,
  });
}
