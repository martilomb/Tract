begin;

-- Correct PL/pgSQL input naming in the applied P3 part action. The original
-- transaction and authorization contract are unchanged.
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
declare input_part_number text := nullif(trim(master_data ->> 'part_number'), '');
declare input_part_description text := nullif(trim(master_data ->> 'part_description'), '');
declare input_revision_code text := nullif(trim(master_data ->> 'revision_code'), '');
declare input_revision_description text := nullif(trim(master_data ->> 'revision_description'), '');
declare input_effective_from date := (master_data ->> 'effective_from')::date;
declare input_exception_reason text := nullif(trim(master_data ->> 'exception_reason'), '');
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
  if input_revision_code is null or input_exception_reason is null then
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
    if input_part_number is null then
      raise exception 'part number is required for a new part' using errcode = '23514';
    end if;
    if exists (
      select 1 from public.parts part
      where part.organization_id = target_organization_id
        and lower(trim(part.part_number)) = lower(input_part_number)
    ) or exists (
      select 1 from public.master_data_aliases alias
      where alias.organization_id = target_organization_id
        and alias.entity_type = 'part'
        and lower(trim(alias.alias)) = lower(input_part_number)
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
      input_exception_reason,
      jsonb_build_object(
        'source', 'administrator_master_data_workspace',
        'reference', nullif(trim(master_data ->> 'provenance_reference'), '')
      ),
      actor_id
    ) returning id into proposal_id;

    insert into public.parts (
      organization_id, program_id, part_number, description
    ) values (
      target_organization_id, target_program_id, input_part_number, input_part_description
    ) returning id into target_part_id;
    proposal_type := 'part';
  else
    select part.part_number, part.description
    into input_part_number, input_part_description
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
    if input_part_number is null then
      raise exception 'select a same-tenant part linked to the program' using errcode = '23503';
    end if;
    if exists (
      select 1 from public.part_revisions revision
      where revision.part_id = target_part_id
        and lower(trim(revision.revision_code)) = lower(input_revision_code)
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

    if previous_revision_id is not null and input_effective_from <= previous_effective_from then
      raise exception 'a new revision must begin after the current approved revision'
        using errcode = '23514';
    end if;

    insert into public.master_data_proposals (
      organization_id, entity_type, proposed_payload, exception_reason, provenance, proposed_by
    ) values (
      target_organization_id,
      'part_revision',
      master_data,
      input_exception_reason,
      jsonb_build_object(
        'source', 'administrator_master_data_workspace',
        'reference', nullif(trim(master_data ->> 'provenance_reference'), '')
      ),
      actor_id
    ) returning id into proposal_id;
    proposal_type := 'part_revision';

    if previous_revision_id is not null then
      update public.part_revisions
      set status = 'superseded', effective_to = input_effective_from - 1
      where id = previous_revision_id;

      update public.part_program_applications
      set effective_to = input_effective_from - 1
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
    target_organization_id, target_part_id, input_revision_code, input_revision_description,
    input_effective_from, target_dcr_id, 'approved', actor_id, clock_timestamp()
  ) returning id into revision_id;

  insert into public.part_program_applications (
    organization_id, part_id, part_revision_id, program_id, program_model_year_id, effective_from
  ) values (
    target_organization_id, target_part_id, revision_id, target_program_id,
    target_model_year_id, input_effective_from
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

revoke all on function public.create_part_master_data(uuid, jsonb) from public, anon;
grant execute on function public.create_part_master_data(uuid, jsonb) to authenticated, service_role;

commit;
