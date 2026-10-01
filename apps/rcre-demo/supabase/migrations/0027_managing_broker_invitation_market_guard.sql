-- 0027 — enforce the Managing Broker's market boundary inside invitation writes.
-- The role/office check in migration 0018 remains; this replacement adds the
-- state check at the database boundary so direct RPC calls cannot bypass it.
create or replace function rcre_auth_create_invitation(p_email citext,p_full_name text,p_platform_role text,p_office_id text,p_team_id text,p_market text,p_token_hash char(64),p_expires_at timestamptz,p_payload_ciphertext bytea,p_payload_nonce bytea,p_payload_tag bytea,p_idempotency_key text)
returns table(invitation_id uuid,user_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  org uuid:=rcre_current_org();
  actor uuid:=rcre_current_user_id();
  actor_role text:=rcre_current_role();
  target users%rowtype;
  i rcre_auth_invitations%rowtype;
  role_db rcre_user_role;
  manager_state text;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  if org is null or actor is null or actor_role not in ('owner','broker','managing_broker') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_email is null or p_full_name is null or length(trim(p_full_name))=0 or p_expires_at<=now() or p_expires_at>now()+interval '15 days' then raise exception 'invalid invitation'; end if;
  if p_platform_role not in ('agent','team_leader','managing_broker','broker_owner','transaction_coordinator','marketing_admin','trainer') then raise exception 'invalid role'; end if;
  if actor_role in ('broker','managing_broker') and (p_platform_role not in ('agent','team_leader','transaction_coordinator') or p_office_id is distinct from (select office_id from users where id=actor and organization_id=org)) then raise exception 'not authorized' using errcode='42501'; end if;
  if actor_role='managing_broker' then
    select case
      when lower(trim(u.office_id)) in ('al','alabama') then 'Alabama'
      when lower(trim(u.office_id)) in ('fl','florida') then 'Florida'
      when u.market in ('Alabama','Florida') then u.market
      else null
    end into manager_state
    from users u where u.organization_id=org and u.id=actor;
    if manager_state is null or p_market is distinct from manager_state then raise exception 'not authorized' using errcode='42501'; end if;
  end if;
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


-- Resend must re-check persisted invitation market and role. This also blocks
-- resending any cross-market invitations created before this guard existed.
create or replace function rcre_auth_resend_invitation(p_id uuid,p_token_hash char(64),p_expires_at timestamptz,p_payload_ciphertext bytea,p_payload_nonce bytea,p_payload_tag bytea,p_idempotency_key text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare
  org uuid:=rcre_current_org();
  actor uuid:=rcre_current_user_id();
  actor_role text:=rcre_current_role();
  i rcre_auth_invitations%rowtype;
  manager_state text;
  target_market text;
begin
  if actor_role='managing_broker' and not exists(select 1 from users u where u.organization_id=org and u.id=actor and u.office_id is not null) then raise exception 'not authorized' using errcode='42501'; end if;
  select * into i from rcre_auth_invitations x where x.id=p_id and x.organization_id=org and x.status in ('pending','expired') for update;
  if not found then return false; end if;
  if org is null or actor is null or actor_role not in ('owner','broker','managing_broker')
    or (actor_role in ('broker','managing_broker') and i.office_id is distinct from (select u.office_id from users u where u.id=actor and u.organization_id=org)) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if actor_role in ('broker','managing_broker') and i.platform_role not in ('agent','team_leader','transaction_coordinator') then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if actor_role='managing_broker' then
    select case
      when lower(trim(u.office_id)) in ('al','alabama') then 'Alabama'
      when lower(trim(u.office_id)) in ('fl','florida') then 'Florida'
      when u.market in ('Alabama','Florida') then u.market
      else null
    end into manager_state
    from users u where u.organization_id=org and u.id=actor;
    select u.market into target_market from users u where u.organization_id=org and u.id=i.user_id for update;
    if manager_state is null or target_market is distinct from manager_state then raise exception 'not authorized' using errcode='42501'; end if;
  end if;
  update rcre_auth_invitations set token_hash=p_token_hash,expires_at=p_expires_at,status='pending',accepted_at=null,cancelled_at=null where id=i.id;
  update rcre_auth_mail_outbox set status='cancelled' where organization_id=org and status in ('queued','retry') and idempotency_key like i.id::text||':%';
  insert into rcre_auth_mail_outbox(organization_id,kind,recipient,payload_ciphertext,payload_nonce,payload_tag,idempotency_key)
    values(org,'invitation_resend',i.email,p_payload_ciphertext,p_payload_nonce,p_payload_tag,p_idempotency_key);
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','invitation.resent','invitation',i.id::text,'write',true,jsonb_build_object('market',target_market));
  return true;
end $$;
