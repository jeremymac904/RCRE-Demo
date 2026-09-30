import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull,can } from '@/lib/platform/auth'
import { AppShell } from '@/components/AppShell'
import { AgentInspector } from '@/components/AgentInspector'
import { AgentProfileAdmin } from '@/components/AgentProfileAdmin'
export const dynamic='force-dynamic'
export const metadata={robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{id?:string}>}){const actor=await actorOrNull();const user=await currentUser();if(!actor||!user)redirect('/login');if(!can(actor,'command'))redirect('/forbidden');const p=await params;return <AppShell user={user}>{!p?.id&&can(actor,'settings.people')&&<AgentProfileAdmin/>}<AgentInspector agentId={p?.id}/></AppShell>}
