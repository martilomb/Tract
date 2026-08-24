import { invariant } from "./errors";

export type RecoveryAgreementStatus =
  "draft" | "under_review" | "approved" | "active" | "expired" | "superseded" | "rejected";

export type EligibleVolumeBasis =
  "part_shipments" | "vehicle_production" | "invoiced_units" | "manual_approved";

export interface AgreementRatePeriod {
  effectiveFrom: string;
  effectiveTo?: string;
  perUnitRate: string;
  currency: string;
}

export interface RecoveryAgreement {
  id: string;
  organizationId: string;
  agreementNumber: string;
  title: string;
  supplierId?: string;
  status: RecoveryAgreementStatus;
  settlementCurrency: string;
  recoverableCost: string;
  eligibleVolumeBasis: EligibleVolumeBasis;
  effectiveFrom?: string;
  effectiveTo?: string;
  expiresOn?: string;
  ownerId: string;
  documentVersionIds: readonly string[];
  programIds: readonly string[];
  modelYearIds: readonly string[];
  partIds: readonly string[];
  dcrIds: readonly string[];
  ratePeriods: readonly AgreementRatePeriod[];
  approvedBy?: string;
  approvedAt?: string;
  approvalDecisionId?: string;
  supersedesId?: string;
}

export interface RecoverySetupActivation {
  agreementEvidenceReviewed: boolean;
  eligibleVolumeBasisConfirmed: boolean;
  roundingMode: "half_even";
  forecastAssumptionsVersion: string;
  compatibleLinks: readonly {
    programId: string;
    modelYearId: string;
    partId: string;
  }[];
  dcrStatuses: readonly {
    id: string;
    status: "draft" | "submitted" | "under_review" | "approved" | "active" | "closed";
  }[];
}

function validIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function validateRecoveryAgreement(agreement: RecoveryAgreement): RecoveryAgreement {
  invariant(
    agreement.organizationId.trim() !== "",
    "Organization is required",
    "agreement_org_required",
  );
  invariant(
    agreement.agreementNumber.trim() !== "",
    "Agreement number is required",
    "agreement_number_required",
  );
  invariant(
    agreement.title.trim() !== "",
    "Agreement title is required",
    "agreement_title_required",
  );
  invariant(
    /^[A-Z]{3}$/.test(agreement.settlementCurrency),
    "Settlement currency must use a three-letter code",
    "agreement_currency_invalid",
  );
  invariant(
    /^\d+(\.\d+)?$/.test(agreement.recoverableCost) && Number(agreement.recoverableCost) >= 0,
    "Recoverable cost must be a non-negative decimal",
    "agreement_cost_invalid",
  );
  invariant(
    agreement.ownerId.trim() !== "",
    "Agreement owner is required",
    "agreement_owner_required",
  );
  if (agreement.effectiveFrom) {
    invariant(
      validIsoDate(agreement.effectiveFrom),
      "Effective date is invalid",
      "agreement_date_invalid",
    );
  }
  if (agreement.effectiveTo) {
    invariant(validIsoDate(agreement.effectiveTo), "End date is invalid", "agreement_date_invalid");
    invariant(
      Boolean(agreement.effectiveFrom) && agreement.effectiveTo >= agreement.effectiveFrom!,
      "Agreement end date cannot precede its effective date",
      "agreement_date_invalid",
    );
  }
  for (const rate of agreement.ratePeriods) {
    invariant(
      validIsoDate(rate.effectiveFrom),
      "Rate effective date is invalid",
      "agreement_rate_invalid",
    );
    invariant(
      /^\d+(\.\d+)?$/.test(rate.perUnitRate),
      "Per-unit rate must be a decimal string",
      "agreement_rate_invalid",
    );
    invariant(
      /^[A-Z]{3}$/.test(rate.currency),
      "Rate currency is invalid",
      "agreement_rate_invalid",
    );
    invariant(
      rate.currency === agreement.settlementCurrency,
      "Rate currency must match the agreement settlement currency",
      "agreement_rate_currency_mismatch",
    );
    invariant(
      !rate.effectiveTo || rate.effectiveTo >= rate.effectiveFrom,
      "Rate end date cannot precede its effective date",
      "agreement_rate_invalid",
    );
  }
  const orderedRates = [...agreement.ratePeriods].sort((left, right) =>
    left.effectiveFrom.localeCompare(right.effectiveFrom),
  );
  for (let index = 1; index < orderedRates.length; index += 1) {
    const previous = orderedRates[index - 1]!;
    const current = orderedRates[index]!;
    invariant(
      !previous.effectiveTo || previous.effectiveTo < current.effectiveFrom,
      "Agreement rate periods cannot overlap",
      "agreement_rate_overlap",
    );
  }
  return agreement;
}

export function submitAgreementForReview(agreement: RecoveryAgreement): RecoveryAgreement {
  validateRecoveryAgreement(agreement);
  invariant(
    agreement.status === "draft",
    "Only a draft agreement can be submitted",
    "agreement_transition_invalid",
  );
  return Object.freeze({ ...agreement, status: "under_review" });
}

export function approveRecoveryAgreement(input: {
  agreement: RecoveryAgreement;
  approverId: string;
  approvalDecisionId: string;
  approvedAt: string;
}): RecoveryAgreement {
  const agreement = validateRecoveryAgreement(input.agreement);
  invariant(
    agreement.status === "under_review",
    "Only an agreement under review can be approved",
    "agreement_transition_invalid",
  );
  invariant(
    agreement.documentVersionIds.length > 0,
    "Approval requires an original document version",
    "agreement_document_required",
  );
  invariant(
    agreement.programIds.length > 0 || agreement.partIds.length > 0,
    "Approval requires at least one linked program or part",
    "agreement_link_required",
  );
  invariant(
    agreement.ratePeriods.length > 0,
    "Approval requires a rate period",
    "agreement_rate_required",
  );
  invariant(input.approverId.trim() !== "", "Approver is required", "agreement_approver_required");
  invariant(
    input.approvalDecisionId.trim() !== "",
    "Approval decision evidence is required",
    "agreement_approval_required",
  );
  return Object.freeze({
    ...agreement,
    status: "approved",
    approvedBy: input.approverId,
    approvedAt: input.approvedAt,
    approvalDecisionId: input.approvalDecisionId,
  });
}

export function activateRecoveryAgreement(
  agreement: RecoveryAgreement,
  asOfDate: string,
  setup: RecoverySetupActivation,
): RecoveryAgreement {
  validateRecoveryAgreement(agreement);
  invariant(
    agreement.status === "approved",
    "Only an approved agreement can be activated",
    "agreement_transition_invalid",
  );
  invariant(
    Boolean(agreement.approvalDecisionId),
    "Activation requires approval evidence",
    "agreement_approval_required",
  );
  invariant(
    agreement.documentVersionIds.length > 0,
    "Activation requires a reviewed original document version",
    "agreement_document_required",
  );
  invariant(
    agreement.programIds.length > 0 &&
      agreement.modelYearIds.length > 0 &&
      agreement.partIds.length > 0,
    "Activation requires linked program, model year, and part records",
    "agreement_link_required",
  );
  invariant(
    agreement.ratePeriods.length > 0,
    "Activation requires a rate period",
    "agreement_rate_required",
  );
  invariant(
    setup.agreementEvidenceReviewed,
    "Activation requires reviewed agreement evidence",
    "agreement_evidence_review_required",
  );
  invariant(
    setup.eligibleVolumeBasisConfirmed,
    "Activation requires confirmed eligible-volume basis",
    "agreement_volume_basis_required",
  );
  invariant(
    setup.roundingMode === "half_even",
    "Activation requires the approved rounding policy",
    "agreement_rounding_required",
  );
  invariant(
    setup.forecastAssumptionsVersion.trim() !== "",
    "Activation requires versioned forecast assumptions",
    "agreement_forecast_assumptions_required",
  );
  invariant(
    setup.compatibleLinks.some(
      (link) =>
        agreement.programIds.includes(link.programId) &&
        agreement.modelYearIds.includes(link.modelYearId) &&
        agreement.partIds.includes(link.partId),
    ),
    "Activation requires a compatible linked program, model year, and part",
    "agreement_link_incompatible",
  );
  for (const dcrId of agreement.dcrIds) {
    const linkedDcr = setup.dcrStatuses.find((candidate) => candidate.id === dcrId);
    invariant(
      linkedDcr?.status === "approved" || linkedDcr?.status === "active",
      "Activation requires every linked DCR to be approved",
      "agreement_dcr_not_approved",
      { dcrId },
    );
  }
  invariant(
    Boolean(agreement.effectiveFrom),
    "Activation requires an effective date",
    "agreement_date_required",
  );
  invariant(
    agreement.effectiveFrom! <= asOfDate,
    "Agreement is not yet effective",
    "agreement_not_effective",
  );
  invariant(
    !agreement.effectiveTo || agreement.effectiveTo >= asOfDate,
    "Agreement has ended",
    "agreement_expired",
  );
  invariant(
    !agreement.expiresOn || agreement.expiresOn >= asOfDate,
    "Agreement has expired",
    "agreement_expired",
  );
  return Object.freeze({ ...agreement, status: "active" });
}

export function assertRecoveryPostingAllowed(
  agreement: RecoveryAgreement | undefined,
  asOfDate: string,
): void {
  invariant(agreement, "Recovery posting requires a linked agreement", "agreement_required");
  invariant(
    agreement.status === "active",
    "Recovery posting requires an active agreement",
    "agreement_inactive",
  );
  invariant(
    Boolean(agreement.approvalDecisionId),
    "Recovery posting requires approval evidence",
    "agreement_approval_required",
  );
  invariant(
    Boolean(agreement.effectiveFrom) && agreement.effectiveFrom! <= asOfDate,
    "Agreement is not effective for this posting date",
    "agreement_not_effective",
  );
  invariant(
    !agreement.effectiveTo || agreement.effectiveTo >= asOfDate,
    "Agreement ended before this posting date",
    "agreement_expired",
  );
  invariant(
    !agreement.expiresOn || agreement.expiresOn >= asOfDate,
    "Agreement expired before this posting date",
    "agreement_expired",
  );
}
