-- Give authenticated RCRE operational roles distinct database identities.
-- Older 0003 intentionally makes legacy `staff` an organization-wide reader;
-- current platform roles must not be collapsed into that broad role.
alter type rcre_user_role add value if not exists 'transaction_coordinator';
alter type rcre_user_role add value if not exists 'marketing_admin';
alter type rcre_user_role add value if not exists 'trainer';

create or replace function rcre_scoped_user_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $fn$
  select rcre_current_user_id()
   where rcre_current_org() is not null
     and rcre_current_user_id() is not null
     and rcre_current_role() in
         ('owner', 'broker', 'team_lead', 'agent', 'staff', 'recruiter', 'viewer',
          'transaction_coordinator', 'marketing_admin', 'trainer')
  union
  select tm.user_id
    from team_members tm
   where rcre_current_role() = 'team_lead'
     and tm.organization_id = rcre_current_org()
     and tm.team_id in (select rcre_led_team_ids())
$fn$;

-- Deliberately retain legacy `staff` here for old pre-platform members. New
-- Transaction Coordinator, Marketing/Admin, and Trainer sessions are not staff.
create or replace function rcre_is_org_wide_reader() returns boolean
language sql stable
as $fn$
  select coalesce(rcre_current_role() in ('owner', 'broker', 'staff'), false)
$fn$;
