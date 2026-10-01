import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { AccessError } from '@/lib/platform/auth'
import { assertSameOriginMutation } from '@/lib/auth/request-origin'

describe('same-origin mutation guard for invitation flows', () => {
  it('accepts a matching Origin or same-origin Referer', () => {
    expect(() => assertSameOriginMutation(new NextRequest('https://rcre.example/api/admin/invitations', {
      method: 'POST', headers: { origin: 'https://rcre.example' },
    }))).not.toThrow()
    expect(() => assertSameOriginMutation(new NextRequest('https://rcre.example/api/admin/invitations', {
      method: 'POST', headers: { referer: 'https://rcre.example/settings/people' },
    }))).not.toThrow()
  })

  it.each([
    ['foreign origin', { origin: 'https://attacker.example' }],
    ['opaque origin', { origin: 'null' }],
    ['foreign referer', { referer: 'https://attacker.example/form' }],
    ['missing origin evidence', {}],
  ])('rejects %s', (_label, headers) => {
    expect(() => assertSameOriginMutation(new NextRequest('https://rcre.example/api/admin/invitations', {
      method: 'POST', headers,
    }))).toThrowError(AccessError)
  })
})
