begin;

create or replace function app.protect_part_revision_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('approved', 'superseded') then
      raise exception 'approved and superseded part revisions are immutable' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.status = 'approved' then
    if new.status not in ('approved', 'superseded') then
      raise exception 'an approved part revision may only be superseded' using errcode = '23514';
    end if;
    if (to_jsonb(new) - array['status', 'updated_at'])
      is distinct from (to_jsonb(old) - array['status', 'updated_at']) then
      raise exception 'approved part revision terms are immutable' using errcode = '42501';
    end if;
  elsif old.status = 'superseded' and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'superseded part revisions are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger part_revisions_approval_protected
before update or delete on public.part_revisions
for each row execute function app.protect_part_revision_approval();

create or replace function app.validate_connector_mapping_operations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare mapping jsonb;
declare operation text;
declare mapping_key text;
begin
  for mapping in select value from jsonb_array_elements(new.field_mappings)
  loop
    if jsonb_typeof(mapping) <> 'object'
      or nullif(trim(mapping ->> 'source'), '') is null
      or nullif(trim(mapping ->> 'destination'), '') is null then
      raise exception 'each field mapping requires source and destination fields' using errcode = '23514';
    end if;
    if mapping ? 'expression' or mapping ? 'script' or mapping ? 'code' then
      raise exception 'executable mapping content is not permitted' using errcode = '42501';
    end if;
    for mapping_key in select jsonb_object_keys(mapping)
    loop
      if mapping_key not in ('source', 'destination', 'required', 'operation', 'constantValue') then
        raise exception 'field mapping contains an unsupported key: %', mapping_key using errcode = '23514';
      end if;
    end loop;
    if mapping ? 'required' and jsonb_typeof(mapping -> 'required') <> 'boolean' then
      raise exception 'field mapping required flag must be boolean' using errcode = '23514';
    end if;
    operation := coalesce(mapping ->> 'operation', 'copy');
    if operation not in ('copy', 'trim', 'uppercase', 'lowercase', 'date_iso', 'decimal', 'integer', 'constant') then
      raise exception 'mapping operation is not an approved declarative operation' using errcode = '23514';
    end if;
    if operation = 'constant' and not mapping ? 'constantValue' then
      raise exception 'constant mappings require a constantValue' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function app.validate_connector_endpoint_allowlist()
returns trigger
language plpgsql
set search_path = ''
as $$
declare endpoint_host text;
declare allowed_host text;
begin
  foreach allowed_host in array new.allowed_hosts
  loop
    if allowed_host !~ '^[A-Za-z0-9.-]+$' then
      raise exception 'connector allowlist entries must be host names without a scheme, path, or port' using errcode = '23514';
    end if;
  end loop;
  if new.endpoint_url is null then return new; end if;
  endpoint_host := lower(substring(new.endpoint_url from '^https://([^/:?#]+)'));
  if endpoint_host is null or not exists (
    select 1 from unnest(new.allowed_hosts) host where lower(host) = endpoint_host
  ) then
    raise exception 'connector endpoint host must be present in the exact host allowlist' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger connector_endpoint_allowlist_validate
before insert or update of endpoint_url, allowed_hosts on public.connectors
for each row execute function app.validate_connector_endpoint_allowlist();

create trigger calculation_agreement_update_validate
before update of organization_id, accrual_id, as_of_date on public.calculation_runs
for each row execute function app.validate_calculation_agreement();

commit;
