/**
 * Person avatar.
 *
 * Uses a real headshot when one is available, otherwise a deterministic
 * initial tile whose colours come from theme tokens.
 *
 * Only RCRE's two brokers have real photographs here — those were obtainable
 * from the public site. The rest of the roster is initials rather than a stock
 * face, because putting an invented face on a named real agent would be worse
 * than a monogram.
 */
const TONES = [1, 2, 3, 4, 5] as const

const SIZE = {
  xs: 'h-6 w-6 text-[0.625rem]',
  sm: 'h-8 w-8 text-[0.6875rem]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
  xl: 'h-20 w-20 text-base',
} as const

export function Avatar({
  initials, size = 'md', tone, photo, name,
}: {
  initials: string
  size?: keyof typeof SIZE
  tone?: number
  photo?: string
  name?: string
}) {
  const cls = SIZE[size]

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name ? `${name}` : ''}
        aria-hidden={!name}
        className={`${cls} shrink-0 rounded-full object-cover ring-1 ring-hair`}
        loading="lazy"
      />
    )
  }

  const n = TONES[(tone ?? initials.charCodeAt(0)) % TONES.length]
  return (
    <span
      aria-hidden
      className={`${cls} inline-flex shrink-0 items-center justify-center rounded-full
                  font-semibold tracking-wide`}
      style={{ background: `var(--av-${n}-bg)`, color: `var(--av-${n}-fg)` }}
    >
      {initials}
    </span>
  )
}
