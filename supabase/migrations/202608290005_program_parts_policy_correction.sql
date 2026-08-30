begin;

-- Keep scoped reads and administrator mutations as separate policies so a
-- single SELECT does not evaluate overlapping permissive policies.
drop policy programs_admin_all on public.programs;
drop policy parts_admin_all on public.parts;
drop policy program_model_years_admin_all on public.program_model_years;
drop policy part_revisions_admin_all on public.part_revisions;
drop policy part_program_applications_admin_all on public.part_program_applications;

create policy programs_admin_insert on public.programs for insert to authenticated
with check (app.is_org_admin(organization_id));
create policy programs_admin_update on public.programs for update to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy programs_admin_delete on public.programs for delete to authenticated
using (app.is_org_admin(organization_id));

create policy parts_admin_insert on public.parts for insert to authenticated
with check (app.is_org_admin(organization_id));
create policy parts_admin_update on public.parts for update to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy parts_admin_delete on public.parts for delete to authenticated
using (app.is_org_admin(organization_id));

create policy program_model_years_admin_insert on public.program_model_years for insert to authenticated
with check (app.is_org_admin(organization_id));
create policy program_model_years_admin_update on public.program_model_years for update to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy program_model_years_admin_delete on public.program_model_years for delete to authenticated
using (app.is_org_admin(organization_id));

create policy part_revisions_admin_insert on public.part_revisions for insert to authenticated
with check (app.is_org_admin(organization_id));
create policy part_revisions_admin_update on public.part_revisions for update to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy part_revisions_admin_delete on public.part_revisions for delete to authenticated
using (app.is_org_admin(organization_id));

create policy part_program_applications_admin_insert on public.part_program_applications for insert to authenticated
with check (app.is_org_admin(organization_id));
create policy part_program_applications_admin_update on public.part_program_applications for update to authenticated
using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy part_program_applications_admin_delete on public.part_program_applications for delete to authenticated
using (app.is_org_admin(organization_id));

commit;
