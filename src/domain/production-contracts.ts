import { z } from "zod";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const decimalSchema = z.string().regex(/^\d+(?:\.\d+)?$/u);

export const recoveryMasterDataInputSchema = z.object({
  oemName: z.string().trim().min(1).max(200),
  oemCode: z.string().trim().min(1).max(120),
  makeName: z.string().trim().min(1).max(200),
  modelCode: z.string().trim().min(1).max(120),
  modelName: z.string().trim().min(1).max(200),
  programCode: z.string().trim().min(1).max(120),
  programName: z.string().trim().min(1).max(240),
  modelYear: z.number().int().min(1900).max(2200),
  partNumber: z.string().trim().min(1).max(200),
  partDescription: z.string().trim().min(1).max(500),
  revisionCode: z.string().trim().min(1).max(80),
  revisionDescription: z.string().trim().min(1).max(500),
  effectiveFrom: isoDateSchema,
  exceptionReason: z.string().trim().min(1).max(1000),
});

export type RecoveryMasterDataInput = z.infer<typeof recoveryMasterDataInputSchema>;

export const recoveryRateInputSchema = z.object({
  effectiveFrom: isoDateSchema,
  effectiveTo: isoDateSchema.optional(),
  perUnitRate: decimalSchema,
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/u),
});

export const recoveryAgreementDraftInputSchema = z
  .object({
    agreementId: uuidSchema.optional(),
    agreementNumber: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(300),
    settlementCurrency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/u),
    recoverableCost: decimalSchema,
    eligibleVolumeBasis: z.enum([
      "part_shipments",
      "vehicle_production",
      "invoiced_units",
      "manual_approved",
    ]),
    effectiveFrom: isoDateSchema.optional(),
    effectiveTo: isoDateSchema.optional(),
    expiresOn: isoDateSchema.optional(),
    roundingScale: z.literal(2),
    roundingMode: z.literal("half_even"),
    contractualLimitAmount: decimalSchema.optional(),
    forecastAssumptionsVersion: z.string().trim().min(1).max(120).optional(),
    forecastAssumptions: z
      .object({
        basis: z.string().trim().min(1).max(500),
        annualGrowthPercent: z
          .string()
          .trim()
          .regex(/^-?\d+(?:\.\d+)?$/u),
        scenario: z.string().trim().min(1).max(120),
      })
      .optional(),
    evidence: z
      .object({
        method: z.literal("manual_attestation"),
        reference: z.string().trim().min(1).max(500),
        summary: z.string().trim().min(1).max(4000),
      })
      .optional(),
    programId: uuidSchema.optional(),
    modelYearId: uuidSchema.optional(),
    partId: uuidSchema.optional(),
    partRevisionId: uuidSchema.optional(),
    dcrId: uuidSchema.optional(),
    ratePeriods: z.array(recoveryRateInputSchema).max(24),
  })
  .superRefine((input, context) => {
    if (input.effectiveTo && input.effectiveFrom && input.effectiveTo < input.effectiveFrom) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "End date precedes start date" });
    }
    const orderedRates = [...input.ratePeriods].sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    );
    for (const rate of orderedRates) {
      if (rate.currency !== input.settlementCurrency) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Every rate must use the agreement settlement currency",
        });
      }
      if (rate.effectiveTo && rate.effectiveTo < rate.effectiveFrom) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "A rate end date is invalid" });
      }
    }
    for (let index = 1; index < orderedRates.length; index += 1) {
      const previous = orderedRates[index - 1]!;
      const current = orderedRates[index]!;
      if (!previous.effectiveTo || previous.effectiveTo >= current.effectiveFrom) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Rate periods cannot overlap" });
      }
    }
  });

export type RecoveryAgreementDraftInput = z.infer<typeof recoveryAgreementDraftInputSchema>;

const choiceSchema = z.object({ id: uuidSchema, name: z.string() });
const makeSchema = choiceSchema.extend({ oem_id: uuidSchema });
const modelSchema = choiceSchema.extend({
  oem_id: uuidSchema,
  make_id: uuidSchema.nullable(),
  code: z.string(),
});
const programSchema = choiceSchema.extend({
  oem_id: uuidSchema.nullable(),
  model_id: uuidSchema.nullable(),
  code: z.string(),
});
const modelYearSchema = z.object({
  id: uuidSchema,
  program_id: uuidSchema,
  model_year: z.number().int(),
});
const partSchema = z.object({
  id: uuidSchema,
  program_id: uuidSchema.nullable(),
  part_number: z.string(),
  description: z.string().nullable(),
  status: z.string(),
});
const revisionSchema = z.object({
  id: uuidSchema,
  part_id: uuidSchema,
  revision_code: z.string(),
  description: z.string().nullable(),
  effective_from: isoDateSchema,
  effective_to: isoDateSchema.nullable(),
  status: z.string(),
});
const dcrSchema = z.object({
  id: uuidSchema,
  dcr_number: z.string(),
  title: z.string(),
  status: z.enum(["approved", "active"]),
  program_id: uuidSchema.nullable(),
  part_id: uuidSchema.nullable(),
});
const agreementSchema = z.object({
  id: uuidSchema,
  agreement_number: z.string(),
  title: z.string(),
  status: z.enum([
    "draft",
    "under_review",
    "approved",
    "active",
    "expired",
    "superseded",
    "rejected",
  ]),
  settlement_currency: z.string(),
  recoverable_cost: z.string(),
  eligible_volume_basis: z.string(),
  effective_from: isoDateSchema.nullable(),
  effective_to: isoDateSchema.nullable(),
  expires_on: isoDateSchema.nullable(),
  rounding_scale: z.number().int(),
  rounding_mode: z.string(),
  forecast_assumptions_version: z.string().nullable(),
  forecast_assumptions: z.record(z.unknown()),
  contractual_limit_amount: z.string().nullable(),
  evidence_review_method: z.string().nullable(),
  evidence_reference: z.string().nullable(),
  evidence_summary: z.string().nullable(),
  evidence_reviewed_by: uuidSchema.nullable(),
  evidence_reviewed_at: z.string().nullable(),
  approved_by: uuidSchema.nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  program_ids: z.array(uuidSchema),
  model_year_ids: z.array(uuidSchema),
  part_links: z.array(z.object({ part_id: uuidSchema, part_revision_id: uuidSchema.nullable() })),
  dcr_ids: z.array(uuidSchema),
  rate_periods: z.array(
    z.object({
      id: uuidSchema,
      effective_from: isoDateSchema,
      effective_to: isoDateSchema.nullable(),
      per_unit_rate: z.string(),
      currency: z.string(),
    }),
  ),
  accruals: z.array(
    z.object({
      id: uuidSchema,
      active: z.boolean(),
      approved_recoverable_cost: z.string(),
      settlement_currency: z.string(),
      program_id: uuidSchema,
      part_id: uuidSchema,
      dcr_id: uuidSchema.nullable(),
    }),
  ),
  approvals: z.array(
    z.object({
      id: uuidSchema,
      stage: z.string(),
      decision: z.string(),
      approver_user_id: uuidSchema.nullable(),
      decided_at: z.string().nullable(),
    }),
  ),
  audit: z.array(
    z.object({
      id: z.number().int(),
      action: z.string(),
      entity_type: z.string(),
      actor_id: uuidSchema.nullable(),
      occurred_at: z.string(),
    }),
  ),
});

export const productionRecoveryWorkspaceSchema = z.object({
  organization_id: uuidSchema,
  as_of: z.string(),
  source: z.literal("tenant_persistence"),
  calculation_version: z.literal("contract-activation-v1"),
  oems: z.array(choiceSchema),
  makes: z.array(makeSchema),
  models: z.array(modelSchema),
  programs: z.array(programSchema),
  model_years: z.array(modelYearSchema),
  parts: z.array(partSchema),
  revisions: z.array(revisionSchema),
  dcrs: z.array(dcrSchema),
  agreements: z.array(agreementSchema),
});

export type ProductionRecoveryWorkspace = z.infer<typeof productionRecoveryWorkspaceSchema>;
export type ProductionRecoveryAgreement = ProductionRecoveryWorkspace["agreements"][number];

export function parseProductionRecoveryWorkspace(value: unknown): ProductionRecoveryWorkspace {
  return productionRecoveryWorkspaceSchema.parse(value);
}

export function recoveryAgreementCsv(input: {
  organizationName: string;
  workspace: ProductionRecoveryWorkspace;
  agreement: ProductionRecoveryAgreement;
}): string {
  const fields: readonly [string, string][] = [
    ["organization", input.organizationName],
    ["agreement_id", input.agreement.id],
    ["agreement_number", input.agreement.agreement_number],
    ["title", input.agreement.title],
    ["status", input.agreement.status],
    ["recoverable_cost", input.agreement.recoverable_cost],
    ["currency", input.agreement.settlement_currency],
    ["eligible_volume_basis", input.agreement.eligible_volume_basis],
    ["effective_from", input.agreement.effective_from ?? ""],
    ["effective_to", input.agreement.effective_to ?? ""],
    ["expires_on", input.agreement.expires_on ?? ""],
    ["contractual_limit_amount", input.agreement.contractual_limit_amount ?? ""],
    ["rounding", `${input.agreement.rounding_mode}:${input.agreement.rounding_scale}`],
    ["forecast_assumptions_version", input.agreement.forecast_assumptions_version ?? ""],
    ["forecast_assumptions", JSON.stringify(input.agreement.forecast_assumptions)],
    ["evidence_review_method", input.agreement.evidence_review_method ?? ""],
    ["evidence_reference", input.agreement.evidence_reference ?? ""],
    ["evidence_summary", input.agreement.evidence_summary ?? ""],
    ["evidence_reviewed_at", input.agreement.evidence_reviewed_at ?? ""],
    ["approved_at", input.agreement.approved_at ?? ""],
    ["source", input.workspace.source],
    ["calculation_version", input.workspace.calculation_version],
    ["as_of", input.workspace.as_of],
    ["rate_periods", JSON.stringify(input.agreement.rate_periods)],
    ["program_ids", input.agreement.program_ids.join("|")],
    ["model_year_ids", input.agreement.model_year_ids.join("|")],
    ["part_ids", input.agreement.part_links.map((link) => link.part_id).join("|")],
    [
      "part_revision_ids",
      input.agreement.part_links.map((link) => link.part_revision_id ?? "").join("|"),
    ],
    ["dcr_ids", input.agreement.dcr_ids.join("|")],
    ["active_accruals", JSON.stringify(input.agreement.accruals.filter((item) => item.active))],
    ["approvals", JSON.stringify(input.agreement.approvals)],
    ["audit_event_ids", input.agreement.audit.map((event) => String(event.id)).join("|")],
    ["audit_history", JSON.stringify(input.agreement.audit)],
  ];
  return [
    "field,value",
    ...fields.map(([field, value]) => `${csvCell(field)},${csvCell(value)}`),
  ].join("\r\n");
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
