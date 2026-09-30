import 'server-only'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull } from '@/lib/platform/auth'
import { isLocalStoreAllowed } from '@/lib/platform/storage-mode'
import { canAccessBrandResources, isBrandAdmin, listBrandAgents } from './index'

export async function getBrandResourceContext() {
  if (!isLocalStoreAllowed(process.env.NODE_ENV, process.env.NEXT_PHASE)) return { kind: 'unavailable' as const }
  const actor = await actorOrNull()
  if (!actor) redirect('/login')
  if (!canAccessBrandResources(actor.role)) redirect('/forbidden')
  const user = await currentUser()
  if (!user) redirect('/login')
  return {
    kind: 'available' as const,
    actor,
    user,
    admin: isBrandAdmin(actor.role),
    agents: listBrandAgents(actor.organizationId),
  }
}

