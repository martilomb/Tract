import { invariant } from "./errors";

export interface ExistingProgramRecord {
  id: string;
  code: string;
  oem: string;
  name: string;
}

export interface ExistingPartRecord {
  id: string;
  partNumber: string;
  revision?: string;
  effectiveFrom?: string;
}

export interface ProgramProposalInput {
  id: string;
  organizationId: string;
  createdAt: string;
  oem: string;
  code: string;
  name: string;
  vehicleArchitecture?: string;
  modelYears: readonly number[];
  effectiveFrom: string;
  effectiveTo: string;
  confidential: boolean;
  reviewReason: string;
  aliases: readonly string[];
}

export interface PartRevisionProposalInput {
  id: string;
  organizationId: string;
  createdAt: string;
  partNumber: string;
  revision: string;
  description: string;
  programId: string;
  modelYears: readonly number[];
  effectiveFrom: string;
  sourceDcr?: string;
  historicalLink?: string;
  reviewReason: string;
}

export type MasterDataProposal =
  | (ProgramProposalInput & { kind: "program"; status: "pending_review" })
  | (PartRevisionProposalInput & { kind: "part_revision"; status: "pending_review" });

export interface ProposalContext {
  existingPrograms: readonly ExistingProgramRecord[];
  existingParts: readonly ExistingPartRecord[];
  proposals: readonly MasterDataProposal[];
}

function normalized(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toUpperCase();
}

function normalizedYears(years: readonly number[]): number[] {
  const values = [...new Set(years.filter((year) => Number.isInteger(year) && year >= 1900))].sort(
    (left, right) => left - right,
  );
  invariant(
    values.length > 0,
    "At least one governed model year is required",
    "missing_model_year",
  );
  return values;
}

function duplicateProgramIdentifier(
  input: ProgramProposalInput,
  context: ProposalContext,
): string | null {
  const identifiers = new Set([normalized(input.code), ...input.aliases.map(normalized)]);
  const existing = context.existingPrograms.find(
    (program) =>
      normalized(program.oem) === normalized(input.oem) &&
      identifiers.has(normalized(program.code)),
  );
  if (existing) return `existing program ${existing.code}`;

  const prior = context.proposals.find(
    (proposal): proposal is Extract<MasterDataProposal, { kind: "program" }> =>
      proposal.kind === "program" &&
      proposal.organizationId === input.organizationId &&
      normalized(proposal.oem) === normalized(input.oem) &&
      [normalized(proposal.code), ...proposal.aliases.map(normalized)].some((value) =>
        identifiers.has(value),
      ),
  );
  return prior ? `pending proposal ${prior.code}` : null;
}

export function createProgramProposal(
  input: ProgramProposalInput,
  context: ProposalContext,
): MasterDataProposal {
  invariant(input.organizationId.trim() !== "", "Organization is required", "missing_organization");
  invariant(input.id.trim() !== "", "Proposal identifier is required", "missing_proposal_id");
  invariant(
    input.createdAt.trim() !== "",
    "Proposal timestamp is required",
    "missing_proposal_time",
  );
  invariant(input.oem.trim() !== "", "OEM is required", "missing_oem");
  invariant(input.code.trim() !== "", "Program code is required", "missing_program_code");
  invariant(input.name.trim() !== "", "Carline name is required", "missing_program_name");
  invariant(
    input.reviewReason.trim() !== "",
    "A review reason is required for a new or confidential program proposal",
    "missing_review_reason",
  );
  invariant(
    input.effectiveFrom <= input.effectiveTo,
    "Program effective dates must be in chronological order",
    "invalid_effective_dates",
  );

  const duplicate = duplicateProgramIdentifier(input, context);
  invariant(
    !duplicate,
    `Program code or alias duplicates ${duplicate ?? "an existing record"}`,
    "duplicate_program_proposal",
  );

  return Object.freeze({
    ...input,
    kind: "program" as const,
    status: "pending_review" as const,
    oem: input.oem.trim(),
    code: input.code.trim(),
    name: input.name.trim(),
    vehicleArchitecture: input.vehicleArchitecture?.trim() || undefined,
    modelYears: normalizedYears(input.modelYears),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    reviewReason: input.reviewReason.trim(),
    aliases: [...new Set(input.aliases.map((alias) => alias.trim()).filter(Boolean))],
  });
}

export function createPartRevisionProposal(
  input: PartRevisionProposalInput,
  context: ProposalContext,
): MasterDataProposal {
  invariant(input.organizationId.trim() !== "", "Organization is required", "missing_organization");
  invariant(input.id.trim() !== "", "Proposal identifier is required", "missing_proposal_id");
  invariant(
    input.createdAt.trim() !== "",
    "Proposal timestamp is required",
    "missing_proposal_time",
  );
  invariant(input.partNumber.trim() !== "", "Part number is required", "missing_part_number");
  invariant(input.revision.trim() !== "", "Revision is required", "missing_revision");
  invariant(input.programId.trim() !== "", "Governed program is required", "missing_program");
  invariant(input.effectiveFrom !== "", "Effective date is required", "missing_effective_date");
  invariant(
    input.reviewReason.trim() !== "",
    "A review reason is required for a part or revision proposal",
    "missing_review_reason",
  );

  const existing = context.existingParts.find(
    (part) => normalized(part.partNumber) === normalized(input.partNumber),
  );
  invariant(
    !existing || normalized(input.historicalLink ?? "") === normalized(existing.id),
    `Part number matches existing part ${existing?.partNumber ?? "record"}; link that historical record to propose a revision`,
    "existing_part_link_required",
  );
  const existingRevisionCollision =
    existing &&
    existing.revision &&
    existing.effectiveFrom &&
    normalized(existing.revision) === normalized(input.revision) &&
    existing.effectiveFrom === input.effectiveFrom;
  invariant(
    !existingRevisionCollision,
    `Part, revision, and effective date duplicate existing record ${existing?.id ?? "record"}`,
    "duplicate_existing_part_revision",
  );
  const prior = context.proposals.find(
    (proposal) =>
      proposal.kind === "part_revision" &&
      proposal.organizationId === input.organizationId &&
      normalized(proposal.partNumber) === normalized(input.partNumber) &&
      normalized(proposal.revision) === normalized(input.revision) &&
      proposal.effectiveFrom === input.effectiveFrom,
  );
  invariant(
    !prior,
    `Part, revision, and effective date duplicate pending proposal ${prior?.id ?? "record"}`,
    "duplicate_part_revision_proposal",
  );

  return Object.freeze({
    ...input,
    kind: "part_revision" as const,
    status: "pending_review" as const,
    partNumber: input.partNumber.trim(),
    revision: input.revision.trim(),
    description: input.description.trim(),
    programId: input.programId.trim(),
    modelYears: normalizedYears(input.modelYears),
    sourceDcr: input.sourceDcr?.trim() || undefined,
    historicalLink: input.historicalLink?.trim() || undefined,
    reviewReason: input.reviewReason.trim(),
  });
}
