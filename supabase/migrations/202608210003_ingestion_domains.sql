begin;

create type public.ingestion_domain as enum ('vehicle_volume', 'document', 'erp');
create type public.ingestion_transport as enum ('csv', 'excel', 'rest', 'odata', 'file_drop');
create type public.ingestion_lifecycle_status as enum (
  'received', 'staged', 'validated', 'mapped', 'reviewed', 'approved', 'posted', 'rejected', 'failed'
);
create type public.vehicle_volume_kind as enum ('actual', 'forecast', 'revised', 'scenario');
create type public.eligible_volume_basis as enum (
  'part_shipments', 'vehicle_production', 'invoiced_units', 'manual_approved'
);
create type public.erp_transaction_type as enum (
  'shipment', 'purchase_order', 'invoice', 'material_document', 'cost', 'correction', 'reversal', 'return'
);
create type public.ingestion_exception_type as enum (
  'duplicate', 'missing_mapping', 'conflicting_source', 'material_revision', 'validation', 'reconciliation'
);

alter table public.connectors drop constraint if exists connectors_adapter_type_check;
alter table public.connectors
  add column provider_key text not null default 'custom' check (provider_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  add column ingestion_domain public.ingestion_domain,
  add column supported_transports public.ingestion_transport[] not null default array['csv']::public.ingestion_transport[],
  add column manual_runs_enabled boolean not null default true,
  add column activation_state text not null default 'disabled' check (activation_state in ('disabled', 'configured', 'approved')),
  add column documentation_reference text,
  add column license_reference text,
  add column sample_reference text,
  add constraint connectors_adapter_type_check check (
    adapter_type in ('csv', 'excel', 'rest', 'sap', 'erp', 'odata', 'file_drop', 'document_extraction')
  ),
  add constraint connectors_credential_reference_check check (
    credential_reference is null or credential_reference ~ '^[a-z][a-z0-9+.-]*://'
  ),
  add constraint connectors_transports_required check (cardinality(supported_transports) > 0),
  add constraint connectors_approved_evidence_check check (
    activation_state <> 'approved'
    or (documentation_reference is not null and sample_reference is not null)
  ),
  add constraint connectors_licensed_volume_provider_check check (
    activation_state <> 'approved'
    or provider_key not in ('ihs', 'afs')
    or license_reference is not null
  );

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  oem_id uuid not null references public.oems(id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id),
  foreign key (organization_id, oem_id) references public.oems(organization_id, id)
);

create table public.plants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  oem_id uuid references public.oems(id) on delete restrict,
  region_id uuid not null references public.regions(id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id),
  foreign key (organization_id, oem_id) references public.oems(organization_id, id),
  foreign key (organization_id, region_id) references public.regions(organization_id, id)
);

create table public.part_vehicle_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  vehicle_model_id uuid not null references public.vehicle_models(id) on delete restrict,
  plant_id uuid references public.plants(id) on delete restrict,
  mapping_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  parts_per_vehicle numeric(38, 12) not null check (parts_per_vehicle >= 0),
  take_rate numeric(20, 12) not null default 1 check (take_rate between 0 and 1),
  allocation numeric(20, 12) not null default 1 check (allocation between 0 and 1),
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null)),
  unique (organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, vehicle_model_id) references public.vehicle_models(organization_id, id),
  foreign key (organization_id, plant_id) references public.plants(organization_id, id),
  foreign key (organization_id, mapping_configuration_id) references public.configuration_versions(organization_id, id)
);

alter table public.part_vehicle_rules
  add constraint approved_part_vehicle_rules_no_overlap_global
  exclude using gist (
    part_id with =,
    program_id with =,
    vehicle_model_id with =,
    daterange(effective_from, coalesce(effective_to + 1, 'infinity'::date), '[)') with &&
  ) where (status = 'approved' and plant_id is null),
  add constraint approved_part_vehicle_rules_no_overlap_plant
  exclude using gist (
    part_id with =,
    program_id with =,
    vehicle_model_id with =,
    plant_id with =,
    daterange(effective_from, coalesce(effective_to + 1, 'infinity'::date), '[)') with &&
  ) where (status = 'approved' and plant_id is not null);

create table public.eligible_volume_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  accrual_id uuid not null references public.accruals(id) on delete restrict,
  policy_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  basis public.eligible_volume_basis not null,
  effective_from date not null,
  effective_to date,
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null)),
  unique (organization_id, id),
  foreign key (organization_id, accrual_id) references public.accruals(organization_id, id),
  foreign key (organization_id, policy_configuration_id) references public.configuration_versions(organization_id, id),
  exclude using gist (
    accrual_id with =,
    daterange(effective_from, coalesce(effective_to + 1, 'infinity'::date), '[)') with &&
  ) where (status = 'approved')
);

create table public.ingestion_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid references public.connectors(id) on delete restrict,
  domain public.ingestion_domain not null,
  provider_key text not null check (provider_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  transport public.ingestion_transport not null,
  status public.ingestion_lifecycle_status not null default 'received',
  status_reason text,
  source_object_path text not null check (source_object_path like organization_id::text || '/%'),
  source_object_name text,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  mapping_configuration_id uuid references public.configuration_versions(id) on delete restrict,
  received_count integer not null default 0 check (received_count >= 0),
  mapped_count integer not null default 0 check (mapped_count >= 0),
  approved_count integer not null default 0 check (approved_count >= 0),
  posted_count integer not null default 0 check (posted_count >= 0),
  initiated_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, connector_id) references public.connectors(organization_id, id),
  foreign key (organization_id, mapping_configuration_id) references public.configuration_versions(organization_id, id)
);

create index ingestion_batches_fingerprint_idx
  on public.ingestion_batches (organization_id, provider_key, content_sha256);

create table public.raw_ingestion_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ingestion_batch_id uuid not null references public.ingestion_batches(id) on delete cascade,
  record_index integer not null check (record_index > 0),
  source_record_id text not null,
  source_record_sha256 text not null check (source_record_sha256 ~ '^[a-f0-9]{64}$'),
  source_timestamp timestamptz,
  economic_event_key text,
  raw_payload jsonb not null,
  supersedes_raw_record_id uuid references public.raw_ingestion_records(id) on delete restrict,
  received_at timestamptz not null default now(),
  unique (ingestion_batch_id, record_index),
  unique (organization_id, id),
  foreign key (organization_id, ingestion_batch_id) references public.ingestion_batches(organization_id, id),
  foreign key (organization_id, supersedes_raw_record_id) references public.raw_ingestion_records(organization_id, id)
);

create index raw_ingestion_source_idx
  on public.raw_ingestion_records (organization_id, source_record_id, source_record_sha256);

create table public.ingestion_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ingestion_batch_id uuid not null references public.ingestion_batches(id) on delete cascade,
  raw_record_id uuid not null references public.raw_ingestion_records(id) on delete restrict,
  candidate_key text not null,
  domain public.ingestion_domain not null,
  status public.ingestion_lifecycle_status not null default 'staged',
  mapping_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  canonical_record jsonb not null check (jsonb_typeof(canonical_record) = 'object'),
  economic_event_key text,
  oem_id uuid references public.oems(id) on delete restrict,
  program_id uuid references public.programs(id) on delete restrict,
  vehicle_model_id uuid references public.vehicle_models(id) on delete restrict,
  plant_id uuid references public.plants(id) on delete restrict,
  region_id uuid references public.regions(id) on delete restrict,
  part_id uuid references public.parts(id) on delete restrict,
  validation_warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_warnings) = 'array'),
  validation_errors jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_errors) = 'array'),
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (raw_record_id, candidate_key),
  unique (organization_id, id),
  foreign key (organization_id, ingestion_batch_id) references public.ingestion_batches(organization_id, id),
  foreign key (organization_id, raw_record_id) references public.raw_ingestion_records(organization_id, id),
  foreign key (organization_id, mapping_configuration_id) references public.configuration_versions(organization_id, id),
  foreign key (organization_id, oem_id) references public.oems(organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, vehicle_model_id) references public.vehicle_models(organization_id, id),
  foreign key (organization_id, plant_id) references public.plants(organization_id, id),
  foreign key (organization_id, region_id) references public.regions(organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id)
);

create table public.ingestion_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ingestion_batch_id uuid not null references public.ingestion_batches(id) on delete cascade,
  exception_type public.ingestion_exception_type not null,
  economic_event_key text,
  raw_record_ids uuid[] not null default '{}'::uuid[],
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'rejected')),
  resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, ingestion_batch_id) references public.ingestion_batches(organization_id, id)
);

create table public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ingestion_batch_id uuid not null references public.ingestion_batches(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'review_required', 'approved', 'failed')),
  source_record_count integer not null check (source_record_count >= 0),
  candidate_count integer not null check (candidate_count >= 0),
  posted_count integer not null check (posted_count >= 0),
  duplicate_count integer not null check (duplicate_count >= 0),
  exception_count integer not null check (exception_count >= 0),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, ingestion_batch_id) references public.ingestion_batches(organization_id, id)
);

create table public.ingestion_postings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  candidate_id uuid not null references public.ingestion_candidates(id) on delete restrict,
  economic_event_key text not null,
  destination_type text not null check (
    destination_type in (
      'vehicle_production', 'forecast_line', 'volume_event', 'erp_transaction', 'contract', 'dcr',
      'part', 'program', 'supplier', 'recovery_rate', 'accrual'
    )
  ),
  destination_id uuid not null,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz not null default now(),
  unique (candidate_id),
  unique (organization_id, economic_event_key),
  unique (organization_id, id),
  foreign key (organization_id, candidate_id) references public.ingestion_candidates(organization_id, id)
);

alter table public.volume_events
  add column eligible_volume_basis public.eligible_volume_basis not null default 'manual_approved',
  add column eligible_volume_policy_id uuid references public.eligible_volume_policies(id) on delete restrict,
  add column part_vehicle_rule_id uuid references public.part_vehicle_rules(id) on delete restrict,
  add column ingestion_posting_id uuid references public.ingestion_postings(id) on delete restrict,
  add column manual_approval_id uuid references public.approvals(id) on delete restrict,
  add constraint volume_event_eligible_policy_same_tenant foreign key (organization_id, eligible_volume_policy_id)
    references public.eligible_volume_policies(organization_id, id),
  add constraint volume_event_part_vehicle_rule_same_tenant foreign key (organization_id, part_vehicle_rule_id)
    references public.part_vehicle_rules(organization_id, id),
  add constraint volume_event_ingestion_posting_same_tenant foreign key (organization_id, ingestion_posting_id)
    references public.ingestion_postings(organization_id, id),
  add constraint volume_event_basis_evidence_check check (
    eligible_volume_policy_id is not null
    and (
      (eligible_volume_basis = 'manual_approved' and manual_approval_id is not null)
      or (eligible_volume_basis <> 'manual_approved' and ingestion_posting_id is not null)
    )
  ) not valid,
  add constraint volume_event_vehicle_rule_check check (
    eligible_volume_basis <> 'vehicle_production' or part_vehicle_rule_id is not null
  );

create table public.vehicle_production_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  ingestion_posting_id uuid not null references public.ingestion_postings(id) on delete restrict,
  raw_record_id uuid not null references public.raw_ingestion_records(id) on delete restrict,
  provider_key text not null,
  source_record_id text not null,
  data_kind public.vehicle_volume_kind not null,
  period daterange not null,
  source_units numeric(38, 6) not null,
  oem_id uuid not null references public.oems(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  vehicle_model_id uuid not null references public.vehicle_models(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  region_id uuid not null references public.regions(id) on delete restrict,
  forecast_version_id uuid references public.forecast_versions(id) on delete restrict,
  supersedes_vehicle_production_record_id uuid references public.vehicle_production_records(id) on delete restrict,
  mapping_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null,
  unique (ingestion_posting_id),
  unique (organization_id, id),
  foreign key (organization_id, ingestion_posting_id) references public.ingestion_postings(organization_id, id),
  foreign key (organization_id, raw_record_id) references public.raw_ingestion_records(organization_id, id),
  foreign key (organization_id, oem_id) references public.oems(organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, vehicle_model_id) references public.vehicle_models(organization_id, id),
  foreign key (organization_id, plant_id) references public.plants(organization_id, id),
  foreign key (organization_id, region_id) references public.regions(organization_id, id),
  foreign key (organization_id, forecast_version_id) references public.forecast_versions(organization_id, id),
  foreign key (organization_id, supersedes_vehicle_production_record_id) references public.vehicle_production_records(organization_id, id),
  foreign key (organization_id, mapping_configuration_id) references public.configuration_versions(organization_id, id),
  check (
    (data_kind = 'revised' and supersedes_vehicle_production_record_id is not null)
    or (data_kind <> 'revised' and supersedes_vehicle_production_record_id is null)
  )
);

create index vehicle_production_source_history_idx
  on public.vehicle_production_records (organization_id, provider_key, source_record_id, period);

create table public.vehicle_production_part_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  vehicle_production_record_id uuid not null references public.vehicle_production_records(id) on delete restrict,
  part_id uuid not null references public.parts(id) on delete restrict,
  part_vehicle_rule_id uuid not null references public.part_vehicle_rules(id) on delete restrict,
  eligible_part_units_candidate numeric(38, 6),
  created_at timestamptz not null default now(),
  unique (vehicle_production_record_id, part_id),
  unique (organization_id, id),
  foreign key (organization_id, vehicle_production_record_id) references public.vehicle_production_records(organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id),
  foreign key (organization_id, part_vehicle_rule_id) references public.part_vehicle_rules(organization_id, id)
);

create table public.erp_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  ingestion_posting_id uuid not null references public.ingestion_postings(id) on delete restrict,
  raw_record_id uuid not null references public.raw_ingestion_records(id) on delete restrict,
  source_system text not null,
  source_transaction_id text not null,
  transaction_type public.erp_transaction_type not null,
  transaction_date date not null,
  signed_quantity numeric(38, 6),
  original_value numeric(38, 18),
  original_currency text check (original_currency is null or original_currency ~ '^[A-Z]{3}$'),
  original_source_field text,
  source_timestamp timestamptz not null,
  mapping_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  plant_id uuid references public.plants(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  oem_id uuid references public.oems(id) on delete restrict,
  program_id uuid references public.programs(id) on delete restrict,
  vehicle_model_id uuid references public.vehicle_models(id) on delete restrict,
  part_id uuid references public.parts(id) on delete restrict,
  recovery_classification text,
  recovery_eligible boolean,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null,
  unique (organization_id, id),
  foreign key (organization_id, ingestion_posting_id) references public.ingestion_postings(organization_id, id),
  foreign key (organization_id, raw_record_id) references public.raw_ingestion_records(organization_id, id),
  foreign key (organization_id, mapping_configuration_id) references public.configuration_versions(organization_id, id),
  foreign key (organization_id, plant_id) references public.plants(organization_id, id),
  foreign key (organization_id, supplier_id) references public.suppliers(organization_id, id),
  foreign key (organization_id, oem_id) references public.oems(organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, vehicle_model_id) references public.vehicle_models(organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id),
  check (original_value is null or (original_currency is not null and original_source_field is not null)),
  check (recovery_eligible is distinct from true or recovery_classification is not null)
);

create index erp_transaction_source_history_idx
  on public.erp_transactions (organization_id, source_system, source_transaction_id, transaction_date);

create table public.extraction_field_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  extraction_job_id uuid not null references public.extraction_jobs(id) on delete restrict,
  field_key text not null,
  raw_value text,
  normalized_value jsonb,
  confidence numeric(7, 6) check (confidence is null or confidence between 0 and 1),
  evidence_page integer check (evidence_page is null or evidence_page > 0),
  evidence_text text,
  evidence_table_coordinates jsonb,
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_value jsonb,
  correction_reason text,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (extraction_job_id, field_key),
  unique (organization_id, id),
  foreign key (organization_id, extraction_job_id) references public.extraction_jobs(organization_id, id),
  check (raw_value is null or (evidence_page is not null and nullif(trim(evidence_text), '') is not null)),
  check (
    status <> 'approved'
    or (approved_value is not null and evidence_page is not null and nullif(trim(evidence_text), '') is not null and reviewer_id is not null and reviewed_at is not null)
  )
);

create table public.document_term_postings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  extraction_field_candidate_id uuid not null references public.extraction_field_candidates(id) on delete restrict,
  destination_type text not null check (
    destination_type in ('contract', 'dcr', 'part', 'program', 'supplier', 'recovery_rate', 'accrual')
  ),
  destination_id uuid not null,
  destination_field text not null,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz not null default now(),
  unique (extraction_field_candidate_id, destination_type, destination_id, destination_field),
  unique (organization_id, id),
  foreign key (organization_id, extraction_field_candidate_id) references public.extraction_field_candidates(organization_id, id)
);

alter table public.approvals drop constraint if exists approvals_entity_type_check;
alter table public.approvals
  add constraint approvals_entity_type_check check (
    entity_type in (
      'dcr', 'report', 'extraction', 'recovery_rate', 'ingestion_batch', 'ingestion_record',
      'document_terms', 'eligible_volume_policy', 'part_vehicle_rule'
    )
  ),
  add constraint approvals_org_id_unique unique (organization_id, id);

alter table public.volume_events
  add constraint volume_event_manual_approval_same_tenant foreign key (organization_id, manual_approval_id)
    references public.approvals(organization_id, id);

create or replace function app.validate_ingestion_batch_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  transition_allowed boolean;
begin
  if new.status = old.status then return new; end if;
  transition_allowed := case old.status
    when 'received' then new.status in ('staged', 'failed', 'rejected')
    when 'staged' then new.status in ('validated', 'failed', 'rejected')
    when 'validated' then new.status in ('mapped', 'failed', 'rejected')
    when 'mapped' then new.status in ('reviewed', 'failed', 'rejected')
    when 'reviewed' then new.status in ('mapped', 'approved', 'rejected')
    when 'approved' then new.status = 'posted'
    when 'rejected' then new.status = 'staged'
    when 'failed' then new.status = 'staged'
    else false
  end;
  if not transition_allowed then
    raise exception 'invalid ingestion lifecycle transition' using errcode = '23514';
  end if;
  if new.status in ('failed', 'rejected') and nullif(trim(new.status_reason), '') is null then
    raise exception 'failed or rejected ingestion requires a reason' using errcode = '23514';
  end if;
  if new.status = 'reviewed' and (new.reviewed_by is null or new.reviewed_at is null) then
    raise exception 'review identity and timestamp are required' using errcode = '23514';
  end if;
  if new.status = 'approved' and (new.approved_by is null or new.approved_at is null) then
    raise exception 'approval identity and timestamp are required' using errcode = '23514';
  end if;
  if new.status = 'posted' and new.posted_at is null then
    raise exception 'posting timestamp is required' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function app.protect_ingestion_candidate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ingestion candidates remain traceable and cannot be deleted' using errcode = '42501';
  end if;
  if new.status <> old.status then
    if not (case old.status
      when 'received' then new.status in ('staged', 'failed', 'rejected')
      when 'staged' then new.status in ('validated', 'failed', 'rejected')
      when 'validated' then new.status in ('mapped', 'failed', 'rejected')
      when 'mapped' then new.status in ('reviewed', 'failed', 'rejected')
      when 'reviewed' then new.status in ('mapped', 'approved', 'rejected')
      when 'approved' then new.status = 'posted'
      when 'rejected' then new.status = 'staged'
      when 'failed' then new.status = 'staged'
      else false
    end) then
      raise exception 'invalid ingestion candidate transition' using errcode = '23514';
    end if;
    if new.status = 'reviewed' and (new.reviewed_by is null or new.reviewed_at is null) then
      raise exception 'candidate review identity and timestamp are required' using errcode = '23514';
    end if;
    if new.status = 'approved' and (new.approved_by is null or new.approved_at is null) then
      raise exception 'candidate approval identity and timestamp are required' using errcode = '23514';
    end if;
  end if;
  if old.status = 'posted' then
    raise exception 'posted ingestion candidates are immutable' using errcode = '42501';
  end if;
  if old.status = 'approved' and (
    new.status <> 'posted'
    or new.canonical_record is distinct from old.canonical_record
    or new.mapping_configuration_id is distinct from old.mapping_configuration_id
    or new.economic_event_key is distinct from old.economic_event_key
  ) then
    raise exception 'approved ingestion candidates may only advance to posted' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_ingestion_posting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate public.ingestion_candidates;
begin
  select * into candidate from public.ingestion_candidates c
  where c.id = new.candidate_id and c.organization_id = new.organization_id;
  if candidate.id is null or candidate.status <> 'approved' then
    raise exception 'only an approved same-tenant candidate may be posted' using errcode = '42501';
  end if;
  if candidate.economic_event_key is distinct from new.economic_event_key then
    raise exception 'posting economic event key does not match candidate' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function app.protect_extraction_field_candidate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'extraction field candidates remain traceable and cannot be deleted' using errcode = '42501';
  end if;
  if old.status in ('approved', 'rejected') then
    raise exception 'reviewed extraction fields are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_extraction_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.extraction_field_candidates f
    where f.extraction_job_id = new.extraction_job_id
      and f.organization_id = new.organization_id
  ) then
    raise exception 'extraction review requires field candidates' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.extraction_field_candidates f
    where f.extraction_job_id = new.extraction_job_id
      and f.organization_id = new.organization_id
      and f.status = 'pending'
  ) then
    raise exception 'all extraction fields must be reviewed before approval' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function app.protect_approved_effective_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'effective rules remain traceable and cannot be deleted' using errcode = '42501';
  end if;
  if old.status = 'superseded' then
    raise exception 'superseded effective rules are immutable' using errcode = '42501';
  end if;
  if old.status = 'approved' and (
    new.status <> 'superseded'
    or to_jsonb(new) - 'status' is distinct from to_jsonb(old) - 'status'
  ) then
    raise exception 'approved effective rules may only be superseded without changing terms' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.record_ingestion_posting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ingestion_candidates
  set status = 'posted'
  where id = new.candidate_id and organization_id = new.organization_id;
  return new;
end;
$$;

create or replace function app.validate_document_term_posting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.extraction_field_candidates f
    where f.id = new.extraction_field_candidate_id
      and f.organization_id = new.organization_id
      and f.status = 'approved'
  ) then
    raise exception 'only an approved extracted field may be posted' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_volume_event_source_policy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.eligible_volume_policies p
    where p.id = new.eligible_volume_policy_id
      and p.organization_id = new.organization_id
      and p.basis = new.eligible_volume_basis
      and p.status = 'approved'
      and new.occurred_on >= p.effective_from
      and (p.effective_to is null or new.occurred_on <= p.effective_to)
  ) then
    raise exception 'volume event requires an effective approved eligible-volume policy' using errcode = '42501';
  end if;
  if new.eligible_volume_basis = 'manual_approved' and not exists (
    select 1 from public.approvals a
    where a.id = new.manual_approval_id
      and a.organization_id = new.organization_id
      and a.entity_type = 'eligible_volume_policy'
      and a.entity_id = new.eligible_volume_policy_id
      and a.decision = 'approved'
  ) then
    raise exception 'manual eligible volume requires explicit approval' using errcode = '42501';
  end if;
  if new.eligible_volume_basis = 'vehicle_production' and not exists (
    select 1 from public.part_vehicle_rules r
    where r.id = new.part_vehicle_rule_id
      and r.organization_id = new.organization_id
      and r.part_id = new.part_id
      and r.program_id = new.program_id
      and r.status = 'approved'
      and new.occurred_on >= r.effective_from
      and (r.effective_to is null or new.occurred_on <= r.effective_to)
  ) then
    raise exception 'vehicle-production volume requires an effective approved part rule' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger regions_updated_at before update on public.regions for each row execute function app.set_updated_at();
create trigger vehicle_models_updated_at before update on public.vehicle_models for each row execute function app.set_updated_at();
create trigger plants_updated_at before update on public.plants for each row execute function app.set_updated_at();
create trigger ingestion_batches_updated_at before update on public.ingestion_batches for each row execute function app.set_updated_at();
create trigger ingestion_candidates_updated_at before update on public.ingestion_candidates for each row execute function app.set_updated_at();

create trigger regions_org_immutable before update on public.regions for each row execute function app.prevent_organization_change();
create trigger vehicle_models_org_immutable before update on public.vehicle_models for each row execute function app.prevent_organization_change();
create trigger plants_org_immutable before update on public.plants for each row execute function app.prevent_organization_change();
create trigger part_vehicle_rules_org_immutable before update on public.part_vehicle_rules for each row execute function app.prevent_organization_change();
create trigger eligible_volume_policies_org_immutable before update on public.eligible_volume_policies for each row execute function app.prevent_organization_change();
create trigger ingestion_batches_org_immutable before update on public.ingestion_batches for each row execute function app.prevent_organization_change();
create trigger ingestion_candidates_org_immutable before update on public.ingestion_candidates for each row execute function app.prevent_organization_change();

create trigger ingestion_batch_transition before update of status on public.ingestion_batches for each row execute function app.validate_ingestion_batch_transition();
create trigger ingestion_candidate_protected before update or delete on public.ingestion_candidates for each row execute function app.protect_ingestion_candidate();
create trigger part_vehicle_rules_protected before update or delete on public.part_vehicle_rules for each row execute function app.protect_approved_effective_rule();
create trigger eligible_volume_policies_protected before update or delete on public.eligible_volume_policies for each row execute function app.protect_approved_effective_rule();
create trigger ingestion_posting_validate before insert on public.ingestion_postings for each row execute function app.validate_ingestion_posting();
create trigger ingestion_posting_record after insert on public.ingestion_postings for each row execute function app.record_ingestion_posting();
create trigger extraction_field_candidate_protected before update or delete on public.extraction_field_candidates for each row execute function app.protect_extraction_field_candidate();
create trigger extraction_review_validate before insert on public.extraction_reviews for each row execute function app.validate_extraction_review();
create trigger document_term_posting_validate before insert on public.document_term_postings for each row execute function app.validate_document_term_posting();
create trigger volume_event_source_policy_validate before insert on public.volume_events for each row execute function app.validate_volume_event_source_policy();

create trigger raw_ingestion_records_immutable before update or delete on public.raw_ingestion_records for each row execute function app.prevent_source_event_mutation();
create trigger ingestion_postings_immutable before update or delete on public.ingestion_postings for each row execute function app.prevent_source_event_mutation();
create trigger vehicle_production_records_immutable before update or delete on public.vehicle_production_records for each row execute function app.prevent_source_event_mutation();
create trigger vehicle_production_part_links_immutable before update or delete on public.vehicle_production_part_links for each row execute function app.prevent_source_event_mutation();
create trigger erp_transactions_immutable before update or delete on public.erp_transactions for each row execute function app.prevent_source_event_mutation();
create trigger document_term_postings_immutable before update or delete on public.document_term_postings for each row execute function app.prevent_source_event_mutation();

create trigger part_vehicle_rules_audit after insert or update or delete on public.part_vehicle_rules for each row execute function app.append_audit_event();
create trigger eligible_volume_policies_audit after insert or update or delete on public.eligible_volume_policies for each row execute function app.append_audit_event();
create trigger ingestion_batches_audit after insert or update or delete on public.ingestion_batches for each row execute function app.append_audit_event();
create trigger ingestion_candidates_audit after insert or update or delete on public.ingestion_candidates for each row execute function app.append_audit_event();
create trigger ingestion_exceptions_audit after insert or update or delete on public.ingestion_exceptions for each row execute function app.append_audit_event();
create trigger extraction_field_candidates_audit after insert or update or delete on public.extraction_field_candidates for each row execute function app.append_audit_event();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'regions', 'vehicle_models', 'plants', 'part_vehicle_rules', 'eligible_volume_policies',
    'ingestion_batches', 'raw_ingestion_records', 'ingestion_candidates', 'ingestion_exceptions',
    'reconciliation_runs', 'ingestion_postings', 'vehicle_production_records',
    'vehicle_production_part_links', 'erp_transactions', 'extraction_field_candidates',
    'document_term_postings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy regions_read on public.regions for select to authenticated using (app.is_org_member(organization_id));
create policy regions_admin_all on public.regions for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy vehicle_models_read on public.vehicle_models for select to authenticated using (app.is_org_member(organization_id));
create policy vehicle_models_admin_all on public.vehicle_models for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy plants_read on public.plants for select to authenticated using (app.is_org_member(organization_id));
create policy plants_admin_all on public.plants for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy part_vehicle_rules_read on public.part_vehicle_rules for select to authenticated using (
  app.can_access_scope(organization_id, null, null, program_id, part_id, 'read')
);
create policy part_vehicle_rules_admin_all on public.part_vehicle_rules for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy eligible_volume_policies_read on public.eligible_volume_policies for select to authenticated using (
  exists (
    select 1 from public.accruals a
    where a.id = accrual_id and app.can_access_scope(a.organization_id, a.department_id, a.technical_team_id, a.program_id, a.part_id, 'read')
  )
);
create policy eligible_volume_policies_admin_all on public.eligible_volume_policies for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy ingestion_batches_control_read on public.ingestion_batches for select to authenticated using (
  app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy ingestion_batches_admin_all on public.ingestion_batches for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy raw_ingestion_records_control_read on public.raw_ingestion_records for select to authenticated using (
  app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy raw_ingestion_records_admin_insert on public.raw_ingestion_records for insert to authenticated with check (app.is_org_admin(organization_id));
create policy ingestion_candidates_control_read on public.ingestion_candidates for select to authenticated using (
  app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy ingestion_candidates_admin_all on public.ingestion_candidates for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy ingestion_exceptions_control_read on public.ingestion_exceptions for select to authenticated using (
  app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy ingestion_exceptions_admin_all on public.ingestion_exceptions for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy reconciliation_runs_control_read on public.reconciliation_runs for select to authenticated using (
  app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy reconciliation_runs_admin_all on public.reconciliation_runs for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy ingestion_postings_control_read on public.ingestion_postings for select to authenticated using (
  app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy ingestion_postings_admin_insert on public.ingestion_postings for insert to authenticated with check (app.is_org_admin(organization_id));

create policy vehicle_production_records_read on public.vehicle_production_records for select to authenticated using (
  app.can_access_scope(organization_id, null, null, program_id, null, 'read')
);
create policy vehicle_production_records_admin_insert on public.vehicle_production_records for insert to authenticated with check (app.is_org_admin(organization_id));
create policy vehicle_production_part_links_read on public.vehicle_production_part_links for select to authenticated using (
  app.can_access_scope(organization_id, null, null, null, part_id, 'read')
);
create policy vehicle_production_part_links_admin_insert on public.vehicle_production_part_links for insert to authenticated with check (app.is_org_admin(organization_id));
create policy erp_transactions_read on public.erp_transactions for select to authenticated using (
  app.can_access_scope(organization_id, null, null, program_id, part_id, 'read')
);
create policy erp_transactions_admin_insert on public.erp_transactions for insert to authenticated with check (app.is_org_admin(organization_id));

create policy extraction_field_candidates_read on public.extraction_field_candidates for select to authenticated using (
  exists (select 1 from public.extraction_jobs j where j.id = extraction_job_id)
);
create policy extraction_field_candidates_admin_all on public.extraction_field_candidates for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy document_term_postings_read on public.document_term_postings for select to authenticated using (
  exists (select 1 from public.extraction_field_candidates f where f.id = extraction_field_candidate_id)
);
create policy document_term_postings_admin_insert on public.document_term_postings for insert to authenticated with check (app.is_org_admin(organization_id));

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

commit;
