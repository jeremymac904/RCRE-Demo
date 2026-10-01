-- Fix the session rotation predicate introduced in migration 0005.
-- The original function joined `users usr` but referenced an uninitialized
-- PL/pgSQL row variable `u`, causing every valid rotation to be rejected.
-- This is forward-only and safe to re-run: CREATE OR REPLACE preserves the
-- function signature and grants while replacing only its implementation.
create or replace function rcre_auth_rotate_session(p_old_hash char(64),p_new_hash char(64),p_expires_at timestamptz,p_device_label text,p_user_agent_hash char(64),p_ip_hash char(64))
returns table(session_id uuid,organization_id uuid,user_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare usr users%rowtype; old_session rcre_auth_sessions%rowtype; s rcre_auth_sessions%rowtype;
begin
  select old,u into old_session,usr
    from rcre_auth_sessions old
    join users u on u.id=old.user_id and u.organization_id=old.organization_id
    where old.token_hash=p_old_hash and old.revoked_at is null and old.expires_at>now()
      and u.is_active and u.onboarding_status='active'
    for update of old,u;
  if not found or p_expires_at<=now() or p_expires_at>now()+interval '13 hours'
      or p_new_hash=p_old_hash then return; end if;

  update rcre_auth_sessions set revoked_at=now()
    where id=old_session.id and revoked_at is null;
  if not found then return; end if;
  insert into rcre_auth_sessions(token_hash,organization_id,user_id,expires_at,device_label,user_agent_hash,ip_hash)
    values(p_new_hash,usr.organization_id,usr.id,p_expires_at,left(p_device_label,120),p_user_agent_hash,p_ip_hash)
    returning * into s;
  return query select s.id,s.organization_id,s.user_id;
end $$;
