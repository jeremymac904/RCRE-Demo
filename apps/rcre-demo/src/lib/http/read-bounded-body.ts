export class RequestBodyTooLargeError extends Error {
  readonly status = 413
  constructor() { super('Request body exceeds the allowed size'); this.name = 'RequestBodyTooLargeError' }
}

/** Read a request body with a hard byte ceiling before invoking multipart parsers. */
export async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('A positive body limit is required')
  const declared = request.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new RequestBodyTooLargeError()
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel('Request body too large')
        throw new RequestBodyTooLargeError()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}

export async function parseBoundedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const bytes = await readBoundedBody(request, maxBytes)
  const contentType = request.headers.get('content-type')
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) throw new Error('Multipart form data is required')
  const boundedRequest = new Request(request.url, { method: 'POST', headers: { 'content-type': contentType }, body: Buffer.from(bytes) })
  return boundedRequest.formData()
}
