import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActor } from '@/lib/platform/auth'
import { validateCloudConfig } from '@/lib/services/cloud-ai/settings-server'
import type { CloudProviderConfig } from '@/lib/services/cloud-ai/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  config: z.object({
    provider: z.literal('openrouter'),
    model: z.literal('openrouter/free'),
    baseUrl: z.literal('https://openrouter.ai/api/v1').optional(),
    maxTokens: z.number().int().min(1).max(2000).optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).strict() as z.ZodType<CloudProviderConfig>,
})

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin')
    if (origin && new URL(origin).host !== req.headers.get('host')) {
      throw new Error('Origin access denied')
    }

    await requireActor()

    const body = await req.json()
    const { config } = schema.parse(body)

    const result = await validateCloudConfig(config)

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Validation failed'
    return NextResponse.json({ valid: false, error: message }, { status: 400 })
  }
}
