import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull,can,demoEnabled } from '@/lib/platform/auth'
import { AppShell } from '@/components/AppShell'
import { RecruitDetail } from '@/components/RecruitDetail'
export const dynamic='force-dynamic'
export const metadata={robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{id?:string}>}){const actor=await actorOrNull();const user=await currentUser();if(!actor||!user)redirect('/login');if(!can(actor,'recruiting'))redirect('/forbidden');const p=await params;return <AppShell user={user}><RecruitDetail id={p.id!} owner={['broker_owner','managing_broker'].includes(actor.role)} demoMode={demoEnabled()}/></AppShell>}
