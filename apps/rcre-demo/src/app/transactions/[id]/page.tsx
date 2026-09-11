import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { Transactions } from '@/components/Transactions'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{id:string}>}){const user=await currentUser();if(!user)redirect('/login');const {id}=await params;return <AppShell user={user}><Transactions id={id}/></AppShell>}
