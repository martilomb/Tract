begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'raw_ingestion_records', 'immutable raw ingestion records exist');
select has_table('public', 'ingestion_candidates', 'mapped candidates exist separately from raw records');
select has_table('public', 'ingestion_postings', 'approved posting registry exists');
select has_table('public', 'vehicle_production_records', 'vehicle production has a canonical source model');
select has_table('public', 'erp_transactions', 'ERP transactions have a canonical source model');
select has_table('public', 'extraction_field_candidates', 'document fields retain evidence and review state');
select has_table('public', 'eligible_volume_policies', 'eligible volume basis is contract configurable');
select has_column('public', 'volume_events', 'eligible_volume_policy_id', 'ledger events reference an eligible-volume policy');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.ingestion_batches (
      organization_id, domain, provider_key, transport, source_object_path, content_sha256
    ) values (
      '20000000-0000-0000-0000-000000000002', 'vehicle_volume', 'ihs', 'csv',
      '20000000-0000-0000-0000-000000000002/raw/denied.csv', repeat('a', 64)
    )$$,
  '42501',
  null,
  'scoped member cannot create an ingestion batch in another tenant'
);

select throws_ok(
  $$insert into public.volume_events (
      organization_id, program_id, part_id, occurred_on, event_type, signed_eligible_units,
      source, external_event_id, eligible_volume_basis
    ) values (
      '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001', '2026-08-01', 'actual', 1,
      'manual-test', 'unapproved-manual', 'manual_approved'
    )$$,
  '42501',
  null,
  'ledger event cannot post without an approved eligible-volume policy and evidence'
);

select * from finish();
rollback;
