import { PERSONAS, demoEnabled } from '@/lib/platform/auth'
import { Logo } from '@/components/Logo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const localDemo = demoEnabled()
  const { error } = await searchParams
  return <main className="min-h-screen bg-ink px-6 py-10">
    <div className="mx-auto max-w-5xl">
      <Link href="/"><Logo /></Link>
      {localDemo ? <>
        <p className="eyebrow mt-12">Local demonstration</p>
        <h1 className="font-display text-4xl mt-3">Choose your workspace.</h1>
        <p className="text-chalk-muted max-w-2xl my-5">Every operational persona and client record is synthetic. This local facility creates an expiring session; it is separate from production authentication.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{PERSONAS.map(persona => <form action="/api/session" method="POST" key={persona.id}>
          <input type="hidden" name="userId" value={persona.id} />
          <button className="text-left w-full h-full border border-hair bg-ink-raised p-6 hover:border-brass-fill">
            <span className="block text-brass-ink text-sm capitalize">{persona.role.replaceAll('_', ' ')}</span>
            <strong className="block font-display text-xl mt-2">{persona.name}</strong>
            <span className="text-chalk-muted block mt-3">{persona.market} · synthetic persona</span>
            <span className="block mt-5 text-sm">Open workspace →</span>
          </button>
        </form>)}</div>
        <p className="my-8 text-sm text-chalk-muted">Invitations and recovery are managed by the local owner. External identity-provider recovery remains unavailable.</p>
        <Link href="/recovery" className="mr-5">Recover local access</Link>
      </> : <>
        <p className="eyebrow mt-12">Secure access</p>
        <h1 className="font-display text-4xl mt-3">Sign in to RCRE.</h1>
        <p className="text-chalk-muted max-w-2xl my-5">Google sign-in is not connected yet. An administrator must configure Google OAuth before production accounts can sign in. Mailbox access remains a separate optional permission.</p>
        <button disabled className="border border-hair px-5 py-3 opacity-60 cursor-not-allowed" aria-describedby="google-status">Sign in with Google</button>
        <p id="google-status" className="mt-3 text-sm text-chalk-muted">{error === 'google-required' ? 'Google identity configuration is required.' : 'Production sign-in is unavailable until Google OAuth is configured.'}</p>
      </>}
      <Link href="/" className="ml-5">Back to RCRE</Link>
    </div>
  </main>
}
