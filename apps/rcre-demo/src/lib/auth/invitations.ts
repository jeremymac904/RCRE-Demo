import 'server-only'
import { randomUUID } from 'node:crypto'
import type { PlatformActor, PlatformRole } from '@/lib/platform/auth'
import { AccessError, assertCapability } from '@/lib/platform/auth'
import { encryptMailPayload } from './mail'
import { getAuthPersistence, hashSecret, opaqueSecret } from './persistence'

function publicOrigin(): string {
  const raw = process.env.RCRE_PUBLIC_URL
  if (!raw) throw new AccessError('Public application URL is not configured.', 503)
  const url = new URL(raw)
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new AccessError('Public application URL must use HTTPS.', 503)
  if (url.username || url.password || url.search || url.hash) throw new AccessError('Public application URL is invalid.', 503)
  return url.origin
}

function invitationEmail(input: { email: string; name: string; token: string; expiresAt: Date; resend: boolean; key: string }) {
  const url = new URL(`/access/${encodeURIComponent(input.token)}`, publicOrigin()).toString()
  const subject = input.resend ? 'Your RCRE invitation link' : 'You are invited to RCRE'
  const text = `Hello ${input.name},\n\nYou have been invited to join the RCRE brokerage workspace. Open this secure link and sign in using the Google account that matches this email address:\n\n${url}\n\nThis link expires ${input.expiresAt.toISOString()} and can be used once. If you were not expecting this invitation, you can ignore this message.\n`
  const html = `<p>Hello ${escapeHtml(input.name)},</p><p>You have been invited to join the RCRE brokerage workspace. Open this secure link and sign in using the Google account that matches this email address:</p><p><a href="${escapeHtml(url)}">Accept your RCRE invitation</a></p><p>This link expires ${escapeHtml(input.expiresAt.toISOString())} and can be used once. If you were not expecting this invitation, you can ignore this message.</p>`
  return { to: input.email, subject, text, html, idempotencyKey: input.key }
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!) }

function managingBrokerState(actor: PlatformActor): 'Alabama' | 'Florida' | null {
  const officeState = actor.officeId.toLowerCase() === 'al' ? 'Alabama'
    : actor.officeId.toLowerCase() === 'fl' ? 'Florida' : null
  const actorState = actor.market === 'Alabama' || actor.market === 'Florida' ? actor.market : null
  if (officeState && actorState && officeState !== actorState) return null
  return officeState ?? actorState
}

function validateAdmin(actor: PlatformActor, role: PlatformRole, officeId: string, market?: string) {
  assertCapability(actor, 'settings.people')
  if (actor.role === 'managing_broker' && (officeId !== actor.officeId || !['agent','team_leader','transaction_coordinator'].includes(role)
    || (market !== undefined && market !== managingBrokerState(actor)))) {
    throw new AccessError('This invitation requires brokerage owner approval.', 403)
  }
  if (!['broker_owner','managing_broker'].includes(actor.role)) throw new AccessError('Only brokerage leadership may invite members.', 403)
}

export async function createInvitation(actor: PlatformActor, input: { email: string; name: string; role: PlatformRole; officeId: string; teamId?: string; market?: string }) {
  const market = input.market ?? (actor.role === 'managing_broker' ? managingBrokerState(actor) ?? '' : input.officeId)
  validateAdmin(actor, input.role, input.officeId, market)
  const token = opaqueSecret(32)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000)
  const idempotencyKey = `${randomUUID()}:${hashSecret(token)}`
  const payload = encryptMailPayload(invitationEmail({ email: input.email.trim().toLowerCase(), name: input.name.trim(), token, expiresAt, resend: false, key: idempotencyKey }))
  const created = await (await getAuthPersistence()).createInvitation(actor, {
    email: input.email.trim().toLowerCase(), name: input.name.trim(), role: input.role,
    officeId: input.officeId, teamId: input.teamId ?? input.officeId, market,
    tokenHash: hashSecret(token), expiresAt, payload, idempotencyKey,
  })
  return { id: created.invitationId, status: 'queued', expiresAt: expiresAt.toISOString() }
}

export async function resendInvitation(actor: PlatformActor, invitation: { id: string; email: string; name: string; role: PlatformRole; officeId: string; market: string }) {
  validateAdmin(actor, invitation.role, invitation.officeId, invitation.market)
  const token = opaqueSecret(32)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000)
  const idempotencyKey = `${invitation.id}:${hashSecret(token)}`
  const payload = encryptMailPayload(invitationEmail({ email: invitation.email, name: invitation.name, token, expiresAt, resend: true, key: idempotencyKey }))
  const resent = await (await getAuthPersistence()).resendInvitation(actor, invitation.id, {
    tokenHash: hashSecret(token), expiresAt, payload, idempotencyKey,
  })
  if (!resent) throw new AccessError('Invitation is no longer pending or is outside your office.', 404)
  return { id: invitation.id, status: 'queued', expiresAt: expiresAt.toISOString() }
}

export async function invitationById(actor: PlatformActor, id: string) {
  const persistence = await getAuthPersistence()
  const [rows, members] = await Promise.all([persistence.listInvitations(actor), persistence.listMembers(actor)])
  const item = rows.find(row => row.id === id)
  if (!item) return null
  const member = members.find(row => row.email.trim().toLowerCase() === item.email.trim().toLowerCase())
  return { ...item, market: member?.market ?? '' }
}

export async function listInvitations(actor: PlatformActor) {
  assertCapability(actor, 'settings.people')
  if (!['broker_owner','managing_broker'].includes(actor.role)) throw new AccessError('Only brokerage leadership may manage invitations.', 403)
  return (await getAuthPersistence()).listInvitations(actor)
}

export async function cancelInvitation(actor: PlatformActor, id: string) {
  assertCapability(actor, 'settings.people')
  if (!['broker_owner','managing_broker'].includes(actor.role)) throw new AccessError('Only brokerage leadership may manage invitations.', 403)
  const cancelled = await (await getAuthPersistence()).cancelInvitation(actor, id)
  if (!cancelled) throw new AccessError('Invitation is no longer pending or is outside your office.', 404)
  return { id, status: 'cancelled' }
}
