import {academyConfig, academyPersistenceAvailable} from '@/lib/academy-service'
import { DurableModuleUnavailable } from '@/components/DurableModuleUnavailable'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull } from '@/lib/platform/auth'
import { communityPosts } from '@/lib/academy-community'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { TrainingNav } from '@/components/TrainingNav'
import { CommunityFeed } from '@/components/CommunityFeed'
import { CommunityYoutubeAutomation } from '@/components/CommunityYoutubeAutomation'
import { communityYoutubeAdmin } from '@/lib/community-youtube'
import { CommunityFilters } from '@/components/CommunityFilters'
import { CommunityRail } from '@/components/CommunityRail'
import { CATEGORIES, type CommunityCategory } from '@/data/community'
import { ACADEMY, courses, lessonsFor } from '@/lib/academy'
export const dynamic='force-dynamic'
export default async function CommunityPage({searchParams}:{searchParams:Promise<{category?:string}>}){
 if (!academyPersistenceAvailable()) return <DurableModuleUnavailable title="Community" detail="Posts, comments, reactions, and the video-to-community draft workflow require durable production storage. No community activity can be saved right now." />
 const [user,actor,params]=await Promise.all([currentUser(),actorOrNull(),searchParams]);if(!user||!actor)redirect('/login')
 const categories=academyConfig(actor.organizationId).categories
 const active=categories.includes(params.category||'')?params.category:undefined
 const posts=communityPosts(actor),counts=categories.map(c=>({label:c,count:posts.filter(p=>p.category===c).length}))
 const composerCourses=courses().map(c=>({id:c.id,title:c.title,lessons:lessonsFor(c.id).map(l=>({id:l.id,title:l.title,order:l.order}))}))
 return <AppShell user={user}><div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-14"><PageHeader eyebrow="RCRE AI Academy" title="Community" sub="Ask a question, share a useful prompt, or work through a lesson with your brokerage."/><TrainingNav active="community"/>{communityYoutubeAdmin(actor)&&<CommunityYoutubeAutomation categories={categories}/>}<div className="mt-10 grid gap-12 lg:grid-cols-3 lg:gap-10"><div className="min-w-0 lg:col-span-2"><CommunityFilters counts={counts} active={active}/><div className="mt-8"><CommunityFeed posts={[]} activeCategory={active} categories={categories} courses={composerCourses} author={{name:user.name,role:user.title,initials:user.initials,photo:user.photo}}/></div></div><CommunityRail about={{posts:posts.length,categories:categories.length,courses:ACADEMY.totals.courses,lessons:ACADEMY.totals.lessons}} leaders={[]}/></div><p className="mt-14 divider pt-6 text-micro tracking-normal text-chalk-faint">Local demonstration community. Posts and interactions are saved per identity in RCRE. The Classroom uses the actual imported Realtor curriculum.</p></div></AppShell>
}
