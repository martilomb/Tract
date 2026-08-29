begin;

alter table public.recovery_agreements
  add column rounding_scale smallint not null default 2
    check (rounding_scale between 0 and 18),
  add column rounding_mode text not null default 'half_even'
    check (rounding_mode in ('half_even')),
  add column forecast_assumptions_version text
    check (
      forecast_assumptions_version is null
      or length(trim(forecast_assumptions_version)) between 1 and 120
    ),
  add column forecast_assumptions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(forecast_assumptions) = 'object'),
  add column contractual_limit_amount numeric(38, 18)
    check (contractual_limit_amount is null or contractual_limit_amount >= 0),
  add column evidence_review_method text
    check (evidence_review_method in ('manual_attestation', 'stored_document')),
  add column evidence_reference text
    check (evidence_reference is null or length(trim(evidence_reference)) between 1 and 500),
  add column evidence_summary text
    check (evidence_summary is null or length(trim(evidence_summary)) between 1 and 4000),
  add column evidence_document_version_id uuid references public.document_versions(id) on delete restrict,
  add column evidence_reviewed_by uuid references auth.users(id) on delete set null,
  add column evidence_reviewed_at timestamptz,
  add constraint recovery_agreement_evidence_same_tenant foreign key (
    organization_id, evidence_document_version_id
  ) references public.document_versions(organization_id, id),
  add constraint recovery_agreement_evidence_bundle check (
    (
      evidence_review_method is null
      and evidence_reference is null
      and evidence_summary is null
      and evidence_document_version_id is null
      and evidence_reviewed_by is null
      and evidence_reviewed_at is null
    )
    or (
      evidence_review_method is not null
      and evidence_reference is not null
      and evidence_summary is not null
      and evidence_reviewed_by is not null
      and evidence_reviewed_at is not null
      and (
        (evidence_review_method = 'manual_attestation' and evidence_document_version_id is null)
        or (evidence_review_method = 'stored_document' and evidence_document_version_id is not null)
      )
    )
  );

create unique index oems_name_casefold_unique
  on public.oems (organization_id, lower(trim(name)));
create unique index vehicle_makes_name_casefold_unique
  on public.vehicle_makes (organization_id, oem_id, lower(trim(name)));
create unique index vehicle_models_code_casefold_unique
  on public.vehicle_models (organization_id, lower(trim(code)));
create unique index programs_code_casefold_unique
  on public.programs (organization_id, lower(trim(code)));
create unique index parts_number_casefold_unique
  on public.parts (organization_id, lower(trim(part_number)));
create unique index part_revisions_code_casefold_unique
  on public.part_revisions (part_id, lower(trim(revision_code)));
create unique index recovery_agreements_number_casefold_unique
  on public.recovery_agreements (organization_id, lower(trim(agreement_number)));

create or replace function app.validate_recovery_rate_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare agreement_record public.recovery_agreements%rowtype;
begin
  select * into agreement_record
  from public.recovery_agreements a
  where a.id = new.recovery_agreement_id
    and a.organization_id = new.organization_id;

  if agreement_record.id is null then
    raise exception 'recovery rate period agreement is unavailable' using errcode = '23503';
  end if;
  if new.currency <> agreement_record.settlement_currency then
    raise exception 'recovery rate currency must match the agreement settlement currency' using errcode = '23514';
  end if;
  if agreement_record.effective_from is not null and new.effective_from < agreement_record.effective_from then
    raise exception 'recovery rate cannot begin before the agreement effective date' using errcode = '23514';
  end if;
  if agreement_record.effective_to is not null
    and coalesce(new.effective_to, agreement_record.effective_to) > agreement_record.effective_to then
    raise exception 'recovery rate cannot extend beyond the agreement effective period' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recovery_agreement_rate_period_validate
before insert or update on public.recovery_agreement_rate_periods
for each row execute function app.validate_recovery_rate_period();

create or replace function app.validate_recovery_model_year_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.program_model_years my
    join public.recovery_agreement_programs ap
      on ap.organization_id = my.organization_id
      and ap.program_id = my.program_id
    where my.organization_id = new.organization_id
      and my.id = new.program_model_year_id
      and ap.recovery_agreement_id = new.recovery_agreement_id
  ) then
    raise exception 'agreement model year must belong to a linked program' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recovery_agreement_model_year_validate
before insert or update on public.recovery_agreement_model_years
for each row execute function app.validate_recovery_model_year_link();

create or replace function app.validate_recovery_part_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.part_revision_id is not null and not exists (
    select 1 from public.part_revisions revision
    where revision.organization_id = new.organization_id
      and revision.id = new.part_revision_id
      and revision.part_id = new.part_id
  ) then
    raise exception 'agreement part revision must belong to the linked part' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recovery_agreement_part_validate
before insert or update on public.recovery_agreement_parts
for each row execute function app.validate_recovery_part_link();

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
    select 1 from public.approvals approval
    where approval.organization_id = new.organization_id
      and approval.entity_type = 'recovery_agreement'
      and approval.entity_id = new.id
      and approval.decision = 'approved'
  ) then
    raise exception 'agreement approval requires an approved decision record' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active' then
    if not exists (
      select 1 from app.recovery_activation_context context
      where context.transaction_id = txid_current() and context.recovery_agreement_id = new.id
    ) then
      raise exception 'use app.activate_recovery_agreement for atomic recovery activation' using errcode = '42501';
    end if;
    if not (
      new.evidence_review_method = 'manual_attestation'
      or exists (
        select 1 from public.documents document
        where document.organization_id = new.organization_id
          and document.recovery_agreement_id = new.id
          and document.status = 'active'
      )
    ) or not exists (
      select 1 from public.recovery_agreement_rate_periods rate
      where rate.organization_id = new.organization_id
        and rate.recovery_agreement_id = new.id
    ) or not exists (
      select 1 from public.recovery_agreement_programs program
      where program.organization_id = new.organization_id
        and program.recovery_agreement_id = new.id
    ) or not exists (
      select 1 from public.recovery_agreement_parts part
      where part.organization_id = new.organization_id
        and part.recovery_agreement_id = new.id
    ) then
      raise exception 'agreement activation requires reviewed evidence, a rate period, a linked program, and a linked part' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function app.validate_p2_recovery_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'active' and new.status = 'active' then
    if new.rounding_mode <> 'half_even' or new.rounding_scale not between 0 and 18 then
      raise exception 'recovery activation requires the recorded rounding policy' using errcode = '23514';
    end if;
    if nullif(trim(new.forecast_assumptions_version), '') is null
      or new.forecast_assumptions = '{}'::jsonb then
      raise exception 'recovery activation requires versioned forecast assumptions' using errcode = '23514';
    end if;
    if new.evidence_review_method is null
      or new.evidence_reviewed_by is null
      or new.evidence_reviewed_at is null then
      raise exception 'recovery activation requires reviewed agreement evidence' using errcode = '23514';
    end if;
    if new.evidence_review_method = 'stored_document' and not exists (
      select 1
      from public.document_versions version
      join public.documents document
        on document.organization_id = version.organization_id
        and document.id = version.document_id
      where version.organization_id = new.organization_id
        and version.id = new.evidence_document_version_id
        and document.recovery_agreement_id = new.id
        and document.status = 'active'
    ) then
      raise exception 'stored agreement evidence must be an active linked document version' using errcode = '23514';
    end if;
    if not exists (
      select 1
      from public.recovery_agreement_model_years amy
      join public.program_model_years my
        on my.organization_id = amy.organization_id
        and my.id = amy.program_model_year_id
      join public.recovery_agreement_programs ap
        on ap.organization_id = amy.organization_id
        and ap.recovery_agreement_id = amy.recovery_agreement_id
        and ap.program_id = my.program_id
      where amy.organization_id = new.organization_id
        and amy.recovery_agreement_id = new.id
    ) then
      raise exception 'recovery activation requires a model year for a linked program' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.recovery_agreement_rate_periods rate
      where rate.organization_id = new.organization_id
        and rate.recovery_agreement_id = new.id
        and rate.currency = new.settlement_currency
        and rate.effective_from <= current_date
        and (rate.effective_to is null or rate.effective_to >= current_date)
    ) then
      raise exception 'recovery activation requires a current rate in the agreement currency' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger recovery_agreement_p2_activation_validate
before update of status on public.recovery_agreements
for each row execute function app.validate_p2_recovery_activation();

create or replace function public.create_recovery_master_data(
  target_organization_id uuid,
  master_data jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
declare oem_id uuid;
declare make_id uuid;
declare model_id uuid;
declare proposal_id uuid;
declare program_id uuid;
declare model_year_id uuid;
declare part_id uuid;
declare revision_id uuid;
declare exception_reason text := nullif(trim(master_data ->> 'exception_reason'), '');
declare effective_from date := (master_data ->> 'effective_from')::date;
begin
  if actor_id is null or not coalesce(app.is_org_admin(target_organization_id), false) then
    raise exception 'administrator access is required to create governed master data' using errcode = '42501';
  end if;
  if exception_reason is null then
    raise exception 'a governed program exception reason is required' using errcode = '23514';
  end if;
  if exists (select 1 from public.oems where organization_id = target_organization_id and lower(trim(name)) = lower(trim(master_data ->> 'oem_name'))) then
    raise exception 'an OEM with this name already exists; select the existing record' using errcode = '23505';
  end if;
  if exists (select 1 from public.vehicle_models where organization_id = target_organization_id and lower(trim(code)) = lower(trim(master_data ->> 'model_code'))) then
    raise exception 'a vehicle model with this code already exists; select the existing record' using errcode = '23505';
  end if;
  if exists (select 1 from public.programs where organization_id = target_organization_id and lower(trim(code)) = lower(trim(master_data ->> 'program_code'))) then
    raise exception 'a program with this code already exists; select the existing record' using errcode = '23505';
  end if;
  if exists (select 1 from public.parts where organization_id = target_organization_id and lower(trim(part_number)) = lower(trim(master_data ->> 'part_number'))) then
    raise exception 'a part number with this value already exists; select the existing record' using errcode = '23505';
  end if;

  insert into public.oems (organization_id, name, external_code)
  values (
    target_organization_id,
    nullif(trim(master_data ->> 'oem_name'), ''),
    nullif(trim(master_data ->> 'oem_code'), '')
  ) returning id into oem_id;

  insert into public.vehicle_makes (organization_id, oem_id, name, effective_from)
  values (
    target_organization_id,
    oem_id,
    nullif(trim(master_data ->> 'make_name'), ''),
    effective_from
  ) returning id into make_id;

  insert into public.vehicle_models (
    organization_id, oem_id, vehicle_make_id, code, name, effective_from, provenance_status
  ) values (
    target_organization_id,
    oem_id,
    make_id,
    nullif(trim(master_data ->> 'model_code'), ''),
    nullif(trim(master_data ->> 'model_name'), ''),
    effective_from,
    'tenant_managed'
  ) returning id into model_id;

  insert into public.master_data_proposals (
    organization_id, entity_type, proposed_payload, exception_reason, provenance, proposed_by
  ) values (
    target_organization_id,
    'program',
    master_data,
    exception_reason,
    jsonb_build_object('source', 'administrator_guided_recovery_setup'),
    actor_id
  ) returning id into proposal_id;

  insert into public.programs (
    organization_id, oem_id, vehicle_model_id, code, name, start_date,
    creation_path, exception_proposal_id
  ) values (
    target_organization_id,
    oem_id,
    model_id,
    nullif(trim(master_data ->> 'program_code'), ''),
    nullif(trim(master_data ->> 'program_name'), ''),
    effective_from,
    'admin_exception',
    proposal_id
  ) returning id into program_id;

  update public.master_data_proposals
  set status = 'approved', resulting_entity_id = program_id, reviewed_by = actor_id,
      reviewed_at = clock_timestamp(), review_reason = 'Approved through governed recovery setup'
  where id = proposal_id;

  insert into public.program_model_years (organization_id, program_id, model_year, start_date)
  values (
    target_organization_id,
    program_id,
    (master_data ->> 'model_year')::smallint,
    effective_from
  ) returning id into model_year_id;

  insert into public.parts (organization_id, program_id, part_number, description)
  values (
    target_organization_id,
    program_id,
    nullif(trim(master_data ->> 'part_number'), ''),
    nullif(trim(master_data ->> 'part_description'), '')
  ) returning id into part_id;

  insert into public.part_revisions (
    organization_id, part_id, revision_code, description, effective_from,
    status, approved_by, approved_at
  ) values (
    target_organization_id,
    part_id,
    nullif(trim(master_data ->> 'revision_code'), ''),
    nullif(trim(master_data ->> 'revision_description'), ''),
    effective_from,
    'approved',
    actor_id,
    clock_timestamp()
  ) returning id into revision_id;

  insert into public.part_program_applications (
    organization_id, part_id, part_revision_id, program_id, program_model_year_id, effective_from
  ) values (
    target_organization_id, part_id, revision_id, program_id, model_year_id, effective_from
  );

  return jsonb_build_object(
    'oem_id', oem_id,
    'make_id', make_id,
    'model_id', model_id,
    'program_id', program_id,
    'model_year_id', model_year_id,
    'part_id', part_id,
    'revision_id', revision_id,
    'proposal_id', proposal_id
  );
end;
$$;

create or replace function public.save_recovery_agreement_draft(
  target_organization_id uuid,
  target_agreement_id uuid,
  draft_data jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
declare agreement_id uuid := target_agreement_id;
declare existing_status public.recovery_agreement_status;
declare rate jsonb;
begin
  if actor_id is null or not coalesce(app.is_org_admin(target_organization_id), false) then
    raise exception 'administrator access is required to save a recovery agreement' using errcode = '42501';
  end if;

  if agreement_id is null then
    insert into public.recovery_agreements (
      organization_id, agreement_number, title, settlement_currency, recoverable_cost,
      eligible_volume_basis, effective_from, effective_to, expires_on, owner_user_id,
      rounding_scale, rounding_mode, forecast_assumptions_version, forecast_assumptions,
      contractual_limit_amount, evidence_review_method, evidence_reference, evidence_summary,
      evidence_reviewed_by, evidence_reviewed_at
    ) values (
      target_organization_id,
      nullif(trim(draft_data ->> 'agreement_number'), ''),
      nullif(trim(draft_data ->> 'title'), ''),
      upper(nullif(trim(draft_data ->> 'settlement_currency'), '')),
      (draft_data ->> 'recoverable_cost')::numeric,
      (draft_data ->> 'eligible_volume_basis')::public.eligible_volume_basis,
      nullif(draft_data ->> 'effective_from', '')::date,
      nullif(draft_data ->> 'effective_to', '')::date,
      nullif(draft_data ->> 'expires_on', '')::date,
      actor_id,
      coalesce((draft_data ->> 'rounding_scale')::smallint, 2),
      coalesce(nullif(draft_data ->> 'rounding_mode', ''), 'half_even'),
      nullif(trim(draft_data ->> 'forecast_assumptions_version'), ''),
      coalesce(draft_data -> 'forecast_assumptions', '{}'::jsonb),
      nullif(draft_data ->> 'contractual_limit_amount', '')::numeric,
      nullif(draft_data ->> 'evidence_review_method', ''),
      nullif(trim(draft_data ->> 'evidence_reference'), ''),
      nullif(trim(draft_data ->> 'evidence_summary'), ''),
      case when nullif(draft_data ->> 'evidence_review_method', '') is null then null else actor_id end,
      case when nullif(draft_data ->> 'evidence_review_method', '') is null then null else clock_timestamp() end
    ) returning id into agreement_id;
  else
    select status into existing_status
    from public.recovery_agreements
    where id = agreement_id and organization_id = target_organization_id
    for update;
    if existing_status is null then
      raise exception 'recovery agreement draft not found' using errcode = 'P0002';
    end if;
    if existing_status <> 'draft' then
      raise exception 'only a draft recovery agreement can be changed' using errcode = '42501';
    end if;
    update public.recovery_agreements
    set agreement_number = nullif(trim(draft_data ->> 'agreement_number'), ''),
        title = nullif(trim(draft_data ->> 'title'), ''),
        settlement_currency = upper(nullif(trim(draft_data ->> 'settlement_currency'), '')),
        recoverable_cost = (draft_data ->> 'recoverable_cost')::numeric,
        eligible_volume_basis = (draft_data ->> 'eligible_volume_basis')::public.eligible_volume_basis,
        effective_from = nullif(draft_data ->> 'effective_from', '')::date,
        effective_to = nullif(draft_data ->> 'effective_to', '')::date,
        expires_on = nullif(draft_data ->> 'expires_on', '')::date,
        rounding_scale = coalesce((draft_data ->> 'rounding_scale')::smallint, 2),
        rounding_mode = coalesce(nullif(draft_data ->> 'rounding_mode', ''), 'half_even'),
        forecast_assumptions_version = nullif(trim(draft_data ->> 'forecast_assumptions_version'), ''),
        forecast_assumptions = coalesce(draft_data -> 'forecast_assumptions', '{}'::jsonb),
        contractual_limit_amount = nullif(draft_data ->> 'contractual_limit_amount', '')::numeric,
        evidence_review_method = nullif(draft_data ->> 'evidence_review_method', ''),
        evidence_reference = nullif(trim(draft_data ->> 'evidence_reference'), ''),
        evidence_summary = nullif(trim(draft_data ->> 'evidence_summary'), ''),
        evidence_document_version_id = null,
        evidence_reviewed_by = case when nullif(draft_data ->> 'evidence_review_method', '') is null then null else actor_id end,
        evidence_reviewed_at = case when nullif(draft_data ->> 'evidence_review_method', '') is null then null else clock_timestamp() end
    where id = agreement_id;
  end if;

  delete from public.recovery_agreement_rate_periods where recovery_agreement_id = agreement_id;
  delete from public.recovery_agreement_dcrs where recovery_agreement_id = agreement_id;
  delete from public.recovery_agreement_model_years where recovery_agreement_id = agreement_id;
  delete from public.recovery_agreement_parts where recovery_agreement_id = agreement_id;
  delete from public.recovery_agreement_programs where recovery_agreement_id = agreement_id;

  if nullif(draft_data ->> 'program_id', '') is not null then
    insert into public.recovery_agreement_programs (organization_id, recovery_agreement_id, program_id)
    values (target_organization_id, agreement_id, (draft_data ->> 'program_id')::uuid);
  end if;
  if nullif(draft_data ->> 'model_year_id', '') is not null then
    insert into public.recovery_agreement_model_years (
      organization_id, recovery_agreement_id, program_model_year_id
    ) values (
      target_organization_id, agreement_id, (draft_data ->> 'model_year_id')::uuid
    );
  end if;
  if nullif(draft_data ->> 'part_id', '') is not null then
    insert into public.recovery_agreement_parts (
      organization_id, recovery_agreement_id, part_id, part_revision_id
    ) values (
      target_organization_id,
      agreement_id,
      (draft_data ->> 'part_id')::uuid,
      nullif(draft_data ->> 'part_revision_id', '')::uuid
    );
  end if;
  if nullif(draft_data ->> 'dcr_id', '') is not null then
    insert into public.recovery_agreement_dcrs (organization_id, recovery_agreement_id, dcr_id)
    values (target_organization_id, agreement_id, (draft_data ->> 'dcr_id')::uuid);
  end if;
  for rate in select value from jsonb_array_elements(coalesce(draft_data -> 'rate_periods', '[]'::jsonb))
  loop
    insert into public.recovery_agreement_rate_periods (
      organization_id, recovery_agreement_id, effective_from, effective_to, per_unit_rate, currency
    ) values (
      target_organization_id,
      agreement_id,
      (rate ->> 'effective_from')::date,
      nullif(rate ->> 'effective_to', '')::date,
      (rate ->> 'per_unit_rate')::numeric,
      upper(nullif(trim(rate ->> 'currency'), ''))
    );
  end loop;
  return agreement_id;
end;
$$;

create or replace function public.activate_recovery_agreement(target_agreement_id uuid)
returns public.recovery_agreements
language sql
security invoker
set search_path = ''
as $$
  select app.activate_recovery_agreement(target_agreement_id);
$$;

create or replace function public.review_and_activate_recovery_agreement(target_agreement_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare agreement_record public.recovery_agreements%rowtype;
declare actor_id uuid := auth.uid();
declare program_id uuid;
declare part_id uuid;
declare linked_dcr_id uuid;
declare policy_id uuid;
declare accrual_id uuid;
declare next_policy_version integer;
begin
  select * into agreement_record
  from public.recovery_agreements
  where id = target_agreement_id
  for update;

  if agreement_record.id is null then
    raise exception 'recovery agreement draft not found' using errcode = 'P0002';
  end if;
  if actor_id is null or not coalesce(app.is_org_admin(agreement_record.organization_id), false) then
    raise exception 'administrator access is required to review and activate recovery' using errcode = '42501';
  end if;
  if agreement_record.status <> 'draft' then
    raise exception 'only a draft recovery agreement can enter the guided activation' using errcode = '23514';
  end if;
  if agreement_record.effective_from is null
    or agreement_record.effective_from > current_date
    or (agreement_record.effective_to is not null and agreement_record.effective_to < current_date)
    or (agreement_record.expires_on is not null and agreement_record.expires_on < current_date) then
    raise exception 'recovery agreement must be effective on the activation date' using errcode = '23514';
  end if;
  if agreement_record.evidence_review_method is null
    or nullif(trim(agreement_record.forecast_assumptions_version), '') is null
    or agreement_record.forecast_assumptions = '{}'::jsonb then
    raise exception 'reviewed evidence and versioned forecast assumptions are required' using errcode = '23514';
  end if;
  if (select count(*) from public.recovery_agreement_programs where recovery_agreement_id = target_agreement_id) <> 1
    or (select count(*) from public.recovery_agreement_model_years where recovery_agreement_id = target_agreement_id) <> 1
    or (select count(*) from public.recovery_agreement_parts where recovery_agreement_id = target_agreement_id) <> 1 then
    raise exception 'guided activation requires exactly one linked program, model year, and part/revision' using errcode = '23514';
  end if;

  select agreement_program.program_id into program_id
  from public.recovery_agreement_programs agreement_program
  where agreement_program.recovery_agreement_id = target_agreement_id;
  select agreement_part.part_id into part_id
  from public.recovery_agreement_parts agreement_part
  where agreement_part.recovery_agreement_id = target_agreement_id;
  select agreement_dcr.dcr_id into linked_dcr_id
  from public.recovery_agreement_dcrs agreement_dcr
  where agreement_dcr.recovery_agreement_id = target_agreement_id;

  select configuration.id into policy_id
  from public.configuration_versions configuration
  where configuration.organization_id = agreement_record.organization_id
    and configuration.kind = 'recovery_policy'
    and configuration.status = 'active'
    and configuration.effective_from <= clock_timestamp()
  order by configuration.version desc
  limit 1;

  if policy_id is null then
    perform pg_advisory_xact_lock(hashtextextended(agreement_record.organization_id::text || ':recovery_policy', 0));
    select configuration.id into policy_id
    from public.configuration_versions configuration
    where configuration.organization_id = agreement_record.organization_id
      and configuration.kind = 'recovery_policy'
      and configuration.status = 'active'
      and configuration.effective_from <= clock_timestamp()
    order by configuration.version desc
    limit 1;
    if policy_id is null then
      select coalesce(max(configuration.version), 0) + 1 into next_policy_version
      from public.configuration_versions configuration
      where configuration.organization_id = agreement_record.organization_id
        and configuration.kind = 'recovery_policy';
      insert into public.configuration_versions (
        organization_id, kind, version, effective_from, status, payload, created_by
      ) values (
        agreement_record.organization_id,
        'recovery_policy',
        next_policy_version,
        clock_timestamp(),
        'active',
        jsonb_build_object(
          'calculation_version', 'contract-activation-v1',
          'rounding_mode', agreement_record.rounding_mode,
          'rounding_scale', agreement_record.rounding_scale,
          'source_agreement_id', agreement_record.id
        ),
        actor_id
      ) returning id into policy_id;
    end if;
  end if;

  update public.recovery_agreements set status = 'under_review' where id = target_agreement_id;
  insert into public.approvals (
    organization_id, entity_type, entity_id, stage, decision, approver_user_id, decided_at
  ) values (
    agreement_record.organization_id,
    'recovery_agreement',
    target_agreement_id,
    'commercial',
    'approved',
    actor_id,
    clock_timestamp()
  );
  update public.recovery_agreements
  set status = 'approved', approved_by = actor_id, approved_at = clock_timestamp()
  where id = target_agreement_id;

  insert into public.accruals (
    organization_id, dcr_id, part_id, program_id, recovery_policy_configuration_id,
    recovery_agreement_id, approved_recoverable_cost, settlement_currency, active
  ) values (
    agreement_record.organization_id,
    linked_dcr_id,
    part_id,
    program_id,
    policy_id,
    target_agreement_id,
    agreement_record.recoverable_cost,
    agreement_record.settlement_currency,
    false
  ) returning id into accrual_id;

  insert into public.recovery_rate_periods (
    organization_id, accrual_id, effective_from, effective_to, per_unit_rate,
    currency, approved, approved_by, approved_at
  )
  select rate.organization_id, accrual_id, rate.effective_from, rate.effective_to,
         rate.per_unit_rate, rate.currency, true, actor_id, clock_timestamp()
  from public.recovery_agreement_rate_periods rate
  where rate.recovery_agreement_id = target_agreement_id;

  perform app.activate_recovery_agreement(target_agreement_id);
  return target_agreement_id;
end;
$$;

revoke all on function public.create_recovery_master_data(uuid, jsonb) from public, anon;
revoke all on function public.save_recovery_agreement_draft(uuid, uuid, jsonb) from public, anon;
revoke all on function public.activate_recovery_agreement(uuid) from public, anon;
revoke all on function public.review_and_activate_recovery_agreement(uuid) from public, anon;
grant execute on function public.create_recovery_master_data(uuid, jsonb) to authenticated, service_role;
grant execute on function public.save_recovery_agreement_draft(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.activate_recovery_agreement(uuid) to authenticated, service_role;
grant execute on function public.review_and_activate_recovery_agreement(uuid) to authenticated, service_role;

commit;
