begin;

create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired');
create type public.entitlement_status as enum ('active', 'superseded', 'revoked');

create table public.plan_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 200),
  seat_limit integer not null check (seat_limit > 0),
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plan_catalog(id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  provider_key text,
  provider_customer_ref text,
  provider_subscription_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  check (current_period_end is null or current_period_start is null or current_period_end > current_period_start)
);

create table public.seat_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null,
  version integer not null check (version > 0),
  status public.entitlement_status not null default 'active',
  included_seats integer not null check (included_seats > 0),
  effective_from timestamptz not null,
  effective_until timestamptz,
  source text not null default 'plan' check (length(trim(source)) between 1 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, version),
  unique (organization_id, id),
  foreign key (organization_id, subscription_id)
    references public.organization_subscriptions(organization_id, id) on delete cascade,
  check (effective_until is null or effective_until > effective_from)
);

create unique index one_active_seat_entitlement_per_org
  on public.seat_entitlements (organization_id)
  where status = 'active';

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role public.organization_role not null default 'member',
  token_digest bytea not null check (octet_length(token_digest) = 32),
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  check (expires_at > created_at),
  check ((status = 'accepted') = (accepted_at is not null and accepted_by is not null)),
  check ((status = 'revoked') = (revoked_at is not null and revoked_by is not null))
);

create unique index one_pending_invitation_per_email
  on public.organization_invitations (organization_id, email)
  where status = 'pending';
create unique index one_invitation_token_digest
  on public.organization_invitations (token_digest);

alter table public.permission_grants
  add constraint permission_grants_member_same_tenant
  foreign key (organization_id, user_id)
  references public.memberships(organization_id, user_id)
  on delete cascade;

create index organization_invitations_org_status_idx
  on public.organization_invitations (organization_id, status, expires_at);
create index seat_entitlements_org_effective_idx
  on public.seat_entitlements (organization_id, effective_from desc);

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
    when not app.is_org_member(target_organization_id) then false
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

create or replace function app.active_seat_limit(target_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select e.included_seats
  from public.seat_entitlements e
  where e.organization_id = target_organization_id
    and e.status = 'active'::public.entitlement_status
    and e.effective_from <= now()
    and (e.effective_until is null or e.effective_until > now())
  order by e.version desc
  limit 1;
$$;

create or replace function app.validate_invitation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending'::public.invitation_status then
      raise exception 'new invitations must begin as pending' using errcode = '23514';
    end if;
    if coalesce(auth.role(), '') <> 'service_role' and new.invited_by is distinct from auth.uid() then
      raise exception 'invitation actor must match the authenticated user' using errcode = '42501';
    end if;
  elsif new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable' using errcode = '42501';
  elsif old.status <> 'pending'::public.invitation_status then
    raise exception 'completed invitations are immutable' using errcode = '42501';
  elsif new.status = 'accepted'::public.invitation_status then
    if coalesce(auth.role(), '') <> 'service_role'
      and (new.accepted_by is distinct from auth.uid() or new.target_user_id is distinct from auth.uid()) then
      raise exception 'invitation acceptance actor must match the authenticated user' using errcode = '42501';
    end if;
  elsif new.status = 'revoked'::public.invitation_status then
    if coalesce(auth.role(), '') <> 'service_role' and new.revoked_by is distinct from auth.uid() then
      raise exception 'invitation revocation actor must match the authenticated user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function app.enforce_invitation_seat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seat_limit integer;
  used_seats integer;
begin
  if new.status = 'pending'::public.invitation_status then
    perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 0));
    seat_limit := app.active_seat_limit(new.organization_id);
    if seat_limit is null then
      raise exception 'pending invitation requires an effective seat entitlement' using errcode = '42501';
    end if;
    select count(*)::integer into used_seats
    from public.memberships m
    where m.organization_id = new.organization_id and m.active;
    used_seats := used_seats + (
      select count(*)::integer
      from public.organization_invitations i
      where i.organization_id = new.organization_id
        and i.status = 'pending'::public.invitation_status
        and i.expires_at > now()
        and (tg_op <> 'UPDATE' or i.id <> old.id)
    );
    if used_seats >= seat_limit then
      raise exception 'organization seat entitlement exceeded' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function app.enforce_membership_invariants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seat_limit integer;
  used_seats integer;
  active_admins integer;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'membership user_id is immutable' using errcode = '42501';
  end if;

  if (tg_op = 'INSERT' and new.active)
    or (tg_op = 'UPDATE' and new.active and not old.active) then
    perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 0));
    seat_limit := app.active_seat_limit(new.organization_id);
    if seat_limit is null then
      raise exception 'active membership requires an effective seat entitlement' using errcode = '42501';
    end if;
    select count(*)::integer into used_seats
    from public.memberships m
    where m.organization_id = new.organization_id
      and m.active
      and (tg_op <> 'UPDATE' or m.id <> old.id);
    if used_seats >= seat_limit then
      raise exception 'organization seat entitlement exceeded' using errcode = '42501';
    end if;
  end if;

  if (tg_op = 'DELETE' and old.active and old.role = 'administrator'::public.organization_role)
    or (tg_op = 'UPDATE' and old.active and old.role = 'administrator'::public.organization_role
      and (not new.active or new.role <> 'administrator'::public.organization_role)) then
    select count(*)::integer into active_admins
    from public.memberships m
    where m.organization_id = old.organization_id
      and m.active
      and m.role = 'administrator'::public.organization_role
      and m.id <> old.id;
    if active_admins = 0 then
      raise exception 'organization must retain an active administrator' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function app.validate_seat_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_limit integer;
begin
  if not exists (
    select 1 from public.organization_subscriptions s
    where s.organization_id = new.organization_id and s.id = new.subscription_id
  ) then
    raise exception 'seat entitlement subscription must belong to organization' using errcode = '23503';
  end if;
  select p.seat_limit into plan_limit
  from public.organization_subscriptions s
  join public.plan_catalog p on p.id = s.plan_id
  where s.organization_id = new.organization_id and s.id = new.subscription_id;
  if new.included_seats > plan_limit then
    raise exception 'seat entitlement exceeds plan limit' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function app.accept_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_record public.organization_invitations;
  authenticated_email text;
begin
  if auth.uid() is null or nullif(trim(invitation_token), '') is null then
    raise exception 'authenticated invitation token is required' using errcode = '42501';
  end if;

  select lower(trim(u.email)) into authenticated_email
  from auth.users u
  where u.id = auth.uid();

  select i.* into invitation_record
  from public.organization_invitations i
  where i.token_digest = extensions.digest(invitation_token, 'sha256')
    and i.status = 'pending'::public.invitation_status
  for update;

  if not found or invitation_record.expires_at <= now() then
    raise exception 'invitation is invalid or expired' using errcode = '42501';
  end if;
  if authenticated_email is null or authenticated_email <> invitation_record.email then
    raise exception 'invitation email does not match authenticated user' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.memberships m
    where m.organization_id = invitation_record.organization_id and m.user_id = auth.uid()
  ) then
    raise exception 'user already has an organization membership' using errcode = '23505';
  end if;

  update public.organization_invitations
  set status = 'accepted'::public.invitation_status,
      target_user_id = auth.uid(),
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = invitation_record.id;

  insert into public.memberships (organization_id, user_id, role)
  values (invitation_record.organization_id, auth.uid(), invitation_record.role);

  insert into public.notification_outbox (organization_id, recipient_user_id, event_type, payload)
  values (
    invitation_record.organization_id,
    auth.uid(),
    'organization.invitation.accepted',
    jsonb_build_object('invitation_id', invitation_record.id)
  );
  return invitation_record.organization_id;
end;
$$;

create or replace function public.accept_organization_invitation(invitation_token text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select app.accept_invitation(invitation_token);
$$;

create or replace function app.append_organization_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
    coalesce(new.id, old.id),
    auth.uid(),
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-request-id',
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger plan_catalog_updated_at before update on public.plan_catalog
for each row execute function app.set_updated_at();
create trigger organization_subscriptions_updated_at before update on public.organization_subscriptions
for each row execute function app.set_updated_at();
create trigger organization_invitations_updated_at before update on public.organization_invitations
for each row execute function app.set_updated_at();

create trigger organization_invitations_validate before insert or update
on public.organization_invitations for each row execute function app.validate_invitation_change();
create trigger organization_invitations_seat before insert or update of status
on public.organization_invitations for each row execute function app.enforce_invitation_seat();
create trigger memberships_invariants before insert or update or delete
on public.memberships for each row execute function app.enforce_membership_invariants();
create trigger seat_entitlements_validate before insert or update
on public.seat_entitlements for each row execute function app.validate_seat_entitlement();

create trigger organizations_application_spine_audit after insert or update or delete on public.organizations
for each row execute function app.append_organization_audit_event();
create trigger memberships_application_spine_audit after insert or update or delete on public.memberships
for each row execute function app.append_audit_event();
create trigger organization_invitations_audit after insert or update or delete on public.organization_invitations
for each row execute function app.append_audit_event();
create trigger organization_subscriptions_audit after insert or update or delete on public.organization_subscriptions
for each row execute function app.append_audit_event();
create trigger seat_entitlements_audit after insert or update or delete on public.seat_entitlements
for each row execute function app.append_audit_event();

alter table public.plan_catalog enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.seat_entitlements enable row level security;
alter table public.organization_invitations enable row level security;

create policy plan_catalog_read on public.plan_catalog for select to authenticated
using (active);

create policy organization_subscriptions_control_read on public.organization_subscriptions for select to authenticated
using (app.membership_role(organization_id) in ('administrator', 'full_view'));

create policy seat_entitlements_control_read on public.seat_entitlements for select to authenticated
using (app.membership_role(organization_id) in ('administrator', 'full_view'));

create policy organization_invitations_admin_read on public.organization_invitations for select to authenticated
using (app.is_org_admin(organization_id));
create policy organization_invitations_admin_insert on public.organization_invitations for insert to authenticated
with check (
  app.is_org_admin(organization_id)
  and status = 'pending'::public.invitation_status
);
create policy organization_invitations_admin_close on public.organization_invitations for update to authenticated
using (
  app.is_org_admin(organization_id)
  and status = 'pending'::public.invitation_status
)
with check (
  app.is_org_admin(organization_id)
  and status in ('expired', 'revoked')
);

grant select on public.plan_catalog to authenticated;
grant select on
  public.organization_subscriptions,
  public.seat_entitlements
to authenticated;
grant select, insert, update on public.organization_invitations to authenticated;
grant all on
  public.plan_catalog,
  public.organization_subscriptions,
  public.seat_entitlements,
  public.organization_invitations
to service_role;

revoke execute on function app.active_seat_limit(uuid) from public, anon, authenticated;
revoke execute on function app.validate_invitation_change() from public, anon, authenticated;
revoke execute on function app.enforce_invitation_seat() from public, anon, authenticated;
revoke execute on function app.enforce_membership_invariants() from public, anon, authenticated;
revoke execute on function app.validate_seat_entitlement() from public, anon, authenticated;
revoke execute on function app.accept_invitation(text) from public, anon;
grant execute on function app.accept_invitation(text) to authenticated, service_role;
revoke execute on function public.accept_organization_invitation(text) from public, anon;
grant execute on function public.accept_organization_invitation(text) to authenticated, service_role;

commit;
