import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { TrainingNav } from '@/components/TrainingNav'
import { AcademyCatalogCard } from '@/components/AcademyCatalogCard'
import { AcademyContinueCard } from '@/components/AcademyContinueCard'
import { AcademyProgressSummary } from '@/components/AcademyProgressSummary'
import { ACADEMY, allLessonsInOrder, courses, publicAsset } from '@/lib/academy'
import type { AcademyCourse } from '@/data/academy-types'

export const dynamic = 'force-dynamic'

/**
 * The Classroom catalog.
 *
 * FOURTEEN COVERS, NOT A TABLE OF FOURTEEN ROWS. This is the one screen in the
 * product where the artwork is the information: an agent choosing what to study
 * next is browsing, and browsing is visual. Everywhere else in RCRE density
 * wins; here it does not.
 *
 * GROUPED BY LEVEL RATHER THAN LISTED FLAT. Foundation, then Practitioner, then
 * Advanced — the shape of the curriculum, taken from the course data's own
 * `level` field rather than derived by a rule this page invented. Inside each
 * group `courses()` has already sorted on the curriculum's `order`, which is
 * authoritative; array position in the generated file is not.
 *
 * NOTHING HERE TALKS ABOUT MISSING VIDEO. The catalog's question is "what
 * should I learn", and the answer does not change based on the production
 * schedule. That statement belongs on the lesson page, once, where an agent is
 * actually looking for a player.
 */

const LEVELS: { level: AcademyCourse['level']; caption: string }[] = [
  { level: 'Foundation',   caption: 'Where every agent starts. Do these in order.' },
  { level: 'Practitioner', caption: 'Applied to your own database, your own listings, your own market.' },
  { level: 'Advanced',     caption: 'Specialist work, and knowing where an assistant has to stop.' },
]

export default async function ClassroomPage() {
  const user = await currentUser()
  if (!user) redirect('/login')

  const catalog = courses()

  // Lesson artwork for the continue card, verified on disk here because
  // `publicAsset` needs a filesystem and the browser has none. Sending the map
  // rather than the convention means the client never guesses a path.
  const artwork: Record<string, string> = {}
  for (const lesson of allLessonsInOrder()) {
    const art = publicAsset(lesson.image)
    if (art) artwork[lesson.id] = art
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12 lg:py-14">
        <PageHeader
          eyebrow="RCRE AI Academy"
          title="Classroom"
          sub={`${ACADEMY.totals.courses} courses, ${ACADEMY.totals.lessons} lessons. Short and practical — nothing theoretical, nothing you cannot use the same week.`}
          action={<AcademyProgressSummary />}
        />

        <TrainingNav active="classroom" />

        <AcademyContinueCard artwork={artwork} />

        {LEVELS.map(({ level, caption }) => {
          const group = catalog.filter(c => c.level === level)
          if (!group.length) return null

          return (
            <section key={level} className="mt-12 lg:mt-14">
              <div className="flex flex-col gap-1 border-b border-hair pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <h2 className="eyebrow">{level}</h2>
                <p className="text-label text-chalk-faint sm:text-right">{caption}</p>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.map(course => (
                  <AcademyCatalogCard
                    key={course.id}
                    cover={publicAsset(course.cover)}
                    course={{
                      id: course.id,
                      title: course.title,
                      description: course.description,
                      level: course.level,
                      lessonCount: course.lessonCount,
                      promptCount: course.promptCount,
                      resourceCount: course.resourceCount,
                    }}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </AppShell>
  )
}
