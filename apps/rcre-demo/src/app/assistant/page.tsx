import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { Assistant } from '@/components/Assistant'

export const dynamic = 'force-dynamic'

export default async function AssistantPage({
  searchParams,
}: { searchParams: Promise<{ ask?: string }> }) {
  const user = await currentUser()
  if (!user) redirect('/login')
  const { ask } = await searchParams

  return (
    <AppShell user={user}>
      <div className="h-[calc(100vh-57px)] lg:h-screen">
        <Assistant agentName={user.firstName} initialAsk={ask} />
      </div>
    </AppShell>
  )
}
