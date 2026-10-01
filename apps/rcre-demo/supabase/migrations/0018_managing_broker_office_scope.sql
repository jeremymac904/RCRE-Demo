-- 0018 — Managing Broker office scope at the repository and RLS boundaries.
-- Broker Owners and legacy owners/brokers remain brokerage-wide. A Managing
-- Broker's scope is derived from their canonical users.office_id row.
update users set role='managing_broker' where platform_role='managing_broker' and role::text <> 'managing_broker';

create or replace function rcre_scoped_user_ids() returns setof uuid
language sql stable security definer set search_path=public,pg_temp
as $fn$
  select rcre_current_user_id()
   where rcre_current_org() is not null
     and rcre_current_user_id() is not null
     and rcre_current_role() in
         ('owner','broker','team_lead','agent','staff','recruiter','viewer',
          'transaction_coordinator','marketing_admin','trainer','managing_broker')
  union
  select tm.user_id
    from team_members tm
   where rcre_current_role()='team_lead'
     and tm.organization_id=rcre_current_org()
     and tm.team_id in (select rcre_led_team_ids())
  union
  select u.id
    from users u
   where rcre_current_role()='managing_broker'
     and u.organization_id=rcre_current_org()
     and u.office_id is not null
     and u.office_id=(select actor.office_id from users actor
                       where actor.organization_id=rcre_current_org()
                         and actor.id=rcre_current_user_id())
$fn$;

-- Recruiting prospects contain confidential information about people currently
-- working at other brokerages. Managing Brokers do not receive this PII by role.

-- Scope audit rows to actions authored by members in the Managing Broker's office.
drop policy if exists audit_events_select on audit_events;
create policy audit_events_select on audit_events for select using (
  organization_id=rcre_current_org()
  and (rcre_is_broker() or (rcre_current_role()='managing_broker' and actor_user_id in (select rcre_scoped_user_ids())))
);

-- Child records do not all duplicate officeId/ownerId. Resolve their office
-- through the canonical parent transaction instead of trusting optional child JSON.
create or replace function rcre_managing_broker_transaction_in_office(
  p_organization_id uuid, p_collection text, p_data jsonb, p_office_id text
) returns boolean
language sql stable security definer
set search_path=pg_catalog,public,pg_temp
set row_security=off
as $fn$
  select p_organization_id=public.rcre_current_org()
     and public.rcre_current_role()='managing_broker'
     and p_office_id is not null
     and p_office_id=(select u.office_id from public.users u where u.organization_id=public.rcre_current_org() and u.id=public.rcre_current_user_id())
     and case when p_collection='transactions' then p_data->>'officeId'=p_office_id
       when p_collection like 'transaction_%' then exists(
         select 1 from public.rcre_domain_records parent
          where parent.organization_id=p_organization_id
            and parent.collection='transactions'
            and parent.record_id=p_data->>'transactionId'
            and parent.data->>'officeId'=p_office_id
            and (p_data->>'officeId' is null or p_data->>'officeId'=p_office_id)
       )
       else false end
$fn$;
revoke all on function rcre_managing_broker_transaction_in_office(uuid,text,jsonb,text) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='rcre_app') then grant execute on function rcre_managing_broker_transaction_in_office(uuid,text,jsonb,text) to rcre_app; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then grant execute on function rcre_managing_broker_transaction_in_office(uuid,text,jsonb,text) to authenticated; end if;
end $$;

-- Preserve shared org resources and office-owned records. Transaction visibility
-- always resolves the parent transaction so incomplete child JSON cannot leak rows.
drop policy if exists rcre_domain_records_select on rcre_domain_records;
create policy rcre_domain_records_select on rcre_domain_records for select using (
 organization_id=rcre_current_org() and (
  rcre_is_broker()
  or (owner_user_id in (select rcre_scoped_user_ids()) and (rcre_current_role()<>'managing_broker' or collection not like 'transaction%'))
  or (owner_user_id is null and rcre_is_org_member() and collection not like 'transaction%'
      and (rcre_current_role()<>'managing_broker' or data->>'officeId' is null
           or data->>'officeId'=(select office_id from users where organization_id=rcre_current_org() and id=rcre_current_user_id())))
  or (collection in ('community_comments','community_reactions') and rcre_is_org_member()
      and rcre_community_post_is_published(data->>'postId'))
  or (collection='community_moderation' and rcre_is_org_member()
      and rcre_community_post_is_published(data->>'postId'))
  or (collection like 'transaction%' and (
    (rcre_current_role()='managing_broker' and rcre_managing_broker_transaction_in_office(organization_id,collection,data,(select office_id from users where organization_id=rcre_current_org() and id=rcre_current_user_id())))
    or (rcre_current_role()<>'managing_broker' and (data->>'ownerId'=rcre_current_user_id()::text or data->>'tcId'=rcre_current_user_id()::text
      or (rcre_current_role()='team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))))
  ))
 )
);
drop policy if exists rcre_domain_records_insert on rcre_domain_records;
create policy rcre_domain_records_insert on rcre_domain_records for insert with check (
 organization_id=rcre_current_org() and (
  rcre_is_broker()
  or owner_user_id=rcre_current_user_id()
  or (rcre_current_role()='managing_broker' and owner_user_id in (select rcre_scoped_user_ids()))
  or (owner_user_id is null and rcre_current_role()='managing_broker'
      and collection in ('academy_courses','academy_lessons','academy_config','academy_policies','academy_assignments','community_posts')
      and (collection<>'academy_assignments' or data->>'officeId'=(select office_id from users where organization_id=rcre_current_org() and id=rcre_current_user_id())))
  or (collection like 'transaction%' and (
    (rcre_current_role()='transaction_coordinator' and data->>'tcId'=rcre_current_user_id()::text)
    or (rcre_current_role()='team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))
  ))
  or (owner_user_id is null and rcre_current_role() in ('owner','broker'))
 )
);
drop policy if exists rcre_domain_records_update on rcre_domain_records;
create policy rcre_domain_records_update on rcre_domain_records for update using (
 organization_id=rcre_current_org() and (
  rcre_is_broker()
  or (owner_user_id in (select rcre_scoped_user_ids()) and (rcre_current_role()<>'managing_broker' or collection not like 'transaction%'))
  or (rcre_current_role()='marketing_admin' and collection in ('marketing_campaigns','marketing_batches','marketing_schedule'))
  or (owner_user_id is null and rcre_current_role()='managing_broker'
      and collection in ('academy_courses','academy_lessons','academy_config','academy_policies','academy_assignments','community_posts')
      and (collection<>'academy_assignments' or data->>'officeId'=(select office_id from users where organization_id=rcre_current_org() and id=rcre_current_user_id())))
  or (collection like 'transaction%' and (
    (rcre_current_role()='managing_broker' and rcre_managing_broker_transaction_in_office(organization_id,collection,data,(select office_id from users where organization_id=rcre_current_org() and id=rcre_current_user_id())))
    or (rcre_current_role()<>'managing_broker' and (data->>'ownerId'=rcre_current_user_id()::text or data->>'tcId'=rcre_current_user_id()::text
      or (rcre_current_role()='team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))))
  ))
 )
) with check (
 organization_id=rcre_current_org() and (
  rcre_is_broker()
  or (owner_user_id=rcre_current_user_id() and collection not like 'transaction%')
  or (rcre_current_role()='managing_broker' and collection not like 'transaction%' and owner_user_id in (select rcre_scoped_user_ids()))
  or (rcre_current_role()='marketing_admin' and collection in ('marketing_campaigns','marketing_batches','marketing_schedule'))
  or (collection like 'transaction%' and (
    (rcre_current_role()='managing_broker' and rcre_managing_broker_transaction_in_office(organization_id,collection,data,(select office_id from users where organization_id=rcre_current_org() and id=rcre_current_user_id())))
    or (rcre_current_role()<>'managing_broker' and (data->>'ownerId'=rcre_current_user_id()::text or data->>'tcId'=rcre_current_user_id()::text
      or (rcre_current_role()='team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))))
  ))
  or (owner_user_id is null and collection not like 'transaction%' and rcre_current_role() in ('owner','broker'))
  or (owner_user_id is null and rcre_current_role()='managing_broker'
      and collection in ('academy_courses','academy_lessons','academy_config','academy_policies','academy_assignments','community_posts')
      and (collection<>'academy_assignments' or data->>'officeId'=(select office_id from users where organization_id=rcre_current_org() and id=rcre_current_user_id())))
 )
);
-- Marketing Admins may review and schedule brokerage marketing, but cannot
-- transfer campaign ownership while using that cross-author approval capability.
create or replace function rcre_guard_marketing_admin_owner() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $fn$
begin
  if tg_op='UPDATE' and rcre_current_role()='marketing_admin'
     and new.collection in ('marketing_campaigns','marketing_batches','marketing_schedule')
     and (new.owner_user_id is distinct from old.owner_user_id
       or new.data->>'ownerId' is distinct from old.data->>'ownerId') then
    raise exception 'Marketing Admin cannot change record ownership' using errcode='42501';
  end if;
  return new;
end
$fn$;
revoke all on function rcre_guard_marketing_admin_owner() from public;
drop trigger if exists rcre_guard_marketing_admin_owner on rcre_domain_records;
create trigger rcre_guard_marketing_admin_owner before update on rcre_domain_records
for each row execute function rcre_guard_marketing_admin_owner();

-- Deletion policy remains owner/broker only; Managing Brokers archive or reassign.

create or replace function rcre_guard_transaction_assignment_fields() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp set row_security=off
as $fn$
declare office text; tc_role text; parent_data jsonb; parent_office text;
begin
  if new.collection like 'transaction%' and rcre_current_role()='managing_broker' then
    select u.office_id into office from users u where u.organization_id=rcre_current_org() and u.id=rcre_current_user_id();
    if office is null then raise exception 'Managing Broker office is unavailable' using errcode='42501'; end if;
    if new.collection='transactions' then
      if new.data->>'officeId' is distinct from office then
        raise exception 'Transaction is outside the Managing Broker office' using errcode='42501';
      end if;
      if new.owner_user_id is null or new.owner_user_id not in (select rcre_scoped_user_ids())
         or new.data->>'ownerId' is distinct from new.owner_user_id::text then
        raise exception 'Transaction owner must belong to the Managing Broker office' using errcode='42501';
      end if;
      if coalesce(new.data->>'tcId','')<>'' then
        select u.platform_role into tc_role from users u where u.organization_id=rcre_current_org() and u.id=(new.data->>'tcId')::uuid and u.office_id=office;
        if tc_role is distinct from 'transaction_coordinator' then
          raise exception 'Transaction coordinator must belong to the Managing Broker office' using errcode='42501';
        end if;
      end if;
      if tg_op='UPDATE' and (old.data->>'officeId' is distinct from office or old.owner_user_id is null or old.owner_user_id not in (select rcre_scoped_user_ids())) then
        raise exception 'Transaction is outside the Managing Broker office' using errcode='42501';
      end if;
    else
      select parent.data into parent_data from rcre_domain_records parent
       where parent.organization_id=rcre_current_org() and parent.collection='transactions'
         and parent.record_id=new.data->>'transactionId';
      parent_office:=parent_data->>'officeId';
      if parent_data is null or parent_office is distinct from office
         or (new.data->>'officeId' is not null and new.data->>'officeId' is distinct from parent_office) then
        raise exception 'Transaction child is outside the Managing Broker office' using errcode='42501';
      end if;
      if (new.data ? 'ownerId' and new.data->>'ownerId' is distinct from parent_data->>'ownerId')
         or (new.data ? 'tcId' and new.data->>'tcId' is distinct from parent_data->>'tcId')
         or (new.data ? 'teamId' and new.data->>'teamId' is distinct from parent_data->>'teamId') then
        raise exception 'Transaction child participants must match the parent transaction' using errcode='42501';
      end if;
      if tg_op='UPDATE' and (old.data->>'transactionId' is distinct from new.data->>'transactionId' or old.owner_user_id is distinct from new.owner_user_id) then
        raise exception 'Transaction child cannot change its parent or author' using errcode='42501';
      end if;
    end if;
  elsif new.collection like 'transaction%' and rcre_current_role() not in ('owner','broker') then
    if tg_op='INSERT' then
      if new.collection='transactions' and (new.owner_user_id is distinct from rcre_current_user_id()
        or new.data->>'ownerId' is distinct from rcre_current_user_id()::text or coalesce(new.data->>'tcId','')<>'') then
        raise exception 'Only an owner may create a transaction assignment';
      end if;
      if new.collection<>'transactions' and new.owner_user_id is distinct from rcre_current_user_id() then
        raise exception 'Transaction child records must be authored by the current participant';
      end if;
    else
      if new.owner_user_id is distinct from old.owner_user_id or new.data->>'ownerId' is distinct from old.data->>'ownerId'
        or new.data->>'tcId' is distinct from old.data->>'tcId' or new.data->>'teamId' is distinct from old.data->>'teamId'
        or new.data->>'transactionId' is distinct from old.data->>'transactionId' then
        raise exception 'Only an owner may change transaction ownership or participant assignment';
      end if;
    end if;
  end if;
  return new;
end
$fn$;

create or replace function rcre_auth_create_invitation(p_email citext,p_full_name text,p_platform_role text,p_office_id text,p_team_id text,p_market text,p_token_hash char(64),p_expires_at timestamptz,p_payload_ciphertext bytea,p_payload_nonce bytea,p_payload_tag bytea,p_idempotency_key text)
returns table(invitation_id uuid,user_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); target users%rowtype; i rcre_auth_invitations%rowtype; role_db rcre_user_role;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  if org is null or actor is null or actor_role not in ('owner','broker','managing_broker') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_email is null or p_full_name is null or length(trim(p_full_name))=0 or p_expires_at<=now() or p_expires_at>now()+interval '15 days' then raise exception 'invalid invitation'; end if;
  if p_platform_role not in ('agent','team_leader','managing_broker','broker_owner','transaction_coordinator','marketing_admin','trainer') then raise exception 'invalid role'; end if;
  if actor_role in ('broker','managing_broker') and (p_platform_role not in ('agent','team_leader','transaction_coordinator') or p_office_id is distinct from (select office_id from users where id=actor and organization_id=org)) then raise exception 'not authorized' using errcode='42501'; end if;
  select * into target from users u where u.organization_id=org and u.email=p_email for update;
  if found and actor_role in ('broker','managing_broker') and target.office_id is distinct from p_office_id then raise exception 'not authorized' using errcode='42501'; end if;
  if found and target.onboarding_status in ('active','invited') then raise exception 'member already exists' using errcode='23505'; end if;
  role_db:=case p_platform_role when 'broker_owner' then 'owner'::rcre_user_role when 'managing_broker' then 'managing_broker'::rcre_user_role when 'team_leader' then 'team_lead'::rcre_user_role when 'transaction_coordinator' then 'staff'::rcre_user_role when 'marketing_admin' then 'staff'::rcre_user_role when 'trainer' then 'viewer'::rcre_user_role else 'agent'::rcre_user_role end;
  if found then
    update users set full_name=trim(p_full_name),role=role_db,is_active=false,platform_role=p_platform_role,office_id=p_office_id,team_id=p_team_id,market=p_market,onboarding_status='invited',updated_at=now()
      where id=target.id returning * into target;
  else
    insert into users(organization_id,email,full_name,role,is_active,platform_role,office_id,team_id,market,onboarding_status)
      values(org,p_email,trim(p_full_name),role_db,false,p_platform_role,p_office_id,p_team_id,p_market,'invited') returning * into target;
  end if;
  insert into rcre_auth_invitations(organization_id,user_id,email,full_name,platform_role,office_id,team_id,token_hash,created_by,expires_at)
    values(org,target.id,p_email,trim(p_full_name),p_platform_role,p_office_id,p_team_id,p_token_hash,actor,p_expires_at) returning * into i;
  insert into rcre_auth_mail_outbox(organization_id,kind,recipient,payload_ciphertext,payload_nonce,payload_tag,idempotency_key)
    values(org,'invitation',p_email,p_payload_ciphertext,p_payload_nonce,p_payload_tag,i.id::text||':'||p_idempotency_key);
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','invitation.created','invitation',i.id::text,'write',true,jsonb_build_object('role',p_platform_role));
  return query select i.id,target.id;
end $$;

create or replace function rcre_auth_list_invitations()
returns table(id uuid,email text,full_name text,platform_role text,status text,created_at timestamptz,expires_at timestamptz,accepted_at timestamptz,mail_status text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role();
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  if org is null or actor is null or actor_role not in ('owner','broker','managing_broker') then raise exception 'not authorized' using errcode='42501'; end if;
  return query select i.id,i.email::text,i.full_name,i.platform_role,
    case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
    i.created_at,i.expires_at,i.accepted_at,
    (select m.status from rcre_auth_mail_outbox m where m.organization_id=i.organization_id and m.idempotency_key like i.id::text||':%' order by m.created_at desc limit 1)
  from rcre_auth_invitations i
  where i.organization_id=org and (actor_role='owner' or i.office_id=(select u.office_id from users u where u.id=actor and u.organization_id=org))
  order by i.created_at desc limit 200;
end $$;

create or replace function rcre_auth_resend_invitation(p_id uuid,p_token_hash char(64),p_expires_at timestamptz,p_payload_ciphertext bytea,p_payload_nonce bytea,p_payload_tag bytea,p_idempotency_key text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); i rcre_auth_invitations%rowtype;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  select * into i from rcre_auth_invitations x where x.id=p_id and x.organization_id=org and x.status in ('pending','expired') for update;
  if not found then return false; end if;
  if actor is null or actor_role not in ('owner','broker','managing_broker') or (actor_role in ('broker','managing_broker') and i.office_id is distinct from (select u.office_id from users u where u.id=actor and u.organization_id=org)) then raise exception 'not authorized' using errcode='42501'; end if;
  update rcre_auth_invitations set token_hash=p_token_hash,expires_at=p_expires_at,status='pending',accepted_at=null,cancelled_at=null where id=i.id;
  update rcre_auth_mail_outbox set status='cancelled' where organization_id=org and status in ('queued','retry') and idempotency_key like i.id::text||':%';
  insert into rcre_auth_mail_outbox(organization_id,kind,recipient,payload_ciphertext,payload_nonce,payload_tag,idempotency_key)
    values(org,'invitation_resend',i.email,p_payload_ciphertext,p_payload_nonce,p_payload_tag,p_idempotency_key);
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','invitation.resent','invitation',i.id::text,'write',true,'{}'::jsonb);
  return true;
end $$;

create or replace function rcre_auth_list_members()
returns table(user_id uuid,organization_id uuid,email text,full_name text,platform_role text,is_active boolean,onboarding_status text,office_id text,team_id text,market text,last_login_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); office text;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  if org is null or actor is null or actor_role not in ('owner','broker','managing_broker') then raise exception 'not authorized' using errcode='42501'; end if;
  select u.office_id into office from users u where u.id=actor and u.organization_id=org;
  return query select u.id,u.organization_id,u.email::text,u.full_name,u.platform_role,u.is_active,u.onboarding_status,u.office_id,u.team_id,u.market,u.last_login_at
    from users u where u.organization_id=org and (actor_role='owner' or u.office_id=office) order by u.full_name nulls last,u.email;
end $$;

create or replace function rcre_auth_update_member(p_user_id uuid,p_platform_role text,p_office_id text,p_team_id text,p_market text,p_active boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); target users%rowtype; mapped_role rcre_user_role;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  if org is null or actor is null or actor_role not in ('owner','broker','managing_broker') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_user_id=actor then raise exception 'cannot modify your own membership' using errcode='42501'; end if;
  if p_platform_role not in ('agent','team_leader','managing_broker','broker_owner','transaction_coordinator','marketing_admin','trainer') then raise exception 'invalid role'; end if;
  select * into target from users u where u.id=p_user_id and u.organization_id=org for update;
  if not found then return false; end if;
  if actor_role in ('broker','managing_broker') and (target.office_id is distinct from (select u.office_id from users u where u.id=actor and u.organization_id=org)
      or p_office_id is distinct from target.office_id or p_team_id is distinct from target.team_id
      or p_platform_role not in ('agent','team_leader','transaction_coordinator')) then raise exception 'not authorized' using errcode='42501'; end if;
  mapped_role:=case p_platform_role when 'broker_owner' then 'owner'::rcre_user_role when 'managing_broker' then 'managing_broker'::rcre_user_role when 'team_leader' then 'team_lead'::rcre_user_role when 'transaction_coordinator' then 'staff'::rcre_user_role when 'marketing_admin' then 'staff'::rcre_user_role when 'trainer' then 'viewer'::rcre_user_role else 'agent'::rcre_user_role end;
  update users set platform_role=p_platform_role,role=mapped_role,office_id=p_office_id,team_id=p_team_id,market=p_market,is_active=p_active,
    onboarding_status=case when p_active then 'active' else 'disabled' end,updated_at=now() where id=target.id;
  if not p_active then update rcre_auth_sessions set revoked_at=coalesce(revoked_at,now()) where user_id=target.id and organization_id=org and revoked_at is null; end if;
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','member.updated','user',target.id::text,'write',true,jsonb_build_object('platformRole',p_platform_role,'active',p_active));
  return true;
end $$;

create or replace function rcre_auth_revoke_user_sessions(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); office text; changed integer;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  if org is null or actor is null or actor_role not in ('owner','broker','managing_broker') then raise exception 'not authorized' using errcode='42501'; end if;
  select u.office_id into office from users u where u.id=actor and u.organization_id=org;
  update rcre_auth_sessions s set revoked_at=coalesce(s.revoked_at,now()) from users u
    where s.user_id=u.id and s.organization_id=org and u.organization_id=org and u.id=p_user_id and s.revoked_at is null
      and (actor_role='owner' or u.office_id=office);
  get diagnostics changed=row_count;
  if changed>0 then insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','member.sessions_revoked','user',p_user_id::text,'write',true,jsonb_build_object('sessionsRevoked',changed)); end if;
  return changed;
end $$;

create or replace function rcre_auth_cancel_invitation(p_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); i rcre_auth_invitations%rowtype; n integer;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  select * into i from rcre_auth_invitations x where x.id=p_id and x.organization_id=org and x.status in ('pending','expired') for update;
  if not found then return false; end if;
  if actor is null or actor_role not in ('owner','broker','managing_broker') or (actor_role in ('broker','managing_broker') and i.office_id is distinct from (select office_id from users where id=actor and organization_id=org)) then raise exception 'not authorized' using errcode='42501'; end if;
  update rcre_auth_invitations set status='cancelled',cancelled_at=now() where id=i.id;
  update users set is_active=false,onboarding_status='disabled' where id=i.user_id and onboarding_status='invited';
  update rcre_auth_mail_outbox set status='cancelled' where organization_id=org and status in ('queued','retry') and idempotency_key like i.id::text||':%';
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','invitation.cancelled','invitation',i.id::text,'write',true,'{}'::jsonb);
  return true;
end $$;
