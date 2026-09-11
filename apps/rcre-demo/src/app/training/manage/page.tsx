import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { TrainingNav } from '@/components/TrainingNav'
import { AcademyManager } from '@/components/AcademyManager'
import { courses } from '@/lib/academy'
export default async function Page(){const user=await currentUser();if(!user)redirect('/login');return <AppShell user={user}><div className="mx-auto max-w-6xl px-6 py-10 lg:px-12"><h1 className="font-display text-h2">Assignments & authoring</h1><TrainingNav active="manage"/><AcademyManager catalog={courses().map(c=>({id:c.id,title:c.title}))}/></div></AppShell>}
