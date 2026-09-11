import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActor } from '@/lib/platform/auth'
import { validateCloudConfig } from '@/lib/services/cloud-ai/settings-server'
import type { CloudProviderConfig } from '@/lib/services/cloud-ai/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  config: z.object({
    provider: z.string(),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional(),
  }) as z.ZodType<CloudProviderConfig>,
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
