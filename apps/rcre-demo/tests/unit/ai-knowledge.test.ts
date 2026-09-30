import { describe, expect, it } from 'vitest'
import { searchTrainingCurriculum } from '@/lib/services/ai-knowledge'

describe('local AI curriculum retrieval', () => {
  it('returns matching imported course or lesson metadata with internal links', () => {
    const hits = searchTrainingCurriculum('AI marketing content')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(hit => hit.href.startsWith('/training/classroom/'))).toBe(true)
    expect(hits.some(hit => /marketing|content/i.test(`${hit.title} ${hit.description}`))).toBe(true)
  })

  it('does not invent brokerage procedure content when no curriculum match exists', () => {
    expect(searchTrainingCurriculum('quartzpaperunicorn')).toEqual([])
  })
})
