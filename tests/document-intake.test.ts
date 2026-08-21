import { describe, expect, it, vi } from "vitest";

import { DeterministicDevelopmentExtractor } from "@/domain/documents";
import {
  approveDocumentIntake,
  extractApprovedDocument,
  type DocumentSafetyScanner,
} from "@/server/document-intake.server";

function scanner(status: "clean" | "infected" | "unavailable"): DocumentSafetyScanner {
  return {
    scan: vi.fn(async () => ({
      status,
      provider: "customer-approved-scanner",
      providerVersion: "2026-08",
      scannedAt: "2026-08-21T12:00:00Z",
      reference: "scan-1",
    })),
  };
}

describe("document intake boundary", () => {
  it("hashes and scans an allowlisted document before invoking extraction", async () => {
    const safetyScanner = scanner("clean");
    const extractor = new DeterministicDevelopmentExtractor();
    const extract = vi.spyOn(extractor, "extract");
    const result = await extractApprovedDocument({
      filename: "contract.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array([1, 2, 3]),
      documentType: "contract",
      configuredFields: ["contract_number"],
      scanner: safetyScanner,
      extractor,
    });

    expect(result.intake).toMatchObject({
      filename: "contract.pdf",
      mimeType: "application/pdf",
      byteLength: 3,
      scan: { status: "clean", provider: "customer-approved-scanner" },
    });
    expect(result.intake.documentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(extract).toHaveBeenCalledOnce();
    expect(result.extraction.documentSha256).toBe(result.intake.documentSha256);
  });

  it("fails closed for infected, unavailable, invalid-type, and oversized documents", async () => {
    const base = {
      filename: "contract.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array([1, 2, 3]),
    };
    await expect(
      approveDocumentIntake({ ...base, scanner: scanner("infected") }),
    ).rejects.toMatchObject({
      code: "document_infected",
    });
    await expect(
      approveDocumentIntake({ ...base, scanner: scanner("unavailable") }),
    ).rejects.toMatchObject({
      code: "document_scan_unavailable",
    });
    await expect(
      approveDocumentIntake({ ...base, mimeType: "text/html", scanner: scanner("clean") }),
    ).rejects.toMatchObject({ code: "document_mime_type_denied" });
    await expect(
      approveDocumentIntake({ ...base, maximumBytes: 2, scanner: scanner("clean") }),
    ).rejects.toMatchObject({ code: "document_too_large" });
  });
});
