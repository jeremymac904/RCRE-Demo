import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AccessError, requireActor } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { getGoogleWorkspaceService } from './service'

function statusFor(error: unknown): number {
  if (error instanceof AccessError) return error.status
  if (error instanceof z.ZodError || error instanceof SyntaxError) return 400
  return 503
}

export async function workspaceGet(
  work: (service: ReturnType<typeof getGoogleWorkspaceService>, actor: Awaited<ReturnType<typeof requireActor>>, url: URL) => Promise<unknown>,
  request: Request,
  route: string,
) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    return NextResponse.json(await work(getGoogleWorkspaceService(), actor, new URL(request.url)), { headers: { 'cache-control': 'private, no-store' } })
  } catch (error) {
    const status = statusFor(error)
    const response = NextResponse.json({ error: safeMessage(error) }, { status })
    await recordCaughtRouteFailure(request, route, actor, status, error)
    return response
  }
}

export async function workspacePost(
  work: (service: ReturnType<typeof getGoogleWorkspaceService>, actor: Awaited<ReturnType<typeof requireActor>>, body: any) => Promise<unknown>,
  request: Request,
  route: string,
) {
  let actor: PlatformActor | null = null
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).host !== new URL(request.url).host) throw new AccessError('Origin verification failed', 403)
    const length = Number(request.headers.get('content-length') ?? 0)
    if (length > 12 * 1024 * 1024) throw new AccessError('Request is too large', 413)
    actor = await requireActor()
    const text = await request.text()
    if (Buffer.byteLength(text, 'utf8') > 12 * 1024 * 1024) throw new AccessError('Request is too large', 413)
    const body = JSON.parse(text)
    const result = await work(getGoogleWorkspaceService(), actor, body)
    return NextResponse.json(result, { headers: { 'cache-control': 'private, no-store' } })
  } catch (error) {
    const status = statusFor(error)
    const response = NextResponse.json({ error: safeMessage(error) }, { status })
    await recordCaughtRouteFailure(request, route, actor, status, error)
    return response
  }
}

export async function workspacePatch(
  work: (service: ReturnType<typeof getGoogleWorkspaceService>, actor: Awaited<ReturnType<typeof requireActor>>, body: any, url: URL) => Promise<unknown>,
  request: Request,
  params: Promise<{ id: string }>,
  route: string,
) {
  let actor: PlatformActor | null = null
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).host !== new URL(request.url).host) throw new AccessError('Origin verification failed', 403)
    actor = await requireActor()
    const text = await request.text()
    if (Buffer.byteLength(text, 'utf8') > 64 * 1024) throw new AccessError('Request is too large', 413)
    const body = JSON.parse(text), { id } = await params
    const result = await work(getGoogleWorkspaceService(), actor, { ...body, eventId: id }, new URL(request.url))
    return NextResponse.json(result, { headers: { 'cache-control': 'private, no-store' } })
  } catch (error) {
    const status = statusFor(error)
    const response = NextResponse.json({ error: safeMessage(error) }, { status })
    await recordCaughtRouteFailure(request, route, actor, status, error)
    return response
  }
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed'
  return message.length < 240 ? message : 'Request failed'
}
