import Link from 'next/link'

export function DurableModuleUnavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="min-h-screen bg-ink px-5 py-16 text-chalk sm:px-8">
      <section className="mx-auto max-w-2xl rounded-panel border border-hair bg-ink-raised p-7 sm:p-10">
        <p className="eyebrow text-brass">River City Real Estate Group</p>
        <h1 className="mt-3 font-display text-h2">{title} is temporarily unavailable</h1>
        <p className="mt-4 max-w-prose text-body text-chalk-muted">{detail}</p>
        <p className="mt-3 text-label text-chalk-faint">No changes were saved. The existing curriculum and account records were not modified.</p>
        <Link className="btn-quiet mt-7 inline-flex" href="/today">Return to the portal</Link>
      </section>
    </main>
  )
}
