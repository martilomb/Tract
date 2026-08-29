import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Json } from "../../database.types";
import {
  parseProductionRecoveryWorkspace,
  recoveryAgreementDraftInputSchema,
  recoveryMasterDataInputSchema,
  type ProductionRecoveryWorkspace,
  type RecoveryAgreementDraftInput,
  type RecoveryMasterDataInput,
} from "../../domain/production-contracts";

type DataClient = SupabaseClient<Database>;

export async function loadProductionRecoveryWorkspace(input: {
  client: DataClient;
  organizationId: string;
}): Promise<ProductionRecoveryWorkspace> {
  const result = await input.client.rpc("get_recovery_workspace", {
    target_organization_id: input.organizationId,
  });
  if (result.error) {
    throw new Error("Recovery agreements could not be loaded", { cause: result.error });
  }
  return parseProductionRecoveryWorkspace(result.data);
}

export async function createGovernedRecoveryMasterData(input: {
  client: DataClient;
  organizationId: string;
  payload: unknown;
}): Promise<void> {
  const values = recoveryMasterDataInputSchema.parse(input.payload);
  const result = await input.client.rpc("create_recovery_master_data", {
    target_organization_id: input.organizationId,
    master_data: masterDataPayload(values),
  });
  if (result.error) throw publicRecoveryActionError(result.error.message);
}

export async function saveProductionRecoveryAgreementDraft(input: {
  client: DataClient;
  organizationId: string;
  payload: unknown;
}): Promise<string> {
  const values = recoveryAgreementDraftInputSchema.parse(input.payload);
  const result = await input.client.rpc("save_recovery_agreement_draft", {
    target_organization_id: input.organizationId,
    target_agreement_id: (values.agreementId ?? null) as unknown as string,
    draft_data: agreementDraftPayload(values),
  });
  if (result.error) throw publicRecoveryActionError(result.error.message);
  return result.data;
}

export async function reviewAndActivateProductionRecovery(input: {
  client: DataClient;
  agreementId: string;
}): Promise<string> {
  const agreementId = z.string().uuid().parse(input.agreementId);
  const result = await input.client.rpc("review_and_activate_recovery_agreement", {
    target_agreement_id: agreementId,
  });
  if (result.error) throw publicRecoveryActionError(result.error.message);
  return result.data;
}

function masterDataPayload(values: RecoveryMasterDataInput): Json {
  return {
    oem_name: values.oemName,
    oem_code: values.oemCode,
    make_name: values.makeName,
    model_code: values.modelCode,
    model_name: values.modelName,
    program_code: values.programCode,
    program_name: values.programName,
    model_year: values.modelYear,
    part_number: values.partNumber,
    part_description: values.partDescription,
    revision_code: values.revisionCode,
    revision_description: values.revisionDescription,
    effective_from: values.effectiveFrom,
    exception_reason: values.exceptionReason,
  };
}

function agreementDraftPayload(values: RecoveryAgreementDraftInput): Json {
  return {
    agreement_number: values.agreementNumber,
    title: values.title,
    settlement_currency: values.settlementCurrency,
    recoverable_cost: values.recoverableCost,
    eligible_volume_basis: values.eligibleVolumeBasis,
    effective_from: values.effectiveFrom ?? "",
    effective_to: values.effectiveTo ?? "",
    expires_on: values.expiresOn ?? "",
    rounding_scale: values.roundingScale,
    rounding_mode: values.roundingMode,
    contractual_limit_amount: values.contractualLimitAmount ?? "",
    forecast_assumptions_version: values.forecastAssumptionsVersion ?? "",
    forecast_assumptions: values.forecastAssumptions
      ? {
          basis: values.forecastAssumptions.basis,
          annual_growth_percent: values.forecastAssumptions.annualGrowthPercent,
          scenario: values.forecastAssumptions.scenario,
        }
      : {},
    evidence_review_method: values.evidence?.method ?? "",
    evidence_reference: values.evidence?.reference ?? "",
    evidence_summary: values.evidence?.summary ?? "",
    program_id: values.programId ?? "",
    model_year_id: values.modelYearId ?? "",
    part_id: values.partId ?? "",
    part_revision_id: values.partRevisionId ?? "",
    dcr_id: values.dcrId ?? "",
    rate_periods: values.ratePeriods.map((rate) => ({
      effective_from: rate.effectiveFrom,
      effective_to: rate.effectiveTo ?? "",
      per_unit_rate: rate.perUnitRate,
      currency: rate.currency,
    })),
  };
}

function publicRecoveryActionError(message: string): Error {
  const known = [
    "already exists; select the existing record",
    "administrator access is required",
    "only a draft recovery agreement",
    "recovery agreement must be effective",
    "reviewed evidence and versioned forecast assumptions are required",
    "guided activation requires exactly one linked program, model year, and part/revision",
    "linked DCRs must be approved",
    "compatible linked program and part",
    "current rate in the agreement currency",
    "rate periods cannot overlap",
    "rate currency must match",
  ];
  const recognized = known.find((candidate) => message.toLowerCase().includes(candidate));
  return new Error(
    recognized
      ? message.replace(/^.*?error:\s*/iu, "").trim()
      : "The recovery agreement request was denied by the governed data policy.",
  );
}
