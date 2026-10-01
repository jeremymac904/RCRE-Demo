import Link from 'next/link'

export function InvitationAcceptance({ token, name }: { token: string; name: string }) {
  return <main className="min-h-screen bg-ink px-6 py-16 text-chalk">
    <div className="mx-auto max-w-xl rounded-2xl border border-hair bg-ink-raised p-8">
      <p className="eyebrow">RCRE invitation</p>
      <h1 className="mt-3 font-display text-3xl">Join your RCRE workspace.</h1>
      <p className="my-5 text-chalk-muted">Hello {name}. Continue with Google using the email address that received this invitation. Google sign-in does not grant Gmail, Calendar, or Drive access.</p>
      <form action="/api/auth/invitations/start" method="post">
        <input type="hidden" name="token" value={token} />
        <button className="btn-primary min-h-11">Continue with Google</button>
      </form>
      <p className="mt-5 text-sm text-chalk-muted">This invitation link is single use and expires. If this invitation was not intended for you, close this page.</p>
      <Link href="/login" className="mt-5 inline-block text-brass-ink">Return to sign in</Link>
    </div>
  </main>
}
