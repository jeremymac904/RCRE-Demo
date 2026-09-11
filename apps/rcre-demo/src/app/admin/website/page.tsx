import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull,can } from '@/lib/platform/auth'
import { AppShell } from '@/components/AppShell'
import { PublicContentStudio } from '@/components/public/PublicContentStudio'
export const dynamic='force-dynamic'
export const metadata={robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{id?:string}>}){const actor=await actorOrNull();const user=await currentUser();if(!actor||!user)redirect('/login');if(!can(actor,'cms'))redirect('/forbidden');const p=await params;return <AppShell user={user}><PublicContentStudio/></AppShell>}
