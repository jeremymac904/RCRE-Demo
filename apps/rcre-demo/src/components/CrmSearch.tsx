import Link from 'next/link'

/**
 * Contact search.
 *
 * A plain GET form rather than a client-side filter: the result is a real URL,
 * so a searched list can be linked, refreshed, and carried back into by a
 * record's "← Contacts". Any active filter travels as a hidden field, so
 * searching inside a Command drill-in narrows it instead of discarding it.
 */
export function CrmSearch({
  q, source, filter, from, clearHref,
}: {
  q?: string
  source?: string
  filter?: string
  from?: string
  clearHref: string
}) {
  return (
    <form action="/crm" method="get" className="flex flex-wrap items-center gap-3">
      {source && <input type="hidden" name="source" value={source} />}
      {filter && <input type="hidden" name="filter" value={filter} />}
      {from && <input type="hidden" name="from" value={from} />}

      <label className="sr-only" htmlFor="crm-q">Search contacts</label>
      <input
        id="crm-q"
        name="q"
        type="search"
        defaultValue={q ?? ''}
        placeholder="Search name, email, phone or area"
        className="field max-w-sm rounded-control"
      />
      <button type="submit" className="btn-ghost">Search</button>
      {q && <Link href={clearHref} className="btn-quiet">Clear search</Link>}
    </form>
  )
}
