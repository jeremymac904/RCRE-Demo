-- 0021 — enforce Managing Broker training assignment scope at the database boundary.
-- Service validation is helpful, but RLS-bound direct writes must not be able to
-- assign brokerage-wide or cross-office training by forging collection JSON.
create or replace function rcre_guard_managing_broker_academy_assignment()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
set row_security=off
as $fn$
declare
  actor_office text;
  actor_team text;
  target_type text;
  target_value text;
begin
  if public.rcre_current_role() <> 'managing_broker' or new.collection <> 'academy_assignments' then
    return new;
  end if;

  select u.office_id, u.team_id into actor_office, actor_team
    from public.users u
   where u.organization_id=public.rcre_current_org()
     and u.id=public.rcre_current_user_id()
     and u.is_active
     and u.onboarding_status='active';

  target_type := new.data->>'targetType';
  target_value := new.data->>'target';

  if actor_office is null
     or new.data->>'officeId' is distinct from actor_office
     or not case
       when target_type='office' then target_value=actor_office
       when target_type='team' then actor_team is not null and target_value=actor_team
       when target_type='agent' and target_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then exists (
         select 1 from public.users learner
          where learner.organization_id=new.organization_id
            and learner.id=target_value::uuid
            and learner.office_id=actor_office
            and learner.is_active
            and learner.onboarding_status='active'
       )
       else false
     end then
    raise exception 'Managing Broker training assignments must target an active learner or the actor own office/team'
      using errcode='42501';
  end if;
  return new;
end
$fn$;

drop trigger if exists rcre_managing_broker_academy_assignment_guard on rcre_domain_records;
create trigger rcre_managing_broker_academy_assignment_guard
before insert or update on rcre_domain_records
for each row execute function rcre_guard_managing_broker_academy_assignment();

-- Publishing a reviewed course or lesson is a separate approval step. Enforce
-- the two-person transition in the database so a direct RLS client cannot set
-- state/status='published' or forge reviewedBy outside the service boundary.
create or replace function rcre_guard_academy_publication()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
set row_security=off
as $fn$
declare
  submitter text;
  reviewer text;
begin
  if new.collection not in ('academy_courses','academy_lessons') then
    return new;
  end if;

  if tg_op='UPDATE' and new.data->>'ownerId' is distinct from old.data->>'ownerId' then
    raise exception 'Academy content ownership cannot be changed by a record update' using errcode='42501';
  end if;

  if (new.collection='academy_courses' and new.data->>'state'='review')
     or (new.collection='academy_lessons' and new.data->>'status'='review') then
    if new.data->>'submittedBy' is distinct from public.rcre_current_user_id()::text then
      raise exception 'The authenticated editor must be recorded as the Academy review submitter' using errcode='42501';
    end if;
  end if;

  if (new.collection='academy_courses' and new.data->>'state'='published')
     or (new.collection='academy_lessons' and new.data->>'status'='published') then
    if public.rcre_current_role() not in ('owner','broker','managing_broker') then
      raise exception 'Only brokerage leadership may publish Academy content' using errcode='42501';
    end if;
    if tg_op <> 'UPDATE' then
      raise exception 'Academy content must be reviewed in a separate update before publication' using errcode='42501';
    end if;

    if new.collection='academy_courses' then
      if old.data->>'state' is distinct from 'review'
         or new.data->>'title' is distinct from old.data->>'title'
         or new.data->>'description' is distinct from old.data->>'description'
         or new.data->>'category' is distinct from old.data->>'category'
         or new.data->>'order' is distinct from old.data->>'order'
         or new.data->>'prerequisite' is distinct from old.data->>'prerequisite'
         or new.data->'resources' is distinct from old.data->'resources' then
        raise exception 'Reviewed Academy course content changed; submit a new review version' using errcode='42501';
      end if;
    else
      if old.data->>'status' is distinct from 'review'
         or new.data->>'courseId' is distinct from old.data->>'courseId'
         or new.data->>'title' is distinct from old.data->>'title'
         or new.data->>'description' is distinct from old.data->>'description'
         or new.data->>'order' is distinct from old.data->>'order'
         or new.data->'resources' is distinct from old.data->'resources' then
        raise exception 'Reviewed Academy lesson content changed; submit a new review version' using errcode='42501';
      end if;
    end if;

    submitter := coalesce(old.data->>'submittedBy',old.data->>'ownerId');
    reviewer := public.rcre_current_user_id()::text;
    if submitter is null or submitter=reviewer
       or new.data->>'ownerId' is distinct from old.data->>'ownerId'
       or new.data->>'submittedBy' is distinct from old.data->>'submittedBy'
       or new.data->>'reviewedBy' is distinct from reviewer then
      raise exception 'A different brokerage leader must review the exact submitted Academy content' using errcode='42501';
    end if;
  end if;
  return new;
end
$fn$;

drop trigger if exists rcre_academy_publication_guard on rcre_domain_records;
create trigger rcre_academy_publication_guard
before insert or update on rcre_domain_records
for each row execute function rcre_guard_academy_publication();
