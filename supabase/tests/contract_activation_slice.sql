begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select has_column('public', 'recovery_agreements', 'rounding_scale', 'agreement rounding scale is persisted');
select has_column('public', 'recovery_agreements', 'forecast_assumptions_version', 'forecast assumptions version is persisted');
select has_column('public', 'recovery_agreements', 'evidence_review_method', 'reviewed evidence method is persisted');
select has_function('public', 'create_recovery_master_data', array['uuid', 'jsonb'], 'governed master-data RPC is exposed');
select has_function('public', 'save_recovery_agreement_draft', array['uuid', 'uuid', 'jsonb'], 'transactional draft RPC is exposed');
select has_function('public', 'review_and_activate_recovery_agreement', array['uuid'], 'atomic review and activation RPC is exposed');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

create temporary table p2_master_result as
select public.create_recovery_master_data(
  '20000000-0000-0000-0000-000000000001',
  jsonb_build_object(
    'oem_name', 'P2 Test OEM',
    'oem_code', 'P2-OEM',
    'make_name', 'P2 Test Make',
    'model_code', 'P2-MODEL',
    'model_name', 'P2 Test Model',
    'program_code', 'P2-PROGRAM',
    'program_name', 'P2 Test Program',
    'model_year', 2027,
    'part_number', 'P2-PART',
    'part_description', 'P2 controlled part',
    'revision_code', 'A',
    'revision_description', 'Initial approved revision',
    'effective_from', (current_date - 1)::text,
    'exception_reason', 'Confidential staging program created for rollback-only P2 acceptance'
  )
) as data;

select ok(
  (select data ?& array['program_id', 'model_year_id', 'part_id', 'revision_id', 'proposal_id'] from p2_master_result),
  'governed creation returns every canonical linked identifier'
);

select throws_ok(
  $$select public.create_recovery_master_data(
    '20000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'oem_name', 'p2 test oem', 'oem_code', 'P2-OEM-2', 'make_name', 'Other',
      'model_code', 'P2-MODEL-2', 'model_name', 'Other', 'program_code', 'P2-PROGRAM-2',
      'program_name', 'Other', 'model_year', 2027, 'part_number', 'P2-PART-2',
      'revision_code', 'A', 'effective_from', current_date::text,
      'exception_reason', 'Duplicate assertion'
    )
  )$$,
  '23505',
  null,
  'case-insensitive duplicate creation is rejected before partial master data persists'
);

create temporary table p2_agreement_result as
select public.save_recovery_agreement_draft(
  '20000000-0000-0000-0000-000000000001',
  null,
  jsonb_build_object(
    'agreement_number', 'P2-AGR-001',
    'title', 'P2 atomic recovery agreement',
    'settlement_currency', 'USD',
    'recoverable_cost', '125000.25',
    'eligible_volume_basis', 'part_shipments',
    'effective_from', (current_date - 1)::text,
    'effective_to', (current_date + 365)::text,
    'rounding_scale', 2,
    'rounding_mode', 'half_even',
    'forecast_assumptions_version', 'p2-forecast-v1',
    'forecast_assumptions', jsonb_build_object(
      'basis', 'approved program volume', 'annual_growth_percent', '0', 'scenario', 'baseline'
    ),
    'contractual_limit_amount', '125000.25',
    'evidence_review_method', 'manual_attestation',
    'evidence_reference', 'P2 controlled commercial register',
    'evidence_summary', 'Authorized administrator reviewed the executed agreement outside the inactive document provider.',
    'program_id', (select data ->> 'program_id' from p2_master_result),
    'model_year_id', (select data ->> 'model_year_id' from p2_master_result),
    'part_id', (select data ->> 'part_id' from p2_master_result),
    'part_revision_id', (select data ->> 'revision_id' from p2_master_result),
    'rate_periods', jsonb_build_array(jsonb_build_object(
      'effective_from', (current_date - 1)::text,
      'effective_to', (current_date + 365)::text,
      'per_unit_rate', '12.500000',
      'currency', 'USD'
    ))
  )
) as id;

select is(
  (select status::text from public.recovery_agreements where id = (select id from p2_agreement_result)),
  'draft',
  'saved recovery setup reloads as an explicit draft'
);
select is(
  (select recoverable_cost::text from public.recovery_agreements where id = (select id from p2_agreement_result)),
  '125000.250000000000000000',
  'draft preserves the exact recoverable cost decimal'
);
select lives_ok(
  format('select public.review_and_activate_recovery_agreement(%L)', (select id from p2_agreement_result)),
  'complete reviewed recovery setup activates through one transaction'
);
select is(
  (select status::text from public.recovery_agreements where id = (select id from p2_agreement_result)),
  'active',
  'atomic activation marks the agreement active'
);
select is(
  (select count(*) from public.accruals where recovery_agreement_id = (select id from p2_agreement_result) and active),
  1::bigint,
  'atomic activation creates exactly one active accrual'
);
select is(
  (select count(*) from public.recovery_rate_periods rate
   join public.accruals accrual on accrual.id = rate.accrual_id
   where accrual.recovery_agreement_id = (select id from p2_agreement_result)
     and rate.approved and rate.per_unit_rate = 12.500000),
  1::bigint,
  'agreement rate becomes the exact approved accrual rate'
);
select ok(
  (select count(*) > 0 from public.audit_events
   where entity_type = 'recovery_agreements'
     and entity_id = (select id from p2_agreement_result)
     and actor_id = '10000000-0000-0000-0000-000000000001'),
  'agreement draft, approval, and activation retain actor-bound audit evidence'
);

create temporary table p2_incomplete_result as
select public.save_recovery_agreement_draft(
  '20000000-0000-0000-0000-000000000001',
  null,
  jsonb_build_object(
    'agreement_number', 'P2-AGR-INCOMPLETE',
    'title', 'P2 incomplete retained draft',
    'settlement_currency', 'USD',
    'recoverable_cost', '500',
    'eligible_volume_basis', 'part_shipments',
    'effective_from', current_date::text,
    'rounding_scale', 2,
    'rounding_mode', 'half_even',
    'forecast_assumptions', '{}'::jsonb,
    'rate_periods', '[]'::jsonb
  )
) as id;

select is(
  (select status::text from public.recovery_agreements where id = (select id from p2_incomplete_result)),
  'draft',
  'an incomplete setup is retained as a visible draft'
);
select throws_ok(
  format('select public.review_and_activate_recovery_agreement(%L)', (select id from p2_incomplete_result)),
  '23514',
  null,
  'incomplete recovery activation fails closed'
);
select is(
  (select status::text from public.recovery_agreements where id = (select id from p2_incomplete_result)),
  'draft',
  'failed activation rolls agreement state back to draft'
);
select is(
  (select count(*) from public.accruals where recovery_agreement_id = (select id from p2_incomplete_result)),
  0::bigint,
  'failed activation creates no partial accrual'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.save_recovery_agreement_draft(
    '20000000-0000-0000-0000-000000000001', null,
    '{"agreement_number":"DENIED","title":"Denied","settlement_currency":"USD","recoverable_cost":"1","eligible_volume_basis":"part_shipments","rate_periods":[]}'::jsonb
  )$$,
  '42501',
  null,
  'non-administrator cannot save an agreement draft'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.save_recovery_agreement_draft(
    '20000000-0000-0000-0000-000000000001', null,
    '{"agreement_number":"CROSS-TENANT","title":"Denied","settlement_currency":"USD","recoverable_cost":"1","eligible_volume_basis":"part_shipments","rate_periods":[]}'::jsonb
  )$$,
  '42501',
  null,
  'another organization administrator cannot write across the tenant boundary'
);
select is(
  (select count(*) from public.recovery_agreements where id = (select id from p2_agreement_result)),
  0::bigint,
  'another organization administrator cannot read the activated agreement'
);

select * from finish();
rollback;
