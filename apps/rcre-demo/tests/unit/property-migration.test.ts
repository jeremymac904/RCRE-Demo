import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe,expect,it} from 'vitest'
const migration=readFileSync(fileURLToPath(new URL('../../supabase/migrations/0004_mls_property_search.sql',import.meta.url)),'utf8')
describe('MLS migration security and readiness gate',()=>{
 it('adds the provider, capability, mapping, compliance, sync, listing and consumer schemas',()=>{
  for(const table of ['mls_provider_catalog','mls_providers','mls_provider_capabilities','mls_provider_field_mappings','mls_provider_compliance','mls_sync_state','properties','property_sources','property_media','property_open_houses','property_consumers','saved_properties','saved_searches','property_inquiries'])expect(migration).toContain('create table if not exists '+table)
 })
 it('keeps listings fail-closed and consumer alerts disabled',()=>{
  expect(migration).toContain("p.id = properties.provider_id and p.status = 'connected'")
  expect(migration).toContain("c.approval_state = 'approved'")
  expect(migration).toContain('check (alerts_enabled = false)')
  for(const table of ['mls_provider_catalog','mls_providers','mls_provider_capabilities','mls_provider_field_mappings','mls_provider_compliance','mls_sync_state','properties','property_sources','property_media','property_open_houses','property_consumers','saved_properties','saved_searches','property_inquiries']){
   expect(migration).toContain('alter table '+table+' enable row level security')
   expect(migration).toContain('alter table '+table+' force row level security')
   expect(migration).toMatch(new RegExp('create\\s+policy\\s+\\w+\\s+on\\s+'+table+'\\s+for\\s+'))
  }
  expect(migration).toContain('rcre_current_org()')
 })
 it('retains indexes and never embeds credentials or guessed legal language',()=>{
  for(const column of ['state_code','city','postal_code','standard_status','list_price','bedrooms','bathrooms_total','property_type','modified_at','latitude','longitude','provider_id','provider_listing_id'])expect(migration).toContain(column)
  expect(migration).toContain('required_attribution  text')
  expect(migration).toContain('required_disclaimer   text')
  expect(migration).toContain('Exact MLS-approved terms only')
  expect(migration).not.toMatch(/(api[_-]?key|client[_-]?secret)\\s*[:=]\\s*['\"][^'\"]+/i)
 })
})
