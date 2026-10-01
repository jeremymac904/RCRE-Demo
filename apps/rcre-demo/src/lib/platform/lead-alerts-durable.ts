import 'server-only'
import { getRepository } from '@/lib/db'
import type { Repository } from '@/lib/db/repository'
import { getAuthPersistence, type MemberSummary } from '@/lib/auth/persistence'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { durableNotifications } from '@/lib/services/notifications-durable'
import { AccessError, assertCapability, scopedOwner, type PlatformActor } from './auth'
import { getSettingDurable } from './settings-durable'
import { listCrmPrioritiesDurable, listCrmTasksDurable } from './crm-durable'

type Dependencies = {
  repository?: Repository
  listMembers?: (actor: PlatformActor) => Promise<MemberSummary[]>
  now?: () => Date
}

/** Generate persisted, idempotent in-app reminders from the durable CRM queue.
 * This never sends email, creates source CRM records, or contacts a provider. */
export async function generateLeadAlertsDurable(actor: PlatformActor, dependencies: Dependencies = {}) {
  assertCapability(actor, 'settings.leads')
  const repository = dependencies.repository ?? await getRepository()
  const policy = await getSettingDurable(actor, 'leads', repository)
  if (policy.value.enabled !== true) return { created: 0, suppressed: 0, message: 'Saved lead alert policy is paused.' }

  const listMembers = dependencies.listMembers ?? (async (current: PlatformActor) => (await getAuthPersistence()).listMembers(current))
  const members = await listMembers(actor)
  const recipientId = typeof policy.value.alertRecipient === 'string' && policy.value.alertRecipient.trim()
    ? policy.value.alertRecipient.trim() : actor.id
  const recipient = members.find(member => member.userId === recipientId && member.organizationId === actor.organizationId && member.active)
  if (!recipient || !scopedOwner(actor, recipient.userId, recipient.officeId)) {
    throw new AccessError('The configured lead alert recipient is inactive or outside your brokerage scope.', 400)
  }

  const [priorities, tasks] = await Promise.all([
    listCrmPrioritiesDurable(actor, repository),
    listCrmTasksDurable(actor, repository),
  ])
  const now = dependencies.now?.() ?? new Date()
  const today = now.toISOString().slice(0, 10)
  const notificationActor = { userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId }
  const notifications = durableNotifications(repository)
  let created = 0
  let suppressed = 0

  for (const item of priorities) {
    const contact = item.contact as unknown as Record<string, unknown>
    if (contact.ownerId !== recipientId || !scopedOwner(actor, String(contact.ownerId ?? ''), String(contact.officeId ?? ''))) continue
    const name = `${String(contact.firstName ?? '')} ${String(contact.lastName ?? '')}`.trim() || 'Contact'
    const result = await notifications.enqueue(notificationActor, {
      idempotencyKey: `lead-alert:${actor.organizationId}:${recipientId}:${String(contact.id)}:${today}:${policy.version}`,
      eventType: 'new_lead', channel: 'in_app',
      title: `Review ${name}: ${item.reasons.join('; ')}`,
      body: `Open this contact in the CRM to review the recorded activity.`,
      href: `/crm/${encodeURIComponent(String(contact.id))}`, source: 'CRM',
    }, { recipientUserId: recipientId })
    if (result.duplicate) continue
    if (result.notification.deliveryState === 'suppressed') suppressed++
    else created++
  }

  const escalationMinutes = Math.max(0, Number(policy.value.escalationMinutes ?? 1440))
  for (const task of tasks) {
    if (task.ownerId !== recipientId || task.done || !scopedOwner(actor, task.ownerId, task.officeId ?? '')) continue
    if (now.getTime() - Date.parse(String(task.dueAt)) < escalationMinutes * 60_000) continue
    const result = await notifications.enqueue(notificationActor, {
      idempotencyKey: `task-escalation:${actor.organizationId}:${task.id}:${task.version}:${policy.version}`,
      eventType: 'overdue_task', channel: 'in_app',
      title: `Review overdue task: ${String(task.title ?? 'Follow up')}`,
      body: 'Review the overdue task in your CRM task list.',
      href: typeof task.contactId === 'string' ? `/crm/${encodeURIComponent(task.contactId)}` : '/crm/tasks', source: 'CRM',
    }, { recipientUserId: recipientId })
    if (result.duplicate) continue
    if (result.notification.deliveryState === 'suppressed') suppressed++
    else created++
  }

  return { created, suppressed, message: 'Durable in-app reminders recorded; no external messages were sent.' }
}
