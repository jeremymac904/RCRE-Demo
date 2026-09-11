import {redirect} from 'next/navigation'
import {actorOrNull,can} from '@/lib/platform/auth'
import {currentUser} from '@/lib/session'
import {AppShell} from '@/components/AppShell'
import {SettingsWorkspace} from '@/components/SettingsWorkspace'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{group?:string}>}){const a=await actorOrNull(),u=await currentUser();if(!a||!u)redirect('/login');const {group}=await params;if(!can(a,'settings.'+(group??'personal')))redirect('/forbidden');return <AppShell user={u}><SettingsWorkspace actor={a} group={group}/></AppShell>}
