export const dynamic = 'force-dynamic'

/** Liveness says only that the web process can answer requests. */
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
