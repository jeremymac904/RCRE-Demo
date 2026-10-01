import { academyConfigDurable, listCommunityDurable } from '@/lib/academy-durable'
import { DurableModuleUnavailable } from '@/components/DurableModuleUnavailable'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull } from '@/lib/platform/auth'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { TrainingNav } from '@/components/TrainingNav'
import { CommunityFeed } from '@/components/CommunityFeed'
import { CommunityYoutubeAutomation } from '@/components/CommunityYoutubeAutomation'
import { academyManager } from '@/lib/academy-service'
import { CommunityFilters } from '@/components/CommunityFilters'
import { CommunityRail } from '@/components/CommunityRail'
import { ACADEMY, courses, lessonsFor } from '@/lib/academy'
export const dynamic='force-dynamic'
export default async function CommunityPage({searchParams}:{searchParams:Promise<{category?:string}>}){
 const [user,actor,params]=await Promise.all([currentUser(),actorOrNull(),searchParams]);if(!user||!actor)redirect('/login')
 let categories: string[], posts: Awaited<ReturnType<typeof listCommunityDurable>>
 try { [categories, posts] = await Promise.all([academyConfigDurable(actor).then(config => config.categories as string[]), listCommunityDurable(actor)]) } catch { return <DurableModuleUnavailable title="Community" detail="Community posts and interactions are temporarily unavailable. No demo feed is being substituted." /> }
 const active=categories.includes(params.category||'')?params.category:undefined
 const counts=categories.map(c=>({label:c,count:posts.filter(p=>p.category===c).length}))
 const composerCourses=courses().map(c=>({id:c.id,title:c.title,lessons:lessonsFor(c.id).map(l=>({id:l.id,title:l.title,order:l.order}))}))
 return <AppShell user={user}><div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-14"><PageHeader eyebrow="RCRE AI Academy" title="Community" sub="Ask a question, share a useful prompt, or work through a lesson with your brokerage."/><TrainingNav active="community"/>{academyManager(actor)&&<CommunityYoutubeAutomation categories={categories}/>}<div className="mt-10 grid gap-12 lg:grid-cols-3 lg:gap-10"><div className="min-w-0 lg:col-span-2"><CommunityFilters counts={counts} active={active}/><div className="mt-8"><CommunityFeed posts={[]} activeCategory={active} categories={categories} courses={composerCourses} author={{name:user.name,role:user.title,initials:user.initials,photo:user.photo}}/></div></div><CommunityRail about={{posts:posts.length,categories:categories.length,courses:ACADEMY.totals.courses,lessons:ACADEMY.totals.lessons}} leaders={[]}/></div><p className="mt-14 divider pt-6 text-micro tracking-normal text-chalk-faint">RCRE internal Community. Training lessons link to the approved imported Realtor curriculum.</p></div></AppShell>
}
