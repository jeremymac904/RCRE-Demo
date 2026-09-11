import {redirect} from 'next/navigation'
import {actorOrNull,can} from '@/lib/platform/auth'
import {currentUser} from '@/lib/session'
import {AppShell} from '@/components/AppShell'
import {ListingWorkspace} from '@/components/ListingWorkspace'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{id?:string}>}){const a=await actorOrNull(),u=await currentUser();if(!a||!u)redirect('/login');if(!can(a,'crm')&&!can(a,'marketing'))redirect('/forbidden');const p=await params;return <AppShell user={u}><ListingWorkspace id={p.id}/></AppShell>}
