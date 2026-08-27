begin;

create extension if not exists pgtap with schema extensions;
select plan(27);

select has_table('public', 'organization_invitations', 'organization invitations exist');
select has_table('public', 'plan_catalog', 'provider-neutral plan catalog exists');
select has_table('public', 'organization_subscriptions', 'organization subscriptions exist');
select has_table('public', 'seat_entitlements', 'seat entitlements exist');
select has_function('app', 'accept_invitation', array['text'], 'invitation acceptance is transactional');
select has_function('public', 'accept_organization_invitation', array['text'], 'bounded authenticated invitation RPC exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","email":"scoped-a@tract.local"}', true);

select is(
  (select count(*) from public.organization_subscriptions where organization_id = '20000000-0000-0000-0000-000000000002'),
  0::bigint,
  'members cannot inspect another organization subscription'
);
select is(
  (select app.can_access_scope(
    '20000000-0000-0000-0000-000000000001', null, null,
    '40000000-0000-0000-0000-000000000001', null, 'read'::public.permission_name
  )),
  true,
  'active scoped members retain granted program access'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","email":"admin-a@tract.local"}', true);

select throws_ok(
  $$update public.memberships
    set role = 'member'
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'the last active administrator cannot be demoted'
);
select throws_ok(
  $$update public.memberships
    set user_id = '10000000-0000-0000-0000-000000000003'
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'membership identity is immutable'
);
select lives_ok(
  $$insert into public.organization_invitations (
    organization_id, email, role, token_digest, invited_by, expires_at
  ) values (
    '20000000-0000-0000-0000-000000000001', 'admin-b@tract.local', 'member',
    extensions.digest('application-spine-token', 'sha256'),
    '10000000-0000-0000-0000-000000000001', now() + interval '1 hour'
  )$$,
  'an organization administrator can create a digest-only invitation'
);
select throws_ok(
  $$update public.organization_invitations
    set status = 'accepted',
        target_user_id = '10000000-0000-0000-0000-000000000001',
        accepted_by = '10000000-0000-0000-0000-000000000001',
        accepted_at = now()
    where token_digest = extensions.digest('application-spine-token', 'sha256')$$,
  '42501',
  null,
  'direct updates cannot bypass transactional invitation acceptance'
);
delete from public.organization_invitations
where token_digest = extensions.digest('application-spine-token', 'sha256');
select is(
  (select count(*) from public.organization_invitations
    where token_digest = extensions.digest('application-spine-token', 'sha256')),
  1::bigint,
  'invitation evidence cannot be deleted by an organization administrator'
);
select throws_ok(
  $$insert into public.organization_invitations (
    organization_id, email, role, token_digest, invited_by, expires_at
  ) values (
    '20000000-0000-0000-0000-000000000002', 'outsider@example.invalid', 'member',
    extensions.digest('cross-tenant-token', 'sha256'),
    '10000000-0000-0000-0000-000000000001', now() + interval '1 hour'
  )$$,
  '42501',
  null,
  'administrator cannot invite into another tenant'
);
update public.organization_subscriptions
set provider_key = 'self-upgrade'
where organization_id = '20000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.organization_subscriptions
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and provider_key = 'self-upgrade'),
  0::bigint,
  'authenticated administrators cannot mutate subscription state directly'
);
update public.seat_entitlements
set included_seats = 2
where organization_id = '20000000-0000-0000-0000-000000000001';
select is(
  (select included_seats from public.seat_entitlements
    where organization_id = '20000000-0000-0000-0000-000000000001'),
  3,
  'authenticated administrators cannot mutate seat entitlements directly'
);
select is(
  (select count(*) from public.audit_events
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and entity_type = 'organization_invitations'
      and entity_id = (select id from public.organization_invitations where token_digest = extensions.digest('application-spine-token', 'sha256'))
      and actor_id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'invitation creation is audited with its actor'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","email":"scoped-a@tract.local"}', true);
select throws_ok(
  $$select public.accept_organization_invitation('application-spine-token')$$,
  '42501',
  null,
  'an invitation cannot be accepted by the wrong email'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated","email":"admin-b@tract.local"}', true);
select is(
  (select public.accept_organization_invitation('application-spine-token')),
  '20000000-0000-0000-0000-000000000001'::uuid,
  'the invited user is added to the organization transactionally'
);
select is(
  (select count(*) from public.memberships
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000003'
      and active),
  1::bigint,
  'accepted invitation creates one active membership'
);
select throws_ok(
  $$select public.accept_organization_invitation('application-spine-token')$$,
  '42501',
  null,
  'an invitation token cannot be replayed'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","email":"admin-a@tract.local"}', true);
select throws_ok(
  $$insert into public.organization_invitations (
    organization_id, email, role, token_digest, invited_by, expires_at
  ) values (
    '20000000-0000-0000-0000-000000000001', 'seat-four@example.invalid', 'member',
    extensions.digest('seat-limit-token', 'sha256'),
    '10000000-0000-0000-0000-000000000001', now() + interval '1 hour'
  )$$,
  '42501',
  null,
  'pending invitations reserve the final available seat'
);
select is(
  (select count(*) from public.audit_events
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and action = 'tampered'),
  0::bigint,
  'audit events cannot be mutated by authenticated users'
);
select is(
  (select app.can_access_scope(
    '20000000-0000-0000-0000-000000000002', null, null,
    '40000000-0000-0000-0000-000000000002', null, 'read'::public.permission_name
  )),
  false,
  'an administrator of one tenant cannot scope into another tenant'
);
select is(
  (select count(*) from public.organization_invitations
    where organization_id = '20000000-0000-0000-0000-000000000002'),
  0::bigint,
  'invitation rows are tenant-isolated'
);
select lives_ok(
  $$update public.memberships set active = false
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000002'$$,
  'an administrator can deactivate a non-administrator membership'
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","email":"scoped-a@tract.local"}', true);
select is(
  (select app.can_access_scope(
    '20000000-0000-0000-0000-000000000001', null, null,
    '40000000-0000-0000-0000-000000000001', null, 'read'::public.permission_name
  )),
  false,
  'inactive members lose access even if a grant exists'
);

select * from finish();
rollback;
