import {AccessFlow} from '@/components/AccessFlow'
import {actorOrNull} from '@/lib/platform/auth'
import {redirect} from 'next/navigation'
export const metadata={robots:{index:false,follow:false}}
export default async function Page(){if(!await actorOrNull())redirect('/login');return <AccessFlow mode="onboarding"/>}
