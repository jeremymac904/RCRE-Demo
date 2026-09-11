import 'server-only'
import { cookies } from 'next/headers'
import { dataMode } from '@/lib/config/env'
import { getRepository } from '@/lib/db'
import type { Actor } from '@/lib/db/repository'
import { BROKER_ID, AGENT_A, ORG_ID } from '../../../tests/fixtures/seed'

/**
 * Resolve the acting user.
 *
 * MVP LIMITATION — this is a DEVELOPMENT session resolver. It reads a cookie in
 * fixtures mode so the two views can be demonstrated. It is NOT authentication.
 *
 * Before any production use this must be replaced with Supabase Auth. The rest
 * of the system is already shaped for that: every repository call takes a
 * resolved Actor, and scoping is enforced in the repository — so swapping this
 * function is the only change required.
 */
export async function getActor(): Promise<Actor | null> {
  if (dataMode() === 'fixtures') {
    const jar = await cookies()
    const who = jar.get('rcre_dev_role')?.value
    const repo = await getRepository()
    const userId = who === 'broker' ? BROKER_ID : AGENT_A
    const user = await repo.getUser(userId)
    if (!user) return null
    return { userId: user.id, organizationId: ORG_ID, role: user.role }
  }

  // Live mode: no authentication is wired yet. Failing closed is correct —
  // returning a default identity would grant access to real client data.
  return null
}
