-- Published Community discussions are shared with organization members.
-- Interaction visibility follows its published parent post; draft discussion
-- remains private to the post owner and moderators.
create or replace function rcre_community_post_is_published(p_post_id text) returns boolean
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
set row_security = off
as $fn$
  select exists (
    select 1 from rcre_domain_records post
     where post.organization_id = rcre_current_org()
       and post.collection = 'community_posts'
       and post.record_id = p_post_id
       and post.owner_user_id is null
       and coalesce(post.data->>'draft', 'false') <> 'true'
       and coalesce(post.data->>'deleted', 'false') <> 'true'
  )
$fn$;

revoke all on function rcre_community_post_is_published(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then
    grant execute on function rcre_community_post_is_published(text) to rcre_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function rcre_community_post_is_published(text) to authenticated;
  end if;
end $$;

drop policy if exists rcre_domain_records_select on rcre_domain_records;
create policy rcre_domain_records_select on rcre_domain_records for select
  using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or owner_user_id in (select rcre_scoped_user_ids())
      or (owner_user_id is null and rcre_is_org_member())
      or (
        collection in ('community_comments', 'community_reactions')
        and rcre_is_org_member()
        and rcre_community_post_is_published(data->>'postId')
      )
    )
  );
