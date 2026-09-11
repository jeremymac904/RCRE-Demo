/**
 * A progress rule, not a progress bar.
 *
 * Deliberately one hairline tall. Progress in the Academy is context for a
 * decision — what to open next — not an achievement to celebrate, and a thick
 * filled bar would give it more weight on the screen than the lesson it sits
 * beside.
 */
export function AcademyProgressBar({
  percent, label, className = '',
}: { percent: number; label?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-sunken"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Course progress'}
      >
        <div className="h-full rounded-full bg-brass-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="shrink-0 text-label text-chalk-faint">{clamped}%</span>
    </div>
  )
}
