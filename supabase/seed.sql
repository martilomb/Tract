-- Local development seed only. Never run this file against a customer or production project.
-- The application UI uses separate bundled synthetic fixtures until a real Supabase project is connected.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@tract.local', extensions.crypt('local-demo-only', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'scoped-a@tract.local', extensions.crypt('local-demo-only', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Scoped A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'admin-b@tract.local', extensions.crypt('local-demo-only', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin B"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.organizations (id, name, slug, default_currency) values
  ('20000000-0000-0000-0000-000000000001', 'Tract Local A', 'tract-local-a', 'USD'),
  ('20000000-0000-0000-0000-000000000002', 'Tract Local B', 'tract-local-b', 'EUR')
on conflict (id) do nothing;

insert into public.memberships (id, organization_id, user_id, role) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'administrator'),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'member'),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'administrator')
on conflict (organization_id, user_id) do nothing;

insert into public.departments (id, organization_id, name) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Electronics'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Structures')
on conflict (id) do nothing;

insert into public.technical_teams (id, organization_id, name) values
  ('31000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Controls'),
  ('31000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Body')
on conflict (id) do nothing;

insert into public.oems (id, organization_id, name, external_code) values
  ('32000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Demo OEM A', 'OEM-A'),
  ('32000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Demo OEM B', 'OEM-B')
on conflict (id) do nothing;

insert into public.suppliers (id, organization_id, name, external_code) values
  ('33000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Demo Supplier A', 'SUP-A')
on conflict (id) do nothing;

insert into public.programs (id, organization_id, oem_id, department_id, technical_team_id, code, name, start_date, end_date) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'PROGRAM-A', 'Local Program A', '2026-01-01', '2030-12-31'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', 'PROGRAM-B', 'Local Program B', '2026-01-01', '2030-12-31')
on conflict (id) do nothing;

insert into public.parts (id, organization_id, program_id, department_id, technical_team_id, part_number, description) values
  ('41000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'PART-A', 'Local part A'),
  ('41000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', 'PART-B', 'Local part B')
on conflict (id) do nothing;

insert into public.permission_grants (id, organization_id, user_id, grant_type, resource_id, permissions, created_by) values
  ('42000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'program', '40000000-0000-0000-0000-000000000001', array['read','write']::public.permission_name[], '10000000-0000-0000-0000-000000000001')
on conflict (organization_id, user_id, grant_type, resource_id) do nothing;

insert into public.configuration_versions (id, organization_id, kind, version, effective_from, status, payload, created_by) values
  (
    '50000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'dcr_workflow', 1, '2026-01-01', 'active',
    '{"statuses":["draft","submitted","under_review","approved","active","closed","rejected","cancelled"],"transitions":[{"from":"draft","to":"submitted"},{"from":"draft","to":"cancelled"},{"from":"submitted","to":"under_review"},{"from":"submitted","to":"rejected"},{"from":"submitted","to":"cancelled"},{"from":"under_review","to":"approved"},{"from":"under_review","to":"rejected"},{"from":"under_review","to":"cancelled"},{"from":"approved","to":"active"},{"from":"approved","to":"cancelled"},{"from":"active","to":"closed"}]}'::jsonb,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'recovery_policy', 1, '2026-01-01', 'active',
    '{"eligible_event_types":["actual","correction","return"],"settlement_scale":2,"settlement_rounding":"half-even"}'::jsonb,
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (id) do nothing;

commit;
