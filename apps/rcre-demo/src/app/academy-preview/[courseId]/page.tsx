import Link from 'next/link'
import {notFound} from 'next/navigation'
import {publicCourseAllowed} from '@/lib/academy-service'
import {courseById,lessonsFor} from '@/lib/academy'
import {AcademyLessonStage} from '@/components/AcademyLessonStage'
import {AcademyResourceList} from '@/components/AcademyResourceList'
export const dynamic='force-dynamic'
export const metadata={title:'RCRE Academy — authorized course preview',robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{courseId:string}>}){const {courseId}=await params;if(!publicCourseAllowed(courseId))notFound();const course=courseById(courseId);if(!course)notFound();return <main className="mx-auto max-w-4xl px-6 py-12"><Link href="/join" className="btn-quiet">← Explore RCRE</Link><p className="eyebrow mt-8">Authorized Academy preview</p><h1 className="font-display text-h1 mt-3">{course.title}</h1><p className="text-lead text-chalk-muted mt-5">{course.description}</p>{lessonsFor(courseId).map(l=><article key={l.id} className="mt-12 border-t border-hair pt-8"><h2 className="font-display text-h3 mb-5">{l.order}. {l.title}</h2><AcademyLessonStage lesson={l}/><p className="text-body my-6">{l.description}</p><Link className="btn-quiet" href="/login">Sign in for agent resources and saved progress →</Link></article>)}</main>}
