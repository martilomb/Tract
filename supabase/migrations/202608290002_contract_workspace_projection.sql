begin;

create or replace function public.get_recovery_workspace(target_organization_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(app.is_org_member(target_organization_id), false) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'organization_id', target_organization_id,
    'as_of', clock_timestamp(),
    'source', 'tenant_persistence',
    'calculation_version', 'contract-activation-v1',
    'oems', coalesce((
      select jsonb_agg(jsonb_build_object('id', oem.id, 'name', oem.name) order by oem.name)
      from public.oems oem
      where oem.organization_id = target_organization_id
    ), '[]'::jsonb),
    'makes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', make.id, 'oem_id', make.oem_id, 'name', make.name
      ) order by make.name)
      from public.vehicle_makes make
      where make.organization_id = target_organization_id
    ), '[]'::jsonb),
    'models', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', model.id, 'oem_id', model.oem_id, 'make_id', model.vehicle_make_id,
        'code', model.code, 'name', model.name
      ) order by model.name)
      from public.vehicle_models model
      where model.organization_id = target_organization_id
    ), '[]'::jsonb),
    'programs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', program.id, 'oem_id', program.oem_id, 'model_id', program.vehicle_model_id,
        'code', program.code, 'name', program.name
      ) order by program.name)
      from public.programs program
      where program.organization_id = target_organization_id
    ), '[]'::jsonb),
    'model_years', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', model_year.id, 'program_id', model_year.program_id,
        'model_year', model_year.model_year
      ) order by model_year.model_year)
      from public.program_model_years model_year
      where model_year.organization_id = target_organization_id
    ), '[]'::jsonb),
    'parts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', part.id, 'program_id', part.program_id, 'part_number', part.part_number,
        'description', part.description, 'status', part.status
      ) order by part.part_number)
      from public.parts part
      where part.organization_id = target_organization_id
    ), '[]'::jsonb),
    'revisions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', revision.id, 'part_id', revision.part_id, 'revision_code', revision.revision_code,
        'description', revision.description, 'effective_from', revision.effective_from,
        'effective_to', revision.effective_to, 'status', revision.status
      ) order by revision.effective_from desc, revision.revision_code)
      from public.part_revisions revision
      where revision.organization_id = target_organization_id
    ), '[]'::jsonb),
    'dcrs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', dcr.id, 'dcr_number', dcr.dcr_number, 'title', dcr.title,
        'status', dcr.status, 'program_id', dcr.program_id, 'part_id', dcr.part_id
      ) order by dcr.dcr_number)
      from public.dcrs dcr
      where dcr.organization_id = target_organization_id
        and dcr.status in ('approved', 'active')
    ), '[]'::jsonb),
    'agreements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', agreement.id,
        'agreement_number', agreement.agreement_number,
        'title', agreement.title,
        'status', agreement.status,
        'settlement_currency', agreement.settlement_currency,
        'recoverable_cost', agreement.recoverable_cost::text,
        'eligible_volume_basis', agreement.eligible_volume_basis,
        'effective_from', agreement.effective_from,
        'effective_to', agreement.effective_to,
        'expires_on', agreement.expires_on,
        'rounding_scale', agreement.rounding_scale,
        'rounding_mode', agreement.rounding_mode,
        'forecast_assumptions_version', agreement.forecast_assumptions_version,
        'forecast_assumptions', agreement.forecast_assumptions,
        'contractual_limit_amount', agreement.contractual_limit_amount::text,
        'evidence_review_method', agreement.evidence_review_method,
        'evidence_reference', agreement.evidence_reference,
        'evidence_summary', agreement.evidence_summary,
        'evidence_reviewed_by', agreement.evidence_reviewed_by,
        'evidence_reviewed_at', agreement.evidence_reviewed_at,
        'approved_by', agreement.approved_by,
        'approved_at', agreement.approved_at,
        'created_at', agreement.created_at,
        'updated_at', agreement.updated_at,
        'program_ids', coalesce((
          select jsonb_agg(link.program_id order by link.created_at)
          from public.recovery_agreement_programs link
          where link.recovery_agreement_id = agreement.id
        ), '[]'::jsonb),
        'model_year_ids', coalesce((
          select jsonb_agg(link.program_model_year_id order by link.created_at)
          from public.recovery_agreement_model_years link
          where link.recovery_agreement_id = agreement.id
        ), '[]'::jsonb),
        'part_links', coalesce((
          select jsonb_agg(jsonb_build_object(
            'part_id', link.part_id, 'part_revision_id', link.part_revision_id
          ) order by link.created_at)
          from public.recovery_agreement_parts link
          where link.recovery_agreement_id = agreement.id
        ), '[]'::jsonb),
        'dcr_ids', coalesce((
          select jsonb_agg(link.dcr_id order by link.created_at)
          from public.recovery_agreement_dcrs link
          where link.recovery_agreement_id = agreement.id
        ), '[]'::jsonb),
        'rate_periods', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', rate.id,
            'effective_from', rate.effective_from,
            'effective_to', rate.effective_to,
            'per_unit_rate', rate.per_unit_rate::text,
            'currency', rate.currency
          ) order by rate.effective_from)
          from public.recovery_agreement_rate_periods rate
          where rate.recovery_agreement_id = agreement.id
        ), '[]'::jsonb),
        'accruals', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', accrual.id, 'active', accrual.active,
            'approved_recoverable_cost', accrual.approved_recoverable_cost::text,
            'settlement_currency', accrual.settlement_currency,
            'program_id', accrual.program_id, 'part_id', accrual.part_id,
            'dcr_id', accrual.dcr_id
          ) order by accrual.created_at)
          from public.accruals accrual
          where accrual.recovery_agreement_id = agreement.id
        ), '[]'::jsonb),
        'approvals', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', approval.id, 'stage', approval.stage, 'decision', approval.decision,
            'approver_user_id', approval.approver_user_id, 'decided_at', approval.decided_at
          ) order by approval.decided_at)
          from public.approvals approval
          where approval.organization_id = agreement.organization_id
            and approval.entity_type = 'recovery_agreement'
            and approval.entity_id = agreement.id
        ), '[]'::jsonb),
        'audit', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', audit.id, 'action', audit.action, 'entity_type', audit.entity_type,
            'actor_id', audit.actor_id, 'occurred_at', audit.occurred_at
          ) order by audit.occurred_at desc)
          from public.audit_events audit
          where audit.organization_id = agreement.organization_id
            and audit.entity_id = agreement.id
        ), '[]'::jsonb)
      ) order by agreement.updated_at desc)
      from public.recovery_agreements agreement
      where agreement.organization_id = target_organization_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_recovery_workspace(uuid) from public, anon;
grant execute on function public.get_recovery_workspace(uuid) to authenticated, service_role;

commit;
