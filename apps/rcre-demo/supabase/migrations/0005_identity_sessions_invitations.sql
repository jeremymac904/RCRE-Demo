-- 0005 — Google identity, revocable sessions and single-use invitations.
-- Authentication bootstrap is deliberately exposed only through narrowly
-- scoped SECURITY DEFINER functions. The application role cannot read these
-- tables directly, so RLS never needs to trust an unauthenticated request.

alter table users add column if not exists platform_role text not null default 'agent';
alter table users add column if not exists office_id text;
alter table users add column if not exists team_id text;
alter table users add column if not exists market text;
alter table users add column if not exists onboarding_status text not null default 'active';
alter table users add column if not exists last_login_at timestamptz;

do $$ begin
  alter table users add constraint users_platform_role_check
    check (platform_role in ('agent','team_leader','managing_broker','broker_owner','transaction_coordinator','marketing_admin','trainer'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table users add constraint users_onboarding_status_check
    check (onboarding_status in ('invited','active','disabled'));
exception when duplicate_object then null; end $$;

update users set platform_role = case role::text
  when 'owner' then 'broker_owner' when 'broker' then 'managing_broker'
  when 'team_lead' then 'team_leader' when 'staff' then 'transaction_coordinator'
  when 'viewer' then 'trainer' else 'agent' end
where platform_role = 'agent' and role::text <> 'agent';

create table if not exists rcre_auth_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider = 'google'),
  subject text not null,
  verified_email citext not null,
  linked_at timestamptz not null default now(),
  last_authenticated_at timestamptz,
  unique (provider, subject),
  unique (organization_id, user_id, provider)
);

create table if not exists rcre_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash char(64) not null unique,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  device_label text,
  user_agent_hash char(64),
  ip_hash char(64),
  check (expires_at > issued_at)
);
create index if not exists rcre_auth_sessions_user_idx on rcre_auth_sessions(organization_id,user_id,issued_at desc);
create index if not exists rcre_auth_sessions_expiry_idx on rcre_auth_sessions(expires_at) where revoked_at is null;

create table if not exists rcre_auth_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  email citext not null,
  full_name text not null,
  platform_role text not null check (platform_role in ('agent','team_leader','managing_broker','broker_owner','transaction_coordinator','marketing_admin','trainer')),
  office_id text,
  team_id text,
  token_hash char(64) not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  check (expires_at > created_at)
);
create unique index if not exists rcre_auth_pending_invite_email_uidx
  on rcre_auth_invitations(organization_id,email) where status='pending';
create index if not exists rcre_auth_invite_admin_idx on rcre_auth_invitations(organization_id,created_at desc);

-- Invitation links must be deliverable asynchronously, but their bearer token
-- is never stored in plaintext in the outbox. Ciphertext is produced by the
-- app using RCRE_MAIL_OUTBOX_KEY and decrypted only by the mail worker.
create table if not exists rcre_auth_mail_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null check (kind in ('invitation','invitation_resend')),
  recipient citext not null,
  payload_ciphertext bytea not null,
  payload_nonce bytea not null,
  payload_tag bytea not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','retry','failed','cancelled')),
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error_code text,
  provider_message_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists rcre_auth_mail_ready_idx on rcre_auth_mail_outbox(available_at,created_at) where status in ('queued','retry');

alter table rcre_auth_identities enable row level security;
alter table rcre_auth_identities force row level security;
alter table rcre_auth_sessions enable row level security;
alter table rcre_auth_sessions force row level security;
alter table rcre_auth_invitations enable row level security;
alter table rcre_auth_invitations force row level security;
alter table rcre_auth_mail_outbox enable row level security;
alter table rcre_auth_mail_outbox force row level security;
-- Explicit tenant and role predicates document the intended row visibility.
-- The app role receives no direct table privileges: all auth mutations and
-- bootstrap reads go through the constrained definer functions below.
drop policy if exists rcre_auth_identities_select on rcre_auth_identities;
create policy rcre_auth_identities_select on rcre_auth_identities for select
  using (organization_id=rcre_current_org() and (user_id=rcre_current_user_id() or rcre_is_broker()));
drop policy if exists rcre_auth_identities_insert on rcre_auth_identities;
create policy rcre_auth_identities_insert on rcre_auth_identities for insert
  with check (organization_id=rcre_current_org() and user_id=rcre_current_user_id());
drop policy if exists rcre_auth_identities_update on rcre_auth_identities;
create policy rcre_auth_identities_update on rcre_auth_identities for update
  using (organization_id=rcre_current_org() and user_id=rcre_current_user_id())
  with check (organization_id=rcre_current_org() and user_id=rcre_current_user_id());
drop policy if exists rcre_auth_identities_delete on rcre_auth_identities;
create policy rcre_auth_identities_delete on rcre_auth_identities for delete
  using (organization_id=rcre_current_org() and false);

drop policy if exists rcre_auth_sessions_select on rcre_auth_sessions;
create policy rcre_auth_sessions_select on rcre_auth_sessions for select
  using (organization_id=rcre_current_org() and (user_id=rcre_current_user_id() or rcre_is_broker()));
drop policy if exists rcre_auth_sessions_insert on rcre_auth_sessions;
create policy rcre_auth_sessions_insert on rcre_auth_sessions for insert
  with check (organization_id=rcre_current_org() and user_id=rcre_current_user_id());
drop policy if exists rcre_auth_sessions_update on rcre_auth_sessions;
create policy rcre_auth_sessions_update on rcre_auth_sessions for update
  using (organization_id=rcre_current_org() and user_id=rcre_current_user_id())
  with check (organization_id=rcre_current_org() and user_id=rcre_current_user_id());
drop policy if exists rcre_auth_sessions_delete on rcre_auth_sessions;
create policy rcre_auth_sessions_delete on rcre_auth_sessions for delete
  using (organization_id=rcre_current_org() and false);

drop policy if exists rcre_auth_invitations_select on rcre_auth_invitations;
create policy rcre_auth_invitations_select on rcre_auth_invitations for select
  using (organization_id=rcre_current_org() and rcre_is_broker());
drop policy if exists rcre_auth_invitations_insert on rcre_auth_invitations;
create policy rcre_auth_invitations_insert on rcre_auth_invitations for insert
  with check (organization_id=rcre_current_org() and rcre_is_broker() and created_by=rcre_current_user_id());
drop policy if exists rcre_auth_invitations_update on rcre_auth_invitations;
create policy rcre_auth_invitations_update on rcre_auth_invitations for update
  using (organization_id=rcre_current_org() and rcre_is_broker())
  with check (organization_id=rcre_current_org() and rcre_is_broker());
drop policy if exists rcre_auth_invitations_delete on rcre_auth_invitations;
create policy rcre_auth_invitations_delete on rcre_auth_invitations for delete
  using (organization_id=rcre_current_org() and false);

drop policy if exists rcre_auth_mail_outbox_select on rcre_auth_mail_outbox;
create policy rcre_auth_mail_outbox_select on rcre_auth_mail_outbox for select
  using (organization_id=rcre_current_org() and rcre_is_broker());
drop policy if exists rcre_auth_mail_outbox_insert on rcre_auth_mail_outbox;
create policy rcre_auth_mail_outbox_insert on rcre_auth_mail_outbox for insert
  with check (organization_id=rcre_current_org() and rcre_is_broker());
drop policy if exists rcre_auth_mail_outbox_update on rcre_auth_mail_outbox;
create policy rcre_auth_mail_outbox_update on rcre_auth_mail_outbox for update
  using (organization_id=rcre_current_org() and rcre_is_broker())
  with check (organization_id=rcre_current_org() and rcre_is_broker());
drop policy if exists rcre_auth_mail_outbox_delete on rcre_auth_mail_outbox;
create policy rcre_auth_mail_outbox_delete on rcre_auth_mail_outbox for delete
  using (organization_id=rcre_current_org() and false);
revoke all on rcre_auth_identities,rcre_auth_sessions,rcre_auth_invitations,rcre_auth_mail_outbox from public;
do $$ begin if exists(select 1 from pg_roles where rolname='rcre_app') then
  revoke all on rcre_auth_identities,rcre_auth_sessions,rcre_auth_invitations,rcre_auth_mail_outbox from rcre_app;
end if; end $$;

create or replace function rcre_auth_link_google(p_email citext,p_subject text,p_full_name text,p_invite_hash char(64))
returns table(user_id uuid,organization_id uuid,platform_role text,full_name text,office_id text,team_id text,market text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare u users%rowtype; i rcre_auth_invitations%rowtype; linked_subject text; active_matches integer; identity_subject text;
begin
  if p_subject is null or length(p_subject)<8 or p_email is null then return; end if;
  select ai.subject into linked_subject from rcre_auth_identities ai
   join users x on x.id=ai.user_id and x.organization_id=ai.organization_id
   where ai.provider='google' and ai.subject=p_subject and ai.verified_email=p_email and x.is_active and x.onboarding_status='active';
  if linked_subject is not null then
    update rcre_auth_identities set last_authenticated_at=now() where provider='google' and subject=p_subject;
    return query select x.id,x.organization_id,x.platform_role,coalesce(x.full_name,p_full_name),x.office_id,x.team_id,x.market
      from users x join rcre_auth_identities ai on ai.user_id=x.id and ai.organization_id=x.organization_id
      where ai.provider='google' and ai.subject=p_subject and x.is_active and x.onboarding_status='active';
    update users set last_login_at=now() where users.id in (select ai.user_id from rcre_auth_identities ai where ai.provider='google' and ai.subject=p_subject);
    return;
  end if;
  -- Link an existing active, invited RCRE membership by Google-verified email.
  select count(*) into active_matches from users x where x.email=p_email and x.is_active and x.onboarding_status='active';
  if active_matches>1 then return; end if;
  if active_matches=1 then
    select * into u from users x where x.email=p_email and x.is_active and x.onboarding_status='active' order by x.created_at limit 1;
    if exists(select 1 from rcre_auth_identities ai where ai.organization_id=u.organization_id and ai.user_id=u.id and ai.provider='google') then return; end if;
  else
    if p_invite_hash is null then return; end if;
    select * into i from rcre_auth_invitations x where x.token_hash=p_invite_hash and x.email=p_email and x.status='pending' and x.expires_at>now() for update;
    if not found then return; end if;
    select * into u from users x where x.id=i.user_id and x.organization_id=i.organization_id and x.email=p_email and x.onboarding_status='invited' for update;
    if not found then return; end if;
    select ai.subject into identity_subject from rcre_auth_identities ai where ai.organization_id=u.organization_id and ai.user_id=u.id and ai.provider='google';
    if identity_subject is not null and identity_subject<>p_subject then return; end if;
    update users set is_active=true,onboarding_status='active',full_name=coalesce(nullif(p_full_name,''),full_name),last_login_at=now(),updated_at=now()
      where id=u.id returning * into u;
    update rcre_auth_invitations set status='accepted',accepted_at=now() where id=i.id;
  end if;
  if identity_subject is null then
    insert into rcre_auth_identities(organization_id,user_id,provider,subject,verified_email,last_authenticated_at)
      values(u.organization_id,u.id,'google',p_subject,p_email,now());
  else
    update rcre_auth_identities set last_authenticated_at=now() where organization_id=u.organization_id and user_id=u.id and provider='google' and subject=p_subject;
  end if;
  return query select u.id,u.organization_id,u.platform_role,coalesce(u.full_name,p_full_name),u.office_id,u.team_id,u.market;
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(u.organization_id,u.id,'user','auth.google_linked','user',u.id::text,'write',true,jsonb_build_object('provider','google'));
end $$;

create or replace function rcre_auth_issue_session(p_user_id uuid,p_token_hash char(64),p_expires_at timestamptz,p_device_label text,p_user_agent_hash char(64),p_ip_hash char(64))
returns table(session_id uuid,organization_id uuid,user_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare u users%rowtype; s rcre_auth_sessions%rowtype;
begin
  select * into u from users x where x.id=p_user_id and x.is_active and x.onboarding_status='active'
    and exists(select 1 from rcre_auth_identities ai where ai.user_id=x.id and ai.organization_id=x.organization_id and ai.provider='google');
  if not found or p_expires_at<=now() or p_expires_at>now()+interval '13 hours' then return; end if;
  insert into rcre_auth_sessions(token_hash,organization_id,user_id,expires_at,device_label,user_agent_hash,ip_hash)
    values(p_token_hash,u.organization_id,u.id,p_expires_at,left(p_device_label,120),p_user_agent_hash,p_ip_hash) returning * into s;
  return query select s.id,s.organization_id,s.user_id;
end $$;

create or replace function rcre_auth_validate_session(p_token_hash char(64))
returns table(session_id uuid,user_id uuid,organization_id uuid,platform_role text,full_name text,office_id text,team_id text,market text,expires_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  return query update rcre_auth_sessions s set last_used_at=now()
    from users u where s.token_hash=p_token_hash and s.revoked_at is null and s.expires_at>now()
      and u.id=s.user_id and u.organization_id=s.organization_id and u.is_active and u.onboarding_status='active'
    returning s.id,u.id,u.organization_id,u.platform_role,u.full_name,u.office_id,u.team_id,u.market,s.expires_at;
end $$;

create or replace function rcre_auth_revoke_session(p_token_hash char(64)) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin update rcre_auth_sessions set revoked_at=coalesce(revoked_at,now()) where token_hash=p_token_hash and revoked_at is null; get diagnostics n=row_count; return n>0; end $$;

create or replace function rcre_auth_rotate_session(p_old_hash char(64),p_new_hash char(64),p_expires_at timestamptz,p_device_label text,p_user_agent_hash char(64),p_ip_hash char(64))
returns table(session_id uuid,organization_id uuid,user_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare u users%rowtype; s rcre_auth_sessions%rowtype;
begin
  select usr.* into u from rcre_auth_sessions old join users usr on usr.id=old.user_id and usr.organization_id=old.organization_id
    where old.token_hash=p_old_hash and old.revoked_at is null and old.expires_at>now() and u.is_active and u.onboarding_status='active' for update of old,u;
  if not found or p_expires_at<=now() or p_expires_at>now()+interval '13 hours' then return; end if;
  update rcre_auth_sessions set revoked_at=now() where token_hash=p_old_hash;
  insert into rcre_auth_sessions(token_hash,organization_id,user_id,expires_at,device_label,user_agent_hash,ip_hash)
    values(p_new_hash,u.organization_id,u.id,p_expires_at,left(p_device_label,120),p_user_agent_hash,p_ip_hash) returning * into s;
  return query select s.id,s.organization_id,s.user_id;
end $$;

create or replace function rcre_auth_invitation_status(p_token_hash char(64))
returns table(valid boolean,email text,expires_at timestamptz,full_name text)
language sql security definer set search_path=public,pg_temp as $$
  select (i.status='pending' and i.expires_at>now()),i.email::text,i.expires_at,i.full_name
  from rcre_auth_invitations i where i.token_hash=p_token_hash limit 1
$$;

create or replace function rcre_auth_create_invitation(p_email citext,p_full_name text,p_platform_role text,p_office_id text,p_team_id text,p_market text,p_token_hash char(64),p_expires_at timestamptz,p_payload_ciphertext bytea,p_payload_nonce bytea,p_payload_tag bytea,p_idempotency_key text)
returns table(invitation_id uuid,user_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); target users%rowtype; i rcre_auth_invitations%rowtype; role_db rcre_user_role;
begin
  if org is null or actor is null or actor_role not in ('owner','broker') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_email is null or p_full_name is null or length(trim(p_full_name))=0 or p_expires_at<=now() or p_expires_at>now()+interval '15 days' then raise exception 'invalid invitation'; end if;
  if p_platform_role not in ('agent','team_leader','managing_broker','broker_owner','transaction_coordinator','marketing_admin','trainer') then raise exception 'invalid role'; end if;
  if actor_role='broker' and (p_platform_role not in ('agent','team_leader','transaction_coordinator') or p_office_id is distinct from (select office_id from users where id=actor and organization_id=org)) then raise exception 'not authorized' using errcode='42501'; end if;
  select * into target from users u where u.organization_id=org and u.email=p_email for update;
  if found and target.onboarding_status in ('active','invited') then raise exception 'member already exists' using errcode='23505'; end if;
  role_db:=case p_platform_role when 'broker_owner' then 'owner'::rcre_user_role when 'managing_broker' then 'broker'::rcre_user_role when 'team_leader' then 'team_lead'::rcre_user_role when 'transaction_coordinator' then 'staff'::rcre_user_role when 'marketing_admin' then 'staff'::rcre_user_role when 'trainer' then 'viewer'::rcre_user_role else 'agent'::rcre_user_role end;
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
  if org is null or actor is null or actor_role not in ('owner','broker') then raise exception 'not authorized' using errcode='42501'; end if;
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
  select * into i from rcre_auth_invitations x where x.id=p_id and x.organization_id=org and x.status in ('pending','expired') for update;
  if not found then return false; end if;
  if actor is null or actor_role not in ('owner','broker') or (actor_role='broker' and i.office_id is distinct from (select u.office_id from users u where u.id=actor and u.organization_id=org)) then raise exception 'not authorized' using errcode='42501'; end if;
  update rcre_auth_invitations set token_hash=p_token_hash,expires_at=p_expires_at,status='pending',accepted_at=null,cancelled_at=null where id=i.id;
  update rcre_auth_mail_outbox set status='cancelled' where organization_id=org and status in ('queued','retry') and idempotency_key like i.id::text||':%';
  insert into rcre_auth_mail_outbox(organization_id,kind,recipient,payload_ciphertext,payload_nonce,payload_tag,idempotency_key)
    values(org,'invitation_resend',i.email,p_payload_ciphertext,p_payload_nonce,p_payload_tag,p_idempotency_key);
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','invitation.resent','invitation',i.id::text,'write',true,'{}'::jsonb);
  return true;
end $$;

create or replace function rcre_auth_claim_mail(p_limit integer default 20)
returns table(id uuid,recipient text,payload_ciphertext bytea,payload_nonce bytea,payload_tag bytea,attempt_count integer)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  return query with ready as (
    select m.id from rcre_auth_mail_outbox m where m.status in ('queued','retry') and m.available_at<=now() and m.attempt_count<5
    order by m.available_at,m.created_at for update skip locked limit greatest(1,least(coalesce(p_limit,20),50))
  ), claimed as (
    update rcre_auth_mail_outbox m set status='sending',attempt_count=m.attempt_count+1
    from ready where m.id=ready.id returning m.id,m.recipient::text,m.payload_ciphertext,m.payload_nonce,m.payload_tag,m.attempt_count
  ) select * from claimed;
end $$;

create or replace function rcre_auth_finish_mail(p_id uuid,p_success boolean,p_error_code text,p_retry_at timestamptz,p_provider_message_id text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
  update rcre_auth_mail_outbox set status=case when p_success then 'sent' when attempt_count>=5 then 'failed' else 'retry' end,
    sent_at=case when p_success then now() else null end,
    last_error_code=case when p_success then null else left(regexp_replace(coalesce(p_error_code,'delivery_error'),'[^a-zA-Z0-9_.-]','','g'),80) end,
    available_at=case when p_success then available_at else coalesce(p_retry_at,now()+interval '15 minutes') end,
    provider_message_id=case when p_success then left(p_provider_message_id,200) else null end
  where id=p_id and status='sending';
  get diagnostics n=row_count; return n>0;
end $$;

create or replace function rcre_auth_list_members()
returns table(user_id uuid,organization_id uuid,email text,full_name text,platform_role text,is_active boolean,onboarding_status text,office_id text,team_id text,market text,last_login_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); office text;
begin
  if org is null or actor is null or actor_role not in ('owner','broker') then raise exception 'not authorized' using errcode='42501'; end if;
  select u.office_id into office from users u where u.id=actor and u.organization_id=org;
  return query select u.id,u.organization_id,u.email::text,u.full_name,u.platform_role,u.is_active,u.onboarding_status,u.office_id,u.team_id,u.market,u.last_login_at
    from users u where u.organization_id=org and (actor_role='owner' or u.office_id=office) order by u.full_name nulls last,u.email;
end $$;

create or replace function rcre_auth_update_member(p_user_id uuid,p_platform_role text,p_office_id text,p_team_id text,p_market text,p_active boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); actor_role text:=rcre_current_role(); target users%rowtype; mapped_role rcre_user_role;
begin
  if org is null or actor is null or actor_role not in ('owner','broker') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_user_id=actor then raise exception 'cannot modify your own membership' using errcode='42501'; end if;
  if p_platform_role not in ('agent','team_leader','managing_broker','broker_owner','transaction_coordinator','marketing_admin','trainer') then raise exception 'invalid role'; end if;
  select * into target from users u where u.id=p_user_id and u.organization_id=org for update;
  if not found then return false; end if;
  if actor_role='broker' and (target.office_id is distinct from (select u.office_id from users u where u.id=actor and u.organization_id=org)
      or p_office_id is distinct from target.office_id or p_team_id is distinct from target.team_id
      or p_platform_role not in ('agent','team_leader','transaction_coordinator')) then raise exception 'not authorized' using errcode='42501'; end if;
  mapped_role:=case p_platform_role when 'broker_owner' then 'owner'::rcre_user_role when 'managing_broker' then 'broker'::rcre_user_role when 'team_leader' then 'team_lead'::rcre_user_role when 'transaction_coordinator' then 'staff'::rcre_user_role when 'marketing_admin' then 'staff'::rcre_user_role when 'trainer' then 'viewer'::rcre_user_role else 'agent'::rcre_user_role end;
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
  if org is null or actor is null or actor_role not in ('owner','broker') then raise exception 'not authorized' using errcode='42501'; end if;
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
  select * into i from rcre_auth_invitations x where x.id=p_id and x.organization_id=org and x.status in ('pending','expired') for update;
  if not found then return false; end if;
  if actor is null or actor_role not in ('owner','broker') or (actor_role='broker' and i.office_id is distinct from (select office_id from users where id=actor and organization_id=org)) then raise exception 'not authorized' using errcode='42501'; end if;
  update rcre_auth_invitations set status='cancelled',cancelled_at=now() where id=i.id;
  update users set is_active=false,onboarding_status='disabled' where id=i.user_id and onboarding_status='invited';
  update rcre_auth_mail_outbox set status='cancelled' where organization_id=org and status in ('queued','retry') and idempotency_key like i.id::text||':%';
  insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
    values(org,actor,'user','invitation.cancelled','invitation',i.id::text,'write',true,'{}'::jsonb);
  return true;
end $$;

revoke all on function rcre_auth_link_google(citext,text,text,char) from public;
revoke all on function rcre_auth_issue_session(uuid,char,timestamptz,text,char,char) from public;
revoke all on function rcre_auth_validate_session(char) from public;
revoke all on function rcre_auth_revoke_session(char) from public;
revoke all on function rcre_auth_rotate_session(char,char,timestamptz,text,char,char) from public;
revoke all on function rcre_auth_invitation_status(char) from public;
revoke all on function rcre_auth_create_invitation(citext,text,text,text,text,text,char,timestamptz,bytea,bytea,bytea,text) from public;
revoke all on function rcre_auth_cancel_invitation(uuid) from public;
revoke all on function rcre_auth_list_members() from public;
revoke all on function rcre_auth_update_member(uuid,text,text,text,text,boolean) from public;
revoke all on function rcre_auth_revoke_user_sessions(uuid) from public;
revoke all on function rcre_auth_claim_mail(integer) from public;
revoke all on function rcre_auth_finish_mail(uuid,boolean,text,timestamptz,text) from public;
revoke all on function rcre_auth_list_invitations() from public;
revoke all on function rcre_auth_resend_invitation(uuid,char,timestamptz,bytea,bytea,bytea,text) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='rcre_app') then
    grant execute on function rcre_auth_link_google(citext,text,text,char) to rcre_app;
    grant execute on function rcre_auth_issue_session(uuid,char,timestamptz,text,char,char) to rcre_app;
    grant execute on function rcre_auth_validate_session(char) to rcre_app;
    grant execute on function rcre_auth_revoke_session(char) to rcre_app;
    grant execute on function rcre_auth_rotate_session(char,char,timestamptz,text,char,char) to rcre_app;
    grant execute on function rcre_auth_invitation_status(char) to rcre_app;
    grant execute on function rcre_auth_create_invitation(citext,text,text,text,text,text,char,timestamptz,bytea,bytea,bytea,text) to rcre_app;
    grant execute on function rcre_auth_cancel_invitation(uuid) to rcre_app;
    grant execute on function rcre_auth_list_members() to rcre_app;
    grant execute on function rcre_auth_update_member(uuid,text,text,text,text,boolean) to rcre_app;
    grant execute on function rcre_auth_revoke_user_sessions(uuid) to rcre_app;
    grant execute on function rcre_auth_claim_mail(integer) to rcre_app;
    grant execute on function rcre_auth_finish_mail(uuid,boolean,text,timestamptz,text) to rcre_app;
    grant execute on function rcre_auth_list_invitations() to rcre_app;
    grant execute on function rcre_auth_resend_invitation(uuid,char,timestamptz,bytea,bytea,bytea,text) to rcre_app;
  end if;
end $$;
