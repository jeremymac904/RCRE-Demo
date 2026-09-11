import {redirect} from 'next/navigation'
import {currentUser} from '@/lib/session'
import {AppShell} from '@/components/AppShell'
import {FubOperations} from '@/components/FubOperations'
export const dynamic='force-dynamic'
export default async function Page(){const user=await currentUser();if(!user)redirect('/login');return <AppShell user={user}><FubOperations/></AppShell>}
