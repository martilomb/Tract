import { describe, expect, it } from "vitest";

import {
  activateRecoveryAgreement,
  approveRecoveryAgreement,
  assertRecoveryPostingAllowed,
  submitAgreementForReview,
  type RecoveryAgreement,
} from "@/domain/contracts";

const draft: RecoveryAgreement = {
  id: "agreement-1",
  organizationId: "org-a",
  agreementNumber: "AGR-2026-001",
  title: "Cooling plate recovery agreement",
  status: "draft",
  settlementCurrency: "USD",
  recoverableCost: "2400000.00",
  eligibleVolumeBasis: "part_shipments",
  effectiveFrom: "2026-08-01",
  ownerId: "owner-1",
  documentVersionIds: ["document-version-1"],
  programIds: ["program-1"],
  modelYearIds: ["program-year-1"],
  partIds: ["part-1"],
  dcrIds: ["dcr-1"],
  ratePeriods: [{ effectiveFrom: "2026-08-01", perUnitRate: "6.315789", currency: "USD" }],
};

describe("recovery agreement workflow", () => {
  it("keeps DCR linkage separate while requiring approval before recovery activation", () => {
    const underReview = submitAgreementForReview(draft);
    const approved = approveRecoveryAgreement({
      agreement: underReview,
      approverId: "approver-1",
      approvalDecisionId: "approval-1",
      approvedAt: "2026-08-24T12:00:00Z",
    });
    const active = activateRecoveryAgreement(approved, "2026-08-24");

    expect(active.status).toBe("active");
    expect(active.dcrIds).toEqual(["dcr-1"]);
    expect(() => assertRecoveryPostingAllowed(active, "2026-08-24")).not.toThrow();
  });

  it("fails closed when agreement evidence, links, rates, or approval are missing", () => {
    expect(() =>
      approveRecoveryAgreement({
        agreement: { ...submitAgreementForReview(draft), documentVersionIds: [] },
        approverId: "approver-1",
        approvalDecisionId: "approval-1",
        approvedAt: "2026-08-24T12:00:00Z",
      }),
    ).toThrow(/original document/i);
    expect(() => assertRecoveryPostingAllowed(undefined, "2026-08-24")).toThrow(
      /linked agreement/i,
    );
    expect(() => assertRecoveryPostingAllowed(draft, "2026-08-24")).toThrow(/active agreement/i);
  });
});
