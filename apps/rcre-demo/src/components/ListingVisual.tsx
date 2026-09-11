/**
 * Listing visual.
 *
 * WHY THIS IS NOT A PHOTOGRAPH.
 * RCRE's listing photography lives on a CDN that rate-limits and then 403s
 * after a handful of requests. Depending on it would mean broken images in the
 * middle of a screen-share, and the same block prevented bundling the photos.
 *
 * So the visual is generated: a warm tonal field with an architectural
 * roofline, deterministic per listing. It reads as real estate, it never fails
 * to load, and — unlike a stock photo — it does not misrepresent a property.
 *
 * Both grounds and the line colour come from theme tokens, so the light version
 * is warm stone rather than a washed-out dark gradient.
 *
 * When RCRE supplies photography, this component is the only thing to change.
 */
export function ListingVisual({
  seed, className = '', showRoofline = true,
}: { seed: string; className?: string; showRoofline?: boolean }) {
  // Deterministic: the same listing always looks the same.
  const n = ([...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 6) + 1
  const skew = (seed.length % 5) - 2

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(148deg, var(--lv-${n}a) 0%, var(--lv-${n}b) 100%)` }}
    >
      {showRoofline && (
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice"
             className="absolute inset-0 h-full w-full" aria-hidden>
          <g stroke="var(--lv-line)" fill="none" strokeLinecap="round" strokeLinejoin="round"
             style={{ opacity: 'var(--lv-line-op)' }}>
            <path d={`M40 ${190 + skew} L200 ${96 + skew} L360 ${190 + skew}`} strokeWidth="1.1" />
            <path d={`M78 ${176 + skew} L78 300 M322 ${176 + skew} L322 300`}
                  strokeWidth="1" opacity="0.6" />
            <path d={`M150 300 L150 ${224 + skew} L250 ${224 + skew} L250 300`}
                  strokeWidth="1" opacity="0.55" />
            <path d={`M110 ${212 + skew} h34 M256 ${212 + skew} h34`}
                  strokeWidth="1" opacity="0.45" />
            <path d="M0 262 H400" strokeWidth="0.8" opacity="0.35" />
          </g>
        </svg>
      )}
      <div className="absolute inset-0"
           style={{ background: 'radial-gradient(120% 90% at 50% 100%, var(--lv-vignette), transparent 70%)' }} />
    </div>
  )
}
