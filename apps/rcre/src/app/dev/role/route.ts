import { NextResponse } from 'next/server'
import { dataMode } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

/**
 * DEVELOPMENT ONLY — switch the fixture role so both RCRE Today (agent view)
 * and RCRE Command (broker view) can be reviewed without opening dev tools.
 *
 * Refuses outright in live mode. This is a review affordance for fixture data,
 * not an authentication mechanism, and it must never become one.
 */
export async function GET(request: Request) {
  if (dataMode() !== 'fixtures') {
    return NextResponse.json(
      { error: 'role switching is only available in fixture mode' },
      { status: 404 },
    )
  }

  const url = new URL(request.url)
  const requested = url.searchParams.get('as')
  const role = requested === 'broker' ? 'broker' : 'agent'

  // Return the reviewer to the page they were on, so switching role on
  // /command does not bounce them to /today.
  let back = url.searchParams.get('back')
  if (!back) {
    const referer = request.headers.get('referer')
    if (referer) {
      try {
        const r = new URL(referer)
        if (r.origin === url.origin) back = r.pathname
      } catch { /* ignore an unparseable referer */ }
    }
  }
  back = back || '/today'

  // Same-origin relative paths only, and never the switch route itself.
  const target =
    back.startsWith('/') && !back.startsWith('//') && !back.startsWith('/dev/role')
      ? back
      : '/today'

  const res = NextResponse.redirect(new URL(target, url.origin))
  res.cookies.set('rcre_dev_role', role, { path: '/', httpOnly: false, sameSite: 'lax' })
  return res
}
