import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { getGoogleWorkspaceService } from '@/lib/google-workspace/service'
export const dynamic = 'force-dynamic'
export async function GET() { try { return NextResponse.json(await getGoogleWorkspaceService().status(await requireActor()), { headers: { 'cache-control': 'private, no-store' } }) } catch { return NextResponse.json({ error: 'Google Workspace status is unavailable.' }, { status: 401 }) } }
