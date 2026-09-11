import Link from 'next/link'

/**
 * Context-preserving back link.
 *
 * Records pass `?from=` when they are opened, so "back" returns to the list the
 * user actually came from rather than always to a default. Falls back cleanly
 * when the parameter is missing (a shared or refreshed URL).
 *
 * Only same-origin relative paths are honoured — a `from` value is user input.
 */

/**
 * Normalise a `from` value.
 *
 * Next does not decode `%2F` in a query value, so a naively re-encoded `from`
 * grows an escape level on every hop (`%2F` → `%252F` → `%25252F`…). Decoding
 * until the value stops changing collapses however many levels arrived, and the
 * `/` check afterwards rejects anything that is not a same-origin path.
 */
export function normaliseFrom(from?: string): string | undefined {
  if (!from) return undefined
  let v = from
  for (let i = 0; i < 5; i++) {
    let next: string
    try { next = decodeURIComponent(v) } catch { break }
    if (next === v) break
    v = next
  }
  return v.startsWith('/') && !v.startsWith('//') ? v : undefined
}
const LABELS: Record<string, string> = {
  '/today': 'Today',
  '/crm': 'Contacts',
  '/pipeline': 'Pipeline',
  '/listings': 'Listings',
  '/marketing': 'Marketing',
  '/command': 'Command',
  '/recruiting': 'Recruiting',
  '/agents': 'Agents',
  '/assistant': 'RCRE AI',
}

function labelFor(path: string): string {
  const clean = path.split('?')[0]
  if (LABELS[clean]) return LABELS[clean]
  const base = '/' + clean.split('/').filter(Boolean)[0]
  return LABELS[base] ?? 'Back'
}

/**
 * `from` arrives URL-decoded, so a query value like `source=Open House` would
 * otherwise be written back into the href with a raw space. Rebuild the query
 * with proper encoding.
 */
function encodePath(path: string): string {
  const [base, query] = path.split('?')
  if (!query) return base
  const params = new URLSearchParams(query)
  return `${base}?${params.toString()}`
}

export function BackLink({
  from, fallback, fallbackLabel,
}: { from?: string; fallback: string; fallbackLabel?: string }) {
  const safe = normaliseFrom(from)
  const href = safe ? encodePath(safe) : fallback
  const label = safe ? labelFor(safe) : (fallbackLabel ?? labelFor(fallback))

  return (
    <Link href={href} className="btn-quiet">
      <span aria-hidden>←</span> {label}
    </Link>
  )
}
