begin;

create type public.recovery_agreement_status as enum (
  'draft', 'under_review', 'approved', 'active', 'expired', 'superseded', 'rejected'
);

create table public.program_model_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  model_year smallint not null check (model_year between 1900 and 2200),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  unique (program_id, model_year),
  unique (organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id)
);

create table public.part_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  revision_code text not null check (length(trim(revision_code)) between 1 and 80),
  description text,
  effective_from date not null,
  effective_to date,
  source_dcr_id uuid references public.dcrs(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded', 'inactive')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null)),
  unique (part_id, revision_code),
  unique (organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id),
  foreign key (organization_id, source_dcr_id) references public.dcrs(organization_id, id)
);

create table public.part_program_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  part_revision_id uuid references public.part_revisions(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  program_model_year_id uuid references public.program_model_years(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  unique nulls not distinct (part_id, part_revision_id, program_id, program_model_year_id, effective_from),
  unique (organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id),
  foreign key (organization_id, part_revision_id) references public.part_revisions(organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, program_model_year_id) references public.program_model_years(organization_id, id)
);

create table public.commodities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (length(trim(code)) between 1 and 80),
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table public.part_commodities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  commodity_id uuid not null references public.commodities(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (part_id, commodity_id),
  unique (organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id) on delete cascade,
  foreign key (organization_id, commodity_id) references public.commodities(organization_id, id) on delete restrict
);

create table public.recovery_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agreement_number text not null check (length(trim(agreement_number)) between 1 and 120),
  title text not null check (length(trim(title)) between 1 and 300),
  supplier_id uuid references public.suppliers(id) on delete restrict,
  status public.recovery_agreement_status not null default 'draft',
  settlement_currency text not null check (settlement_currency ~ '^[A-Z]{3}$'),
  recoverable_cost numeric(38, 18) not null check (recoverable_cost >= 0),
  eligible_volume_basis public.eligible_volume_basis not null,
  effective_from date,
  effective_to date,
  expires_on date,
  owner_user_id uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  supersedes_id uuid references public.recovery_agreements(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check (expires_on is null or effective_from is null or expires_on >= effective_from),
  check (status not in ('approved', 'active') or (approved_by is not null and approved_at is not null)),
  check (status <> 'active' or effective_from is not null),
  unique (organization_id, agreement_number),
  unique (organization_id, id),
  foreign key (organization_id, supplier_id) references public.suppliers(organization_id, id),
  foreign key (organization_id, supersedes_id) references public.recovery_agreements(organization_id, id)
);

create table public.recovery_agreement_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recovery_agreement_id uuid not null references public.recovery_agreements(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (recovery_agreement_id, program_id),
  unique (organization_id, id),
  foreign key (organization_id, recovery_agreement_id) references public.recovery_agreements(organization_id, id) on delete cascade,
  foreign key (organization_id, program_id) references public.programs(organization_id, id) on delete restrict
);

create table public.recovery_agreement_model_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recovery_agreement_id uuid not null references public.recovery_agreements(id) on delete cascade,
  program_model_year_id uuid not null references public.program_model_years(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (recovery_agreement_id, program_model_year_id),
  unique (organization_id, id),
  foreign key (organization_id, recovery_agreement_id) references public.recovery_agreements(organization_id, id) on delete cascade,
  foreign key (organization_id, program_model_year_id) references public.program_model_years(organization_id, id) on delete restrict
);

create table public.recovery_agreement_parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recovery_agreement_id uuid not null references public.recovery_agreements(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  part_revision_id uuid references public.part_revisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique nulls not distinct (recovery_agreement_id, part_id, part_revision_id),
  unique (organization_id, id),
  foreign key (organization_id, recovery_agreement_id) references public.recovery_agreements(organization_id, id) on delete cascade,
  foreign key (organization_id, part_id) references public.parts(organization_id, id) on delete restrict,
  foreign key (organization_id, part_revision_id) references public.part_revisions(organization_id, id) on delete restrict
);

create table public.recovery_agreement_dcrs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recovery_agreement_id uuid not null references public.recovery_agreements(id) on delete cascade,
  dcr_id uuid not null references public.dcrs(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (recovery_agreement_id, dcr_id),
  unique (organization_id, id),
  foreign key (organization_id, recovery_agreement_id) references public.recovery_agreements(organization_id, id) on delete cascade,
  foreign key (organization_id, dcr_id) references public.dcrs(organization_id, id) on delete restrict
);

create table public.recovery_agreement_rate_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recovery_agreement_id uuid not null references public.recovery_agreements(id) on delete cascade,
  effective_from date not null,
  effective_to date,
  per_unit_rate numeric(38, 18) not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  unique (organization_id, id),
  foreign key (organization_id, recovery_agreement_id) references public.recovery_agreements(organization_id, id) on delete cascade,
  exclude using gist (
    recovery_agreement_id with =,
    daterange(effective_from, coalesce(effective_to + 1, 'infinity'::date), '[)') with &&
  )
);

alter table public.approvals drop constraint if exists approvals_entity_type_check;
alter table public.approvals
  add constraint approvals_entity_type_check check (
    entity_type in (
      'dcr', 'report', 'extraction', 'recovery_rate', 'ingestion_batch', 'ingestion_record',
      'document_terms', 'eligible_volume_policy', 'part_vehicle_rule', 'recovery_agreement'
    )
  );

alter table public.documents
  add column recovery_agreement_id uuid references public.recovery_agreements(id) on delete restrict,
  add constraint documents_recovery_agreement_same_tenant foreign key (organization_id, recovery_agreement_id)
    references public.recovery_agreements(organization_id, id);

alter table public.accruals
  add column recovery_agreement_id uuid references public.recovery_agreements(id) on delete restrict,
  alter column active set default false,
  add constraint accrual_active_agreement_required check (not active or recovery_agreement_id is not null),
  add constraint accrual_recovery_agreement_same_tenant foreign key (organization_id, recovery_agreement_id)
    references public.recovery_agreements(organization_id, id);

alter table public.connectors
  add column environment text not null default 'staging' check (environment in ('development', 'staging', 'production')),
  add column endpoint_url text,
  add column allowed_hosts text[] not null default '{}'::text[],
  add column authentication_method text not null default 'none' check (
    authentication_method in ('none', 'basic', 'api_key', 'oauth2', 'client_certificate', 'managed_identity')
  ),
  add column time_zone text not null default 'UTC',
  add column delta_behavior jsonb not null default '{}'::jsonb check (jsonb_typeof(delta_behavior) = 'object'),
  add column source_objects jsonb not null default '[]'::jsonb check (jsonb_typeof(source_objects) = 'array'),
  add column data_categories public.erp_transaction_type[] not null default '{}'::public.erp_transaction_type[],
  add column reconciliation_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(reconciliation_rules) = 'object'),
  add column retry_policy jsonb not null default '{"maximum_attempts":3,"backoff_seconds":30}'::jsonb check (jsonb_typeof(retry_policy) = 'object'),
  add column owner_user_id uuid references auth.users(id) on delete set null,
  add column health_state text not null default 'not_tested' check (health_state in ('not_tested', 'healthy', 'degraded', 'error', 'disabled')),
  add column last_run_at timestamptz,
  add column next_run_at timestamptz,
  add column last_error_code text,
  add column last_error_detail text,
  add constraint connector_https_endpoint check (endpoint_url is null or endpoint_url ~ '^https://'),
  add constraint connector_endpoint_allowlist check (endpoint_url is null or cardinality(allowed_hosts) > 0),
  add constraint connector_enabled_approved check (not enabled or activation_state = 'approved'),
  add constraint connector_erp_categories_required check (
    activation_state = 'disabled'
    or adapter_type not in ('sap', 'erp', 'odata')
    or cardinality(data_categories) > 0
  ),
  add constraint connector_api_credential_required check (
    activation_state <> 'approved'
    or authentication_method = 'none'
    or credential_reference is not null
  );

create table public.connector_mapping_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid not null references public.connectors(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'validated', 'approved', 'superseded')),
  field_mappings jsonb not null check (jsonb_typeof(field_mappings) = 'array'),
  sample_validation jsonb not null default '{}'::jsonb check (jsonb_typeof(sample_validation) = 'object'),
  reconciliation_preview jsonb not null default '{}'::jsonb check (jsonb_typeof(reconciliation_preview) = 'object'),
  owner_user_id uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  supersedes_id uuid references public.connector_mapping_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null)),
  check (jsonb_array_length(field_mappings) > 0),
  unique (connector_id, version),
  unique (organization_id, id),
  foreign key (organization_id, connector_id) references public.connectors(organization_id, id) on delete cascade,
  foreign key (organization_id, supersedes_id) references public.connector_mapping_versions(organization_id, id)
);

create unique index one_approved_connector_mapping
  on public.connector_mapping_versions (connector_id)
  where status = 'approved';

create index program_model_years_org_program_idx on public.program_model_years (organization_id, program_id);
create index part_revisions_org_part_idx on public.part_revisions (organization_id, part_id);
create index part_program_applications_org_program_idx on public.part_program_applications (organization_id, program_id);
create index part_program_applications_org_part_idx on public.part_program_applications (organization_id, part_id);
create index recovery_agreements_org_status_idx on public.recovery_agreements (organization_id, status);
create index recovery_agreements_supplier_idx on public.recovery_agreements (organization_id, supplier_id);
create index recovery_agreement_programs_program_idx on public.recovery_agreement_programs (organization_id, program_id);
create index recovery_agreement_model_years_year_idx on public.recovery_agreement_model_years (organization_id, program_model_year_id);
create index recovery_agreement_parts_part_idx on public.recovery_agreement_parts (organization_id, part_id);
create index recovery_agreement_dcrs_dcr_idx on public.recovery_agreement_dcrs (organization_id, dcr_id);
create index recovery_agreement_rate_periods_agreement_idx on public.recovery_agreement_rate_periods (organization_id, recovery_agreement_id);
create index documents_recovery_agreement_idx on public.documents (organization_id, recovery_agreement_id);
create index accruals_recovery_agreement_idx on public.accruals (organization_id, recovery_agreement_id);
create index connector_mapping_versions_org_connector_idx on public.connector_mapping_versions (organization_id, connector_id);

create or replace function app.can_access_recovery_agreement(target_agreement_id uuid, required_permission public.permission_name default 'read')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.recovery_agreements a
    where a.id = target_agreement_id
      and (
        (required_permission = 'read'::public.permission_name and app.membership_role(a.organization_id) = 'full_view'::public.organization_role)
        or app.is_org_admin(a.organization_id)
        or exists (
          select 1 from public.recovery_agreement_programs ap
          where ap.recovery_agreement_id = a.id
            and app.can_access_scope(a.organization_id, null, null, ap.program_id, null, required_permission)
        )
        or exists (
          select 1 from public.recovery_agreement_parts ar
          where ar.recovery_agreement_id = a.id
            and app.can_access_scope(a.organization_id, null, null, null, ar.part_id, required_permission)
        )
        or exists (
          select 1 from public.recovery_agreement_dcrs ad
          join public.dcrs d on d.id = ad.dcr_id and d.organization_id = ad.organization_id
          where ad.recovery_agreement_id = a.id
            and app.can_access_scope(a.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, required_permission)
        )
      )
  );
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
  if tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active' and (
    not exists (
      select 1 from public.documents d
      where d.organization_id = new.organization_id
        and d.recovery_agreement_id = new.id
        and d.status = 'active'
    )
    or not exists (
      select 1 from public.recovery_agreement_rate_periods rp
      where rp.organization_id = new.organization_id
        and rp.recovery_agreement_id = new.id
    )
    or not (
      exists (
        select 1 from public.recovery_agreement_programs p
        where p.organization_id = new.organization_id and p.recovery_agreement_id = new.id
      )
      or exists (
        select 1 from public.recovery_agreement_parts p
        where p.organization_id = new.organization_id and p.recovery_agreement_id = new.id
      )
    )
  ) then
    raise exception 'agreement activation requires an original document, rate period, and linked program or part' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.protect_recovery_agreement_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare agreement_id uuid;
declare agreement_status public.recovery_agreement_status;
begin
  agreement_id := coalesce(new.recovery_agreement_id, old.recovery_agreement_id);
  select a.status into agreement_status from public.recovery_agreements a where a.id = agreement_id;
  if agreement_status not in ('draft', 'under_review') then
    raise exception 'approved agreement links are immutable; create a superseding agreement' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function app.validate_accrual_agreement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active and not exists (
    select 1 from public.recovery_agreements a
    where a.id = new.recovery_agreement_id
      and a.organization_id = new.organization_id
      and a.status = 'active'
      and a.effective_from <= current_date
      and (a.effective_to is null or a.effective_to >= current_date)
      and (a.expires_on is null or a.expires_on >= current_date)
  ) then
    raise exception 'recovery activation requires an effective approved agreement' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_calculation_agreement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.accruals ac
    join public.recovery_agreements a
      on a.id = ac.recovery_agreement_id and a.organization_id = ac.organization_id
    where ac.id = new.accrual_id
      and ac.organization_id = new.organization_id
      and ac.active
      and a.status = 'active'
      and a.effective_from <= new.as_of_date
      and (a.effective_to is null or a.effective_to >= new.as_of_date)
      and (a.expires_on is null or a.expires_on >= new.as_of_date)
  ) then
    raise exception 'calculation requires an active recovery agreement' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_connector_mapping_operations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare mapping jsonb;
declare operation text;
begin
  for mapping in select value from jsonb_array_elements(new.field_mappings)
  loop
    if jsonb_typeof(mapping) <> 'object'
      or nullif(trim(mapping ->> 'source'), '') is null
      or nullif(trim(mapping ->> 'destination'), '') is null then
      raise exception 'each field mapping requires source and destination fields' using errcode = '23514';
    end if;
    operation := coalesce(mapping ->> 'operation', 'copy');
    if operation not in ('copy', 'trim', 'uppercase', 'lowercase', 'date_iso', 'decimal', 'integer', 'constant') then
      raise exception 'mapping operation is not an approved declarative operation' using errcode = '23514';
    end if;
    if mapping ? 'expression' or mapping ? 'script' or mapping ? 'code' then
      raise exception 'executable mapping content is not permitted' using errcode = '42501';
    end if;
  end loop;
  return new;
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
  if new.status = old.status then return new; end if;
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
  return new;
end;
$$;

create trigger program_model_years_updated_at before update on public.program_model_years for each row execute function app.set_updated_at();
create trigger part_revisions_updated_at before update on public.part_revisions for each row execute function app.set_updated_at();
create trigger commodities_updated_at before update on public.commodities for each row execute function app.set_updated_at();
create trigger recovery_agreements_updated_at before update on public.recovery_agreements for each row execute function app.set_updated_at();

create trigger program_model_years_org_immutable before update on public.program_model_years for each row execute function app.prevent_organization_change();
create trigger part_revisions_org_immutable before update on public.part_revisions for each row execute function app.prevent_organization_change();
create trigger part_program_applications_org_immutable before update on public.part_program_applications for each row execute function app.prevent_organization_change();
create trigger commodities_org_immutable before update on public.commodities for each row execute function app.prevent_organization_change();
create trigger part_commodities_org_immutable before update on public.part_commodities for each row execute function app.prevent_organization_change();
create trigger recovery_agreements_org_immutable before update on public.recovery_agreements for each row execute function app.prevent_organization_change();
create trigger recovery_agreement_programs_org_immutable before update on public.recovery_agreement_programs for each row execute function app.prevent_organization_change();
create trigger recovery_agreement_model_years_org_immutable before update on public.recovery_agreement_model_years for each row execute function app.prevent_organization_change();
create trigger recovery_agreement_parts_org_immutable before update on public.recovery_agreement_parts for each row execute function app.prevent_organization_change();
create trigger recovery_agreement_dcrs_org_immutable before update on public.recovery_agreement_dcrs for each row execute function app.prevent_organization_change();
create trigger recovery_agreement_rate_periods_org_immutable before update on public.recovery_agreement_rate_periods for each row execute function app.prevent_organization_change();
create trigger connector_mapping_versions_org_immutable before update on public.connector_mapping_versions for each row execute function app.prevent_organization_change();

create trigger recovery_agreement_change before insert or update on public.recovery_agreements for each row execute function app.validate_recovery_agreement_change();
create trigger recovery_agreement_programs_protected before insert or update or delete on public.recovery_agreement_programs for each row execute function app.protect_recovery_agreement_link();
create trigger recovery_agreement_model_years_protected before insert or update or delete on public.recovery_agreement_model_years for each row execute function app.protect_recovery_agreement_link();
create trigger recovery_agreement_parts_protected before insert or update or delete on public.recovery_agreement_parts for each row execute function app.protect_recovery_agreement_link();
create trigger recovery_agreement_dcrs_protected before insert or update or delete on public.recovery_agreement_dcrs for each row execute function app.protect_recovery_agreement_link();
create trigger recovery_agreement_rate_periods_protected before insert or update or delete on public.recovery_agreement_rate_periods for each row execute function app.protect_recovery_agreement_link();
create trigger accrual_agreement_validate before insert or update of active, recovery_agreement_id on public.accruals for each row execute function app.validate_accrual_agreement();
create trigger calculation_agreement_validate before insert on public.calculation_runs for each row execute function app.validate_calculation_agreement();
create trigger connector_mapping_operations_validate before insert or update on public.connector_mapping_versions for each row execute function app.validate_connector_mapping_operations();

create trigger program_model_years_audit after insert or update or delete on public.program_model_years for each row execute function app.append_audit_event();
create trigger part_revisions_audit after insert or update or delete on public.part_revisions for each row execute function app.append_audit_event();
create trigger part_program_applications_audit after insert or update or delete on public.part_program_applications for each row execute function app.append_audit_event();
create trigger commodities_audit after insert or update or delete on public.commodities for each row execute function app.append_audit_event();
create trigger part_commodities_audit after insert or update or delete on public.part_commodities for each row execute function app.append_audit_event();
create trigger recovery_agreements_audit after insert or update or delete on public.recovery_agreements for each row execute function app.append_audit_event();
create trigger recovery_agreement_programs_audit after insert or update or delete on public.recovery_agreement_programs for each row execute function app.append_audit_event();
create trigger recovery_agreement_model_years_audit after insert or update or delete on public.recovery_agreement_model_years for each row execute function app.append_audit_event();
create trigger recovery_agreement_parts_audit after insert or update or delete on public.recovery_agreement_parts for each row execute function app.append_audit_event();
create trigger recovery_agreement_dcrs_audit after insert or update or delete on public.recovery_agreement_dcrs for each row execute function app.append_audit_event();
create trigger recovery_agreement_rate_periods_audit after insert or update or delete on public.recovery_agreement_rate_periods for each row execute function app.append_audit_event();
create trigger connector_mapping_versions_audit after insert or update or delete on public.connector_mapping_versions for each row execute function app.append_audit_event();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'program_model_years', 'part_revisions', 'part_program_applications', 'commodities',
    'part_commodities', 'recovery_agreements', 'recovery_agreement_programs',
    'recovery_agreement_model_years', 'recovery_agreement_parts', 'recovery_agreement_dcrs',
    'recovery_agreement_rate_periods',
    'connector_mapping_versions'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy program_model_years_read on public.program_model_years for select to authenticated using (
  app.can_access_scope(organization_id, null, null, program_id, null, 'read')
);
create policy program_model_years_write on public.program_model_years for all to authenticated using (
  app.can_access_scope(organization_id, null, null, program_id, null, 'write')
) with check (app.can_access_scope(organization_id, null, null, program_id, null, 'write'));

create policy part_revisions_read on public.part_revisions for select to authenticated using (
  app.can_access_scope(organization_id, null, null, null, part_id, 'read')
);
create policy part_revisions_write on public.part_revisions for all to authenticated using (
  app.can_access_scope(organization_id, null, null, null, part_id, 'write')
) with check (app.can_access_scope(organization_id, null, null, null, part_id, 'write'));

create policy part_program_applications_read on public.part_program_applications for select to authenticated using (
  app.can_access_scope(organization_id, null, null, program_id, part_id, 'read')
);
create policy part_program_applications_write on public.part_program_applications for all to authenticated using (
  app.can_access_scope(organization_id, null, null, program_id, part_id, 'write')
) with check (app.can_access_scope(organization_id, null, null, program_id, part_id, 'write'));

create policy commodities_read on public.commodities for select to authenticated using (app.is_org_member(organization_id));
create policy commodities_admin_all on public.commodities for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy part_commodities_read on public.part_commodities for select to authenticated using (
  app.can_access_scope(organization_id, null, null, null, part_id, 'read')
);
create policy part_commodities_admin_all on public.part_commodities for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy recovery_agreements_read on public.recovery_agreements for select to authenticated using (
  app.can_access_recovery_agreement(id, 'read')
);
create policy recovery_agreements_admin_all on public.recovery_agreements for all to authenticated using (
  app.is_org_admin(organization_id)
) with check (app.is_org_admin(organization_id));

create policy recovery_agreement_programs_read on public.recovery_agreement_programs for select to authenticated using (
  app.can_access_recovery_agreement(recovery_agreement_id, 'read')
);
create policy recovery_agreement_programs_admin_all on public.recovery_agreement_programs for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy recovery_agreement_model_years_read on public.recovery_agreement_model_years for select to authenticated using (
  app.can_access_recovery_agreement(recovery_agreement_id, 'read')
);
create policy recovery_agreement_model_years_admin_all on public.recovery_agreement_model_years for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy recovery_agreement_parts_read on public.recovery_agreement_parts for select to authenticated using (
  app.can_access_recovery_agreement(recovery_agreement_id, 'read')
);
create policy recovery_agreement_parts_admin_all on public.recovery_agreement_parts for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy recovery_agreement_dcrs_read on public.recovery_agreement_dcrs for select to authenticated using (
  app.can_access_recovery_agreement(recovery_agreement_id, 'read')
);
create policy recovery_agreement_dcrs_admin_all on public.recovery_agreement_dcrs for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy recovery_agreement_rate_periods_read on public.recovery_agreement_rate_periods for select to authenticated using (
  app.can_access_recovery_agreement(recovery_agreement_id, 'read')
);
create policy recovery_agreement_rate_periods_admin_all on public.recovery_agreement_rate_periods for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy connector_mapping_versions_control_read on public.connector_mapping_versions for select to authenticated using (
  app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy connector_mapping_versions_admin_all on public.connector_mapping_versions for all to authenticated using (
  app.is_org_admin(organization_id)
) with check (app.is_org_admin(organization_id));

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;

commit;
