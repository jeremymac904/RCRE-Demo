/**
 * RCRE mark.
 *
 * Both official artworks, downloaded from RCRE's CDN and resized to 480px.
 * The mark is single-colour, so each theme needs its own file — the white one
 * disappears on a light sidebar and the black one disappears on a dark one.
 *
 * Both are rendered and swapped with CSS rather than JavaScript, so the correct
 * one is present on first paint with no flash and no hydration dependency.
 */
export function Logo({ className = '', width = 108 }: { className?: string; width?: number }) {
  const height = Math.round(width / 3)
  const common = 'h-auto select-none'
  return (
    <span className={`relative inline-block ${className}`} style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/rcre-logo-dark.png"
        alt="RCRE — River City Real Estate Group"
        width={width} height={height}
        className={`${common} block dark-hide`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/rcre-logo-light.png"
        alt=""
        aria-hidden
        width={width} height={height}
        className={`${common} absolute inset-0 light-hide`}
      />
    </span>
  )
}
