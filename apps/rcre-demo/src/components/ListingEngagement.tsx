/**
 * Listing engagement.
 *
 * A six-week bar trend plus the three totals an agent is asked about on a
 * listing appointment. Drawn with divs rather than a charting library: it is
 * six numbers, and a dependency that ships a canvas renderer to show six
 * numbers is not a trade worth making.
 *
 * The shape — not the axis — is the point, so there is no axis. The final
 * week is picked out in brass because "is it still moving?" is the question.
 */
export function ListingEngagement({
  trend, views, saves, leads, flat,
}: {
  trend?: number[]
  views: number
  saves: number
  leads: number
  /** Rendered when the listing has no traffic yet — a flat line reads as broken. */
  flat?: string
}) {
  const series = trend ?? []
  const peak = Math.max(...series, 0)
  const live = peak > 0
  // Two different empty states. "Nothing happened" and "we were not yet
  // counting" look identical in a chart and mean opposite things to an agent.
  const empty = series.length === 0
    ? 'Weekly trend accumulates forward from the day tracking starts, and has not been collected for this listing. The totals below are what it has so far.'
    : flat ?? 'No traffic yet — nothing has been published.'

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-label font-semibold uppercase tracking-[0.1em] text-chalk-muted">
          Engagement
        </h2>
        {live && (
          <p className="text-micro tracking-normal text-chalk-faint">Views per week · last six weeks</p>
        )}
      </div>

      {live ? (
        <div className="mt-4 flex h-24 items-end gap-1.5" role="img"
             aria-label={`Weekly views: ${series.join(', ')}`}>
          {series.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={`w-full rounded-t-[3px] ${
                    i === series.length - 1 ? 'bg-brass-fill' : 'bg-hair-strong'}`}
                   style={{ height: `${Math.max((v / peak) * 100, 3)}%` }} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-control border border-hair bg-ink-raised px-4 py-3 text-body text-chalk-muted">
          {empty}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-hair pt-4">
        {[
          ['Leads', leads.toLocaleString()],
          ['Views', views.toLocaleString()],
          ['Saves', saves.toLocaleString()],
        ].map(([k, v]) => (
          <div key={k}>
            <dd className="font-display text-h3 font-600 text-chalk">{v}</dd>
            <dt className="mt-0.5 text-label text-chalk-faint">{k}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Compact version for the listings index — the trend only, no totals. */
export function ListingSparkline({ trend }: { trend?: number[] }) {
  const series = trend ?? []
  const peak = Math.max(...series, 0)
  if (peak <= 0) return null

  return (
    <span aria-hidden className="flex h-6 items-end gap-[3px]">
      {series.map((v, i) => (
        <span key={i}
              className={`w-full flex-1 rounded-t-[2px] ${
                i === series.length - 1 ? 'bg-brass-fill' : 'bg-hair-strong'}`}
              style={{ height: `${Math.max((v / peak) * 100, 6)}%` }} />
      ))}
    </span>
  )
}
