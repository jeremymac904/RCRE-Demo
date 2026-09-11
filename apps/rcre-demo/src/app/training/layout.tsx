import { actorOrNull } from '@/lib/platform/auth'
import { progressFor } from '@/lib/academy-service'
import { AcademyProgressProvider } from '@/components/AcademyProgressProvider'
import { ACADEMY_PROGRESS, allLessonsInOrder, courses } from '@/lib/academy'

/**
 * The Training shell.
 *
 * ITS ONLY JOB IS PROGRESS. A layout, rather than a wrapper repeated per page,
 * because a layout does not remount as the agent moves between Overview, the
 * catalog, a course and a lesson. Marking a lesson complete and pressing Back
 * therefore shows the updated card immediately — no refetch, no stale card, no
 * flicker.
 *
 * IT SITS AT /training, NOT AT /training/classroom. Progress belongs to the
 * learner, not to one room. Mounted under Classroom only, the Overview kept
 * rendering the seed after the agent had completed lessons — the two screens
 * disagreed about the same fact.
 *
 * WHAT CROSSES THE BOUNDARY AND WHY IT IS SO SMALL. Only the curriculum's
 * sequence — id, course, order, title — plus the demo's progress seed. The
 * browser needs those to answer "how far am I" and "what is next" without a
 * round trip. Descriptions, covers, resources and video paths stay on the
 * server, which is also where `publicAsset` and `playableVideo` have to run:
 * they check the filesystem, and a client bundle has no filesystem.
 *
 * ORDERING COMES FROM `allLessonsInOrder`, so the client sequence is the
 * curriculum's own `order` rather than array position in the generated file —
 * the same rule the server list pages follow.
 */
export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const actor = await actorOrNull()
  const progress = actor ? progressFor(actor) : { completedLessonIds: [] }
  const curriculum = {
    lessons: allLessonsInOrder().map(l => ({
      id: l.id,
      courseId: l.courseId,
      order: l.order,
      title: l.title,
    })),
    courses: courses().map(c => ({
      id: c.id,
      title: c.title,
      lessonCount: c.lessonCount,
    })),
  }

  return (
    <AcademyProgressProvider curriculum={curriculum} seed={progress}>
      {children}
    </AcademyProgressProvider>
  )
}
