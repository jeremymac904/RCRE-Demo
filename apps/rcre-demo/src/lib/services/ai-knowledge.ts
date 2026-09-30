import { courses, lessonsFor } from '@/lib/academy'

export interface LocalKnowledgeHit {
  title: string
  description: string
  href: string
}

const STOP_WORDS = new Set(['about', 'after', 'could', 'from', 'have', 'into', 'that', 'them', 'then', 'they', 'this', 'what', 'when', 'where', 'with', 'your', 'should', 'would', 'please', 'next'])

/** Search only imported course and lesson metadata. This is not brokerage policy retrieval. */
export function searchTrainingCurriculum(query: string, limit = 4): LocalKnowledgeHit[] {
  const terms = query.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter(term => !STOP_WORDS.has(term)) ?? []
  if (terms.length === 0) return []
  const hits: Array<LocalKnowledgeHit & { score: number }> = []
  for (const course of courses()) {
    const courseText = `${course.title} ${course.description}`.toLowerCase()
    const courseHref = `/training/classroom/${encodeURIComponent(course.id)}`
    const courseScore = terms.reduce((score, term) => score + (courseText.includes(term) ? 1 : 0), 0)
    if (courseScore > 0) hits.push({ title: course.title, description: course.description, href: courseHref, score: courseScore })
    for (const lesson of lessonsFor(course.id)) {
      const text = `${lesson.title} ${lesson.description}`.toLowerCase()
      const score = terms.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0)
      if (score > 0) hits.push({ title: `${course.title}: ${lesson.title}`, description: lesson.description, href: `${courseHref}/${encodeURIComponent(lesson.id)}`, score })
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, Math.max(1, limit)).map(({ score: _score, ...hit }) => hit)
}
