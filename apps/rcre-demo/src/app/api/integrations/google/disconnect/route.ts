import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AccessError, requireActor } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { getGoogleWorkspaceService } from '@/lib/google-workspace/service'
import type { WorkspaceService } from '@/lib/google-workspace/types'
export const dynamic = 'force-dynamic'
const bodySchema = z.object({ service: z.enum(['gmail','calendar','drive']) })
export async function POST(request: Request) { let actor: PlatformActor | null = null; try { const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==new URL(request.url).host)throw new AccessError('Origin verification failed',403);const body=bodySchema.parse(await request.json());actor=await requireActor();const result=await getGoogleWorkspaceService().disconnect(actor,body.service as WorkspaceService);return NextResponse.json(result,{headers:{'cache-control':'private, no-store'}}) } catch (error) { const response=NextResponse.json({error:'Google Workspace could not be disconnected.'},{status:400});await recordCaughtRouteFailure(request,'/api/integrations/google/disconnect',actor,error instanceof AccessError?error.status:actor?503:400,error);return response } }
