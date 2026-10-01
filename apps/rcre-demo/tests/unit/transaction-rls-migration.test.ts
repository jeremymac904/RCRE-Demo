import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/0009_transaction_record_scope.sql'), 'utf8')

it('scopes transaction records by brokerage role or explicit transaction participant', () => {
  expect(migration).toMatch(/organization_id\s*=\s*rcre_current_org\(\)/)
  expect(migration).toMatch(/rcre_is_broker\(\)/)
  expect(migration).toMatch(/collection like 'transaction%'/)
  expect(migration).toMatch(/data->>'tcId'\s*=\s*rcre_current_user_id\(\)::text/)
  expect(migration).toMatch(/data->>'ownerId'\s*=\s*rcre_current_user_id\(\)::text/)
  expect(migration).toMatch(/data->>'teamId'.*rcre_my_team_ids/s)
})

it('does not grant transaction coordinators a cross-module staff or CRM scope', () => {
  expect(migration).not.toMatch(/rcre_is_org_wide_reader\(\)/)
  expect(migration).not.toMatch(/'staff'/)
  expect(migration).toMatch(/rcre_current_role\(\)\s*=\s*'transaction_coordinator'/)
  expect(migration).toMatch(/rcre_guard_transaction_assignment_fields/)
  expect(migration).toMatch(/ownerId'.*distinct from old\.data->>'ownerId'/s)
})

it('keeps destructive deletion broker-only', () => {
  const deletePolicy = migration.match(/create policy rcre_domain_records_delete[\s\S]*?;/)?.[0] ?? ''
  expect(deletePolicy).toMatch(/rcre_is_broker\(\)/)
  expect(deletePolicy).not.toMatch(/transaction_coordinator/)
})
