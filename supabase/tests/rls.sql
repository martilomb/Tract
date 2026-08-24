begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*) from public.organizations), 1::bigint, 'member sees only their organization');
select is((select count(*) from public.programs), 1::bigint, 'scoped member sees granted program');
select is((select count(*) from public.parts), 1::bigint, 'program grant gives additive access to program part');
select is((select count(*) from public.programs where organization_id = '20000000-0000-0000-0000-000000000002'), 0::bigint, 'other tenant program is denied');
select is((select count(*) from public.parts where organization_id = '20000000-0000-0000-0000-000000000002'), 0::bigint, 'other tenant part is denied');
update public.memberships
set role = 'administrator'
where user_id = '10000000-0000-0000-0000-000000000002';
select is(
  (select role from public.memberships where user_id = '10000000-0000-0000-0000-000000000002'),
  'member'::public.organization_role,
  'member cannot elevate their own role'
);
select throws_ok(
  $$insert into public.volume_events (organization_id, program_id, part_id, occurred_on, event_type, signed_eligible_units, source, external_event_id) values ('20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002', '2026-08-01', 'actual', 1, 'rls-test', 'denied')$$,
  '42501',
  null,
  'cross-tenant source-event insert is denied'
);

select * from finish();
rollback;
