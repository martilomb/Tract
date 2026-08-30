import { z } from "zod";

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const decimalSchema = z.string().regex(/^-?\d+(?:\.\d+)?$/u);
const nullableDateSchema = dateSchema.nullable();

export const masterDataQuerySchema = z
  .object({
    view: z.enum(["programs", "parts"]).default("programs"),
    q: z.string().trim().max(200).optional(),
    program: uuidSchema.optional(),
    part: uuidSchema.optional(),
    asOf: dateSchema,
    sort: z.string().trim().max(40),
    direction: z.enum(["asc", "desc"]).default("asc"),
    limit: z.coerce.number().int().min(1).max(20000).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((input, context) => {
    const allowed =
      input.view === "programs"
        ? ["name", "code", "updated_at"]
        : ["part_number", "program", "updated_at"];
    if (!allowed.includes(input.sort)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sort"],
        message: `Sort must be one of ${allowed.join(", ")}`,
      });
    }
  });

export type MasterDataQuery = z.infer<typeof masterDataQuerySchema>;

export const createProgramInputSchema = z.object({
  oemId: uuidSchema,
  modelId: uuidSchema,
  programCode: z.string().trim().min(1).max(120),
  programName: z.string().trim().min(1).max(240),
  modelYear: z.number().int().min(1900).max(2200),
  effectiveFrom: dateSchema,
  exceptionReason: z.string().trim().min(1).max(1000),
  provenanceReference: z.string().trim().max(500).optional(),
});

export const createPartInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("new_part"),
    programId: uuidSchema,
    modelYearId: uuidSchema,
    partNumber: z.string().trim().min(1).max(200),
    partDescription: z.string().trim().max(500).optional(),
    revisionCode: z.string().trim().min(1).max(80),
    revisionDescription: z.string().trim().max(500).optional(),
    effectiveFrom: dateSchema,
    sourceDcrId: uuidSchema.optional(),
    exceptionReason: z.string().trim().min(1).max(1000),
    provenanceReference: z.string().trim().max(500).optional(),
  }),
  z.object({
    mode: z.literal("new_revision"),
    programId: uuidSchema,
    modelYearId: uuidSchema,
    partId: uuidSchema,
    revisionCode: z.string().trim().min(1).max(80),
    revisionDescription: z.string().trim().max(500).optional(),
    effectiveFrom: dateSchema,
    sourceDcrId: uuidSchema.optional(),
    exceptionReason: z.string().trim().min(1).max(1000),
    provenanceReference: z.string().trim().max(500).optional(),
  }),
]);

export const createAliasInputSchema = z.object({
  entityType: z.enum(["program", "part"]),
  entityId: uuidSchema,
  alias: z.string().trim().min(1).max(300),
  reason: z.string().trim().min(1).max(1000),
  provenanceReference: z.string().trim().max(500).optional(),
});

export type CreateProgramInput = z.infer<typeof createProgramInputSchema>;
export type CreatePartInput = z.infer<typeof createPartInputSchema>;
export type CreateAliasInput = z.infer<typeof createAliasInputSchema>;

const recoveryPositionSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/u),
  approved_recoverable_cost: decimalSchema,
});

const programRowSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  oem_id: uuidSchema.nullable(),
  oem_name: z.string().nullable(),
  model_id: uuidSchema.nullable(),
  model_code: z.string().nullable(),
  model_name: z.string().nullable(),
  start_date: nullableDateSchema,
  end_date: nullableDateSchema,
  creation_path: z.string(),
  provider_key: z.string().nullable(),
  provider_identifier: z.string().nullable(),
  approved_recovery_by_currency: z.array(recoveryPositionSchema),
  updated_at: z.string(),
  model_years: z.array(z.number().int()),
  part_count: z.number().int().nonnegative(),
  active_agreement_count: z.number().int().nonnegative(),
});

const revisionSchema = z.object({
  id: uuidSchema,
  revision_code: z.string(),
  description: z.string().nullable(),
  effective_from: dateSchema,
  effective_to: nullableDateSchema,
  status: z.enum(["draft", "approved", "superseded", "inactive"]),
  source_dcr_id: uuidSchema.nullable(),
  approved_at: z.string().nullable().optional(),
});

const partRowSchema = z.object({
  id: uuidSchema,
  part_number: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  program_id: uuidSchema.nullable(),
  program_code: z.string().nullable(),
  program_name: z.string().nullable(),
  approved_recovery_by_currency: z.array(recoveryPositionSchema),
  updated_at: z.string(),
  current_revision: revisionSchema.omit({ approved_at: true }).nullable(),
  active_agreement_count: z.number().int().nonnegative(),
});

const aliasSchema = z.object({
  id: uuidSchema,
  alias: z.string(),
  provider_key: z.string().nullable(),
  provider_identifier: z.string().nullable(),
  effective_from: nullableDateSchema,
  effective_to: nullableDateSchema,
  provenance: z.record(z.unknown()),
  approved_at: z.string(),
});

const proposalSchema = z.object({
  id: uuidSchema,
  entity_type: z.string().optional(),
  status: z.string(),
  exception_reason: z.string(),
  provenance: z.record(z.unknown()),
  created_at: z.string(),
  reviewed_at: z.string().nullable(),
});

const agreementSchema = z.object({
  id: uuidSchema,
  agreement_number: z.string(),
  title: z.string(),
  status: z.string(),
  recoverable_cost: decimalSchema,
  settlement_currency: z.string(),
  part_revision_id: uuidSchema.nullable().optional(),
  evidence_reference: z.string().nullable(),
  evidence_summary: z.string().nullable(),
  evidence_reviewed_at: z.string().nullable(),
  approved_at: z.string().nullable(),
  rate_periods: z
    .array(
      z.object({
        id: uuidSchema,
        effective_from: dateSchema,
        effective_to: nullableDateSchema,
        per_unit_rate: decimalSchema,
        currency: z.string(),
      }),
    )
    .optional(),
});

const auditSchema = z.object({
  id: z.number().int(),
  action: z.string(),
  entity_type: z.string().optional(),
  actor_id: uuidSchema.nullable(),
  occurred_at: z.string(),
});

const selectedProgramSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  oem_name: z.string().nullable(),
  model_code: z.string().nullable(),
  model_name: z.string().nullable(),
  start_date: nullableDateSchema,
  end_date: nullableDateSchema,
  creation_path: z.string(),
  provider_key: z.string().nullable(),
  provider_identifier: z.string().nullable(),
  approved_recovery_by_currency: z.array(recoveryPositionSchema),
  aliases: z.array(aliasSchema),
  proposals: z.array(proposalSchema),
  model_years: z.array(
    z.object({
      id: uuidSchema,
      model_year: z.number().int(),
      start_date: nullableDateSchema,
      end_date: nullableDateSchema,
    }),
  ),
  parts: z.array(
    z.object({
      id: uuidSchema,
      part_number: z.string(),
      description: z.string().nullable(),
      status: z.string(),
    }),
  ),
  part_count: z.number().int().nonnegative(),
  agreements: z.array(agreementSchema),
  audit: z.array(auditSchema),
});

const selectedPartSchema = z.object({
  id: uuidSchema,
  part_number: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  program_id: uuidSchema.nullable(),
  program_code: z.string().nullable(),
  program_name: z.string().nullable(),
  approved_recovery_by_currency: z.array(recoveryPositionSchema),
  aliases: z.array(aliasSchema),
  proposals: z.array(proposalSchema),
  revisions: z.array(revisionSchema),
  applications: z.array(
    z.object({
      id: uuidSchema,
      program_id: uuidSchema,
      model_year_id: uuidSchema.nullable(),
      part_revision_id: uuidSchema.nullable(),
      effective_from: dateSchema,
      effective_to: nullableDateSchema,
    }),
  ),
  agreements: z.array(agreementSchema),
  audit: z.array(auditSchema),
});

export const productionMasterDataWorkspaceSchema = z.object({
  organization_id: uuidSchema,
  generated_at: z.string(),
  as_of_date: dateSchema,
  source: z.literal("tenant_persistence"),
  projection_version: z.literal("program-parts-v1"),
  view: z.enum(["programs", "parts"]),
  search: z.string(),
  sort_field: z.string(),
  sort_direction: z.enum(["asc", "desc"]),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  program_count: z.number().int().nonnegative(),
  part_count: z.number().int().nonnegative(),
  oems: z.array(z.object({ id: uuidSchema, name: z.string() })),
  models: z.array(
    z.object({
      id: uuidSchema,
      oem_id: uuidSchema,
      make_id: uuidSchema.nullable(),
      code: z.string(),
      name: z.string(),
      effective_from: nullableDateSchema,
      effective_to: nullableDateSchema,
      provider_key: z.string().nullable(),
      provider_identifier: z.string().nullable(),
      provenance_status: z.string(),
    }),
  ),
  model_years: z.array(
    z.object({
      id: uuidSchema,
      program_id: uuidSchema,
      model_year: z.number().int(),
      start_date: nullableDateSchema,
      end_date: nullableDateSchema,
      provider_key: z.string().nullable(),
      provider_identifier: z.string().nullable(),
    }),
  ),
  program_choices: z.array(z.object({ id: uuidSchema, code: z.string(), name: z.string() })),
  programs: z.array(programRowSchema),
  parts: z.array(partRowSchema),
  selected_program: selectedProgramSchema.nullable(),
  selected_part: selectedPartSchema.nullable(),
});

export type ProductionMasterDataWorkspace = z.infer<typeof productionMasterDataWorkspaceSchema>;
export type ProductionProgramRow = z.infer<typeof programRowSchema>;
export type ProductionPartRow = z.infer<typeof partRowSchema>;

export function parseProductionMasterDataWorkspace(value: unknown): ProductionMasterDataWorkspace {
  return productionMasterDataWorkspaceSchema.parse(value);
}

export function masterDataCsv(input: {
  organizationName: string;
  workspace: ProductionMasterDataWorkspace;
}): string {
  const metadata: readonly [string, string][] = [
    ["organization", input.organizationName],
    ["view", input.workspace.view],
    ["search", input.workspace.search],
    ["as_of_date", input.workspace.as_of_date],
    ["source", input.workspace.source],
    ["projection_version", input.workspace.projection_version],
    ["generated_at", input.workspace.generated_at],
    ["sort", `${input.workspace.sort_field}:${input.workspace.sort_direction}`],
    ["offset", String(input.workspace.offset)],
  ];
  const table =
    input.workspace.view === "programs"
      ? [
          [
            "program_id",
            "code",
            "name",
            "oem",
            "vehicle_model",
            "model_years",
            "parts",
            "active_agreements",
            "approved_recovery_by_currency",
            "creation_path",
            "provider_reference",
          ],
          ...input.workspace.programs.map((program) => [
            program.id,
            program.code,
            program.name,
            program.oem_name ?? "",
            program.model_name ?? "",
            program.model_years.join("|"),
            String(program.part_count),
            String(program.active_agreement_count),
            JSON.stringify(program.approved_recovery_by_currency),
            program.creation_path,
            [program.provider_key, program.provider_identifier].filter(Boolean).join(":"),
          ]),
        ]
      : [
          [
            "part_id",
            "part_number",
            "description",
            "program_id",
            "program",
            "revision_id",
            "revision",
            "revision_effective_from",
            "revision_effective_to",
            "active_agreements",
            "approved_recovery_by_currency",
          ],
          ...input.workspace.parts.map((part) => [
            part.id,
            part.part_number,
            part.description ?? "",
            part.program_id ?? "",
            part.program_name ?? "",
            part.current_revision?.id ?? "",
            part.current_revision?.revision_code ?? "",
            part.current_revision?.effective_from ?? "",
            part.current_revision?.effective_to ?? "",
            String(part.active_agreement_count),
            JSON.stringify(part.approved_recovery_by_currency),
          ]),
        ];

  return [
    "metadata,value",
    ...metadata.map((row) => row.map(csvCell).join(",")),
    "",
    ...table.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
