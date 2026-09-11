import { protectedHref } from '@/lib/academy-media'
import {
  RESOURCE_LABEL, formatBytes, isDownloadable, type AcademyResource,
} from '@/lib/academy'

/**
 * Lesson resources — handouts, prompt packs, templates.
 *
 * TWO HONEST STATES, and the difference is checked against the filesystem
 * rather than the data. A resource whose file was really copied into RCRE is a
 * download, with its format and size stated before the click. A resource the
 * curriculum lists but whose file is not here yet is rendered as text — not as
 * a link that 404s, and not hidden either, because the curriculum genuinely
 * includes it and an agent deciding whether the Academy is worth their time
 * should see the whole set.
 *
 * `sourcePath` is never rendered. It exists so a maintainer can trace an asset
 * back to Jeremy's workspace; an agent has no use for a production filename and
 * showing one would leak the internal tree.
 */
export function AcademyResourceList({ resources }: { resources: AcademyResource[] }) {
  if (!resources.length) return null

  return (
    <ul className="divide-y divide-hair border-y border-hair">
      {resources.map((r, i) => {
        const size = formatBytes(r.bytes)
        const meta = [RESOURCE_LABEL[r.kind], r.format, size].filter(Boolean).join(' · ')

        return (
          <li key={`${r.title}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
            <div className="min-w-0">
              {isDownloadable(r) ? (
                <a
                  href={r.href ? protectedHref(r.href) : undefined}
                  download
                  className="text-body font-medium text-chalk underline decoration-hair-brass underline-offset-4
                             transition-colors hover:text-brass"
                >
                  {r.title}
                </a>
              ) : (
                <span className="text-body font-medium text-chalk-muted">{r.title}</span>
              )}
              <span className="mt-0.5 block text-label text-chalk-faint">{meta}</span>
            </div>
            {!isDownloadable(r) && (
              <span className="shrink-0 text-label text-chalk-faint">Not yet released</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
