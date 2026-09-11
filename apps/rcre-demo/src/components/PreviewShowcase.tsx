import Link from 'next/link'
import {
  PreviewToday, PreviewAssistant, PreviewCrm, PreviewMarketing, PreviewAcademy,
} from './PreviewSurfaces'

/**
 * The public arrangements of the product previews.
 *
 * Two of them, because the two public pages have different readers. The
 * landing page reader is browsing and gets all five surfaces. The /join reader
 * has already decided the technology matters and is checking whether it is
 * real, so they get three — placed inside the existing RCRE AI band rather
 * than as a section of their own, which would promote the software above the
 * six pillars the page is built on.
 *
 * The honesty line under each arrangement is not decoration. These frames look
 * like software, and a viewer is entitled to know at a glance that the people
 * and figures in them are invented.
 */

const HONESTY =
  'Miniatures of the real screens, drawn with the same design system. Every ' +
  'name, message and figure in them is synthetic, and nothing shown here has ' +
  'been sent.'

/**
 * Landing page: all five surfaces.
 *
 * The grid gains a two-column shape at `md` so a tablet is not served the
 * phone stack, then takes its editorial proportions at `lg` — Today and the
 * assistant reading as the pair they are, the CRM running full width because
 * a list wants width, and marketing and training closing as equals.
 */
export function PreviewShowcase() {
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
        <div className="md:col-span-2 lg:col-span-7"><PreviewToday /></div>
        <div className="md:col-span-2 lg:col-span-5"><PreviewAssistant /></div>
        <div className="md:col-span-2 lg:col-span-12"><PreviewCrm /></div>
        <div className="md:col-span-1 lg:col-span-6"><PreviewMarketing /></div>
        <div className="md:col-span-1 lg:col-span-6"><PreviewAcademy /></div>
      </div>

      <p className="mt-6 max-w-prose text-label text-chalk-faint">{HONESTY}</p>
    </div>
  )
}

/** /join: three surfaces, inside the section that already argues for them. */
export function PreviewStrip() {
  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <PreviewToday />
        <PreviewAssistant />
        {/* Alone on its row at tablet width, so it fills rather than half-fills. */}
        <div className="sm:col-span-2 lg:col-span-1"><PreviewAcademy /></div>
      </div>

      <p className="mt-5 max-w-prose text-label text-chalk-faint">
        {HONESTY}{' '}
        <Link href="/login" className="text-brass underline underline-offset-4">
          Open the demo
        </Link>{' '}
        to see the screens themselves.
      </p>
    </div>
  )
}
