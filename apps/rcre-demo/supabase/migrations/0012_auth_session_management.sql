-- 0012 — self-service session inventory and per-device revocation.
-- The app role has no direct access to auth session rows; these definer
-- functions use the transaction-local RLS identity and are deliberately
-- limited to the signed-in user's own sessions.

create or replace function rcre_auth_list_my_sessions()
returns table(id uuid, issued_at timestamptz, expires_at timestamptz, revoked_at timestamptz, last_used_at timestamptz, device_label text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id();
begin
  if org is null or actor is null then raise exception 'not authorized' using errcode='42501'; end if;
  return query select s.id,s.issued_at,s.expires_at,s.revoked_at,s.last_used_at,s.device_label
    from rcre_auth_sessions s where s.organization_id=org and s.user_id=actor
    order by s.issued_at desc;
end $$;

create or replace function rcre_auth_revoke_session_by_id(p_session_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid:=rcre_current_org(); actor uuid:=rcre_current_user_id(); n integer;
begin
  if org is null or actor is null then raise exception 'not authorized' using errcode='42501'; end if;
  update rcre_auth_sessions s set revoked_at=coalesce(s.revoked_at,now())
    where s.id=p_session_id and s.organization_id=org and s.user_id=actor and s.revoked_at is null;
  get diagnostics n=row_count;
  if n>0 then
    insert into audit_events(organization_id,actor_user_id,actor_kind,action,target_type,target_id,effect,allowed,detail)
      values(org,actor,'user','auth.session_revoked','auth_session',p_session_id::text,'write',true,'{}'::jsonb);
  end if;
  return n>0;
end $$;

revoke all on function rcre_auth_list_my_sessions() from public;
revoke all on function rcre_auth_revoke_session_by_id(uuid) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='rcre_app') then
    grant execute on function rcre_auth_list_my_sessions() to rcre_app;
    grant execute on function rcre_auth_revoke_session_by_id(uuid) to rcre_app;
  end if;
end $$;
