import { expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as saveCmsRoute } from '@/app/api/public/content-admin/route'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { listPublicContentForAdmin, savePublicContent } from '@/lib/public/cms'
import { repositoryActor } from '@/lib/platform/onboarding'
import type { PlatformActor } from '@/lib/platform/auth'

const organizationId = '11111111-1111-4111-8111-111111111111'
const marketingId = '22222222-2222-4222-8222-222222222222'
const agentId = '33333333-3333-4333-8333-333333333333'
const marketer: PlatformActor = { id: marketingId, userId: marketingId, organizationId, role: 'marketing_admin', name: 'Marketing Admin', market: 'Florida', officeId: 'fl', teamId: 'fl' }
const agent: PlatformActor = { ...marketer, id: agentId, userId: agentId, role: 'agent', name: 'Agent' }
const content = (status: 'draft' | 'published' | 'archived', revision: number, body: string) => ({
  id: '/pages/approved-copy', revision, status, title: 'Approved copy', description: 'A public page.', body,
})

it('allows Marketing Admin CMS writes through the scoped repository with revision conflict and audit', async () => {
  const repository = new MemoryRepository(emptySeed())
  const draft = await savePublicContent(marketer, content('draft', 0, 'Draft text'), repository)
  expect(draft.revision).toBe(1)
  const update = await savePublicContent(marketer, content('published', 1, 'Published text'), repository)
  expect(update).toMatchObject({ status: 'published', revision: 2, published: { body: 'Published text' }, history: [{ body: 'Draft text' }] })
  await expect(savePublicContent(marketer, content('published', 1, 'Stale text'), repository)).rejects.toThrow(/changed in another session/i)
  expect((await listPublicContentForAdmin(marketer, repository))).toHaveLength(1)
  const audit = await repository.listAudit({ ...repositoryActor(marketer), role: 'owner' })
  expect(audit.map(event => event.action)).toEqual(expect.arrayContaining(['website.draft', 'website.published']))
  await expect(savePublicContent(agent, content('draft', 0, 'Denied'), repository)).rejects.toThrow(/access denied/i)
})

it('scopes content administration to the authenticated organization', async () => {
  const repository = new MemoryRepository(emptySeed())
  await savePublicContent(marketer, content('published', 0, 'Organization one'), repository)
  const otherOrg = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const otherAdmin: PlatformActor = { ...marketer, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', organizationId: otherOrg }
  await savePublicContent(otherAdmin, content('published', 0, 'Organization two'), repository)
  expect((await listPublicContentForAdmin(marketer, repository)).map(row => row.body)).toEqual(['Organization one'])
  expect(await repository.getPublicContentProjection(otherOrg, '/pages/approved-copy')).toMatchObject({ published: { body: 'Organization two' } })
})

it('public projections exclude drafts and reveal only published payload or archived path metadata', async () => {
  const repository = new MemoryRepository(emptySeed())
  await savePublicContent(marketer, content('draft', 0, 'PRIVATE DRAFT BODY'), repository)
  expect(await repository.getPublicContentProjection(organizationId, '/pages/approved-copy')).toBeNull()
  expect(await repository.listPublicContentProjections(organizationId)).toEqual([])
  await savePublicContent(marketer, content('published', 1, 'PUBLIC BODY'), repository)
  const publicRow = await repository.getPublicContentProjection(organizationId, '/pages/approved-copy')
  expect(publicRow).toEqual({ id: '/pages/approved-copy', status: 'published', revision: 2, published: expect.objectContaining({ body: 'PUBLIC BODY' }) })
  expect(JSON.stringify(publicRow)).not.toContain('PRIVATE DRAFT BODY')
  expect(JSON.stringify(publicRow)).not.toContain('history')
  await savePublicContent(marketer, content('archived', 2, 'PUBLIC BODY'), repository)
  expect(await repository.getPublicContentProjection(organizationId, '/pages/approved-copy')).toEqual({ id: '/pages/approved-copy', status: 'archived', revision: 3 })
})


it('rejects a missing Origin before attempting a public CMS write', async () => {
  const response = await saveCmsRoute(new NextRequest('https://rcre.test/api/public/content-admin', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(content('published', 0, 'Text')),
  }))
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({ error: 'Origin verification required' })
})
