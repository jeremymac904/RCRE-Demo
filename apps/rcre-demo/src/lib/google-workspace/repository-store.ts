import 'server-only'
import { getRepository } from '@/lib/db'
import type { Actor } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import type { StoredGoogleGrant, WorkspaceGrantStore, WorkspaceService } from './types'

function dbActor(actor: PlatformActor): Actor {
  return { userId: actor.userId, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role) }
}

export class RepositoryGoogleGrantStore implements WorkspaceGrantStore {
  async get(actor: PlatformActor, service: WorkspaceService): Promise<StoredGoogleGrant | null> {
    const row = await (await getRepository()).getDomainRecord<StoredGoogleGrant>(dbActor(actor), 'google_workspace_tokens', service)
    if (!row || row.ownerUserId !== actor.userId || row.data.service !== service) return null
    return row.data
  }

  async put(actor: PlatformActor, grant: StoredGoogleGrant): Promise<void> {
    const repository = await getRepository()
    const scope = dbActor(actor)
    const prior = await repository.getDomainRecord<StoredGoogleGrant>(scope, 'google_workspace_tokens', grant.service)
    await repository.putDomainRecordsAtomic(scope, [{ collection: 'google_workspace_tokens', recordId: grant.service, ownerUserId: actor.userId, data: grant as unknown as Record<string, unknown>, ...(prior ? { expectedVersion: prior.version } : { createOnly: true }) }], [{ organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action: prior ? 'google_workspace.reconnected' : 'google_workspace.connected', targetType: 'integration', targetId: grant.service, effect: 'write', allowed: true, detail: { service: grant.service, scopes: grant.scopes } }])
  }

  async remove(actor: PlatformActor, service: WorkspaceService): Promise<void> {
    const repository = await getRepository(), scope = dbActor(actor)
    await repository.deleteDomainRecord(scope, 'google_workspace_tokens', service)
    await repository.recordAudit(scope, { organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action: 'google_workspace.disconnected', targetType: 'integration', targetId: service, effect: 'write', allowed: true, detail: { service } })
  }
}
