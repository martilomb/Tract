begin;

create extension if not exists pgtap with schema extensions;
select plan(3);
create temporary table tap_results (result text) on commit drop;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'integrity-test@tract.local',
  extensions.crypt('local-test-only', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Integrity test"}',
  now(), now(), '', '', '', ''
);

insert into public.organizations (id, name, slug, default_currency) values (
  'a1000000-0000-0000-0000-000000000001', 'Milestone integrity test',
  'milestone-integrity-test', 'USD'
);

insert into public.programs (id, organization_id, code, name) values (
  'a2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001', 'M10-TEST', 'Milestone test program'
);

insert into public.parts (id, organization_id, program_id, part_number, description) values (
  'a3000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001', 'M10-PART', 'Milestone test part'
);

insert into public.part_revisions (
  id, organization_id, part_id, revision_code, effective_from,
  status, approved_by, approved_at
) values (
  'a4000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001', 'A', '2026-08-24',
  'approved', 'a0000000-0000-0000-0000-000000000001', now()
);

insert into public.connectors (
  id, organization_id, name, adapter_type, provider_key, ingestion_domain,
  supported_transports, activation_state, environment, endpoint_url, allowed_hosts,
  authentication_method, source_objects, data_categories, reconciliation_rules,
  retry_policy, owner_user_id
) values (
  'a5000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001', 'Integrity connector', 'sap',
  'test_erp', 'erp', array['odata']::public.ingestion_transport[], 'configured',
  'staging', 'https://erp.example.test/odata', array['erp.example.test'], 'none',
  '["Shipments"]'::jsonb,
  array['shipment']::public.erp_transaction_type[],
  '{"quantity_tolerance":"0"}'::jsonb,
  '{"maximum_attempts":1}'::jsonb,
  'a0000000-0000-0000-0000-000000000001'
);

insert into tap_results select throws_ok(
  $$update public.part_revisions set description = 'changed after approval' where id = 'a4000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'approved part revision terms are immutable'
);

insert into tap_results select throws_ok(
  $$insert into public.connector_mapping_versions (
    organization_id, connector_id, version, field_mappings
  ) values (
    'a1000000-0000-0000-0000-000000000001',
    'a5000000-0000-0000-0000-000000000001', 1,
    '[{"source":"Material","destination":"part_number","operation":"copy","custom":"value"}]'::jsonb
  )$$,
  '23514', null, 'unknown mapping keys are rejected'
);

insert into tap_results select throws_ok(
  $$update public.connectors set allowed_hosts = array['other.example.test'] where id = 'a5000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'connector endpoint host must match its exact allowlist'
);

insert into tap_results select * from finish();
select * from tap_results;
rollback;
