import { NextResponse } from 'next/server'
import { AccessError, requireActor } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { getGoogleWorkspaceService } from '@/lib/google-workspace/service'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { let actor: PlatformActor | null = null; try { actor=await requireActor();return NextResponse.json(await getGoogleWorkspaceService().status(actor), { headers: { 'cache-control': 'private, no-store' } }) } catch (error) { const response=NextResponse.json({ error: 'Google Workspace status is unavailable.' }, { status: 401 });await recordCaughtRouteFailure(request,'/api/integrations/google',actor,error instanceof AccessError?error.status:actor?503:401,error);return response } }
