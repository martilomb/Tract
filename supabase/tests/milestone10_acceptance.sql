begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'materiality_rules', 'versioned materiality rules exist');
select has_table('public', 'vehicle_architectures', 'vehicle architectures are canonical records');
select has_table('public', 'vehicle_makes', 'vehicle makes are canonical records');
select has_table('public', 'vehicle_models', 'vehicle models are canonical records');
select has_table('public', 'master_data_proposals', 'governed master-data proposals exist');
select has_table('public', 'master_data_aliases', 'approved master-data aliases exist');
select has_table('public', 'master_data_merge_events', 'immutable merge provenance exists');
select has_table('public', 'connector_test_runs', 'bounded connector test evidence exists');
select has_function('app', 'activate_recovery_agreement', array['uuid'], 'atomic recovery activation function exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.dcrs (
    organization_id, dcr_number, title, status, initiator_user_id,
    workflow_configuration_id, settlement_currency
  ) values (
    '20000000-0000-0000-0000-000000000001', 'DCR-INVALID-START',
    'Invalid lifecycle start', 'submitted',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001', 'USD'
  )$$,
  '23514',
  null,
  'new DCRs cannot bypass the fixed draft start'
);

select lives_ok(
  $$insert into public.materiality_rules (
    id, organization_id, metric, version, status, threshold_amount, currency,
    effective_from, rationale, created_by, approved_by, approved_at
  ) values (
    'b1000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001', 'under_recovery', 1, 'active',
    100000, 'USD', now(), 'Local acceptance threshold',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001', now()
  )$$,
  'an administrator can activate an audited organization materiality rule'
);

select throws_ok(
  $$update public.materiality_rules
    set threshold_amount = 1
    where id = 'b1000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'active materiality terms are immutable'
);

select throws_ok(
  $$insert into public.materiality_rules (
    organization_id, metric, scope_type, scope_id, version, threshold_amount, currency,
    effective_from, rationale, created_by
  ) values (
    '20000000-0000-0000-0000-000000000001', 'over_recovery', 'program',
    '40000000-0000-0000-0000-000000000002', 1, 1, 'USD', now(),
    'Cross-tenant scope must fail', '10000000-0000-0000-0000-000000000001'
  )$$,
  '23503',
  null,
  'materiality overrides cannot reference another tenant program'
);

insert into public.vehicle_architectures (
  id, organization_id, oem_id, code, name, effective_from
) values (
  'b2000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001', 'ARCH-LOCAL',
  'Local shared architecture', '2026-01-01'
);

insert into public.vehicle_makes (
  id, organization_id, oem_id, name, effective_from
) values (
  'b2100000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001', 'Local Make', '2026-01-01'
);

insert into public.vehicle_models (
  id, organization_id, oem_id, code, vehicle_make_id, vehicle_architecture_id, name, effective_from
) values (
  'b2200000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001', 'MODEL-LOCAL',
  'b2100000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001', 'Local Model', '2026-01-01'
);

select lives_ok(
  $$insert into public.master_data_aliases (
    organization_id, entity_type, entity_id, alias, provider_key, provider_identifier,
    provenance, approved_by, approved_at
  ) values (
    '20000000-0000-0000-0000-000000000001', 'vehicle_model',
    'b2200000-0000-0000-0000-000000000001', 'Local Model Alias',
    'tenant_seed', 'model-1', '{"source":"local-test"}'::jsonb,
    '10000000-0000-0000-0000-000000000001', now()
  )$$,
  'approved same-tenant aliases retain provider-neutral provenance'
);

select throws_ok(
  $$insert into public.master_data_aliases (
    organization_id, entity_type, entity_id, alias, approved_by, approved_at
  ) values (
    '20000000-0000-0000-0000-000000000001', 'program',
    '40000000-0000-0000-0000-000000000002', 'Cross tenant alias',
    '10000000-0000-0000-0000-000000000001', now()
  )$$,
  '23503',
  null,
  'aliases cannot reference another tenant record'
);

select throws_ok(
  $$insert into public.master_data_proposals (
    organization_id, entity_type, proposed_payload, exception_reason, status,
    proposed_by, reviewed_by, reviewed_at, resulting_entity_id
  ) values (
    '20000000-0000-0000-0000-000000000001', 'program',
    '{"code":"CROSS"}'::jsonb, 'Cross-tenant result must fail', 'approved',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001', now(),
    '40000000-0000-0000-0000-000000000002'
  )$$,
  '23503',
  null,
  'approved proposals require a same-tenant resulting record'
);

insert into public.programs (
  id, organization_id, oem_id, code, name
) values (
  'b2300000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001', 'MERGE-TARGET', 'Merge target'
);

select throws_ok(
  $$insert into public.master_data_merge_events (
    organization_id, entity_type, source_entity_id, canonical_entity_id, reason, approved_by
  ) values (
    '20000000-0000-0000-0000-000000000001', 'program',
    '40000000-0000-0000-0000-000000000001',
    'b2300000-0000-0000-0000-000000000001', 'Wrong approver test',
    '10000000-0000-0000-0000-000000000002'
  )$$,
  '42501',
  null,
  'merge provenance requires the acting same-tenant administrator'
);

insert into public.connectors (
  id, organization_id, name, adapter_type, provider_key, ingestion_domain,
  supported_transports, activation_state, environment, endpoint_url, allowed_hosts,
  authentication_method, source_objects, data_categories, owner_user_id
) values (
  'b3000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', 'Acceptance connection', 'sap',
  'customer_erp_acceptance', 'erp', array['odata']::public.ingestion_transport[],
  'configured', 'staging', 'https://erp.example.test/odata', array['erp.example.test'],
  'oauth2', '["Shipments"]'::jsonb,
  array['shipment','cost','correction','reversal','return']::public.erp_transaction_type[],
  '10000000-0000-0000-0000-000000000001'
);

select lives_ok(
  $$insert into public.connector_test_runs (
    organization_id, connector_id, mode, status, result_summary, attempted_by, completed_at
  ) values (
    '20000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000001', 'configuration', 'passed',
    '{"result_code":"configuration_valid","message":"No live credential used"}'::jsonb,
    '10000000-0000-0000-0000-000000000001', now()
  )$$,
  'safe configuration validation can complete without live credentials'
);

select throws_ok(
  $$insert into public.connector_test_runs (
    organization_id, connector_id, mode, status, result_summary, attempted_by, completed_at
  ) values (
    '20000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000001', 'live', 'failed',
    '{"result_code":"credential_missing","message":"Server-side credential reference required"}'::jsonb,
    '10000000-0000-0000-0000-000000000001', now()
  )$$,
  '42501',
  null,
  'live connection tests fail closed without approved activation and credentials'
);

select throws_ok(
  $$insert into public.connector_test_runs (
    organization_id, connector_id, mode, status, result_summary, attempted_by, completed_at
  ) values (
    '20000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000001', 'configuration', 'failed',
    '{"password":"must-not-persist"}'::jsonb,
    '10000000-0000-0000-0000-000000000001', now()
  )$$,
  '23514',
  null,
  'connector test evidence rejects unsupported secret-shaped result fields'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(
  (select count(*) from public.connector_test_runs),
  0::bigint,
  'non-control members cannot read connector test evidence'
);

select throws_ok(
  $$insert into public.materiality_rules (
    organization_id, metric, version, threshold_amount, currency,
    effective_from, rationale, created_by
  ) values (
    '20000000-0000-0000-0000-000000000002', 'under_recovery', 1, 1, 'USD',
    now(), 'Cross-tenant write must fail', '10000000-0000-0000-0000-000000000002'
  )$$,
  '42501',
  null,
  'non-admin members cannot create cross-tenant materiality rules'
);

select * from finish();
rollback;
