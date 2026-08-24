begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'recovery_agreements', 'canonical recovery agreements exist');
select has_table('public', 'connector_mapping_versions', 'versioned connector mappings exist');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into public.program_model_years (
  id, organization_id, program_id, model_year, start_date, end_date
) values (
  '61000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  2027, '2026-08-01', '2027-07-31'
);

insert into public.part_revisions (
  id, organization_id, part_id, revision_code, effective_from, status, approved_by, approved_at
) values (
  '62000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  'B', '2026-08-01', 'approved',
  '10000000-0000-0000-0000-000000000001', now()
);

insert into public.recovery_agreements (
  id, organization_id, agreement_number, title, supplier_id, settlement_currency,
  recoverable_cost, eligible_volume_basis, effective_from, owner_user_id
) values (
  '63000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'AGR-LOCAL-001', 'Local recovery agreement',
  '33000000-0000-0000-0000-000000000001', 'USD', 2400000,
  'part_shipments', '2026-08-01',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.recovery_agreement_programs (
  id, organization_id, recovery_agreement_id, program_id
) values (
  '63100000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '63000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001'
);

insert into public.recovery_agreement_parts (
  id, organization_id, recovery_agreement_id, part_id, part_revision_id
) values (
  '63200000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '63000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001'
);

insert into public.recovery_agreement_rate_periods (
  id, organization_id, recovery_agreement_id, effective_from, per_unit_rate, currency
) values (
  '63300000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '63000000-0000-0000-0000-000000000001',
  '2026-08-01', 6.315789, 'USD'
);

insert into public.documents (
  id, organization_id, recovery_agreement_id, document_type, title, created_by
) values (
  '63400000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '63000000-0000-0000-0000-000000000001',
  'recovery_agreement', 'Local agreement original',
  '10000000-0000-0000-0000-000000000001'
);

update public.recovery_agreements
set status = 'under_review'
where id = '63000000-0000-0000-0000-000000000001';

insert into public.approvals (
  id, organization_id, entity_type, entity_id, stage, decision,
  approver_user_id, decided_at
) values (
  '63500000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'recovery_agreement', '63000000-0000-0000-0000-000000000001',
  'commercial', 'approved',
  '10000000-0000-0000-0000-000000000001', now()
);

update public.recovery_agreements
set status = 'approved',
    approved_by = '10000000-0000-0000-0000-000000000001',
    approved_at = now()
where id = '63000000-0000-0000-0000-000000000001';

update public.recovery_agreements
set status = 'active'
where id = '63000000-0000-0000-0000-000000000001';

select is(
  (select status::text from public.recovery_agreements where id = '63000000-0000-0000-0000-000000000001'),
  'active',
  'evidence-backed agreement activates through the approved sequence'
);

insert into public.dcrs (
  id, organization_id, dcr_number, title, status, initiator_user_id, program_id,
  part_id, department_id, technical_team_id, supplier_id,
  workflow_configuration_id, settlement_currency
) values (
  '64000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'DCR-LOCAL-M10', 'Local Milestone 10 DCR', 'under_review',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', 'USD'
);

update public.configuration_versions
set payload = '{"transitions":[{"from":"under_review","to":"approved","required_document_types":["technical_evidence"],"required_assignment_roles":["reviewer","approver"],"required_approval_stages":["technical"]}]}'::jsonb
where id = '50000000-0000-0000-0000-000000000001';

select throws_ok(
  $$update public.dcrs set status = 'approved' where id = '64000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'DCR approval is denied when configured evidence gates are incomplete'
);

insert into public.documents (
  id, organization_id, dcr_id, document_type, title, created_by
) values (
  '64100000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '64000000-0000-0000-0000-000000000001',
  'technical_evidence', 'Local technical evidence',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.dcr_assignments (
  id, organization_id, dcr_id, assigned_user_id, assigned_by, role
) values
  (
    '64200000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '64000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001', 'reviewer'
  ),
  (
    '64200000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '64000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001', 'approver'
  );

insert into public.approvals (
  id, organization_id, entity_type, entity_id, stage, decision,
  approver_user_id, decided_at
) values (
  '64300000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'dcr', '64000000-0000-0000-0000-000000000001',
  'technical', 'approved',
  '10000000-0000-0000-0000-000000000001', now()
);

select lives_ok(
  $$update public.dcrs set status = 'approved' where id = '64000000-0000-0000-0000-000000000001'$$,
  'DCR approval succeeds after all configured evidence gates pass'
);

select lives_ok(
  $$insert into public.accruals (
    id, organization_id, dcr_id, part_id, program_id, department_id,
    technical_team_id, recovery_policy_configuration_id, recovery_agreement_id,
    approved_recoverable_cost, settlement_currency, active
  ) values (
    '65000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '64000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    '63000000-0000-0000-0000-000000000001',
    2400000, 'USD', true
  )$$,
  'recovery activation succeeds with an effective active agreement'
);

select throws_ok(
  $$insert into public.accruals (
    id, organization_id, dcr_id, part_id, program_id,
    recovery_policy_configuration_id, approved_recoverable_cost,
    settlement_currency, active
  ) values (
    '65000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '64000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    1, 'USD', true
  )$$,
  '42501',
  null,
  'recovery activation without an agreement is denied'
);

insert into public.connectors (
  id, organization_id, name, adapter_type, provider_key, ingestion_domain,
  supported_transports, activation_state, environment, endpoint_url,
  allowed_hosts, authentication_method, credential_reference, time_zone,
  source_objects, data_categories, reconciliation_rules, retry_policy, owner_user_id
) values (
  '66000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Local ERP draft', 'sap', 'customer_erp', 'erp',
  array['odata']::public.ingestion_transport[], 'configured', 'staging',
  'https://erp.example.test/odata', array['erp.example.test'], 'oauth2',
  'secret://local/erp', 'UTC', '["Shipments"]'::jsonb,
  array['shipment','cost','correction','reversal','return']::public.erp_transaction_type[],
  '{"quantity_tolerance":"0"}'::jsonb,
  '{"maximum_attempts":3,"backoff_seconds":30}'::jsonb,
  '10000000-0000-0000-0000-000000000001'
);

select lives_ok(
  $$insert into public.connector_mapping_versions (
    id, organization_id, connector_id, version, field_mappings, owner_user_id
  ) values (
    '66100000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '66000000-0000-0000-0000-000000000001', 1,
    '[{"source":"Material","destination":"part_number","operation":"trim"}]'::jsonb,
    '10000000-0000-0000-0000-000000000001'
  )$$,
  'approved declarative mapping operations are accepted'
);

select throws_ok(
  $$insert into public.connector_mapping_versions (
    id, organization_id, connector_id, version, field_mappings
  ) values (
    '66100000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '66000000-0000-0000-0000-000000000001', 2,
    '[{"source":"Material","destination":"part_number","operation":"copy","script":"return value"}]'::jsonb
  )$$,
  '42501',
  null,
  'customer-supplied executable mapping content is denied'
);

select is(
  (select cardinality(data_categories) from public.connectors where id = '66000000-0000-0000-0000-000000000001'),
  5,
  'SAP and ERP source classifications remain explicit configuration'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(
  (select count(*) from public.recovery_agreements),
  1::bigint,
  'scoped member can read an agreement linked to their granted program'
);

select is(
  (select count(*) from public.connector_mapping_versions),
  0::bigint,
  'non-admin member cannot read connector mapping configuration'
);

select throws_ok(
  $$insert into public.connectors (
    organization_id, name, adapter_type, provider_key, ingestion_domain,
    supported_transports, source_objects
  ) values (
    '20000000-0000-0000-0000-000000000002', 'Cross tenant connector',
    'csv', 'cross_tenant', 'erp', array['csv']::public.ingestion_transport[], '["Shipments"]'::jsonb
  )$$,
  '42501',
  null,
  'non-admin cross-tenant connector creation is denied'
);

select * from finish();
rollback;
