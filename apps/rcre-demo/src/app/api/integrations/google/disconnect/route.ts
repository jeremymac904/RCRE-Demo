import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AccessError, requireActor } from '@/lib/platform/auth'
import { getGoogleWorkspaceService } from '@/lib/google-workspace/service'
import type { WorkspaceService } from '@/lib/google-workspace/types'
export const dynamic = 'force-dynamic'
const bodySchema = z.object({ service: z.enum(['gmail','calendar','drive']) })
export async function POST(request: Request) { try { const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==new URL(request.url).host)throw new AccessError('Origin verification failed',403);const body=bodySchema.parse(await request.json());const result=await getGoogleWorkspaceService().disconnect(await requireActor(),body.service as WorkspaceService);return NextResponse.json(result,{headers:{'cache-control':'private, no-store'}}) } catch { return NextResponse.json({error:'Google Workspace could not be disconnected.'},{status:400}) } }
