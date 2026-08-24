begin;

-- Milestone 10 acceptance controls: durable materiality, controlled vehicle master
-- data, bounded connector test evidence, and atomic recovery activation.

create table public.materiality_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null check (metric in (
    'under_recovery', 'over_recovery', 'forecast_at_completion', 'break_even_delay'
  )),
  scope_type text not null default 'organization' check (scope_type in ('organization', 'program', 'recovery_agreement')),
  scope_id uuid,
  version integer not null check (version > 0),
  status public.configuration_status not null default 'draft',
  threshold_amount numeric(38, 18) check (threshold_amount is null or threshold_amount >= 0),
  threshold_percentage numeric(12, 8) check (
    threshold_percentage is null or threshold_percentage between 0 and 100
  ),
  threshold_days integer check (threshold_days is null or threshold_days >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  effective_from timestamptz not null,
  effective_to timestamptz,
  rationale text not null check (length(trim(rationale)) between 1 and 1000),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  supersedes_id uuid references public.materiality_rules(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_type = 'organization' and scope_id is null)
    or (scope_type <> 'organization' and scope_id is not null)
  ),
  check (effective_to is null or effective_to > effective_from),
  check (status <> 'active' or (approved_by is not null and approved_at is not null)),
  check (
    (metric = 'break_even_delay' and threshold_days is not null)
    or (metric <> 'break_even_delay' and num_nonnulls(threshold_amount, threshold_percentage) > 0)
  ),
  check (threshold_amount is null or currency is not null),
  unique (organization_id, id),
  foreign key (organization_id, supersedes_id)
    references public.materiality_rules(organization_id, id) on delete restrict
);

create unique index one_active_materiality_rule_per_scope
  on public.materiality_rules (
    organization_id,
    metric,
    scope_type,
    coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) where status = 'active';

create table public.vehicle_architectures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  oem_id uuid references public.oems(id) on delete restrict,
  code text not null check (length(trim(code)) between 1 and 120),
  name text not null check (length(trim(name)) between 1 and 240),
  effective_from date,
  effective_to date,
  provider_key text,
  provider_identifier text,
  provenance_status text not null default 'tenant_managed' check (
    provenance_status in ('tenant_managed', 'provider_unverified', 'provider_verified')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check ((provider_key is null) = (provider_identifier is null)),
  unique (organization_id, code),
  unique (organization_id, id),
  foreign key (organization_id, oem_id) references public.oems(organization_id, id)
);

create unique index vehicle_architectures_provider_identifier_unique
  on public.vehicle_architectures (organization_id, provider_key, provider_identifier)
  where provider_identifier is not null;

create table public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  oem_id uuid not null references public.oems(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 200),
  effective_from date,
  effective_to date,
  provider_key text,
  provider_identifier text,
  provenance_status text not null default 'tenant_managed' check (
    provenance_status in ('tenant_managed', 'provider_unverified', 'provider_verified')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check ((provider_key is null) = (provider_identifier is null)),
  unique (organization_id, oem_id, name),
  unique (organization_id, id),
  foreign key (organization_id, oem_id) references public.oems(organization_id, id)
);

create unique index vehicle_makes_provider_identifier_unique
  on public.vehicle_makes (organization_id, provider_key, provider_identifier)
  where provider_identifier is not null;

alter table public.vehicle_models
  add column vehicle_make_id uuid references public.vehicle_makes(id) on delete restrict,
  add column vehicle_architecture_id uuid references public.vehicle_architectures(id) on delete restrict,
  add column effective_from date,
  add column effective_to date,
  add column provider_key text,
  add column provider_identifier text,
  add column provenance_status text not null default 'tenant_managed' check (
    provenance_status in ('tenant_managed', 'provider_unverified', 'provider_verified')
  ),
  add constraint vehicle_models_effective_dates check (
    effective_to is null or effective_from is null or effective_to >= effective_from
  ),
  add constraint vehicle_models_provider_identifier_pair check (
    (provider_key is null) = (provider_identifier is null)
  ),
  add constraint vehicle_models_vehicle_make_same_tenant foreign key (organization_id, vehicle_make_id)
    references public.vehicle_makes(organization_id, id),
  add constraint vehicle_models_architecture_same_tenant foreign key (organization_id, vehicle_architecture_id)
    references public.vehicle_architectures(organization_id, id);

create unique index vehicle_models_provider_identifier_unique
  on public.vehicle_models (organization_id, provider_key, provider_identifier)
  where provider_identifier is not null;

create table public.master_data_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'oem', 'vehicle_architecture', 'vehicle_make', 'vehicle_model',
    'program', 'program_model_year', 'part', 'part_revision'
  )),
  proposed_payload jsonb not null check (jsonb_typeof(proposed_payload) = 'object'),
  duplicate_candidate_ids uuid[] not null default '{}'::uuid[],
  exception_reason text not null check (length(trim(exception_reason)) between 1 and 1000),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'withdrawn')),
  proposed_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  resulting_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'proposed' or (reviewed_by is not null and reviewed_at is not null)),
  check (status <> 'approved' or resulting_entity_id is not null),
  unique (organization_id, id)
);

create table public.master_data_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'oem', 'vehicle_architecture', 'vehicle_make', 'vehicle_model',
    'program', 'program_model_year', 'part', 'part_revision'
  )),
  entity_id uuid not null,
  alias text not null check (length(trim(alias)) between 1 and 300),
  provider_key text,
  provider_identifier text,
  effective_from date,
  effective_to date,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check ((provider_key is null) = (provider_identifier is null)),
  unique nulls not distinct (organization_id, entity_type, alias, provider_key),
  unique (organization_id, id)
);

create table public.master_data_merge_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entity_type text not null check (entity_type in (
    'oem', 'vehicle_architecture', 'vehicle_make', 'vehicle_model',
    'program', 'program_model_year', 'part', 'part_revision'
  )),
  source_entity_id uuid not null,
  canonical_entity_id uuid not null,
  reason text not null check (length(trim(reason)) between 1 and 1000),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  approved_by uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  check (source_entity_id <> canonical_entity_id),
  unique (organization_id, entity_type, source_entity_id),
  unique (organization_id, id)
);

alter table public.programs
  add column vehicle_model_id uuid references public.vehicle_models(id) on delete restrict,
  add column vehicle_architecture_id uuid references public.vehicle_architectures(id) on delete restrict,
  add column provider_key text,
  add column provider_identifier text,
  add column creation_path text not null default 'existing' check (
    creation_path in ('existing', 'approved_import', 'admin_exception')
  ),
  add column exception_proposal_id uuid references public.master_data_proposals(id) on delete restrict,
  add constraint programs_provider_identifier_pair check ((provider_key is null) = (provider_identifier is null)),
  add constraint programs_exception_proposal_required check (
    creation_path <> 'admin_exception' or exception_proposal_id is not null
  ),
  add constraint programs_vehicle_model_same_tenant foreign key (organization_id, vehicle_model_id)
    references public.vehicle_models(organization_id, id),
  add constraint programs_vehicle_architecture_same_tenant foreign key (organization_id, vehicle_architecture_id)
    references public.vehicle_architectures(organization_id, id),
  add constraint programs_exception_proposal_same_tenant foreign key (organization_id, exception_proposal_id)
    references public.master_data_proposals(organization_id, id);

create unique index programs_provider_identifier_unique
  on public.programs (organization_id, provider_key, provider_identifier)
  where provider_identifier is not null;

alter table public.program_model_years
  add column provider_key text,
  add column provider_identifier text,
  add constraint program_model_year_provider_identifier_pair
    check ((provider_key is null) = (provider_identifier is null));

create unique index program_model_years_provider_identifier_unique
  on public.program_model_years (organization_id, provider_key, provider_identifier)
  where provider_identifier is not null;

create table public.connector_test_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid not null references public.connectors(id) on delete cascade,
  mapping_version_id uuid references public.connector_mapping_versions(id) on delete restrict,
  mode text not null check (mode in ('configuration', 'synthetic', 'live')),
  status text not null default 'pending' check (status in ('pending', 'running', 'passed', 'failed', 'cancelled')),
  endpoint_host text,
  configuration_hash text check (configuration_hash is null or configuration_hash ~ '^[a-f0-9]{64}$'),
  result_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(result_summary) = 'object'),
  attempted_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status in ('pending', 'running')) = (completed_at is null)),
  unique (organization_id, id),
  foreign key (organization_id, connector_id) references public.connectors(organization_id, id) on delete cascade,
  foreign key (organization_id, mapping_version_id)
    references public.connector_mapping_versions(organization_id, id) on delete restrict
);

alter table public.accruals alter column dcr_id drop not null;

create unique index one_active_accrual_per_agreement_scope
  on public.accruals (recovery_agreement_id, program_id, part_id)
  where active;

create table app.recovery_activation_context (
  transaction_id bigint not null,
  recovery_agreement_id uuid not null,
  actor_id uuid,
  primary key (transaction_id, recovery_agreement_id)
);

revoke all on table app.recovery_activation_context from public, anon, authenticated;

create or replace function app.master_data_entity_exists(
  target_organization_id uuid,
  target_entity_type text,
  target_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return case target_entity_type
    when 'oem' then exists (select 1 from public.oems e where e.organization_id = target_organization_id and e.id = target_entity_id)
    when 'vehicle_architecture' then exists (select 1 from public.vehicle_architectures e where e.organization_id = target_organization_id and e.id = target_entity_id)
    when 'vehicle_make' then exists (select 1 from public.vehicle_makes e where e.organization_id = target_organization_id and e.id = target_entity_id)
    when 'vehicle_model' then exists (select 1 from public.vehicle_models e where e.organization_id = target_organization_id and e.id = target_entity_id)
    when 'program' then exists (select 1 from public.programs e where e.organization_id = target_organization_id and e.id = target_entity_id)
    when 'program_model_year' then exists (select 1 from public.program_model_years e where e.organization_id = target_organization_id and e.id = target_entity_id)
    when 'part' then exists (select 1 from public.parts e where e.organization_id = target_organization_id and e.id = target_entity_id)
    when 'part_revision' then exists (select 1 from public.part_revisions e where e.organization_id = target_organization_id and e.id = target_entity_id)
    else false
  end;
end;
$$;

create or replace function app.validate_materiality_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and tg_op = 'INSERT' and new.created_by is distinct from auth.uid() then
    raise exception 'materiality rule actor must match the authenticated user' using errcode = '42501';
  end if;
  if coalesce(auth.role(), '') <> 'service_role' and tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    raise exception 'materiality rule actor must match the authenticated user' using errcode = '42501';
  end if;
  if coalesce(auth.role(), '') <> 'service_role' and new.status = 'active' and new.approved_by is distinct from auth.uid() then
    raise exception 'materiality rule approver must match the authenticated user' using errcode = '42501';
  end if;
  if new.scope_type = 'program' and not exists (
    select 1 from public.programs p where p.organization_id = new.organization_id and p.id = new.scope_id
  ) then
    raise exception 'materiality program scope must reference a same-tenant program' using errcode = '23503';
  end if;
  if new.scope_type = 'recovery_agreement' and not exists (
    select 1 from public.recovery_agreements a where a.organization_id = new.organization_id and a.id = new.scope_id
  ) then
    raise exception 'materiality agreement scope must reference a same-tenant agreement' using errcode = '23503';
  end if;
  if tg_op = 'UPDATE' and old.status = 'active'
    and (to_jsonb(new) - array['status', 'updated_at']) is distinct from (to_jsonb(old) - array['status', 'updated_at']) then
    raise exception 'active materiality rules are immutable; create a superseding version' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_master_data_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.master_data_entity_exists(new.organization_id, new.entity_type, new.entity_id) then
    raise exception 'master-data reference must identify a same-tenant canonical record' using errcode = '23503';
  end if;
  if coalesce(auth.role(), '') <> 'service_role' and new.approved_by is distinct from auth.uid() then
    raise exception 'master-data alias approver must match the authenticated user' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.protect_master_data_proposal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and tg_op = 'INSERT' and new.proposed_by is distinct from auth.uid() then
    raise exception 'master-data proposal actor must match the authenticated user' using errcode = '42501';
  end if;
  if coalesce(auth.role(), '') <> 'service_role' and tg_op = 'UPDATE' and new.proposed_by is distinct from old.proposed_by then
    raise exception 'master-data proposal actor must match the authenticated user' using errcode = '42501';
  end if;
  if coalesce(auth.role(), '') <> 'service_role' and new.status <> 'proposed' and new.reviewed_by is distinct from auth.uid() then
    raise exception 'master-data proposal reviewer must match the authenticated user' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status in ('approved', 'rejected', 'withdrawn')
    and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'reviewed master-data proposals are immutable' using errcode = '42501';
  end if;
  if new.status = 'approved'
    and not app.master_data_entity_exists(new.organization_id, new.entity_type, new.resulting_entity_id) then
    raise exception 'approved master-data proposals require a same-tenant resulting record' using errcode = '23503';
  end if;
  return new;
end;
$$;

create or replace function app.prevent_master_data_merge_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'master-data merge history is immutable' using errcode = '42501';
end;
$$;

create or replace function app.validate_master_data_merge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.master_data_entity_exists(new.organization_id, new.entity_type, new.source_entity_id)
    or not app.master_data_entity_exists(new.organization_id, new.entity_type, new.canonical_entity_id) then
    raise exception 'master-data merge must reference same-tenant records of the declared type' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.organization_id = new.organization_id
      and m.user_id = new.approved_by
      and m.active
      and m.role = 'administrator'
  ) or (coalesce(auth.role(), '') <> 'service_role' and new.approved_by is distinct from auth.uid()) then
    raise exception 'master-data merge requires a same-tenant administrator approver' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_connector_test_run()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare result_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and tg_op = 'INSERT' and new.attempted_by is distinct from auth.uid() then
    raise exception 'connector test actor must match the authenticated user' using errcode = '42501';
  end if;
  if coalesce(auth.role(), '') <> 'service_role' and tg_op = 'UPDATE' and new.attempted_by is distinct from old.attempted_by then
    raise exception 'connector test actor must match the authenticated user' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status in ('passed', 'failed', 'cancelled')
    and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'completed connector test evidence is immutable' using errcode = '42501';
  end if;
  for result_key in select jsonb_object_keys(new.result_summary)
  loop
    if result_key not in ('result_code', 'message', 'checks', 'counts', 'configuration_version', 'tested_at') then
      raise exception 'connector test result contains an unsupported field: %', result_key using errcode = '23514';
    end if;
  end loop;
  if new.mode = 'live' and not exists (
    select 1 from public.connectors c
    where c.organization_id = new.organization_id
      and c.id = new.connector_id
      and c.activation_state = 'approved'
      and c.enabled
      and (c.authentication_method = 'none' or c.credential_reference is not null)
  ) then
    raise exception 'live connector testing requires an approved enabled connection and its server-side credential reference' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_recovery_agreement_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'new recovery agreements must begin as drafts' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and not (case old.status
    when 'draft' then new.status in ('draft', 'under_review', 'rejected')
    when 'under_review' then new.status in ('draft', 'under_review', 'approved', 'rejected')
    when 'approved' then new.status in ('approved', 'active', 'superseded')
    when 'active' then new.status in ('active', 'expired', 'superseded')
    when 'expired' then new.status = 'expired'
    when 'superseded' then new.status = 'superseded'
    when 'rejected' then new.status in ('draft', 'rejected')
  end) then
    raise exception 'invalid recovery agreement transition' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.status in ('approved', 'active', 'expired', 'superseded')
    and to_jsonb(new) - array['status', 'updated_at'] is distinct from to_jsonb(old) - array['status', 'updated_at'] then
    raise exception 'approved agreement terms are immutable; create a superseding version' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status <> 'approved' and new.status = 'approved' and not exists (
    select 1 from public.approvals ap
    where ap.organization_id = new.organization_id
      and ap.entity_type = 'recovery_agreement'
      and ap.entity_id = new.id
      and ap.decision = 'approved'
  ) then
    raise exception 'agreement approval requires an approved decision record' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active' then
    if not exists (
      select 1 from app.recovery_activation_context c
      where c.transaction_id = txid_current() and c.recovery_agreement_id = new.id
    ) then
      raise exception 'use app.activate_recovery_agreement for atomic recovery activation' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.documents d
      where d.organization_id = new.organization_id and d.recovery_agreement_id = new.id and d.status = 'active'
    ) or not exists (
      select 1 from public.recovery_agreement_rate_periods rp
      where rp.organization_id = new.organization_id and rp.recovery_agreement_id = new.id
    ) or not exists (
      select 1 from public.recovery_agreement_programs p
      where p.organization_id = new.organization_id and p.recovery_agreement_id = new.id
    ) or not exists (
      select 1 from public.recovery_agreement_parts p
      where p.organization_id = new.organization_id and p.recovery_agreement_id = new.id
    ) then
      raise exception 'agreement activation requires an original document, rate period, linked program, and linked part' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function app.activate_recovery_agreement(target_agreement_id uuid)
returns public.recovery_agreements
language plpgsql
security definer
set search_path = ''
as $$
declare agreement_record public.recovery_agreements%rowtype;
declare activated_record public.recovery_agreements%rowtype;
begin
  select * into agreement_record
  from public.recovery_agreements a
  where a.id = target_agreement_id
  for update;

  if agreement_record.id is null then
    raise exception 'recovery agreement not found' using errcode = 'P0002';
  end if;
  if coalesce(auth.role(), '') <> 'service_role'
    and not coalesce(app.is_org_admin(agreement_record.organization_id), false) then
    raise exception 'recovery activation permission denied' using errcode = '42501';
  end if;
  if agreement_record.status <> 'approved' then
    raise exception 'recovery agreement must be approved before activation' using errcode = '23514';
  end if;
  if agreement_record.effective_from is null
    or agreement_record.effective_from > current_date
    or (agreement_record.effective_to is not null and agreement_record.effective_to < current_date)
    or (agreement_record.expires_on is not null and agreement_record.expires_on < current_date) then
    raise exception 'recovery agreement must be effective on the activation date' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.recovery_agreement_dcrs ad
    join public.dcrs d on d.organization_id = ad.organization_id and d.id = ad.dcr_id
    where ad.organization_id = agreement_record.organization_id
      and ad.recovery_agreement_id = agreement_record.id
      and d.status not in ('approved', 'active')
  ) then
    raise exception 'linked DCRs must be approved before recovery activation' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.recovery_agreement_parts ap
    join public.parts p on p.organization_id = ap.organization_id and p.id = ap.part_id
    join public.recovery_agreement_programs agp
      on agp.organization_id = ap.organization_id
      and agp.recovery_agreement_id = ap.recovery_agreement_id
      and (
        p.program_id = agp.program_id
        or exists (
          select 1 from public.part_program_applications ppa
          where ppa.organization_id = ap.organization_id
            and ppa.part_id = ap.part_id
            and ppa.program_id = agp.program_id
        )
      )
    where ap.organization_id = agreement_record.organization_id
      and ap.recovery_agreement_id = agreement_record.id
  ) then
    raise exception 'recovery setup requires a compatible linked program and part' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.accruals ac
    where ac.organization_id = agreement_record.organization_id
      and ac.recovery_agreement_id = agreement_record.id
      and not ac.active
      and ac.settlement_currency = agreement_record.settlement_currency
      and exists (
        select 1 from public.recovery_agreement_programs ap
        where ap.organization_id = ac.organization_id
          and ap.recovery_agreement_id = ac.recovery_agreement_id
          and ap.program_id = ac.program_id
      )
      and exists (
        select 1 from public.recovery_agreement_parts ap
        where ap.organization_id = ac.organization_id
          and ap.recovery_agreement_id = ac.recovery_agreement_id
          and ap.part_id = ac.part_id
      )
      and (
        ac.dcr_id is null
        or exists (
          select 1 from public.recovery_agreement_dcrs ad
          join public.dcrs d on d.organization_id = ad.organization_id and d.id = ad.dcr_id
          where ad.organization_id = ac.organization_id
            and ad.recovery_agreement_id = ac.recovery_agreement_id
            and ad.dcr_id = ac.dcr_id
            and d.status in ('approved', 'active')
        )
      )
  ) then
    raise exception 'recovery activation requires a complete inactive recovery setup in the agreement currency' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.accruals ac
    where ac.organization_id = agreement_record.organization_id
      and ac.recovery_agreement_id = agreement_record.id
      and not ac.active
      and (
        ac.settlement_currency <> agreement_record.settlement_currency
        or not exists (
          select 1 from public.recovery_agreement_programs ap
          where ap.organization_id = ac.organization_id
            and ap.recovery_agreement_id = ac.recovery_agreement_id
            and ap.program_id = ac.program_id
        )
        or not exists (
          select 1 from public.recovery_agreement_parts ap
          where ap.organization_id = ac.organization_id
            and ap.recovery_agreement_id = ac.recovery_agreement_id
            and ap.part_id = ac.part_id
        )
        or (
          ac.dcr_id is not null and not exists (
            select 1 from public.recovery_agreement_dcrs ad
            join public.dcrs d on d.organization_id = ad.organization_id and d.id = ad.dcr_id
            where ad.organization_id = ac.organization_id
              and ad.recovery_agreement_id = ac.recovery_agreement_id
              and ad.dcr_id = ac.dcr_id
              and d.status in ('approved', 'active')
          )
        )
      )
  ) then
    raise exception 'recovery activation found an incomplete or mismatched recovery draft' using errcode = '23514';
  end if;

  insert into app.recovery_activation_context (transaction_id, recovery_agreement_id, actor_id)
  values (txid_current(), agreement_record.id, auth.uid());

  update public.recovery_agreements
  set status = 'active'
  where id = agreement_record.id
  returning * into activated_record;

  update public.accruals ac
  set active = true
  where ac.organization_id = agreement_record.organization_id
    and ac.recovery_agreement_id = agreement_record.id
    and not ac.active;

  delete from app.recovery_activation_context
  where transaction_id = txid_current() and recovery_agreement_id = agreement_record.id;

  return activated_record;
end;
$$;

create or replace function app.validate_dcr_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare transition_definition jsonb;
declare required_permission public.permission_name;
declare required_item text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'new DCRs must begin as drafts' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.status = old.status then return new; end if;
  if not (case old.status
    when 'draft' then new.status in ('submitted', 'cancelled')
    when 'submitted' then new.status in ('draft', 'under_review', 'cancelled')
    when 'under_review' then new.status in ('submitted', 'approved', 'rejected', 'cancelled')
    when 'approved' then new.status in ('active', 'rejected', 'cancelled')
    when 'active' then new.status in ('closed', 'cancelled')
    when 'closed' then false
    when 'rejected' then new.status = 'draft'
    when 'cancelled' then false
  end) then
    raise exception 'DCR transition is outside the fixed governed lifecycle' using errcode = '23514';
  end if;
  select transition into transition_definition
  from public.configuration_versions c,
    jsonb_array_elements(c.payload -> 'transitions') transition
  where c.id = new.workflow_configuration_id
    and c.organization_id = new.organization_id
    and c.kind = 'dcr_workflow'::public.configuration_kind
    and transition ->> 'from' = old.status::text
    and transition ->> 'to' = new.status::text
  limit 1;
  if transition_definition is null then
    raise exception 'DCR transition is not present in its versioned workflow' using errcode = '23514';
  end if;
  if new.status in ('closed', 'rejected', 'cancelled') and nullif(trim(new.transition_reason), '') is null then
    raise exception 'A transition reason is required for terminal DCR states' using errcode = '23514';
  end if;
  required_permission := case when new.status in ('under_review', 'approved', 'active', 'closed', 'rejected')
    then 'approve'::public.permission_name else 'write'::public.permission_name end;
  if auth.uid() is not null and not app.can_access_scope(
    new.organization_id, new.department_id, new.technical_team_id, new.program_id, new.part_id, required_permission
  ) then
    raise exception 'DCR transition permission denied' using errcode = '42501';
  end if;
  for required_item in select jsonb_array_elements_text(coalesce(transition_definition -> 'required_document_types', '[]'::jsonb))
  loop
    if not exists (
      select 1 from public.documents d
      where d.organization_id = new.organization_id and d.dcr_id = new.id
        and d.document_type = required_item and d.status = 'active'
    ) then
      raise exception 'DCR transition requires document evidence: %', required_item using errcode = '23514';
    end if;
  end loop;
  for required_item in select jsonb_array_elements_text(coalesce(transition_definition -> 'required_assignment_roles', '[]'::jsonb))
  loop
    if not exists (
      select 1 from public.dcr_assignments a
      where a.organization_id = new.organization_id and a.dcr_id = new.id
        and a.role = required_item and a.active
    ) then
      raise exception 'DCR transition requires active assignment: %', required_item using errcode = '23514';
    end if;
  end loop;
  for required_item in select jsonb_array_elements_text(coalesce(transition_definition -> 'required_approval_stages', '[]'::jsonb))
  loop
    if not exists (
      select 1 from public.approvals a
      where a.organization_id = new.organization_id and a.entity_type = 'dcr'
        and a.entity_id = new.id and a.stage = required_item and a.decision = 'approved'
    ) then
      raise exception 'DCR transition requires approval stage: %', required_item using errcode = '23514';
    end if;
  end loop;
  if new.status = 'active' and (
    new.program_id is null
    or new.part_id is null
    or not exists (
      select 1
      from public.recovery_agreement_dcrs ad
      join public.recovery_agreements ag
        on ag.organization_id = ad.organization_id and ag.id = ad.recovery_agreement_id
      join public.recovery_agreement_programs ap
        on ap.organization_id = ad.organization_id
        and ap.recovery_agreement_id = ad.recovery_agreement_id
        and ap.program_id = new.program_id
      join public.recovery_agreement_parts apt
        on apt.organization_id = ad.organization_id
        and apt.recovery_agreement_id = ad.recovery_agreement_id
        and apt.part_id = new.part_id
      join public.accruals ac
        on ac.organization_id = ad.organization_id
        and ac.recovery_agreement_id = ad.recovery_agreement_id
        and ac.dcr_id = new.id
        and ac.program_id = new.program_id
        and ac.part_id = new.part_id
        and ac.active
      where ad.organization_id = new.organization_id
        and ad.dcr_id = new.id
        and ag.status = 'active'
        and ag.effective_from <= current_date
        and (ag.effective_to is null or ag.effective_to >= current_date)
        and (ag.expires_on is null or ag.expires_on >= current_date)
    )
  ) then
    raise exception 'DCR activation requires an approved effective agreement and complete linked recovery setup' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger dcr_transition_validate on public.dcrs;
create trigger dcr_transition_validate
before insert or update of status on public.dcrs
for each row execute function app.validate_dcr_transition();

create trigger materiality_rules_updated_at
before update on public.materiality_rules for each row execute function app.set_updated_at();
create trigger vehicle_architectures_updated_at
before update on public.vehicle_architectures for each row execute function app.set_updated_at();
create trigger vehicle_makes_updated_at
before update on public.vehicle_makes for each row execute function app.set_updated_at();
create trigger master_data_proposals_updated_at
before update on public.master_data_proposals for each row execute function app.set_updated_at();

create trigger materiality_rules_org_immutable before update on public.materiality_rules
for each row execute function app.prevent_organization_change();
create trigger vehicle_architectures_org_immutable before update on public.vehicle_architectures
for each row execute function app.prevent_organization_change();
create trigger vehicle_makes_org_immutable before update on public.vehicle_makes
for each row execute function app.prevent_organization_change();
create trigger master_data_proposals_org_immutable before update on public.master_data_proposals
for each row execute function app.prevent_organization_change();
create trigger master_data_aliases_org_immutable before update on public.master_data_aliases
for each row execute function app.prevent_organization_change();
create trigger connector_test_runs_org_immutable before update on public.connector_test_runs
for each row execute function app.prevent_organization_change();

create trigger materiality_rules_validate before insert or update on public.materiality_rules
for each row execute function app.validate_materiality_rule();
create trigger master_data_aliases_validate before insert or update on public.master_data_aliases
for each row execute function app.validate_master_data_reference();
create trigger master_data_proposals_protect before insert or update on public.master_data_proposals
for each row execute function app.protect_master_data_proposal();
create trigger master_data_merge_validate before insert on public.master_data_merge_events
for each row execute function app.validate_master_data_merge();
create trigger master_data_merge_immutable before update or delete on public.master_data_merge_events
for each row execute function app.prevent_master_data_merge_mutation();
create trigger connector_test_runs_validate before insert or update on public.connector_test_runs
for each row execute function app.validate_connector_test_run();

create trigger materiality_rules_audit after insert or update or delete on public.materiality_rules
for each row execute function app.append_audit_event();
create trigger vehicle_architectures_audit after insert or update or delete on public.vehicle_architectures
for each row execute function app.append_audit_event();
create trigger vehicle_makes_audit after insert or update or delete on public.vehicle_makes
for each row execute function app.append_audit_event();
create trigger vehicle_models_audit after insert or update or delete on public.vehicle_models
for each row execute function app.append_audit_event();
create trigger master_data_proposals_audit after insert or update or delete on public.master_data_proposals
for each row execute function app.append_audit_event();
create trigger master_data_aliases_audit after insert or update or delete on public.master_data_aliases
for each row execute function app.append_audit_event();
create trigger master_data_merge_events_audit after insert or update or delete on public.master_data_merge_events
for each row execute function app.append_audit_event();
create trigger connector_test_runs_audit after insert or update or delete on public.connector_test_runs
for each row execute function app.append_audit_event();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'materiality_rules', 'vehicle_architectures', 'vehicle_makes', 'vehicle_models',
    'master_data_proposals', 'master_data_aliases', 'master_data_merge_events',
    'connector_test_runs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy materiality_rules_read on public.materiality_rules for select to authenticated
using (app.is_org_member(organization_id));
create policy materiality_rules_admin_all on public.materiality_rules for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy vehicle_architectures_read on public.vehicle_architectures for select to authenticated
using (app.is_org_member(organization_id));
create policy vehicle_architectures_admin_all on public.vehicle_architectures for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy vehicle_makes_read on public.vehicle_makes for select to authenticated
using (app.is_org_member(organization_id));
create policy vehicle_makes_admin_all on public.vehicle_makes for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy master_data_aliases_read on public.master_data_aliases for select to authenticated
using (app.is_org_member(organization_id));
create policy master_data_aliases_admin_all on public.master_data_aliases for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy master_data_proposals_admin_all on public.master_data_proposals for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy master_data_merge_events_read on public.master_data_merge_events for select to authenticated
using (app.membership_role(organization_id) in ('administrator', 'full_view'));
create policy master_data_merge_events_admin_insert on public.master_data_merge_events for insert to authenticated
with check (app.is_org_admin(organization_id));
create policy connector_test_runs_control_read on public.connector_test_runs for select to authenticated
using (app.membership_role(organization_id) in ('administrator', 'full_view'));
create policy connector_test_runs_admin_all on public.connector_test_runs for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

grant select, insert, update, delete on
  public.materiality_rules,
  public.vehicle_architectures,
  public.vehicle_makes,
  public.vehicle_models,
  public.master_data_proposals,
  public.master_data_aliases,
  public.master_data_merge_events,
  public.connector_test_runs
to authenticated;
grant all on
  public.materiality_rules,
  public.vehicle_architectures,
  public.vehicle_makes,
  public.vehicle_models,
  public.master_data_proposals,
  public.master_data_aliases,
  public.master_data_merge_events,
  public.connector_test_runs
to service_role;
revoke execute on function app.master_data_entity_exists(uuid, text, uuid) from public, anon, authenticated;
grant execute on function app.master_data_entity_exists(uuid, text, uuid) to service_role;
revoke execute on function app.activate_recovery_agreement(uuid) from public, anon;
grant execute on function app.activate_recovery_agreement(uuid) to authenticated, service_role;

commit;
