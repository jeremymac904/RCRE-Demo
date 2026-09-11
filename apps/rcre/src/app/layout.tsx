import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dataMode } from '@/lib/config/env'

export const metadata: Metadata = {
  title: 'RCRE',
  description: 'RCRE intelligence layer',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = dataMode()
  const role = mode === 'fixtures'
    ? ((await cookies()).get('rcre_dev_role')?.value === 'broker' ? 'broker' : 'agent')
    : null
  return (
    <html lang="en">
      <body>
        {mode === 'fixtures' && (
          <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
              <span>
                <strong>Development fixtures.</strong> Synthetic data only — no real
                contacts, no Follow&nbsp;Up&nbsp;Boss connection.
              </span>
              <span className="text-amber-700" aria-hidden>|</span>
              <span>
                Viewing as{' '}
                <strong>{role === 'broker' ? 'Fixture Broker' : 'Fixture Agent A'}</strong>
                {' '}({role})
              </span>
              <a
                href={`/dev/role?as=${role === 'broker' ? 'agent' : 'broker'}`}
                className="rounded border border-amber-400 bg-amber-50 px-2 py-0.5 font-medium underline-offset-2 hover:bg-amber-200"
              >
                Switch to {role === 'broker' ? 'agent' : 'broker'}
              </a>
            </div>
          </div>
        )}
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight text-rcre-deep">RCRE</Link>
            <nav className="flex gap-4 text-sm text-ink-soft">
              <Link href="/today" className="hover:text-rcre">Today</Link>
              <Link href="/command" className="hover:text-rcre">Command</Link>
              <Link href="/join" className="hover:text-rcre">Join RCRE</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
