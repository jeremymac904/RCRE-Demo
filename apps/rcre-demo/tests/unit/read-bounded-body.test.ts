import { describe, expect, it } from 'vitest'
import { parseBoundedFormData, readBoundedBody, RequestBodyTooLargeError } from '../../src/lib/http/read-bounded-body'

const streamed = (chunks: string[]) => new Request('https://rcre.test/upload', {
  method: 'POST',
  body: new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk)); controller.close() } }),
  duplex: 'half',
} as RequestInit)

describe('bounded request parsing', () => {
  it('rejects a chunked oversized body before a multipart parser sees it', async () => {
    const request = streamed(['1234', '5678'])
    await expect(readBoundedBody(request, 7)).rejects.toBeInstanceOf(RequestBodyTooLargeError)
  })

  it('parses a small multipart form under the cap', async () => {
    const request = new Request('https://rcre.test/upload', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=test-boundary' },
      body: '--test-boundary\r\nContent-Disposition: form-data; name="note"\r\n\r\nok\r\n--test-boundary--\r\n',
    })
    const form = await parseBoundedFormData(request, 1024)
    expect(form.get('note')).toBe('ok')
  })

  it('rejects declared oversized lengths without consuming the body', async () => {
    const request = new Request('https://rcre.test/upload', { method: 'POST', headers: { 'content-length': '9999' }, body: 'x' })
    await expect(readBoundedBody(request, 16)).rejects.toBeInstanceOf(RequestBodyTooLargeError)
  })
})
