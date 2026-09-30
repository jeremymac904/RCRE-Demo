import { describe, expect, it } from 'vitest'
import { isLocalStoreAllowed } from '@/lib/platform/storage-mode'

describe('production persistence boundary', () => {
  it('permits the local adapter in development and automated tests', () => {
    expect(isLocalStoreAllowed('development', undefined)).toBe(true)
    expect(isLocalStoreAllowed('test', undefined)).toBe(true)
  })

  it('permits temporary local storage only while Next is building', () => {
    expect(isLocalStoreAllowed('production', 'phase-production-build')).toBe(true)
  })

  it('refuses local SQLite for every production runtime phase', () => {
    expect(isLocalStoreAllowed('production', 'phase-production-server')).toBe(false)
    expect(isLocalStoreAllowed('production', undefined)).toBe(false)
  })
})
