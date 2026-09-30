-- 0009 — transaction participant visibility and writes on the shared JSONB bridge.
-- The participant fields are duplicated onto child metadata records intentionally so
-- RLS can enforce owner, team-lead and assigned-TC access without opening CRM data.

drop policy if exists rcre_domain_records_select on rcre_domain_records;
create policy rcre_domain_records_select on rcre_domain_records for select
  using (
    organization_id = rcre_current_org()
    and (
      rcre_is_broker()
      or owner_user_id in (select rcre_scoped_user_ids())
      or (owner_user_id is null and rcre_is_org_member())
      or (
        collection like 'transaction%'
        and (
          data->>'ownerId' = rcre_current_user_id()::text
          or data->>'tcId' = rcre_current_user_id()::text
          or (rcre_current_role() = 'team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))
        )
      )
    )
  );

drop policy if exists rcre_domain_records_insert on rcre_domain_records;
create policy rcre_domain_records_insert on rcre_domain_records for insert
  with check (
    organization_id = rcre_current_org()
    and (
      rcre_is_broker()
      or owner_user_id = rcre_current_user_id()
      or (
        collection like 'transaction%'
        and (
          (rcre_current_role() = 'transaction_coordinator' and data->>'tcId' = rcre_current_user_id()::text)
          or (rcre_current_role() = 'team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))
        )
      )
      or (owner_user_id is null and rcre_current_role() in ('owner', 'broker'))
    )
  );

drop policy if exists rcre_domain_records_update on rcre_domain_records;
create policy rcre_domain_records_update on rcre_domain_records for update
  using (
    organization_id = rcre_current_org()
    and (
      rcre_is_broker()
      or owner_user_id in (select rcre_scoped_user_ids())
      or (
        collection like 'transaction%'
        and (
          data->>'ownerId' = rcre_current_user_id()::text
          or data->>'tcId' = rcre_current_user_id()::text
          or (rcre_current_role() = 'team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))
        )
      )
    )
  )
  with check (
    organization_id = rcre_current_org()
    and (
      rcre_is_broker()
      or owner_user_id = rcre_current_user_id()
      or (
        collection like 'transaction%'
        and (
          data->>'ownerId' = rcre_current_user_id()::text
          or data->>'tcId' = rcre_current_user_id()::text
          or (rcre_current_role() = 'team_lead' and data->>'teamId' in (select team_id::text from rcre_my_team_ids()))
        )
      )
    )
  );

drop policy if exists rcre_domain_records_delete on rcre_domain_records;
create policy rcre_domain_records_delete on rcre_domain_records for delete
  using (
    organization_id = rcre_current_org()
    and rcre_is_broker()
  );

-- Defense in depth: participant APIs remain the normal write path, and this
-- trigger prevents direct SQL clients from changing assignment identity.
create or replace function rcre_guard_transaction_assignment_fields() returns trigger
language plpgsql
as $fn$
begin
  if new.collection like 'transaction%' and rcre_current_role() not in ('owner', 'broker') then
    if tg_op = 'INSERT' then
      if new.collection = 'transactions' and (
        new.owner_user_id is distinct from rcre_current_user_id()
        or new.data->>'ownerId' is distinct from rcre_current_user_id()::text
        or coalesce(new.data->>'tcId', '') <> ''
      ) then
        raise exception 'Only an owner may create a transaction assignment';
      end if;
      if new.collection <> 'transactions' and new.owner_user_id is distinct from rcre_current_user_id() then
        raise exception 'Transaction child records must be authored by the current participant';
      end if;
    else
      if new.owner_user_id is distinct from old.owner_user_id
        or new.data->>'ownerId' is distinct from old.data->>'ownerId'
        or new.data->>'tcId' is distinct from old.data->>'tcId'
        or new.data->>'teamId' is distinct from old.data->>'teamId' then
        raise exception 'Only an owner may change transaction ownership or participant assignment';
      end if;
    end if;
  end if;
  return new;
end
$fn$;

drop trigger if exists rcre_transaction_assignment_guard on rcre_domain_records;
create trigger rcre_transaction_assignment_guard
before insert or update on rcre_domain_records
for each row execute function rcre_guard_transaction_assignment_fields();
