begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists app;

create type public.organization_role as enum ('administrator', 'full_view', 'member');
create type public.grant_type as enum ('department', 'technical_team', 'program', 'part');
create type public.permission_name as enum ('read', 'write', 'approve');
create type public.configuration_kind as enum (
  'recovery_policy',
  'dcr_workflow',
  'notification_rules',
  'document_mapping',
  'import_mapping',
  'retention_policy'
);
create type public.configuration_status as enum ('draft', 'active', 'superseded');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  default_currency text not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.organization_role not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, id)
);

create table public.technical_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, id)
);

create table public.oems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  external_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique nulls not distinct (organization_id, external_code),
  unique (organization_id, id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  external_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique nulls not distinct (organization_id, external_code),
  unique (organization_id, id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  oem_id uuid references public.oems(id) on delete cascade,
  display_name text not null,
  email text,
  invited_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(supplier_id, oem_id) <= 1),
  unique (organization_id, id)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  oem_id uuid references public.oems(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  technical_team_id uuid references public.technical_teams(id) on delete set null,
  code text not null,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid references public.programs(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  technical_team_id uuid references public.technical_teams(id) on delete set null,
  part_number text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, part_number),
  unique (organization_id, id)
);

alter table public.contacts
  add constraint contacts_supplier_same_tenant foreign key (organization_id, supplier_id)
    references public.suppliers (organization_id, id) on delete cascade,
  add constraint contacts_oem_same_tenant foreign key (organization_id, oem_id)
    references public.oems (organization_id, id) on delete cascade;

alter table public.programs
  add constraint programs_oem_same_tenant foreign key (organization_id, oem_id)
    references public.oems (organization_id, id) on delete restrict,
  add constraint programs_department_same_tenant foreign key (organization_id, department_id)
    references public.departments (organization_id, id) on delete restrict,
  add constraint programs_team_same_tenant foreign key (organization_id, technical_team_id)
    references public.technical_teams (organization_id, id) on delete restrict;

alter table public.parts
  add constraint parts_program_same_tenant foreign key (organization_id, program_id)
    references public.programs (organization_id, id) on delete restrict,
  add constraint parts_department_same_tenant foreign key (organization_id, department_id)
    references public.departments (organization_id, id) on delete restrict,
  add constraint parts_team_same_tenant foreign key (organization_id, technical_team_id)
    references public.technical_teams (organization_id, id) on delete restrict;

create table public.permission_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_type public.grant_type not null,
  resource_id uuid not null,
  permissions public.permission_name[] not null default array['read']::public.permission_name[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, grant_type, resource_id),
  check (cardinality(permissions) > 0)
);

create table public.configuration_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind public.configuration_kind not null,
  version integer not null check (version > 0),
  effective_from timestamptz not null,
  status public.configuration_status not null default 'draft',
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  supersedes_id uuid references public.configuration_versions(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, kind, version),
  unique (organization_id, id),
  foreign key (organization_id, supersedes_id)
    references public.configuration_versions (organization_id, id) on delete restrict
);

create unique index one_active_configuration_per_kind
  on public.configuration_versions (organization_id, kind)
  where status = 'active';

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid references auth.users(id) on delete set null,
  request_id text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index audit_events_org_time_idx on public.audit_events (organization_id, occurred_at desc);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create or replace function app.prevent_organization_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.validate_permission_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resource_exists boolean;
begin
  resource_exists := case new.grant_type
    when 'department'::public.grant_type then exists (
      select 1 from public.departments r where r.id = new.resource_id and r.organization_id = new.organization_id
    )
    when 'technical_team'::public.grant_type then exists (
      select 1 from public.technical_teams r where r.id = new.resource_id and r.organization_id = new.organization_id
    )
    when 'program'::public.grant_type then exists (
      select 1 from public.programs r where r.id = new.resource_id and r.organization_id = new.organization_id
    )
    when 'part'::public.grant_type then exists (
      select 1 from public.parts r where r.id = new.resource_id and r.organization_id = new.organization_id
    )
  end;
  if not resource_exists then
    raise exception 'permission grant resource does not belong to organization' using errcode = '23503';
  end if;
  return new;
end;
$$;

create or replace function app.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.active
  );
$$;

create or replace function app.membership_role(target_organization_id uuid)
returns public.organization_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  where m.organization_id = target_organization_id
    and m.user_id = auth.uid()
    and m.active
  limit 1;
$$;

create or replace function app.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.membership_role(target_organization_id) = 'administrator'::public.organization_role;
$$;

create or replace function app.can_access_scope(
  target_organization_id uuid,
  target_department_id uuid,
  target_technical_team_id uuid,
  target_program_id uuid,
  target_part_id uuid,
  required_permission public.permission_name default 'read'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when app.membership_role(target_organization_id) = 'administrator'::public.organization_role then true
    when app.membership_role(target_organization_id) = 'full_view'::public.organization_role then required_permission = 'read'::public.permission_name
    else exists (
      select 1
      from public.permission_grants g
      where g.organization_id = target_organization_id
        and g.user_id = auth.uid()
        and required_permission = any(g.permissions)
        and (
          (g.grant_type = 'department'::public.grant_type and g.resource_id = target_department_id)
          or (g.grant_type = 'technical_team'::public.grant_type and g.resource_id = target_technical_team_id)
          or (g.grant_type = 'program'::public.grant_type and g.resource_id = target_program_id)
          or (g.grant_type = 'part'::public.grant_type and g.resource_id = target_part_id)
        )
    )
  end;
$$;

create or replace function app.append_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_id uuid;
  row_id uuid;
begin
  tenant_id := coalesce(new.organization_id, old.organization_id);
  row_id := coalesce(new.id, old.id);
  insert into public.audit_events (
    organization_id,
    actor_id,
    request_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) values (
    tenant_id,
    auth.uid(),
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-request-id',
    tg_op,
    tg_table_name,
    row_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create or replace function app.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit events are append-only' using errcode = '42501';
end;
$$;

create trigger audit_events_immutable
before update or delete on public.audit_events
for each row execute function app.prevent_audit_mutation();

create trigger organizations_updated_at before update on public.organizations for each row execute function app.set_updated_at();
create trigger memberships_updated_at before update on public.memberships for each row execute function app.set_updated_at();
create trigger departments_updated_at before update on public.departments for each row execute function app.set_updated_at();
create trigger technical_teams_updated_at before update on public.technical_teams for each row execute function app.set_updated_at();
create trigger oems_updated_at before update on public.oems for each row execute function app.set_updated_at();
create trigger suppliers_updated_at before update on public.suppliers for each row execute function app.set_updated_at();
create trigger contacts_updated_at before update on public.contacts for each row execute function app.set_updated_at();
create trigger programs_updated_at before update on public.programs for each row execute function app.set_updated_at();
create trigger parts_updated_at before update on public.parts for each row execute function app.set_updated_at();

create trigger memberships_org_immutable before update on public.memberships for each row execute function app.prevent_organization_change();
create trigger departments_org_immutable before update on public.departments for each row execute function app.prevent_organization_change();
create trigger technical_teams_org_immutable before update on public.technical_teams for each row execute function app.prevent_organization_change();
create trigger oems_org_immutable before update on public.oems for each row execute function app.prevent_organization_change();
create trigger suppliers_org_immutable before update on public.suppliers for each row execute function app.prevent_organization_change();
create trigger contacts_org_immutable before update on public.contacts for each row execute function app.prevent_organization_change();
create trigger programs_org_immutable before update on public.programs for each row execute function app.prevent_organization_change();
create trigger parts_org_immutable before update on public.parts for each row execute function app.prevent_organization_change();
create trigger permission_grants_org_immutable before update on public.permission_grants for each row execute function app.prevent_organization_change();
create trigger permission_grants_validate before insert or update on public.permission_grants for each row execute function app.validate_permission_grant();
create trigger configuration_versions_org_immutable before update on public.configuration_versions for each row execute function app.prevent_organization_change();

create trigger programs_audit after insert or update or delete on public.programs for each row execute function app.append_audit_event();
create trigger parts_audit after insert or update or delete on public.parts for each row execute function app.append_audit_event();
create trigger permission_grants_audit after insert or update or delete on public.permission_grants for each row execute function app.append_audit_event();
create trigger configuration_versions_audit after insert or update or delete on public.configuration_versions for each row execute function app.append_audit_event();

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.departments enable row level security;
alter table public.technical_teams enable row level security;
alter table public.oems enable row level security;
alter table public.suppliers enable row level security;
alter table public.contacts enable row level security;
alter table public.programs enable row level security;
alter table public.parts enable row level security;
alter table public.permission_grants enable row level security;
alter table public.configuration_versions enable row level security;
alter table public.audit_events enable row level security;
alter table public.notification_outbox enable row level security;

create policy organizations_read on public.organizations for select to authenticated using (app.is_org_member(id));
create policy organizations_admin_update on public.organizations for update to authenticated using (app.is_org_admin(id)) with check (app.is_org_admin(id));

create policy memberships_read on public.memberships for select to authenticated using (user_id = auth.uid() or app.is_org_admin(organization_id));
create policy memberships_admin_insert on public.memberships for insert to authenticated with check (app.is_org_admin(organization_id));
create policy memberships_admin_update on public.memberships for update to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy memberships_admin_delete on public.memberships for delete to authenticated using (app.is_org_admin(organization_id));

create policy departments_read on public.departments for select to authenticated using (app.can_access_scope(organization_id, id, null, null, null, 'read'));
create policy departments_admin_all on public.departments for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy technical_teams_read on public.technical_teams for select to authenticated using (app.can_access_scope(organization_id, null, id, null, null, 'read'));
create policy technical_teams_admin_all on public.technical_teams for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy oems_read on public.oems for select to authenticated using (app.is_org_member(organization_id));
create policy oems_admin_all on public.oems for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy suppliers_read on public.suppliers for select to authenticated using (app.is_org_member(organization_id));
create policy suppliers_admin_all on public.suppliers for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy contacts_read on public.contacts for select to authenticated using (app.is_org_member(organization_id));
create policy contacts_admin_all on public.contacts for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy programs_read on public.programs for select to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, id, null, 'read'));
create policy programs_write on public.programs for all to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, id, null, 'write')) with check (app.can_access_scope(organization_id, department_id, technical_team_id, id, null, 'write'));
create policy parts_read on public.parts for select to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, id, 'read'));
create policy parts_write on public.parts for all to authenticated using (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, id, 'write')) with check (app.can_access_scope(organization_id, department_id, technical_team_id, program_id, id, 'write'));

create policy permission_grants_admin_all on public.permission_grants for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy permission_grants_self_read on public.permission_grants for select to authenticated using (user_id = auth.uid());
create policy configuration_versions_read on public.configuration_versions for select to authenticated using (app.is_org_member(organization_id));
create policy configuration_versions_admin_all on public.configuration_versions for all to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy audit_events_read on public.audit_events for select to authenticated using (app.membership_role(organization_id) in ('administrator', 'full_view'));
create policy notification_outbox_self_read on public.notification_outbox for select to authenticated using (recipient_user_id = auth.uid() and app.is_org_member(organization_id));

grant usage on schema app to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

commit;
