import type { PlatformActor } from './auth'
import type { KnowledgeActor } from '@/lib/services/ai-knowledge'

/** Derive knowledge scope only from the authenticated canonical platform actor. */
export function trustedKnowledgeActor(actor: PlatformActor): KnowledgeActor {
  const role = actor.role === 'broker_owner' ? 'owner' : actor.role === 'managing_broker' ? 'broker' : actor.role === 'team_leader' ? 'team_lead' : actor.role === 'transaction_coordinator' ? 'staff' : actor.role === 'marketing_admin' || actor.role === 'trainer' ? 'staff' : 'agent'
  const market = actor.market.toLowerCase()
  const states = actor.officeId === 'al' || market.includes('alabama') ? ['AL'] : actor.officeId === 'fl' || market.includes('florida') ? ['FL'] : actor.role === 'broker_owner' ? ['AL', 'FL'] : []
  return { userId: actor.userId, organizationId: actor.organizationId, role, states, canViewAllStates: actor.role === 'broker_owner' }
}
