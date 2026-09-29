import {redirect} from 'next/navigation'
import {actorOrNull,can} from '@/lib/platform/auth'
import {currentUser} from '@/lib/session'
import {AppShell} from '@/components/AppShell'
import {MlsAdmin} from '@/components/property/MlsAdmin'
export const dynamic='force-dynamic'
export const metadata={title:'MLS Provider Readiness',robots:{index:false,follow:false}}
export default async function Page(){const actor=await actorOrNull(),user=await currentUser();if(!actor||!user)redirect('/login');if(!can(actor,'settings.leads'))redirect('/forbidden');return <AppShell user={user}><MlsAdmin/></AppShell>}
