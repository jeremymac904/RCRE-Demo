import type { UserRole } from '@/lib/domain-types'
import type { PlatformRole } from '@/lib/platform/auth'

/** Map verified persisted RCRE roles without granting generic legacy staff scope. */
export function repositoryRoleForPlatform(role: PlatformRole): UserRole {
  const map: Record<PlatformRole, UserRole> = {
    agent: 'agent',
    team_leader: 'team_lead',
    managing_broker: 'managing_broker',
    broker_owner: 'owner',
    transaction_coordinator: 'transaction_coordinator',
    marketing_admin: 'marketing_admin',
    trainer: 'trainer',
  }
  return map[role]
}
