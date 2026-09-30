import { NextResponse } from 'next/server'
import { AccessError, requireActor } from '@/lib/platform/auth'
import { getGoogleWorkspaceService } from './service'

export async function workspaceGet(work: (service: ReturnType<typeof getGoogleWorkspaceService>, actor: Awaited<ReturnType<typeof requireActor>>, url: URL) => Promise<unknown>, request: Request) {
  try { const actor = await requireActor(); return NextResponse.json(await work(getGoogleWorkspaceService(), actor, new URL(request.url)), { headers: { 'cache-control': 'private, no-store' } }) }
  catch (error) { return NextResponse.json({ error: safeMessage(error) }, { status: error instanceof AccessError ? error.status : 503 }) }
}
export async function workspacePost(work: (service: ReturnType<typeof getGoogleWorkspaceService>, actor: Awaited<ReturnType<typeof requireActor>>, body: any) => Promise<unknown>, request: Request) {
  try { const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==new URL(request.url).host)throw new AccessError('Origin verification failed',403);const length=Number(request.headers.get('content-length')??0);if(length>12*1024*1024)throw new AccessError('Request is too large',413);const actor=await requireActor(),text=await request.text();if(Buffer.byteLength(text,'utf8')>12*1024*1024)throw new AccessError('Request is too large',413);const body=JSON.parse(text);return NextResponse.json(await work(getGoogleWorkspaceService(),actor,body),{headers:{'cache-control':'private, no-store'}}) }
  catch (error) { return NextResponse.json({ error: safeMessage(error) }, { status: error instanceof AccessError ? error.status : 400 }) }
}
export async function workspacePatch(work: (service: ReturnType<typeof getGoogleWorkspaceService>, actor: Awaited<ReturnType<typeof requireActor>>, body: any, url: URL) => Promise<unknown>, request: Request, params: Promise<{ id: string }>) {
  try { const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==new URL(request.url).host)throw new AccessError('Origin verification failed',403);const actor=await requireActor(),text=await request.text();if(Buffer.byteLength(text,'utf8')>64*1024)throw new AccessError('Request is too large',413);const body=JSON.parse(text),{id}=await params;return NextResponse.json(await work(getGoogleWorkspaceService(),actor,{...body,eventId:id},new URL(request.url)),{headers:{'cache-control':'private, no-store'}}) }
  catch (error) { return NextResponse.json({ error: safeMessage(error) }, { status: error instanceof AccessError ? error.status : 400 }) }
}
function safeMessage(error: unknown) { const message=error instanceof Error?error.message:'Request failed';return message.length<240?message:'Request failed' }
