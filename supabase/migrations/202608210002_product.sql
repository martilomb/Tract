begin;

create extension if not exists btree_gist with schema extensions;

create type public.dcr_status as enum (
  'draft', 'submitted', 'under_review', 'approved', 'active', 'closed', 'rejected', 'cancelled'
);
create type public.job_status as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');
create type public.import_status as enum ('uploaded', 'staged', 'validated', 'committed', 'failed', 'cancelled');

create table public.dcrs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dcr_number text not null,
  title text not null,
  status public.dcr_status not null default 'draft',
  initiator_user_id uuid not null references auth.users(id) on delete restrict,
  program_id uuid references public.programs(id) on delete restrict,
  part_id uuid references public.parts(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  technical_team_id uuid references public.technical_teams(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  salesperson_contact_id uuid references public.contacts(id) on delete set null,
  engineer_contact_id uuid references public.contacts(id) on delete set null,
  workflow_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  module_component text,
  comments_summary text,
  transition_reason text,
  approved_recoverable_cost numeric(38, 18) not null default 0,
  approved_adjustments numeric(38, 18) not null default 0,
  settlement_currency text not null check (settlement_currency ~ '^[A-Z]{3}$'),
  ed_and_t_amount numeric(38, 18),
  piece_price_impact numeric(38, 18),
  stated_volume numeric(38, 6),
  submitted_at timestamptz,
  approved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dcr_number),
  unique (organization_id, id)
);

alter table public.dcrs
  add constraint dcr_program_same_tenant foreign key (organization_id, program_id) references public.programs(organization_id, id),
  add constraint dcr_part_same_tenant foreign key (organization_id, part_id) references public.parts(organization_id, id),
  add constraint dcr_department_same_tenant foreign key (organization_id, department_id) references public.departments(organization_id, id),
  add constraint dcr_team_same_tenant foreign key (organization_id, technical_team_id) references public.technical_teams(organization_id, id),
  add constraint dcr_supplier_same_tenant foreign key (organization_id, supplier_id) references public.suppliers(organization_id, id);

alter table public.dcrs
  add constraint dcr_salesperson_same_tenant foreign key (organization_id, salesperson_contact_id) references public.contacts(organization_id, id),
  add constraint dcr_engineer_same_tenant foreign key (organization_id, engineer_contact_id) references public.contacts(organization_id, id),
  add constraint dcr_workflow_same_tenant foreign key (organization_id, workflow_configuration_id) references public.configuration_versions(organization_id, id);

create table public.dcr_parts (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dcr_id uuid not null references public.dcrs(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (dcr_id, part_id),
  foreign key (organization_id, dcr_id) references public.dcrs(organization_id, id) on delete cascade,
  foreign key (organization_id, part_id) references public.parts(organization_id, id) on delete restrict
);

create table public.dcr_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dcr_id uuid not null references public.dcrs(id) on delete cascade,
  assigned_user_id uuid not null references auth.users(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  role text not null check (role in ('owner', 'reviewer', 'approver', 'observer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (organization_id, dcr_id) references public.dcrs(organization_id, id) on delete cascade
);

create unique index one_active_dcr_assignment
  on public.dcr_assignments (dcr_id, assigned_user_id, role)
  where active;

create table public.dcr_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dcr_id uuid not null references public.dcrs(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  foreign key (organization_id, dcr_id) references public.dcrs(organization_id, id) on delete cascade
);

create table public.dcr_status_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  dcr_id uuid not null references public.dcrs(id) on delete restrict,
  from_status public.dcr_status not null,
  to_status public.dcr_status not null,
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  workflow_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  occurred_at timestamptz not null default clock_timestamp(),
  foreign key (organization_id, dcr_id) references public.dcrs(organization_id, id) on delete restrict
);

create table public.accruals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dcr_id uuid not null references public.dcrs(id) on delete restrict,
  part_id uuid not null references public.parts(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  technical_team_id uuid references public.technical_teams(id) on delete restrict,
  recovery_policy_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  approved_recoverable_cost numeric(38, 18) not null,
  approved_adjustments numeric(38, 18) not null default 0,
  settlement_currency text not null check (settlement_currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, dcr_id) references public.dcrs(organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, recovery_policy_configuration_id) references public.configuration_versions(organization_id, id)
);

create table public.recovery_rate_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  accrual_id uuid not null references public.accruals(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  per_unit_rate numeric(38, 18) not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  approved boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  foreign key (organization_id, accrual_id) references public.accruals(organization_id, id),
  exclude using gist (
    accrual_id with =,
    daterange(effective_from, coalesce(effective_to + 1, 'infinity'::date), '[)') with &&
  ) where (approved)
);

create table public.volume_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  part_id uuid not null references public.parts(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  technical_team_id uuid references public.technical_teams(id) on delete restrict,
  occurred_on date not null,
  effective_period daterange,
  event_type text not null check (event_type in ('actual', 'forecast', 'correction', 'return')),
  signed_eligible_units numeric(38, 6) not null,
  source text not null,
  external_event_id text not null,
  import_run_id uuid,
  provenance jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  unique (organization_id, source, external_event_id),
  unique (organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id)
);

create index volume_events_part_date_idx on public.volume_events (organization_id, part_id, occurred_on);

create table public.calculation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  accrual_id uuid not null references public.accruals(id) on delete restrict,
  policy_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  as_of_date date not null,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  status public.job_status not null default 'pending',
  initiated_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_detail text,
  created_at timestamptz not null default now(),
  unique (organization_id, accrual_id, input_hash),
  unique (organization_id, id),
  foreign key (organization_id, accrual_id) references public.accruals(organization_id, id)
);

create table public.calculation_lines (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  calculation_run_id uuid not null references public.calculation_runs(id) on delete restrict,
  volume_event_id uuid not null references public.volume_events(id) on delete restrict,
  recovery_rate_period_id uuid not null references public.recovery_rate_periods(id) on delete restrict,
  signed_eligible_units numeric(38, 6) not null,
  per_unit_rate numeric(38, 18) not null,
  recovered_amount numeric(38, 18) not null,
  foreign key (organization_id, calculation_run_id) references public.calculation_runs(organization_id, id),
  foreign key (organization_id, volume_event_id) references public.volume_events(organization_id, id),
  unique (calculation_run_id, volume_event_id)
);

create table public.calculation_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  calculation_run_id uuid not null references public.calculation_runs(id) on delete restrict,
  recovered_amount numeric(38, 18) not null,
  remaining_amount numeric(38, 18) not null,
  under_recovery numeric(38, 18) not null check (under_recovery >= 0),
  over_recovery numeric(38, 18) not null check (over_recovery >= 0),
  settlement_currency text not null check (settlement_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  unique (calculation_run_id),
  foreign key (organization_id, calculation_run_id) references public.calculation_runs(organization_id, id)
);

create table public.forecast_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null check (version > 0),
  as_of_date date not null,
  source text not null,
  status text not null check (status in ('draft', 'approved', 'superseded')),
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, source, version),
  unique (organization_id, id)
);

create table public.forecast_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  forecast_version_id uuid not null references public.forecast_versions(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  part_id uuid not null references public.parts(id) on delete restrict,
  period daterange not null,
  units numeric(38, 6) not null,
  source_reference text,
  unique (forecast_version_id, part_id, period),
  foreign key (organization_id, forecast_version_id) references public.forecast_versions(organization_id, id),
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, part_id) references public.parts(organization_id, id)
);

create table public.connectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  adapter_type text not null check (adapter_type in ('csv', 'excel', 'rest', 'sap')),
  enabled boolean not null default false,
  mapping_configuration_id uuid references public.configuration_versions(id) on delete restrict,
  credential_reference text,
  schedule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, id),
  foreign key (organization_id, mapping_configuration_id) references public.configuration_versions(organization_id, id)
);

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid not null references public.connectors(id) on delete restrict,
  status public.import_status not null default 'uploaded',
  file_name text,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  row_count integer not null default 0 check (row_count >= 0),
  valid_row_count integer not null default 0 check (valid_row_count >= 0),
  committed_row_count integer not null default 0 check (committed_row_count >= 0),
  initiated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, connector_id, content_sha256),
  unique (organization_id, id),
  foreign key (organization_id, connector_id) references public.connectors(organization_id, id)
);

alter table public.volume_events
  add constraint volume_event_import_same_tenant foreign key (organization_id, import_run_id)
    references public.import_runs(organization_id, id) on delete restrict;

create table public.import_staging_rows (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  source_data jsonb not null,
  normalized_data jsonb,
  valid boolean not null default false,
  errors jsonb not null default '[]'::jsonb,
  unique (import_run_id, row_number),
  foreign key (organization_id, import_run_id) references public.import_runs(organization_id, id) on delete cascade
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dcr_id uuid references public.dcrs(id) on delete restrict,
  document_type text not null,
  title text not null,
  status text not null default 'active' check (status in ('active', 'superseded', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, dcr_id) references public.dcrs(organization_id, id)
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null check (version > 0),
  storage_path text not null check (storage_path like organization_id::text || '/%'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  unique (document_id, version),
  unique (organization_id, id),
  foreign key (organization_id, document_id) references public.documents(organization_id, id)
);

create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_version_id uuid not null references public.document_versions(id) on delete restrict,
  mapping_configuration_id uuid not null references public.configuration_versions(id) on delete restrict,
  provider text not null,
  provider_version text not null,
  status public.job_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  result jsonb,
  error_code text,
  error_detail text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, document_version_id) references public.document_versions(organization_id, id),
  foreign key (organization_id, mapping_configuration_id) references public.configuration_versions(organization_id, id)
);

create table public.extraction_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  extraction_job_id uuid not null references public.extraction_jobs(id) on delete restrict,
  reviewer_id uuid references auth.users(id) on delete set null,
  approved_fields jsonb not null check (jsonb_typeof(approved_fields) = 'object'),
  corrections jsonb not null default '{}'::jsonb check (jsonb_typeof(corrections) = 'object'),
  reviewed_at timestamptz not null default now(),
  unique (extraction_job_id),
  foreign key (organization_id, extraction_job_id) references public.extraction_jobs(organization_id, id)
);

create table public.report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  report_type text not null,
  parameters jsonb not null default '{}'::jsonb,
  manifest jsonb not null,
  output_storage_path text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entity_type text not null check (entity_type in ('dcr', 'report', 'extraction', 'recovery_rate')),
  entity_id uuid not null,
  stage text not null,
  decision text not null check (decision in ('pending', 'approved', 'rejected', 'cancelled')),
  approver_user_id uuid references auth.users(id) on delete set null,
  reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function app.prevent_source_event_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'source and derived accounting events are append-only' using errcode = '42501';
end;
$$;

create or replace function app.validate_dcr_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_exists boolean;
  required_permission public.permission_name;
begin
  if new.status = old.status then return new; end if;
  select exists (
    select 1
    from public.configuration_versions c,
      jsonb_array_elements(c.payload -> 'transitions') transition
    where c.id = new.workflow_configuration_id
      and c.organization_id = new.organization_id
      and c.kind = 'dcr_workflow'::public.configuration_kind
      and transition ->> 'from' = old.status::text
      and transition ->> 'to' = new.status::text
  ) into transition_exists;
  if not transition_exists then
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
  return new;
end;
$$;

create or replace function app.record_dcr_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> old.status then
    insert into public.dcr_status_history (
      organization_id, dcr_id, from_status, to_status, actor_id, reason, workflow_configuration_id
    ) values (
      new.organization_id, new.id, old.status, new.status, auth.uid(), new.transition_reason, new.workflow_configuration_id
    );
    insert into public.notification_outbox (organization_id, event_type, payload)
    values (new.organization_id, 'dcr.status.changed', jsonb_build_object('dcr_id', new.id, 'from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create or replace function app.notify_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_outbox (organization_id, recipient_user_id, event_type, payload)
  values (new.organization_id, new.assigned_user_id, 'dcr.assigned', jsonb_build_object('dcr_id', new.dcr_id, 'role', new.role));
  return new;
end;
$$;

create trigger dcrs_updated_at before update on public.dcrs for each row execute function app.set_updated_at();
create trigger accruals_updated_at before update on public.accruals for each row execute function app.set_updated_at();
create trigger connectors_updated_at before update on public.connectors for each row execute function app.set_updated_at();
create trigger dcrs_org_immutable before update on public.dcrs for each row execute function app.prevent_organization_change();
create trigger accruals_org_immutable before update on public.accruals for each row execute function app.prevent_organization_change();
create trigger connectors_org_immutable before update on public.connectors for each row execute function app.prevent_organization_change();
create trigger dcr_transition_validate before update of status on public.dcrs for each row execute function app.validate_dcr_transition();
create trigger dcr_transition_record after update of status on public.dcrs for each row execute function app.record_dcr_transition();
create trigger dcr_assignment_notify after insert on public.dcr_assignments for each row execute function app.notify_assignment();

create trigger volume_events_immutable before update or delete on public.volume_events for each row execute function app.prevent_source_event_mutation();
create trigger calculation_runs_immutable before update or delete on public.calculation_runs for each row when (old.status = 'completed') execute function app.prevent_source_event_mutation();
create trigger calculation_lines_immutable before update or delete on public.calculation_lines for each row execute function app.prevent_source_event_mutation();
create trigger calculation_results_immutable before update or delete on public.calculation_results for each row execute function app.prevent_source_event_mutation();
create trigger dcr_history_immutable before update or delete on public.dcr_status_history for each row execute function app.prevent_source_event_mutation();
create trigger extraction_reviews_immutable before update or delete on public.extraction_reviews for each row execute function app.prevent_source_event_mutation();

create trigger dcrs_audit after insert or update or delete on public.dcrs for each row execute function app.append_audit_event();
create trigger accruals_audit after insert or update or delete on public.accruals for each row execute function app.append_audit_event();
create trigger rate_periods_audit after insert or update or delete on public.recovery_rate_periods for each row execute function app.append_audit_event();
create trigger import_runs_audit after insert or update or delete on public.import_runs for each row execute function app.append_audit_event();
create trigger documents_audit after insert or update or delete on public.documents for each row execute function app.append_audit_event();
create trigger approvals_audit after insert or update or delete on public.approvals for each row execute function app.append_audit_event();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'dcrs','dcr_parts','dcr_assignments','dcr_comments','dcr_status_history','accruals','recovery_rate_periods',
    'volume_events','calculation_runs','calculation_lines','calculation_results','forecast_versions','forecast_lines',
    'connectors','import_runs','import_staging_rows','documents','document_versions','extraction_jobs','extraction_reviews',
    'report_runs','approvals'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy dcrs_read on public.dcrs for select to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'read'));
create policy dcrs_write on public.dcrs for all to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'write')) with check (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'write'));
create policy accruals_read on public.accruals for select to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'read'));
create policy accruals_write on public.accruals for all to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'write')) with check (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'write'));
create policy volume_events_read on public.volume_events for select to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'read'));
create policy volume_events_insert on public.volume_events for insert to authenticated with check (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, part_id, 'write'));

create policy dcr_parts_read on public.dcr_parts for select to authenticated using (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'read'))
);
create policy dcr_parts_write on public.dcr_parts for all to authenticated using (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'write'))
) with check (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'write'))
);

create policy dcr_assignments_read on public.dcr_assignments for select to authenticated using (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'read'))
);
create policy dcr_assignments_write on public.dcr_assignments for all to authenticated using (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'write'))
) with check (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'write'))
);

create policy dcr_comments_read on public.dcr_comments for select to authenticated using (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'read'))
);
create policy dcr_comments_write on public.dcr_comments for all to authenticated using (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'write'))
) with check (
  author_user_id = auth.uid() and exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'write'))
);

create policy dcr_status_history_read on public.dcr_status_history for select to authenticated using (
  exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'read'))
);

create policy recovery_rate_periods_read on public.recovery_rate_periods for select to authenticated using (
  exists (select 1 from public.accruals a where a.id = accrual_id and app.can_access_scope(a.organization_id, a.department_id, a.technical_team_id, a.program_id, a.part_id, 'read'))
);
create policy recovery_rate_periods_approve on public.recovery_rate_periods for all to authenticated using (
  exists (select 1 from public.accruals a where a.id = accrual_id and app.can_access_scope(a.organization_id, a.department_id, a.technical_team_id, a.program_id, a.part_id, 'approve'))
) with check (
  exists (select 1 from public.accruals a where a.id = accrual_id and app.can_access_scope(a.organization_id, a.department_id, a.technical_team_id, a.program_id, a.part_id, 'approve'))
);

create policy calculation_runs_read on public.calculation_runs for select to authenticated using (
  exists (select 1 from public.accruals a where a.id = accrual_id and app.can_access_scope(a.organization_id, a.department_id, a.technical_team_id, a.program_id, a.part_id, 'read'))
);
create policy calculation_lines_read on public.calculation_lines for select to authenticated using (
  exists (select 1 from public.calculation_runs r join public.accruals a on a.id = r.accrual_id where r.id = calculation_run_id and app.can_access_scope(a.organization_id, a.department_id, a.technical_team_id, a.program_id, a.part_id, 'read'))
);
create policy calculation_results_read on public.calculation_results for select to authenticated using (
  exists (select 1 from public.calculation_runs r join public.accruals a on a.id = r.accrual_id where r.id = calculation_run_id and app.can_access_scope(a.organization_id, a.department_id, a.technical_team_id, a.program_id, a.part_id, 'read'))
);

create policy forecast_versions_read on public.forecast_versions for select to authenticated using (app.is_org_member(organization_id));
create policy forecast_versions_admin_all on public.forecast_versions for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy forecast_lines_read on public.forecast_lines for select to authenticated using (app.can_access_scope(organization_id, null, null, program_id, part_id, 'read'));
create policy forecast_lines_admin_all on public.forecast_lines for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy connectors_admin_all on public.connectors for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy import_runs_admin_all on public.import_runs for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy import_staging_rows_admin_all on public.import_staging_rows for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy documents_read on public.documents for select to authenticated using (
  (dcr_id is not null and exists (select 1 from public.dcrs d where d.id = dcr_id and app.can_access_scope(d.organization_id, d.department_id, d.technical_team_id, d.program_id, d.part_id, 'read')))
  or app.membership_role(organization_id) in ('administrator', 'full_view')
);
create policy documents_admin_all on public.documents for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy document_versions_read on public.document_versions for select to authenticated using (exists (select 1 from public.documents d where d.id = document_id));
create policy document_versions_admin_all on public.document_versions for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy extraction_jobs_read on public.extraction_jobs for select to authenticated using (exists (select 1 from public.document_versions v where v.id = document_version_id));
create policy extraction_jobs_admin_all on public.extraction_jobs for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy extraction_reviews_read on public.extraction_reviews for select to authenticated using (exists (select 1 from public.extraction_jobs j where j.id = extraction_job_id));
create policy extraction_reviews_admin_insert on public.extraction_reviews for insert to authenticated with check (app.is_org_admin(organization_id));

create policy report_runs_control_read on public.report_runs for select to authenticated using (app.membership_role(organization_id) in ('administrator', 'full_view'));
create policy report_runs_admin_all on public.report_runs for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy approvals_control_read on public.approvals for select to authenticated using (app.membership_role(organization_id) in ('administrator', 'full_view'));
create policy approvals_admin_all on public.approvals for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

insert into storage.buckets (id, name, public, file_size_limit)
values ('tract-private-documents', 'tract-private-documents', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- There is deliberately no authenticated storage.objects read policy. Document access uses
-- short-lived signed URLs produced by an authorized server operation after a tenant/scope check.

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

commit;
