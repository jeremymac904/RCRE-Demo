 'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AcademyProgress } from '@/data/academy-types'
export interface ClassroomLesson {id:string;courseId:string;order:number;title:string}
export interface ClassroomCourse {id:string;title:string;lessonCount:number}
export interface ClassroomCurriculum {lessons:ClassroomLesson[];courses:ClassroomCourse[]}
export interface CourseProgress {done:number;total:number;percent:number}
type RecordState=AcademyProgress & {bookmarks?:string[];positions?:Record<string,number>}
const CurriculumContext=createContext<ClassroomCurriculum>({lessons:[],courses:[]})
const ProgressContext=createContext<{record:RecordState;save:(input:Record<string,unknown>)=>Promise<void>}>({record:{completedLessonIds:[]},save:async()=>{}})
export function AcademyProgressProvider({curriculum,seed,children}:{curriculum:ClassroomCurriculum;seed:AcademyProgress;children:React.ReactNode}) {
 const [record,setRecord]=useState<RecordState>(seed),[error,setError]=useState('')
 const save=useCallback(async(input:Record<string,unknown>)=>{try{const r=await fetch('/api/academy/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const b=await r.json();if(!r.ok)throw new Error(b.error);setRecord(b);setError('')}catch(e){setError((e as Error).message)}},[])
 useEffect(()=>{let active=true;fetch('/api/academy/progress').then(async r=>{if(!r.ok)throw new Error('Unable to load saved progress');return r.json()}).then(p=>{if(active)setRecord(p)}).catch(e=>setError(e.message));return()=>{active=false}},[])
 return <CurriculumContext.Provider value={curriculum}><ProgressContext.Provider value={{record,save}}>{error&&<p role="alert" className="border border-red-400 p-3">{error}. Refresh to retry.</p>}{children}</ProgressContext.Provider></CurriculumContext.Provider>
}
export function useAcademyProgress(){const {record,save}=useContext(ProgressContext);const isComplete=useCallback((id:string)=>record.completedLessonIds.includes(id),[record]);return {record,isComplete,setComplete:useCallback((lessonId:string,complete:boolean)=>save({lessonId,complete}),[save]),toggleComplete:(lessonId:string)=>save({lessonId,complete:!isComplete(lessonId)}),markViewed:useCallback((lessonId:string)=>save({lessonId}),[save]),bookmark:(lessonId:string,bookmark:boolean)=>save({lessonId,bookmark}),savePosition:(lessonId:string,seconds:number)=>save({lessonId,seconds})}}
export function useCourseLessons(courseId: string): ClassroomLesson[] {
  const { lessons } = useContext(CurriculumContext)
  return useMemo(() => lessons.filter(l => l.courseId === courseId), [lessons, courseId])
}

const progressOf = (
  lessons: ClassroomLesson[], isComplete: (id: string) => boolean,
): CourseProgress => {
  const done = lessons.reduce((n, l) => (isComplete(l.id) ? n + 1 : n), 0)
  return {
    done,
    total: lessons.length,
    percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
  }
}

export function useCourseProgress(courseId: string): CourseProgress {
  const { isComplete } = useAcademyProgress()
  const lessons = useCourseLessons(courseId)
  return useMemo(() => progressOf(lessons, isComplete), [lessons, isComplete])
}

/** Whole-Academy progress. Completions for lessons the curriculum no longer
 *  contains are ignored rather than counted — the same guard the server-side
 *  `overallProgress` applies, and the reason a stale browser record cannot
 *  report 183 of 181. */
export function useOverallProgress(): CourseProgress {
  const { isComplete } = useAcademyProgress()
  const { lessons } = useContext(CurriculumContext)
  return useMemo(() => progressOf(lessons, isComplete), [lessons, isComplete])
}

/**
 * The lesson a "Continue" action points at, Academy-wide.
 *
 * Mirrors `continueLesson` in `@/lib/academy` deliberately: last viewed wins
 * while it is unfinished, otherwise the sequence advances from there, otherwise
 * the top of the curriculum. Undefined only when everything is complete.
 */
export function useContinueLesson(): ClassroomLesson | undefined {
  const { record, isComplete } = useAcademyProgress()
  const { lessons } = useContext(CurriculumContext)

  return useMemo(() => {
    const last = record.lastViewedLessonId
      ? lessons.find(l => l.id === record.lastViewedLessonId)
      : undefined
    if (last && !isComplete(last.id)) return last
    if (last) {
      const from = lessons.findIndex(l => l.id === last.id)
      const onward = lessons.slice(from + 1).find(l => !isComplete(l.id))
      if (onward) return onward
    }
    return lessons.find(l => !isComplete(l.id))
  }, [lessons, record, isComplete])
}

/**
 * Resume WITHIN one course.
 *
 * The Academy-wide answer is the wrong one on a course screen — an agent who
 * opened Course 8 wants Course 8, not to be bounced into Course 2 because that
 * is where they last stopped.
 */
export function useCourseResume(courseId: string): ClassroomLesson | undefined {
  const { record, isComplete } = useAcademyProgress()
  const lessons = useCourseLessons(courseId)

  return useMemo(() => {
    const last = lessons.find(l => l.id === record.lastViewedLessonId)
    if (last && !isComplete(last.id)) return last
    return lessons.find(l => !isComplete(l.id))
  }, [lessons, record, isComplete])
}

/** Neighbours in curriculum order, crossing the course boundary — so the last
 *  lesson of a course leads into the next course rather than dead-ending. */
export function useLessonNeighbours(lessonId: string) {
  const { lessons } = useContext(CurriculumContext)
  return useMemo(() => {
    const i = lessons.findIndex(l => l.id === lessonId)
    return {
      previous: i > 0 ? lessons[i - 1] : undefined,
      next: i >= 0 ? lessons[i + 1] : undefined,
    }
  }, [lessons, lessonId])
}

export function useClassroomCourse(courseId: string): ClassroomCourse | undefined {
  const { courses } = useContext(CurriculumContext)
  return courses.find(c => c.id === courseId)
}
