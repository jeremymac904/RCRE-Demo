import { redirect } from 'next/navigation'
import { actorOrNull } from '@/lib/platform/auth'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { GoogleWorkspaceConnections } from '@/components/GoogleWorkspaceConnections'
export const dynamic='force-dynamic'
export const metadata={title:'Google Workspace · RCRE',robots:{index:false,follow:false}}
export default async function Page(){const actor=await actorOrNull(),user=await currentUser();if(!actor||!user)redirect('/login');return <AppShell user={user}><GoogleWorkspaceConnections/></AppShell>}
