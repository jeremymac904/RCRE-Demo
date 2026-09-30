import {OnboardingWorkspace} from '@/components/OnboardingWorkspace'
import {actorOrNull} from '@/lib/platform/auth'
import {redirect} from 'next/navigation'
export const metadata={robots:{index:false,follow:false}}
export default async function Page(){const actor=await actorOrNull();if(!actor)redirect('/login');return <OnboardingWorkspace name={actor.name}/>}
