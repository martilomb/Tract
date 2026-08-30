import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../../database.types";
import {
  createAliasInputSchema,
  createPartInputSchema,
  createProgramInputSchema,
  masterDataQuerySchema,
  parseProductionMasterDataWorkspace,
  type CreateAliasInput,
  type CreatePartInput,
  type CreateProgramInput,
  type MasterDataQuery,
  type ProductionMasterDataWorkspace,
} from "../../domain/production-master-data";

type DataClient = SupabaseClient<Database>;

export async function loadProductionMasterDataWorkspace(input: {
  client: DataClient;
  organizationId: string;
  query: unknown;
}): Promise<ProductionMasterDataWorkspace> {
  const query = masterDataQuerySchema.parse(input.query);
  const result = await input.client.rpc("get_program_parts_workspace", {
    target_organization_id: input.organizationId,
    target_view: query.view,
    search_text: query.q,
    selected_program_id: query.program,
    selected_part_id: query.part,
    as_of_date: query.asOf,
    sort_field: query.sort,
    sort_direction: query.direction,
    page_limit: query.limit,
    page_offset: query.offset,
  });
  if (result.error) throw new Error("Program and part master data could not be loaded");
  return parseProductionMasterDataWorkspace(result.data);
}

export async function createGovernedProgram(input: {
  client: DataClient;
  organizationId: string;
  payload: unknown;
}): Promise<void> {
  const values = createProgramInputSchema.parse(input.payload);
  const result = await input.client.rpc("create_program_master_data", {
    target_organization_id: input.organizationId,
    master_data: programPayload(values),
  });
  if (result.error) throw publicMasterDataActionError(result.error.message);
}

export async function createGovernedPart(input: {
  client: DataClient;
  organizationId: string;
  payload: unknown;
}): Promise<void> {
  const values = createPartInputSchema.parse(input.payload);
  const result = await input.client.rpc("create_part_master_data", {
    target_organization_id: input.organizationId,
    master_data: partPayload(values),
  });
  if (result.error) throw publicMasterDataActionError(result.error.message);
}

export async function createGovernedAlias(input: {
  client: DataClient;
  organizationId: string;
  payload: unknown;
}): Promise<void> {
  const values = createAliasInputSchema.parse(input.payload);
  const result = await input.client.rpc("create_master_data_alias", {
    target_organization_id: input.organizationId,
    alias_data: aliasPayload(values),
  });
  if (result.error) throw publicMasterDataActionError(result.error.message);
}

function programPayload(values: CreateProgramInput): Json {
  return {
    oem_id: values.oemId,
    model_id: values.modelId,
    program_code: values.programCode,
    program_name: values.programName,
    model_year: values.modelYear,
    effective_from: values.effectiveFrom,
    exception_reason: values.exceptionReason,
    provenance_reference: values.provenanceReference ?? "",
  };
}

function partPayload(values: CreatePartInput): Json {
  return {
    mode: values.mode,
    program_id: values.programId,
    model_year_id: values.modelYearId,
    part_id: values.mode === "new_revision" ? values.partId : "",
    part_number: values.mode === "new_part" ? values.partNumber : "",
    part_description: values.mode === "new_part" ? (values.partDescription ?? "") : "",
    revision_code: values.revisionCode,
    revision_description: values.revisionDescription ?? "",
    effective_from: values.effectiveFrom,
    source_dcr_id: values.sourceDcrId ?? "",
    exception_reason: values.exceptionReason,
    provenance_reference: values.provenanceReference ?? "",
  };
}

function aliasPayload(values: CreateAliasInput): Json {
  return {
    entity_type: values.entityType,
    entity_id: values.entityId,
    alias: values.alias,
    reason: values.reason,
    provenance_reference: values.provenanceReference ?? "",
  };
}

function publicMasterDataActionError(message: string): Error {
  const safeFragments = [
    "administrator access is required",
    "matching program or alias already exists",
    "matching part number or alias already exists",
    "matching part revision already exists",
    "new revision must begin after",
    "same-tenant OEM and vehicle model",
    "same-tenant program and model year",
    "same-tenant part linked",
    "source DCR must be same-tenant and approved",
    "alias already identifies a canonical record",
  ];
  const normalized = message.replace(/^.*?error:\s*/iu, "").trim();
  if (safeFragments.some((fragment) => normalized.toLowerCase().includes(fragment))) {
    return new Error(normalized);
  }
  return new Error("The master-data request was denied by the governed data policy.");
}

export function defaultMasterDataQuery(view: "programs" | "parts"): MasterDataQuery {
  return {
    view,
    asOf: new Date().toISOString().slice(0, 10),
    sort: view === "programs" ? "name" : "part_number",
    direction: "asc",
    limit: 50,
    offset: 0,
  };
}
