-- Marketing administrators need read access to brokerage campaign queues so
-- approval and content review can work across authors. This policy is limited
-- to marketing collections, always tenant-bound, and does not grant writes.
-- Campaign mutation remains owner-scoped or uses existing administrator rules.

 drop policy if exists rcre_marketing_admin_campaign_read on rcre_domain_records;
 create policy rcre_marketing_admin_campaign_read on rcre_domain_records
   for select
   using (
     organization_id = rcre_current_org()
     and collection in ('marketing_campaigns', 'marketing_batches', 'marketing_schedule')
     and rcre_current_role() = 'marketing_admin'
   );
