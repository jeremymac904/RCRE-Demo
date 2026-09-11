import {redirect} from 'next/navigation'
import {currentUser} from '@/lib/session'
import {actorOrNull} from '@/lib/platform/auth'
import {AppShell} from '@/components/AppShell'
import {ApprovalCenter} from '@/components/ApprovalCenter'
export const dynamic='force-dynamic'
export const metadata={robots:{index:false,follow:false}}
export default async function Page(){const actor=await actorOrNull(),user=await currentUser();if(!actor||!user)redirect('/login');return <AppShell user={user}><ApprovalCenter/></AppShell>}
