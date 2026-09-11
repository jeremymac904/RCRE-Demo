'use client'

import { useOverallProgress } from './AcademyProgressProvider'

/**
 * The Classroom's one headline number.
 *
 * Lives in the page header's action slot, where the CRM screens put their
 * counts, so Training reads as the same operating system rather than a bolted-on
 * course platform. Client-side because it has to fall in step the instant a
 * lesson is marked complete two routes away.
 */
export function AcademyProgressSummary() {
  const overall = useOverallProgress()

  return (
    <div className="text-left sm:text-right">
      <p className="font-display text-h3 font-600 tabular text-brass">
        {overall.done}/{overall.total}
      </p>
      <p className="text-label text-chalk-faint">lessons complete</p>
    </div>
  )
}
