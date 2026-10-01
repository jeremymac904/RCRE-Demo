import { requireActor, can, AccessError } from '@/lib/platform/auth'
import { listContacts, listTasks, canReadMarketing } from '@/lib/platform/service'
import { academy } from '@/data/academy'
import { courseAllowed } from '@/lib/academy-service'
import { readRecords } from '@/lib/platform/store'
import { listTransactions } from '@/lib/services/transactions'
import { getRepository } from '@/lib/db'
import { listContactsPage } from '@/lib/platform/service'
import { listCrmTasksDurable } from '@/lib/platform/crm-durable'
import { durableTransactions } from '@/lib/services/transactions-durable'
import { listMarketingDurable } from '@/lib/platform/marketing-durable'
import { listRecruitingDurable } from '@/lib/platform/recruiting-durable'
import { academyCatalog } from '@/lib/academy-durable'
import { isProduction } from '@/lib/config/env'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import type { PlatformActor } from '@/lib/platform/auth'

export const dynamic = 'force-dynamic'
type SearchResult = { id: string; title: string; detail: string; kind: string; href: string }

export async function POST(req: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    const origin = req.headers.get('origin')
    if (origin && new URL(origin).host !== new URL(req.url).host) throw new AccessError('Origin mismatch')
    const body = await req.json()
    const query = String(body.query ?? '').trim().toLowerCase()
    if (query.length < 2 || query.length > 200) throw new AccessError('Enter between 2 and 200 characters', 400)
    const rows: SearchResult[] = []

    if (isProduction) {
      const repository = await getRepository()
      if (can(actor, 'crm')) {
        const [contacts, tasks] = await Promise.all([
          listContactsPage(actor, { query, page: 1, pageSize: 80 }, repository),
          listCrmTasksDurable(actor, repository),
        ])
        for (const contact of contacts.rows) rows.push({
          id: contact.id,
          title: `${contact.firstName} ${contact.lastName}`,
          detail: [contact.email, contact.stage, (contact.tags ?? []).join(', ')].filter(Boolean).join(' · '),
          kind: 'Contact', href: `/crm/${contact.id}`,
        })
        for (const task of tasks) {
          const title = String(task.title ?? '')
          const detail = task.done ? 'Completed task' : 'Open task'
          if (!(title + ' ' + detail).toLowerCase().includes(query)) continue
          rows.push({ id: task.id, title, detail, kind: 'Task', href: typeof task.contactId === 'string' ? `/crm/${task.contactId}` : '/today' })
        }
      }
      if (can(actor, 'transactions.read')) {
        for (const transaction of await durableTransactions().list(actor)) {
          if (!(transaction.address + ' ' + transaction.client + ' ' + transaction.status).toLowerCase().includes(query)) continue
          rows.push({ id: transaction.id, title: transaction.address, detail: `${transaction.client} · ${transaction.status}`, kind: 'Transaction', href: `/transactions/${transaction.id}` })
        }
      }
      if (can(actor, 'marketing')) {
        for (const item of await listMarketingDurable(actor, repository)) {
          if (!(item.title + ' ' + item.workflow + ' ' + item.channel + ' ' + item.status).toLowerCase().includes(query)) continue
          rows.push({ id: String(item.id ?? ''), title: item.title, detail: `${item.workflow} · ${item.channel} · ${item.status}`, kind: 'Content', href: `/marketing?content=${encodeURIComponent(String(item.id ?? ''))}` })
        }
      }
      if (can(actor, 'recruiting')) {
        for (const prospect of await listRecruitingDurable(actor, repository)) {
          if (!(prospect.name + ' ' + prospect.stage + ' ' + (prospect.source ?? '')).toLowerCase().includes(query)) continue
          rows.push({ id: prospect.id, title: prospect.name, detail: `${prospect.stage} · ${prospect.source ?? ''}`, kind: 'Recruiting', href: `/recruiting/${prospect.id}` })
        }
      }
      const catalog = await academyCatalog(actor, repository)
      for (const course of catalog.courses) {
        if (!(course.title + ' ' + course.description + ' ' + course.category).toLowerCase().includes(query)) continue
        rows.push({ id: course.id, title: course.title, detail: String(course.category || 'Authorized Realtor curriculum'), kind: 'Course', href: `/training/classroom/${course.id}` })
      }
    } else {
      if (can(actor, 'crm')) {
        for (const contact of listContacts(actor)) rows.push({ id: contact.id, title: `${contact.firstName} ${contact.lastName}`, detail: `${contact.email} · ${contact.stage} · ${contact.tags.join(', ')}`, kind: 'Contact', href: `/crm/${contact.id}` })
        for (const task of listTasks(actor)) rows.push({ id: task.id, title: task.title, detail: task.done ? 'Completed task' : 'Open task', kind: 'Task', href: task.contactId ? `/crm/${task.contactId}` : '/today' })
      }
      if (can(actor, 'transactions.read')) for (const transaction of listTransactions(actor)) rows.push({ id: transaction.id, title: transaction.address, detail: `${transaction.client} · ${transaction.status}`, kind: 'Transaction', href: `/transactions/${transaction.id}` })
      if (can(actor, 'marketing')) for (const item of readRecords<any>('marketing')) if (canReadMarketing(actor, item)) rows.push({ id: String(item.id ?? ''), title: item.title, detail: `${item.workflow} · ${item.channel} · ${item.status}`, kind: 'Content', href: `/marketing?content=${encodeURIComponent(String(item.id ?? ''))}` })
      if (can(actor, 'recruiting')) for (const prospect of readRecords<any>('recruits')) if (prospect.organizationId === actor.organizationId && (actor.role === 'broker_owner' || prospect.officeId === actor.officeId)) rows.push({ id: prospect.id, title: prospect.name, detail: `${prospect.stage} · ${prospect.source ?? prospect.channel}`, kind: 'Recruiting', href: `/recruiting/${prospect.id}` })
      for (const course of academy.courses) if (courseAllowed(actor, course.id)) rows.push({ id: course.id, title: course.title, detail: 'Authorized Realtor curriculum', kind: 'Course', href: `/training/classroom/${course.id}` })
    }

    const matches = isProduction ? rows : rows.filter(row => `${row.title} ${row.detail}`.toLowerCase().includes(query))
    return Response.json({ results: matches.slice(0, 80), total: matches.length }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500
    const response = Response.json({ error: isProduction && status >= 500 ? 'Workspace search is temporarily unavailable.' : error instanceof Error ? error.message : 'Search failed' }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    await recordCaughtRouteFailure(req, '/api/workspace-search', actor, status, error)
    return response
  }
}
