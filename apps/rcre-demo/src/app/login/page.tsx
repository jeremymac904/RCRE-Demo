import { PERSONAS, demoEnabled } from '@/lib/platform/auth'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { googleConfig } from '@/lib/auth/google-oidc'

export const dynamic = 'force-dynamic'

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const localDemo = demoEnabled()
  const googleReady = !!googleConfig()
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
        <p className="text-chalk-muted max-w-2xl my-5">Use your invited RCRE Google account to sign in. Mailbox, Calendar, and Drive access remain separate optional permissions.</p>
        {googleReady ? <form action="/api/auth/google" method="get"><button className="inline-flex min-h-11 items-center border border-hair px-5 py-3 hover:border-brass-fill">Sign in with Google</button></form> : <button disabled className="border border-hair px-5 py-3 opacity-60 cursor-not-allowed" aria-describedby="google-status">Sign in with Google</button>}
        <p id="google-status" className="mt-3 text-sm text-chalk-muted">{error === 'not-invited' ? 'This Google account does not match an active RCRE invitation.' : error === 'sign-in-failed' ? 'Google sign-in could not be verified. Please try again.' : googleReady ? 'Google identity is ready; only invited RCRE accounts may enter.' : 'Google identity configuration is required before account sign-in is available.'}</p>
      </>}
      <Link href="/" className="ml-5">Back to RCRE</Link>
    </div>
  </main>
}
