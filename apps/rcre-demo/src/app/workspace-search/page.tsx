import {redirect} from 'next/navigation'
import {currentUser} from '@/lib/session'
import {AppShell} from '@/components/AppShell'
import {WorkspaceSearch} from '@/components/WorkspaceSearch'
export const dynamic='force-dynamic'
export const metadata={title:'Workspace search | RCRE',robots:{index:false,follow:false}}
export default async function Page(){const user=await currentUser();if(!user)redirect('/login');return <AppShell user={user}><WorkspaceSearch/></AppShell>}
