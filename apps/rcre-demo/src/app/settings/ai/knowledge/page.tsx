import { redirect } from 'next/navigation'
import { actorOrNull } from '@/lib/platform/auth'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { KnowledgeLibraryClient } from './KnowledgeLibraryClient'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [actor, user] = await Promise.all([actorOrNull(), currentUser()])
  if (!actor || !user) redirect('/login')
  if (!['broker_owner', 'managing_broker'].includes(actor.role)) redirect('/settings/ai')
  return <AppShell user={user}><KnowledgeLibraryClient /></AppShell>
}
