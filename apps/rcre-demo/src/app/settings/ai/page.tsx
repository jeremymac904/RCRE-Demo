/**
 * AI Settings Page (Server Component)
 * 
 * Fetches the actor server-side and passes serializable props to the client component.
 */

import { redirect } from 'next/navigation'
import { actorOrNull } from '@/lib/platform/auth'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { AISettingsClient } from './AISettingsClient'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [a, u] = await Promise.all([actorOrNull(), currentUser()])
  if (!a || !u) redirect('/login')

  return (
    <AppShell user={u}>
      <AISettingsClient actor={a} />
    </AppShell>
  )
}
