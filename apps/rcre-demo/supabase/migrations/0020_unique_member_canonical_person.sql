-- A canonical verified person may be linked to only one RCRE membership per organization.
-- The identity itself remains in the existing canonical public roster; this adds no people table.
create unique index if not exists rcre_member_profile_verified_person_unique
  on rcre_domain_records (organization_id, (data->>'verifiedPersonId'))
  where collection = 'member_profiles'
    and nullif(data->>'verifiedPersonId', '') is not null;
