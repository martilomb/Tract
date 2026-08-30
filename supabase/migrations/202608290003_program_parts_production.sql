begin;

-- P3 Programs/Parts production slice. This migration adds no competing master
-- tables: it governs the existing canonical records and exposes one bounded,
-- tenant-scoped projection for the production workspaces and exports.

create or replace function app.validate_master_data_proposal_candidates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare candidate_id uuid;
begin
  if cardinality(new.duplicate_candidate_ids) <> (
    select count(distinct candidate.value)
    from unnest(new.duplicate_candidate_ids) as candidate(value)
  ) then
    raise exception 'duplicate candidate references must be unique' using errcode = '23514';
  end if;

  foreach candidate_id in array new.duplicate_candidate_ids
  loop
    if not app.master_data_entity_exists(new.organization_id, new.entity_type, candidate_id) then
      raise exception 'duplicate candidates must reference same-tenant records of the declared type'
        using errcode = '23503';
    end if;
  end loop;
  return new;
end;
$$;

create trigger master_data_proposals_candidates_validate
before insert or update of organization_id, entity_type, duplicate_candidate_ids
on public.master_data_proposals
for each row execute function app.validate_master_data_proposal_candidates();

create or replace function app.prevent_master_data_alias_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'approved master-data aliases are immutable; add a corrected alias'
    using errcode = '42501';
end;
$$;

create trigger master_data_aliases_immutable
before update or delete on public.master_data_aliases
for each row execute function app.prevent_master_data_alias_mutation();

create unique index master_data_aliases_casefold_unique
  on public.master_data_aliases (
    organization_id,
    entity_type,
    lower(trim(alias)),
    coalesce(provider_key, '')
  );

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
    if new.status = 'approved' then
      if (to_jsonb(new) - array['updated_at'])
        is distinct from (to_jsonb(old) - array['updated_at']) then
        raise exception 'approved part revision terms are immutable' using errcode = '42501';
      end if;
    elsif new.status = 'superseded' then
      if new.effective_to is null or new.effective_to < old.effective_from then
        raise exception 'a superseded part revision requires a valid closing date' using errcode = '23514';
      end if;
      if (to_jsonb(new) - array['status', 'effective_to', 'updated_at'])
        is distinct from (to_jsonb(old) - array['status', 'effective_to', 'updated_at']) then
        raise exception 'approved part revision terms are immutable' using errcode = '42501';
      end if;
    else
      raise exception 'an approved part revision may only be superseded' using errcode = '23514';
    end if;
  elsif old.status = 'superseded' and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'superseded part revisions are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

alter table public.part_revisions
  add constraint effective_part_revisions_no_overlap
  exclude using gist (
    part_id with =,
    daterange(effective_from, coalesce(effective_to + 1, 'infinity'::date), '[)') with &&
  ) where (status in ('approved', 'superseded'));

drop policy programs_write on public.programs;
drop policy parts_write on public.parts;
drop policy program_model_years_write on public.program_model_years;
drop policy part_revisions_write on public.part_revisions;
drop policy part_program_applications_write on public.part_program_applications;

create policy programs_admin_all on public.programs for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy parts_admin_all on public.parts for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy program_model_years_admin_all on public.program_model_years for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy part_revisions_admin_all on public.part_revisions for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy part_program_applications_admin_all on public.part_program_applications for all to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create or replace function public.create_program_master_data(
  target_organization_id uuid,
  master_data jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
declare target_oem_id uuid := nullif(master_data ->> 'oem_id', '')::uuid;
declare target_model_id uuid := nullif(master_data ->> 'model_id', '')::uuid;
declare target_model_year smallint := (master_data ->> 'model_year')::smallint;
declare program_effective_from date := (master_data ->> 'effective_from')::date;
declare program_code text := nullif(trim(master_data ->> 'program_code'), '');
declare program_name text := nullif(trim(master_data ->> 'program_name'), '');
declare exception_reason text := nullif(trim(master_data ->> 'exception_reason'), '');
declare proposal_id uuid;
declare program_id uuid;
declare model_year_id uuid;
declare duplicate_candidates uuid[] := '{}'::uuid[];
begin
  if actor_id is null or not coalesce(app.is_org_admin(target_organization_id), false) then
    raise exception 'administrator access is required to create governed program master data'
      using errcode = '42501';
  end if;
  if program_code is null or program_name is null or exception_reason is null then
    raise exception 'program code, name, and exception reason are required' using errcode = '23514';
  end if;
  if target_model_year not between 1900 and 2200 then
    raise exception 'model year must be between 1900 and 2200' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.vehicle_models model
    where model.organization_id = target_organization_id
      and model.id = target_model_id
      and model.oem_id = target_oem_id
  ) then
    raise exception 'select a same-tenant OEM and vehicle model' using errcode = '23503';
  end if;

  select coalesce(array_agg(program.id order by program.id), '{}'::uuid[])
  into duplicate_candidates
  from public.programs program
  where program.organization_id = target_organization_id
    and (
      lower(trim(program.code)) = lower(program_code)
      or lower(trim(program.name)) = lower(program_name)
    );

  if cardinality(duplicate_candidates) > 0 or exists (
    select 1 from public.master_data_aliases alias
    where alias.organization_id = target_organization_id
      and alias.entity_type = 'program'
      and lower(trim(alias.alias)) in (lower(program_code), lower(program_name))
  ) then
    raise exception 'a matching program or alias already exists; select the existing record'
      using errcode = '23505';
  end if;

  insert into public.master_data_proposals (
    organization_id, entity_type, proposed_payload, duplicate_candidate_ids,
    exception_reason, provenance, proposed_by
  ) values (
    target_organization_id,
    'program',
    master_data,
    duplicate_candidates,
    exception_reason,
    jsonb_build_object(
      'source', 'administrator_master_data_workspace',
      'reference', nullif(trim(master_data ->> 'provenance_reference'), '')
    ),
    actor_id
  ) returning id into proposal_id;

  insert into public.programs (
    organization_id, oem_id, vehicle_model_id, code, name, start_date,
    creation_path, exception_proposal_id
  ) values (
    target_organization_id, target_oem_id, target_model_id, program_code,
    program_name, program_effective_from, 'admin_exception', proposal_id
  ) returning id into program_id;

  insert into public.program_model_years (
    organization_id, program_id, model_year, start_date
  ) values (
    target_organization_id, program_id, target_model_year, program_effective_from
  ) returning id into model_year_id;

  update public.master_data_proposals
  set status = 'approved', resulting_entity_id = program_id,
      reviewed_by = actor_id, reviewed_at = clock_timestamp(),
      review_reason = 'Approved by an organization administrator through governed master-data maintenance'
  where id = proposal_id;

  return jsonb_build_object(
    'program_id', program_id,
    'model_year_id', model_year_id,
    'proposal_id', proposal_id
  );
end;
$$;

create or replace function public.create_part_master_data(
  target_organization_id uuid,
  master_data jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
declare creation_mode text := coalesce(nullif(trim(master_data ->> 'mode'), ''), 'new_part');
declare target_program_id uuid := nullif(master_data ->> 'program_id', '')::uuid;
declare target_model_year_id uuid := nullif(master_data ->> 'model_year_id', '')::uuid;
declare target_part_id uuid := nullif(master_data ->> 'part_id', '')::uuid;
declare target_dcr_id uuid := nullif(master_data ->> 'source_dcr_id', '')::uuid;
declare part_number text := nullif(trim(master_data ->> 'part_number'), '');
declare part_description text := nullif(trim(master_data ->> 'part_description'), '');
declare revision_code text := nullif(trim(master_data ->> 'revision_code'), '');
declare revision_description text := nullif(trim(master_data ->> 'revision_description'), '');
declare new_effective_from date := (master_data ->> 'effective_from')::date;
declare exception_reason text := nullif(trim(master_data ->> 'exception_reason'), '');
declare proposal_id uuid;
declare revision_id uuid;
declare previous_revision_id uuid;
declare previous_effective_from date;
declare proposal_type text;
begin
  if actor_id is null or not coalesce(app.is_org_admin(target_organization_id), false) then
    raise exception 'administrator access is required to create governed part master data'
      using errcode = '42501';
  end if;
  if creation_mode not in ('new_part', 'new_revision') then
    raise exception 'part master-data mode must be new_part or new_revision' using errcode = '23514';
  end if;
  if revision_code is null or exception_reason is null then
    raise exception 'revision code and exception reason are required' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.program_model_years model_year
    where model_year.organization_id = target_organization_id
      and model_year.id = target_model_year_id
      and model_year.program_id = target_program_id
  ) then
    raise exception 'select a same-tenant program and model year' using errcode = '23503';
  end if;
  if target_dcr_id is not null and not exists (
    select 1 from public.dcrs dcr
    where dcr.organization_id = target_organization_id
      and dcr.id = target_dcr_id
      and dcr.status in ('approved', 'active')
  ) then
    raise exception 'a source DCR must be same-tenant and approved' using errcode = '23514';
  end if;

  if creation_mode = 'new_part' then
    if part_number is null then
      raise exception 'part number is required for a new part' using errcode = '23514';
    end if;
    if exists (
      select 1 from public.parts part
      where part.organization_id = target_organization_id
        and lower(trim(part.part_number)) = lower(part_number)
    ) or exists (
      select 1 from public.master_data_aliases alias
      where alias.organization_id = target_organization_id
        and alias.entity_type = 'part'
        and lower(trim(alias.alias)) = lower(part_number)
    ) then
      raise exception 'a matching part number or alias already exists; select the existing record'
        using errcode = '23505';
    end if;

    insert into public.master_data_proposals (
      organization_id, entity_type, proposed_payload, exception_reason, provenance, proposed_by
    ) values (
      target_organization_id,
      'part',
      master_data,
      exception_reason,
      jsonb_build_object(
        'source', 'administrator_master_data_workspace',
        'reference', nullif(trim(master_data ->> 'provenance_reference'), '')
      ),
      actor_id
    ) returning id into proposal_id;

    insert into public.parts (
      organization_id, program_id, part_number, description
    ) values (
      target_organization_id, target_program_id, part_number, part_description
    ) returning id into target_part_id;
    proposal_type := 'part';
  else
    select part.part_number, part.description
    into part_number, part_description
    from public.parts part
    where part.organization_id = target_organization_id
      and part.id = target_part_id
      and (
        part.program_id = target_program_id
        or exists (
          select 1 from public.part_program_applications application
          where application.organization_id = target_organization_id
            and application.part_id = part.id
            and application.program_id = target_program_id
        )
      )
    for update;
    if part_number is null then
      raise exception 'select a same-tenant part linked to the program' using errcode = '23503';
    end if;
    if exists (
      select 1 from public.part_revisions revision
      where revision.part_id = target_part_id
        and lower(trim(revision.revision_code)) = lower(revision_code)
    ) then
      raise exception 'a matching part revision already exists; select the existing revision'
        using errcode = '23505';
    end if;

    select revision.id, revision.effective_from
    into previous_revision_id, previous_effective_from
    from public.part_revisions revision
    where revision.organization_id = target_organization_id
      and revision.part_id = target_part_id
      and revision.status = 'approved'
    order by revision.effective_from desc, revision.id
    limit 1
    for update;

    if previous_revision_id is not null and new_effective_from <= previous_effective_from then
      raise exception 'a new revision must begin after the current approved revision'
        using errcode = '23514';
    end if;

    insert into public.master_data_proposals (
      organization_id, entity_type, proposed_payload, exception_reason, provenance, proposed_by
    ) values (
      target_organization_id,
      'part_revision',
      master_data,
      exception_reason,
      jsonb_build_object(
        'source', 'administrator_master_data_workspace',
        'reference', nullif(trim(master_data ->> 'provenance_reference'), '')
      ),
      actor_id
    ) returning id into proposal_id;
    proposal_type := 'part_revision';

    if previous_revision_id is not null then
      update public.part_revisions
      set status = 'superseded', effective_to = new_effective_from - 1
      where id = previous_revision_id;

      update public.part_program_applications
      set effective_to = new_effective_from - 1
      where organization_id = target_organization_id
        and part_id = target_part_id
        and part_revision_id = previous_revision_id
        and program_id = target_program_id
        and effective_to is null;
    end if;
  end if;

  insert into public.part_revisions (
    organization_id, part_id, revision_code, description, effective_from,
    source_dcr_id, status, approved_by, approved_at
  ) values (
    target_organization_id, target_part_id, revision_code, revision_description,
    new_effective_from, target_dcr_id, 'approved', actor_id, clock_timestamp()
  ) returning id into revision_id;

  insert into public.part_program_applications (
    organization_id, part_id, part_revision_id, program_id, program_model_year_id, effective_from
  ) values (
    target_organization_id, target_part_id, revision_id, target_program_id,
    target_model_year_id, new_effective_from
  );

  update public.master_data_proposals
  set status = 'approved', resulting_entity_id = case when proposal_type = 'part' then target_part_id else revision_id end,
      reviewed_by = actor_id, reviewed_at = clock_timestamp(),
      review_reason = 'Approved by an organization administrator through governed master-data maintenance'
  where id = proposal_id;

  return jsonb_build_object(
    'part_id', target_part_id,
    'revision_id', revision_id,
    'proposal_id', proposal_id,
    'superseded_revision_id', previous_revision_id
  );
end;
$$;

create or replace function public.create_master_data_alias(
  target_organization_id uuid,
  alias_data jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
declare target_entity_type text := nullif(trim(alias_data ->> 'entity_type'), '');
declare target_entity_id uuid := nullif(alias_data ->> 'entity_id', '')::uuid;
declare alias_value text := nullif(trim(alias_data ->> 'alias'), '');
declare reason text := nullif(trim(alias_data ->> 'reason'), '');
declare alias_id uuid;
begin
  if actor_id is null or not coalesce(app.is_org_admin(target_organization_id), false) then
    raise exception 'administrator access is required to approve master-data aliases'
      using errcode = '42501';
  end if;
  if target_entity_type not in ('program', 'part') or alias_value is null or reason is null then
    raise exception 'program or part alias, canonical record, and reason are required'
      using errcode = '23514';
  end if;
  if not (
    (target_entity_type = 'program' and exists (
      select 1 from public.programs program
      where program.organization_id = target_organization_id and program.id = target_entity_id
    ))
    or (target_entity_type = 'part' and exists (
      select 1 from public.parts part
      where part.organization_id = target_organization_id and part.id = target_entity_id
    ))
  ) then
    raise exception 'alias must reference a same-tenant canonical record' using errcode = '23503';
  end if;
  if (
    target_entity_type = 'program' and exists (
      select 1 from public.programs program
      where program.organization_id = target_organization_id
        and lower(trim(alias_value)) in (lower(trim(program.code)), lower(trim(program.name)))
    )
  ) or (
    target_entity_type = 'part' and exists (
      select 1 from public.parts part
      where part.organization_id = target_organization_id
        and lower(trim(alias_value)) = lower(trim(part.part_number))
    )
  ) or exists (
    select 1 from public.master_data_aliases alias
    where alias.organization_id = target_organization_id
      and alias.entity_type = target_entity_type
      and alias.provider_key is null
      and lower(trim(alias.alias)) = lower(alias_value)
  ) then
    raise exception 'this alias already identifies a canonical record' using errcode = '23505';
  end if;

  insert into public.master_data_aliases (
    organization_id, entity_type, entity_id, alias, provenance, approved_by, approved_at
  ) values (
    target_organization_id, target_entity_type, target_entity_id, alias_value,
    jsonb_build_object(
      'source', 'administrator_master_data_workspace',
      'reason', reason,
      'reference', nullif(trim(alias_data ->> 'provenance_reference'), '')
    ),
    actor_id, clock_timestamp()
  ) returning id into alias_id;

  return alias_id;
end;
$$;

create or replace function public.get_program_parts_workspace(
  target_organization_id uuid,
  target_view text default 'programs',
  search_text text default null,
  selected_program_id uuid default null,
  selected_part_id uuid default null,
  as_of_date date default current_date,
  sort_field text default 'name',
  sort_direction text default 'asc',
  page_limit integer default 50,
  page_offset integer default 0
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare bounded_limit integer := least(greatest(page_limit, 1), 20000);
declare bounded_offset integer := greatest(page_offset, 0);
declare normalized_search text := nullif(trim(search_text), '');
begin
  if not coalesce(app.is_org_member(target_organization_id), false) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;
  if target_view not in ('programs', 'parts') then
    raise exception 'workspace view must be programs or parts' using errcode = '23514';
  end if;
  if sort_direction not in ('asc', 'desc') then
    raise exception 'sort direction must be asc or desc' using errcode = '23514';
  end if;
  if (target_view = 'programs' and sort_field not in ('name', 'code', 'updated_at'))
    or (target_view = 'parts' and sort_field not in ('part_number', 'program', 'updated_at')) then
    raise exception 'unsupported master-data sort field' using errcode = '23514';
  end if;

  return jsonb_build_object(
    'organization_id', target_organization_id,
    'generated_at', clock_timestamp(),
    'as_of_date', as_of_date,
    'source', 'tenant_persistence',
    'projection_version', 'program-parts-v1',
    'view', target_view,
    'search', coalesce(normalized_search, ''),
    'sort_field', sort_field,
    'sort_direction', sort_direction,
    'limit', bounded_limit,
    'offset', bounded_offset,
    'program_count', (
      select count(*)
      from public.programs program
      left join public.oems oem on oem.id = program.oem_id
      left join public.vehicle_models model on model.id = program.vehicle_model_id
      where program.organization_id = target_organization_id
        and (normalized_search is null
          or program.code ilike '%' || normalized_search || '%'
          or program.name ilike '%' || normalized_search || '%'
          or oem.name ilike '%' || normalized_search || '%'
          or model.name ilike '%' || normalized_search || '%'
          or exists (
            select 1 from public.master_data_aliases alias
            where alias.organization_id = target_organization_id
              and alias.entity_type = 'program' and alias.entity_id = program.id
              and alias.alias ilike '%' || normalized_search || '%'
          ))
    ),
    'part_count', (
      select count(*)
      from public.parts part
      left join public.programs program on program.id = part.program_id
      where part.organization_id = target_organization_id
        and (selected_program_id is null or part.program_id = selected_program_id)
        and (normalized_search is null
          or part.part_number ilike '%' || normalized_search || '%'
          or coalesce(part.description, '') ilike '%' || normalized_search || '%'
          or program.code ilike '%' || normalized_search || '%'
          or program.name ilike '%' || normalized_search || '%'
          or exists (
            select 1 from public.master_data_aliases alias
            where alias.organization_id = target_organization_id
              and alias.entity_type = 'part' and alias.entity_id = part.id
              and alias.alias ilike '%' || normalized_search || '%'
          ))
    ),
    'oems', coalesce((
      select jsonb_agg(jsonb_build_object('id', oem.id, 'name', oem.name) order by oem.name)
      from public.oems oem where oem.organization_id = target_organization_id
    ), '[]'::jsonb),
    'models', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', model.id, 'oem_id', model.oem_id, 'make_id', model.vehicle_make_id,
        'code', model.code, 'name', model.name, 'effective_from', model.effective_from,
        'effective_to', model.effective_to, 'provider_key', model.provider_key,
        'provider_identifier', model.provider_identifier,
        'provenance_status', model.provenance_status
      ) order by model.name)
      from public.vehicle_models model where model.organization_id = target_organization_id
    ), '[]'::jsonb),
    'model_years', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', model_year.id, 'program_id', model_year.program_id,
        'model_year', model_year.model_year, 'start_date', model_year.start_date,
        'end_date', model_year.end_date, 'provider_key', model_year.provider_key,
        'provider_identifier', model_year.provider_identifier
      ) order by model_year.model_year)
      from public.program_model_years model_year
      where model_year.organization_id = target_organization_id
    ), '[]'::jsonb),
    'program_choices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', program.id, 'code', program.code, 'name', program.name
      ) order by program.name, program.code)
      from public.programs program
      where program.organization_id = target_organization_id
    ), '[]'::jsonb),
    'programs', coalesce((
      select jsonb_agg(item.payload order by item.position)
      from (
        select jsonb_build_object(
          'id', program.id, 'code', program.code, 'name', program.name,
          'oem_id', program.oem_id, 'oem_name', oem.name,
          'model_id', program.vehicle_model_id, 'model_code', model.code,
          'model_name', model.name, 'start_date', program.start_date,
          'end_date', program.end_date, 'creation_path', program.creation_path,
          'provider_key', program.provider_key, 'provider_identifier', program.provider_identifier,
          'updated_at', program.updated_at,
          'model_years', coalesce((
            select jsonb_agg(year.model_year order by year.model_year)
            from public.program_model_years year where year.program_id = program.id
          ), '[]'::jsonb),
          'part_count', (select count(*) from public.parts part where part.program_id = program.id),
          'active_agreement_count', (
            select count(*) from public.recovery_agreement_programs link
            join public.recovery_agreements agreement on agreement.id = link.recovery_agreement_id
            where link.program_id = program.id and agreement.status = 'active'
          ),
          'approved_recovery_by_currency', coalesce((
            select jsonb_agg(jsonb_build_object(
              'currency', position.settlement_currency,
              'approved_recoverable_cost', position.approved_recoverable_cost::text
            ) order by position.settlement_currency)
            from (
              select accrual.settlement_currency, sum(accrual.approved_recoverable_cost) approved_recoverable_cost
              from public.accruals accrual
              where accrual.program_id = program.id and accrual.active
              group by accrual.settlement_currency
            ) position
          ), '[]'::jsonb)
        ) payload,
        row_number() over (order by
          case when sort_direction = 'asc' then
            case when sort_field = 'code' then lower(program.code)
              when sort_field = 'updated_at' then program.updated_at::text
              else lower(program.name) end end asc,
          case when sort_direction = 'desc' then
            case when sort_field = 'code' then lower(program.code)
              when sort_field = 'updated_at' then program.updated_at::text
              else lower(program.name) end end desc,
          program.id
        ) position
        from public.programs program
        left join public.oems oem on oem.id = program.oem_id
        left join public.vehicle_models model on model.id = program.vehicle_model_id
        where program.organization_id = target_organization_id
          and (normalized_search is null
            or program.code ilike '%' || normalized_search || '%'
            or program.name ilike '%' || normalized_search || '%'
            or oem.name ilike '%' || normalized_search || '%'
            or model.name ilike '%' || normalized_search || '%'
            or exists (
              select 1 from public.master_data_aliases alias
              where alias.organization_id = target_organization_id
                and alias.entity_type = 'program' and alias.entity_id = program.id
                and alias.alias ilike '%' || normalized_search || '%'
            ))
        order by
          case when sort_direction = 'asc' then
            case when sort_field = 'code' then lower(program.code)
              when sort_field = 'updated_at' then program.updated_at::text
              else lower(program.name) end end asc,
          case when sort_direction = 'desc' then
            case when sort_field = 'code' then lower(program.code)
              when sort_field = 'updated_at' then program.updated_at::text
              else lower(program.name) end end desc,
          program.id
        limit bounded_limit offset bounded_offset
      ) item
    ), '[]'::jsonb),
    'parts', coalesce((
      select jsonb_agg(item.payload order by item.position)
      from (
        select jsonb_build_object(
          'id', part.id, 'part_number', part.part_number, 'description', part.description,
          'status', part.status, 'program_id', part.program_id,
          'program_code', program.code, 'program_name', program.name,
          'updated_at', part.updated_at,
          'current_revision', case when revision.id is null then null else jsonb_build_object(
            'id', revision.id, 'revision_code', revision.revision_code,
            'description', revision.description, 'effective_from', revision.effective_from,
            'effective_to', revision.effective_to, 'status', revision.status,
            'source_dcr_id', revision.source_dcr_id
          ) end,
          'active_agreement_count', (
            select count(*) from public.recovery_agreement_parts link
            join public.recovery_agreements agreement on agreement.id = link.recovery_agreement_id
            where link.part_id = part.id and agreement.status = 'active'
          ),
          'approved_recovery_by_currency', coalesce((
            select jsonb_agg(jsonb_build_object(
              'currency', position.settlement_currency,
              'approved_recoverable_cost', position.approved_recoverable_cost::text
            ) order by position.settlement_currency)
            from (
              select accrual.settlement_currency, sum(accrual.approved_recoverable_cost) approved_recoverable_cost
              from public.accruals accrual
              where accrual.part_id = part.id and accrual.active
              group by accrual.settlement_currency
            ) position
          ), '[]'::jsonb)
        ) payload,
        row_number() over (order by
          case when sort_direction = 'asc' then
            case when sort_field = 'program' then lower(coalesce(program.name, ''))
              when sort_field = 'updated_at' then part.updated_at::text
              else lower(part.part_number) end end asc,
          case when sort_direction = 'desc' then
            case when sort_field = 'program' then lower(coalesce(program.name, ''))
              when sort_field = 'updated_at' then part.updated_at::text
              else lower(part.part_number) end end desc,
          part.id
        ) position
        from public.parts part
        left join public.programs program on program.id = part.program_id
        left join lateral (
          select candidate.* from public.part_revisions candidate
          where candidate.part_id = part.id
            and candidate.status in ('approved', 'superseded')
            and candidate.effective_from <= as_of_date
            and (candidate.effective_to is null or candidate.effective_to >= as_of_date)
          order by candidate.effective_from desc, candidate.id limit 1
        ) revision on true
        where part.organization_id = target_organization_id
          and (selected_program_id is null or part.program_id = selected_program_id)
          and (normalized_search is null
            or part.part_number ilike '%' || normalized_search || '%'
            or coalesce(part.description, '') ilike '%' || normalized_search || '%'
            or program.code ilike '%' || normalized_search || '%'
            or program.name ilike '%' || normalized_search || '%'
            or exists (
              select 1 from public.master_data_aliases alias
              where alias.organization_id = target_organization_id
                and alias.entity_type = 'part' and alias.entity_id = part.id
                and alias.alias ilike '%' || normalized_search || '%'
            ))
        order by
          case when sort_direction = 'asc' then
            case when sort_field = 'program' then lower(coalesce(program.name, ''))
              when sort_field = 'updated_at' then part.updated_at::text
              else lower(part.part_number) end end asc,
          case when sort_direction = 'desc' then
            case when sort_field = 'program' then lower(coalesce(program.name, ''))
              when sort_field = 'updated_at' then part.updated_at::text
              else lower(part.part_number) end end desc,
          part.id
        limit bounded_limit offset bounded_offset
      ) item
    ), '[]'::jsonb),
    'selected_program', (
      select jsonb_build_object(
        'id', program.id, 'code', program.code, 'name', program.name,
        'oem_name', oem.name, 'model_code', model.code, 'model_name', model.name,
        'start_date', program.start_date, 'end_date', program.end_date,
        'creation_path', program.creation_path, 'provider_key', program.provider_key,
        'provider_identifier', program.provider_identifier,
        'approved_recovery_by_currency', coalesce((
          select jsonb_agg(jsonb_build_object(
            'currency', position.settlement_currency,
            'approved_recoverable_cost', position.approved_recoverable_cost::text
          ) order by position.settlement_currency)
          from (
            select accrual.settlement_currency, sum(accrual.approved_recoverable_cost) approved_recoverable_cost
            from public.accruals accrual
            where accrual.program_id = program.id and accrual.active
            group by accrual.settlement_currency
          ) position
        ), '[]'::jsonb),
        'aliases', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', alias.id, 'alias', alias.alias, 'provider_key', alias.provider_key,
            'provider_identifier', alias.provider_identifier, 'effective_from', alias.effective_from,
            'effective_to', alias.effective_to, 'provenance', alias.provenance,
            'approved_at', alias.approved_at
          ) order by alias.created_at)
          from public.master_data_aliases alias
          where alias.organization_id = target_organization_id
            and alias.entity_type = 'program' and alias.entity_id = program.id
        ), '[]'::jsonb),
        'proposals', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', proposal.id, 'status', proposal.status, 'exception_reason', proposal.exception_reason,
            'provenance', proposal.provenance, 'created_at', proposal.created_at,
            'reviewed_at', proposal.reviewed_at
          ) order by proposal.created_at desc)
          from public.master_data_proposals proposal
          where proposal.organization_id = target_organization_id
            and proposal.entity_type = 'program' and proposal.resulting_entity_id = program.id
        ), '[]'::jsonb),
        'model_years', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', year.id, 'model_year', year.model_year,
            'start_date', year.start_date, 'end_date', year.end_date
          ) order by year.model_year)
          from public.program_model_years year where year.program_id = program.id
        ), '[]'::jsonb),
        'parts', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', part.id, 'part_number', part.part_number,
            'description', part.description, 'status', part.status
          ) order by part.part_number)
          from (select visible.* from public.parts visible where visible.program_id = program.id order by visible.part_number limit 250) part
        ), '[]'::jsonb),
        'part_count', (select count(*) from public.parts part where part.program_id = program.id),
        'agreements', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', agreement.id, 'agreement_number', agreement.agreement_number,
            'title', agreement.title, 'status', agreement.status,
            'recoverable_cost', agreement.recoverable_cost::text,
            'settlement_currency', agreement.settlement_currency,
            'evidence_reference', agreement.evidence_reference,
            'evidence_summary', agreement.evidence_summary,
            'evidence_reviewed_at', agreement.evidence_reviewed_at,
            'approved_at', agreement.approved_at
          ) order by agreement.updated_at desc)
          from public.recovery_agreement_programs link
          join public.recovery_agreements agreement on agreement.id = link.recovery_agreement_id
          where link.program_id = program.id
        ), '[]'::jsonb),
        'audit', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', audit.id, 'action', audit.action, 'actor_id', audit.actor_id,
            'occurred_at', audit.occurred_at
          ) order by audit.occurred_at desc)
          from public.audit_events audit
          where audit.organization_id = target_organization_id
            and audit.entity_type in ('programs', 'program_model_years')
            and (audit.entity_id = program.id or audit.after_state ->> 'program_id' = program.id::text)
        ), '[]'::jsonb)
      )
      from public.programs program
      left join public.oems oem on oem.id = program.oem_id
      left join public.vehicle_models model on model.id = program.vehicle_model_id
      where program.organization_id = target_organization_id and program.id = selected_program_id
    ),
    'selected_part', (
      select jsonb_build_object(
        'id', part.id, 'part_number', part.part_number, 'description', part.description,
        'status', part.status, 'program_id', part.program_id,
        'program_code', program.code, 'program_name', program.name,
        'approved_recovery_by_currency', coalesce((
          select jsonb_agg(jsonb_build_object(
            'currency', position.settlement_currency,
            'approved_recoverable_cost', position.approved_recoverable_cost::text
          ) order by position.settlement_currency)
          from (
            select accrual.settlement_currency, sum(accrual.approved_recoverable_cost) approved_recoverable_cost
            from public.accruals accrual
            where accrual.part_id = part.id and accrual.active
            group by accrual.settlement_currency
          ) position
        ), '[]'::jsonb),
        'aliases', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', alias.id, 'alias', alias.alias, 'provider_key', alias.provider_key,
            'provider_identifier', alias.provider_identifier, 'effective_from', alias.effective_from,
            'effective_to', alias.effective_to, 'provenance', alias.provenance,
            'approved_at', alias.approved_at
          ) order by alias.created_at)
          from public.master_data_aliases alias
          where alias.organization_id = target_organization_id
            and alias.entity_type = 'part' and alias.entity_id = part.id
        ), '[]'::jsonb),
        'proposals', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', proposal.id, 'entity_type', proposal.entity_type,
            'status', proposal.status, 'exception_reason', proposal.exception_reason,
            'provenance', proposal.provenance, 'created_at', proposal.created_at,
            'reviewed_at', proposal.reviewed_at
          ) order by proposal.created_at desc)
          from public.master_data_proposals proposal
          where proposal.organization_id = target_organization_id
            and ((proposal.entity_type = 'part' and proposal.resulting_entity_id = part.id)
              or (proposal.entity_type = 'part_revision' and exists (
                select 1 from public.part_revisions revision
                where revision.part_id = part.id and revision.id = proposal.resulting_entity_id
              )))
        ), '[]'::jsonb),
        'revisions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', revision.id, 'revision_code', revision.revision_code,
            'description', revision.description, 'effective_from', revision.effective_from,
            'effective_to', revision.effective_to, 'status', revision.status,
            'source_dcr_id', revision.source_dcr_id,
            'approved_at', revision.approved_at
          ) order by revision.effective_from desc, revision.revision_code)
          from public.part_revisions revision where revision.part_id = part.id
        ), '[]'::jsonb),
        'applications', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', application.id, 'program_id', application.program_id,
            'model_year_id', application.program_model_year_id,
            'part_revision_id', application.part_revision_id,
            'effective_from', application.effective_from,
            'effective_to', application.effective_to
          ) order by application.effective_from desc)
          from public.part_program_applications application where application.part_id = part.id
        ), '[]'::jsonb),
        'agreements', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', agreement.id, 'agreement_number', agreement.agreement_number,
            'title', agreement.title, 'status', agreement.status,
            'recoverable_cost', agreement.recoverable_cost::text,
            'settlement_currency', agreement.settlement_currency,
            'part_revision_id', link.part_revision_id,
            'evidence_reference', agreement.evidence_reference,
            'evidence_summary', agreement.evidence_summary,
            'evidence_reviewed_at', agreement.evidence_reviewed_at,
            'approved_at', agreement.approved_at,
            'rate_periods', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', rate.id, 'effective_from', rate.effective_from,
                'effective_to', rate.effective_to, 'per_unit_rate', rate.per_unit_rate::text,
                'currency', rate.currency
              ) order by rate.effective_from)
              from public.recovery_agreement_rate_periods rate
              where rate.recovery_agreement_id = agreement.id
            ), '[]'::jsonb)
          ) order by agreement.updated_at desc)
          from public.recovery_agreement_parts link
          join public.recovery_agreements agreement on agreement.id = link.recovery_agreement_id
          where link.part_id = part.id
        ), '[]'::jsonb),
        'audit', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', audit.id, 'action', audit.action, 'entity_type', audit.entity_type,
            'actor_id', audit.actor_id, 'occurred_at', audit.occurred_at
          ) order by audit.occurred_at desc)
          from public.audit_events audit
          where audit.organization_id = target_organization_id
            and audit.entity_type in ('parts', 'part_revisions', 'part_program_applications')
            and (audit.entity_id = part.id or audit.after_state ->> 'part_id' = part.id::text
              or audit.before_state ->> 'part_id' = part.id::text)
        ), '[]'::jsonb)
      )
      from public.parts part
      left join public.programs program on program.id = part.program_id
      where part.organization_id = target_organization_id and part.id = selected_part_id
    )
  );
end;
$$;

revoke all on function public.create_program_master_data(uuid, jsonb) from public, anon;
revoke all on function public.create_part_master_data(uuid, jsonb) from public, anon;
revoke all on function public.create_master_data_alias(uuid, jsonb) from public, anon;
revoke all on function public.get_program_parts_workspace(uuid, text, text, uuid, uuid, date, text, text, integer, integer) from public, anon;

grant execute on function public.create_program_master_data(uuid, jsonb) to authenticated, service_role;
grant execute on function public.create_part_master_data(uuid, jsonb) to authenticated, service_role;
grant execute on function public.create_master_data_alias(uuid, jsonb) to authenticated, service_role;
grant execute on function public.get_program_parts_workspace(uuid, text, text, uuid, uuid, date, text, text, integer, integer) to authenticated, service_role;

commit;
