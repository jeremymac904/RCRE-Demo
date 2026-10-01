import { AccessFlow } from '@/components/AccessFlow'
import { InvitationAcceptance } from './InvitationAcceptance'
import { getAuthPersistence, hashSecret } from '@/lib/auth/persistence'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token
  if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) return <AccessFlow mode="access" token={token} />
  try {
    const invitation = await (await getAuthPersistence()).invitationStatus(hashSecret(token))
    if (!invitation?.valid) return <main className="min-h-screen bg-ink px-6 py-20 text-chalk"><div className="mx-auto max-w-xl"><h1 className="font-display text-3xl">Invitation unavailable</h1><p className="my-5 text-chalk-muted">This invitation may have expired, already been used, or been cancelled. Ask your RCRE administrator for a new link.</p></div></main>
    return <InvitationAcceptance token={token} name={invitation.name} />
  } catch {
    return <main className="min-h-screen bg-ink px-6 py-20 text-chalk"><div className="mx-auto max-w-xl"><h1 className="font-display text-3xl">Sign-in is temporarily unavailable</h1><p className="my-5 text-chalk-muted">Please try again later or contact your RCRE administrator.</p></div></main>
  }
}
