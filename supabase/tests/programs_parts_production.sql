begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

select has_function('public', 'get_program_parts_workspace', array['uuid','text','text','uuid','uuid','date','text','text','integer','integer'], 'bounded production projection exists');
select has_function('public', 'create_program_master_data', array['uuid','jsonb'], 'governed program action exists');
select has_function('public', 'create_part_master_data', array['uuid','jsonb'], 'governed part action exists');
select has_function('public', 'create_master_data_alias', array['uuid','jsonb'], 'governed alias action exists');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.part_revisions'::regclass
      and conname = 'effective_part_revisions_no_overlap'
  ),
  'effective revisions cannot overlap'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'programs'
      and policyname = 'programs_admin_insert'
  ),
  'program mutation is administrator-only'
);

create temporary table p3_context as
select
  administrator.organization_id,
  administrator.user_id administrator_id,
  (
    select member.user_id from public.memberships member
    where member.organization_id = administrator.organization_id
      and member.active and member.role = 'member'
    order by member.created_at limit 1
  ) scoped_member_id,
  (
    select other.user_id from public.memberships other
    where other.organization_id <> administrator.organization_id
      and other.active and other.role = 'administrator'
    order by other.created_at limit 1
  ) other_administrator_id
from public.memberships administrator
where administrator.active and administrator.role = 'administrator'
  and exists (
    select 1 from public.memberships member
    where member.organization_id = administrator.organization_id
      and member.active and member.role = 'member'
  )
  and exists (
    select 1 from public.memberships other
    where other.organization_id <> administrator.organization_id
      and other.active and other.role = 'administrator'
  )
order by administrator.created_at
limit 1;

select set_config('p3.organization_id', (select organization_id::text from p3_context), true);
select set_config('p3.administrator_id', (select administrator_id::text from p3_context), true);
select set_config('p3.scoped_member_id', (select scoped_member_id::text from p3_context), true);
select set_config('p3.other_administrator_id', (select other_administrator_id::text from p3_context), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('p3.administrator_id'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('p3.administrator_id'), 'role', 'authenticated')::text, true);

create temporary table p3_base as
select public.create_recovery_master_data(
  current_setting('p3.organization_id')::uuid,
  jsonb_build_object(
    'oem_name', 'P3 Controlled OEM', 'oem_code', 'P3-OEM',
    'make_name', 'P3 Controlled Make', 'model_code', 'P3-MODEL',
    'model_name', 'P3 Controlled Model', 'program_code', 'P3-BASE',
    'program_name', 'P3 Base Program', 'model_year', 2028,
    'part_number', 'P3-BASE-PART', 'part_description', 'P3 base part',
    'revision_code', 'A', 'revision_description', 'P3 base revision',
    'effective_from', (current_date - 30)::text,
    'exception_reason', 'Rollback-only P3 controlled base hierarchy'
  )
) as data;

select ok((select data ? 'model_id' from p3_base), 'existing governed seam creates a controlled hierarchy');

create temporary table p3_program as
select public.create_program_master_data(
  current_setting('p3.organization_id')::uuid,
  jsonb_build_object(
    'oem_id', (select data ->> 'oem_id' from p3_base),
    'model_id', (select data ->> 'model_id' from p3_base),
    'program_code', 'P3-PROGRAM', 'program_name', 'P3 Production Program',
    'model_year', 2029, 'effective_from', (current_date - 10)::text,
    'exception_reason', 'Administrator-reviewed confidential program exception',
    'provenance_reference', 'rollback-p3-register'
  )
) as data;

select ok((select data ?& array['program_id','model_year_id','proposal_id'] from p3_program), 'program creation returns stable canonical identifiers');

create temporary table p3_part as
select public.create_part_master_data(
  current_setting('p3.organization_id')::uuid,
  jsonb_build_object(
    'mode', 'new_part',
    'program_id', (select data ->> 'program_id' from p3_program),
    'model_year_id', (select data ->> 'model_year_id' from p3_program),
    'part_number', 'P3-PART', 'part_description', 'P3 governed part',
    'revision_code', 'A', 'revision_description', 'Initial governed revision',
    'effective_from', (current_date - 5)::text,
    'exception_reason', 'Administrator-reviewed part creation',
    'provenance_reference', 'rollback-p3-register'
  )
) as data;

select ok((select data ?& array['part_id','revision_id','proposal_id'] from p3_part), 'part and initial revision are created transactionally');
select is(
  (public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null, null,
    current_date, 'part_number', 'asc', 50, 0
  ) ->> 'part_count')::integer,
  1,
  'bounded search returns the exact governed part'
);

create temporary table p3_alias as
select public.create_master_data_alias(
  current_setting('p3.organization_id')::uuid,
  jsonb_build_object(
    'entity_type', 'part', 'entity_id', (select data ->> 'part_id' from p3_part),
    'alias', 'P3-LEGACY-PART', 'reason', 'Approved legacy ERP identifier',
    'provenance_reference', 'rollback-p3-register'
  )
) as id;

select ok((select id is not null from p3_alias), 'administrator can append an approved alias');
select is(
  (public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-LEGACY-PART', null, null,
    current_date, 'part_number', 'asc', 50, 0
  ) ->> 'part_count')::integer,
  1,
  'alias search resolves to the canonical part'
);
select throws_ok(
  format('update public.master_data_aliases set alias = %L where id = %L', 'TAMPERED', (select id from p3_alias)),
  '42501', null, 'approved aliases cannot be updated'
);
select throws_ok(
  format('delete from public.master_data_aliases where id = %L', (select id from p3_alias)),
  '42501', null, 'approved aliases cannot be deleted'
);
select throws_ok(
  format(
    'select public.create_master_data_alias(%L, %L::jsonb)',
    current_setting('p3.organization_id'),
    jsonb_build_object(
      'entity_type', 'part', 'entity_id', (select data ->> 'part_id' from p3_part),
      'alias', 'p3-legacy-part', 'reason', 'Duplicate alias attempt'
    )::text
  ),
  '23505', null, 'case-insensitive duplicate alias creation is rejected'
);

create temporary table p3_revision as
select public.create_part_master_data(
  current_setting('p3.organization_id')::uuid,
  jsonb_build_object(
    'mode', 'new_revision',
    'program_id', (select data ->> 'program_id' from p3_program),
    'model_year_id', (select data ->> 'model_year_id' from p3_program),
    'part_id', (select data ->> 'part_id' from p3_part),
    'revision_code', 'B', 'revision_description', 'Effective governed revision',
    'effective_from', (current_date + 10)::text,
    'exception_reason', 'Administrator-reviewed engineering revision',
    'provenance_reference', 'rollback-p3-register'
  )
) as data;

select ok((select data ? 'revision_id' from p3_revision), 'future effective revision is created atomically');
select is(
  (select status from public.part_revisions where id = (select (data ->> 'revision_id')::uuid from p3_part)),
  'superseded', 'the prior approved revision is superseded'
);
select is(
  (select effective_to from public.part_revisions where id = (select (data ->> 'revision_id')::uuid from p3_part)),
  current_date + 9, 'the prior revision closes on the day before the new revision'
);
select is(
  (select status from public.part_revisions where id = (select (data ->> 'revision_id')::uuid from p3_revision)),
  'approved', 'the new revision is the approved forward record'
);
select is(
  public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null, null,
    current_date, 'part_number', 'asc', 50, 0
  ) #>> '{parts,0,current_revision,revision_code}',
  'A', 'as-of projection selects the historical revision before the change date'
);
select is(
  public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null, null,
    current_date + 10, 'part_number', 'asc', 50, 0
  ) #>> '{parts,0,current_revision,revision_code}',
  'B', 'as-of projection selects the new revision on its effective date'
);
select throws_ok(
  format(
    'insert into public.part_revisions (organization_id, part_id, revision_code, effective_from, effective_to, status, approved_by, approved_at) values (%L,%L,%L,%L,%L,%L,%L,now())',
    current_setting('p3.organization_id'), (select data ->> 'part_id' from p3_part),
    'OVERLAP', (current_date + 5)::text, (current_date + 20)::text, 'approved',
    current_setting('p3.administrator_id')
  ),
  '23P01', null, 'overlapping approved effective periods fail at the database boundary'
);
select throws_ok(
  format('update public.part_revisions set description = %L where id = %L', 'Tampered', (select data ->> 'revision_id' from p3_revision)),
  '42501', null, 'approved revision terms remain immutable'
);
select throws_ok(
  $$insert into public.master_data_proposals (
    organization_id, entity_type, proposed_payload, duplicate_candidate_ids,
    exception_reason, proposed_by
  ) values (
    current_setting('p3.organization_id')::uuid, 'program', '{}'::jsonb,
    array[(select (data ->> 'part_id')::uuid from p3_part)],
    'Wrong entity-type candidate attempt', current_setting('p3.administrator_id')::uuid
  )$$,
  '23503', null, 'duplicate candidates must match the proposal entity type'
);
select throws_ok(
  format(
    'select public.create_part_master_data(%L, %L::jsonb)',
    current_setting('p3.organization_id'),
    jsonb_build_object(
      'mode', 'new_revision', 'program_id', (select data ->> 'program_id' from p3_program),
      'model_year_id', (select data ->> 'model_year_id' from p3_program),
      'part_id', (select data ->> 'part_id' from p3_part), 'revision_code', 'B',
      'effective_from', (current_date + 20)::text, 'exception_reason', 'Duplicate revision attempt'
    )::text
  ),
  '23505', null, 'duplicate revision denial creates no partial canonical record'
);
select is(
  (select count(*) from public.part_revisions where part_id = (select (data ->> 'part_id')::uuid from p3_part)),
  2::bigint, 'failed duplicate revision leaves the exact prior revision count'
);
select ok(
  (select count(*) >= 3 from public.audit_events
   where organization_id = current_setting('p3.organization_id')::uuid
     and entity_type in ('parts','part_revisions','master_data_aliases')),
  'governed part, revision, and alias changes retain audit evidence'
);

insert into public.permission_grants (
  organization_id, user_id, grant_type, resource_id, permissions, created_by
) values (
  current_setting('p3.organization_id')::uuid,
  current_setting('p3.scoped_member_id')::uuid, 'program',
  (select (data ->> 'program_id')::uuid from p3_program),
  array['read','write']::public.permission_name[],
  current_setting('p3.administrator_id')::uuid
);

select set_config('request.jwt.claim.sub', current_setting('p3.scoped_member_id'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('p3.scoped_member_id'), 'role', 'authenticated')::text, true);
select is(
  (public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null, null,
    current_date, 'part_number', 'asc', 50, 0
  ) ->> 'part_count')::integer,
  1, 'scoped member sees the explicitly granted program part'
);
select throws_ok(
  format(
    'select public.create_part_master_data(%L, %L::jsonb)',
    current_setting('p3.organization_id'),
    jsonb_build_object(
      'mode', 'new_revision', 'program_id', (select data ->> 'program_id' from p3_program),
      'model_year_id', (select data ->> 'model_year_id' from p3_program),
      'part_id', (select data ->> 'part_id' from p3_part), 'revision_code', 'C',
      'effective_from', (current_date + 20)::text, 'exception_reason', 'Non-admin attempt'
    )::text
  ),
  '42501', null, 'scoped member cannot use the governed mutation RPC'
);
select throws_ok(
  $$insert into public.programs (organization_id, code, name)
    values (current_setting('p3.organization_id')::uuid, 'BYPASS', 'Bypass')$$,
  '42501', null, 'scoped write grants cannot bypass administrator master-data policy'
);
select ok(
  exists (
    select 1
    from jsonb_array_elements(public.get_program_parts_workspace(
      current_setting('p3.organization_id')::uuid, 'parts', null, null, null,
      current_date, 'part_number', 'asc', 50, 0
    ) -> 'program_choices') choice
    where choice ->> 'id' = (select data ->> 'program_id' from p3_program)
  ),
  'scoped projection returns the explicitly granted program'
);

select set_config('request.jwt.claim.sub', current_setting('p3.other_administrator_id'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('p3.other_administrator_id'), 'role', 'authenticated')::text, true);
select throws_ok(
  $$select public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'programs', null, null, null,
    current_date, 'name', 'asc', 50, 0
  )$$,
  '42501', null, 'another-organization administrator cannot query the tenant projection'
);
select is(
  (select count(*) from public.parts where id = (select (data ->> 'part_id')::uuid from p3_part)),
  0::bigint, 'another-organization administrator cannot read the governed part directly'
);

select set_config('request.jwt.claim.sub', current_setting('p3.administrator_id'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('p3.administrator_id'), 'role', 'authenticated')::text, true);
select is(
  public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null,
    (select (data ->> 'part_id')::uuid from p3_part), current_date + 10,
    'part_number', 'asc', 50, 0
  ) #>> '{selected_part,agreements}',
  '[]', 'projection does not invent agreement or analytical evidence'
);
select is(
  public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null, null,
    current_date, 'part_number', 'desc', 1, 0
  ) ->> 'limit',
  '1', 'projection preserves the requested bounded page size'
);
select is(
  public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null, null,
    current_date, 'part_number', 'asc', 50, 0
  ) ->> 'source',
  'tenant_persistence', 'production projection declares its persisted source'
);
select is(
  public.get_program_parts_workspace(
    current_setting('p3.organization_id')::uuid, 'parts', 'P3-PART', null, null,
    current_date, 'part_number', 'asc', 50, 0
  ) ->> 'projection_version',
  'program-parts-v1', 'production projection is explicitly versioned'
);

select case
  when count(*) = 0 then '37 assertions passed'
  else string_agg(diagnostic, E'\n')
end as p3_pgtap_summary
from finish() diagnostic;
rollback;
