import { parseBoundedFormData, RequestBodyTooLargeError } from '@/lib/http/read-bounded-body'
import { actorOrNull } from '@/lib/platform/auth'
import { academyManager } from '@/lib/academy-service'
import { uploadAcademyAsset } from '@/lib/academy-durable'
import { StorageError } from '@/lib/storage'

export async function POST(request: Request) {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  if (!academyManager(actor)) return Response.json({ error: 'Trainer permission required' }, { status: 403 })
  try {
    const form = await parseBoundedFormData(request, 101 * 1024 * 1024), file = form.get('file')
    if (!(file instanceof File) || file.size > 100 * 1024 * 1024) throw new Error('Choose a resource up to 100 MB')
    return Response.json(await uploadAcademyAsset(actor, { filename: file.name, contentType: file.type, bytes: Buffer.from(await file.arrayBuffer()), category: 'training-resource' }))
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = error instanceof RequestBodyTooLargeError ? 413 : error instanceof StorageError ? error.status : /PostgreSQL is required|repository is available|storage is not configured/i.test(message) ? 503 : 400
    return Response.json({ error: error instanceof Error ? error.message : 'Resource upload failed' }, { status })
  }
}
