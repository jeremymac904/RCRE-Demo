-- 0013: support bounded, tenant-scoped CRM People queries over the shared JSONB domain store.
-- These indexes are additive and safe to re-run. They do not change RLS policy.
create index if not exists rcre_crm_contacts_recent_idx
  on rcre_domain_records (organization_id, (data->>'receivedAt') desc, record_id)
  where collection = 'crm_contacts';

create index if not exists rcre_crm_contacts_office_recent_idx
  on rcre_domain_records (organization_id, (data->>'officeId'), (data->>'receivedAt') desc, record_id)
  where collection = 'crm_contacts';

create index if not exists rcre_crm_contacts_owner_recent_idx
  on rcre_domain_records (organization_id, (data->>'ownerId'), (data->>'receivedAt') desc, record_id)
  where collection = 'crm_contacts';

create index if not exists rcre_crm_contacts_stage_recent_idx
  on rcre_domain_records (organization_id, (data->>'stage'), (data->>'receivedAt') desc, record_id)
  where collection = 'crm_contacts';

create index if not exists rcre_crm_contacts_source_recent_idx
  on rcre_domain_records (organization_id, (data->>'source'), (data->>'receivedAt') desc, record_id)
  where collection = 'crm_contacts';
