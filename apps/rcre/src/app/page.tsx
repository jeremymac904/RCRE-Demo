import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RCRE intelligence layer</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          An intelligence layer on top of Follow&nbsp;Up&nbsp;Boss — not a replacement CRM.
          Follow&nbsp;Up&nbsp;Boss remains the system of record for contact data; RCRE
          answers what to do today, why, and what can be prepared for you.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/today" className="rounded-lg border border-line bg-white p-5 hover:border-rcre">
          <h2 className="font-medium">RCRE Today</h2>
          <p className="mt-1 text-sm text-ink-mute">The agent view — what needs attention, and why.</p>
        </Link>
        <Link href="/command" className="rounded-lg border border-line bg-white p-5 hover:border-rcre">
          <h2 className="font-medium">RCRE Command</h2>
          <p className="mt-1 text-sm text-ink-mute">The broker view — exceptions only, no dashboard clutter.</p>
        </Link>
      </div>
    </div>
  )
}
