import 'server-only'
import { getRepository } from '@/lib/db'
import type { Repository } from '@/lib/db/repository'
import { AccessError, assertCapability, can, type PlatformActor } from './auth'
import { repositoryActor } from './onboarding'
import { listContactsPage } from './service'
import { listCrmAppointmentsDurable, listCrmTasksDurable, saveCrmAppointmentDurable } from './crm-durable'
import { workInstant } from './day-plan'

type Row = Record<string, unknown> & { id: string; ownerId: string; title: string; version: number }

function assertDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new AccessError('Choose a valid day', 400)
}

function asTime(value: unknown, fallback: string) { return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback }

async function rowsForDay(actor: PlatformActor, day: string, repository: Repository) {
  assertCapability(actor, 'calendar')
  assertDay(day)
  const [personal, brokerage, tasks, appointments] = await Promise.all([
    repository.getDomainRecord<Record<string, unknown>>(repositoryActor(actor), 'platform_settings', `personal:${actor.id}`),
    repository.getDomainRecord<Record<string, unknown>>(repositoryActor(actor), 'platform_settings', `brokerage:${actor.officeId || actor.id}`),
    listCrmTasksDurable(actor, repository),
    listCrmAppointmentsDurable(actor, repository),
  ])
  const prefs = personal?.data ?? {}
  const office = brokerage?.data ?? {}
  const timezone = typeof prefs.timezone === 'string' ? prefs.timezone : 'America/New_York'
  const begin = workInstant(day, asTime(prefs.workStart, asTime(office.workStart, '09:00')), timezone)
  const end = workInstant(day, asTime(prefs.workEnd, asTime(office.workEnd, '17:00')), timezone)
  if (end <= begin) throw new AccessError('Working hours must end after they start', 400)
  return { timezone, begin, end, prefs, tasks: tasks.filter(task => task.ownerId === actor.id && !task.done), appointments: appointments.filter(event => event.ownerId === actor.id && !['canceled', 'completed'].includes(String(event.status ?? 'planned'))) }
}

function priorityCandidates(actor: PlatformActor, contacts: Array<Record<string, unknown>>, leadsSetting: Record<string, unknown>, now: number) {
  if (!can(actor, 'crm')) return []
  const responseMinutes = Number(leadsSetting.responseMinutes ?? 60) + Number(leadsSetting.graceMinutes ?? 0)
  const followUpDays = Number(leadsSetting.followUpDays ?? 7)
  return contacts.filter(contact => contact.ownerId === actor.id).flatMap(contact => {
    const reasons: string[] = []
    const received = Date.parse(String(contact.receivedAt ?? ''))
    const firstTouch = typeof contact.firstTouchAt === 'string' ? Date.parse(contact.firstTouchAt) : NaN
    const lastOutbound = typeof contact.lastOutboundAt === 'string' ? Date.parse(contact.lastOutboundAt) : NaN
    if (!Number.isNaN(received) && Number.isNaN(firstTouch) && now - received > responseMinutes * 60_000) reasons.push('No recorded outbound outreach since lead receipt')
    const recentEngagement = Array.isArray(contact.timeline) && contact.timeline.some((event: any) => ['property_view', 'property_saved', 'email_open'].includes(event.kind) && now - Date.parse(String(event.at)) < 7 * 86_400_000)
    if (recentEngagement && (Number.isNaN(lastOutbound) || now - lastOutbound > followUpDays * 86_400_000)) reasons.push('Recent engagement without recent recorded outreach')
    if (!reasons.length) return []
    const name = `${String(contact.firstName ?? '')} ${String(contact.lastName ?? '')}`.trim() || 'Contact'
    return [{ key: String(contact.id), title: `Follow up: ${name}`, contactId: String(contact.id), minutes: 15, reason: reasons.join(' · ') }]
  }).slice(0, 3)
}

export async function dayPlanDurable(actor: PlatformActor, day: string, repository?: Repository, now = Date.now()) {
  const repo = repository ?? await getRepository()
  const scope = repositoryActor(actor)
  const { timezone, begin, end, tasks, appointments, prefs } = await rowsForDay(actor, day, repo)
  const leadScope = actor.role === 'broker_owner' ? 'organization' : actor.officeId || actor.id
  const leads = can(actor, 'crm') ? await repo.getDomainRecord<Record<string, unknown>>(scope, 'platform_settings', `leads:${leadScope}`) : null
  const taskMinutes = Math.max(5, Math.min(240, Number(leads?.data.taskEstimateMinutes ?? 30) || 30))
  const candidates: Array<{ key: string; taskId?: string; title: string; contactId?: string; minutes: number; reason: string }> = [
    ...tasks.sort((a, b) => Date.parse(String(a.dueAt)) - Date.parse(String(b.dueAt))).map(task => ({ key: task.id, taskId: task.id, title: String(task.title), contactId: typeof task.contactId === 'string' ? task.contactId : undefined, minutes: taskMinutes, reason: `Unfinished task, ordered by due date; configured estimate ${taskMinutes} minutes` })),
  ]
  if (can(actor, 'crm')) {
    const allContacts: Array<Record<string, unknown>> = []
    for (let page = 1; ; page++) {
      const result = await listContactsPage(actor, { page, pageSize: 100 }, repo)
      allContacts.push(...result.rows as unknown as Array<Record<string, unknown>>)
      if (page >= result.pageCount) break
    }
    candidates.push(...priorityCandidates(actor, allContacts, leads?.data ?? {}, now))
  }
  const occupied = appointments.map(event => ({ start: Date.parse(String(event.startsAt)), end: Date.parse(String(event.endsAt)) }))
  let cursor = Math.max(begin, Math.ceil(now / 900_000) * 900_000)
  const blocks: Array<Record<string, unknown>> = []
  for (const candidate of candidates) {
    if (appointments.some(event => event.kind === 'proposed block' && event.title === candidate.title && Date.parse(String(event.startsAt)) >= begin && Date.parse(String(event.startsAt)) < end)) continue
    const duration = candidate.minutes * 60_000
    while (cursor + duration <= end) {
      const conflict = occupied.find(item => item.start < cursor + duration && item.end > cursor)
      if (conflict) { cursor = conflict.end; continue }
      blocks.push({ ...candidate, startsAt: new Date(cursor).toISOString(), endsAt: new Date(cursor + duration).toISOString() })
      cursor += duration
      break
    }
  }
  return { day, timezone, blocks, unscheduled: candidates.length - blocks.length }
}

export async function acceptDayBlockDurable(actor: PlatformActor, day: string, key: string, repository?: Repository) {
  const repo = repository ?? await getRepository()
  const block = (await dayPlanDurable(actor, day, repo)).blocks.find(item => item.key === key)
  if (!block) throw new AccessError('This suggestion changed; refresh the plan', 409)
  return saveCrmAppointmentDurable(actor, { ...block, kind: 'proposed block' }, repo)
}
