import { describe, expect, it } from 'vitest'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'

describe('least privilege platform role mapping', () => {
  it('preserves transaction coordinator and marketing admin scopes', () => {
    expect(repositoryRoleForPlatform('transaction_coordinator')).toBe('transaction_coordinator')
    expect(repositoryRoleForPlatform('marketing_admin')).toBe('marketing_admin')
    expect(repositoryRoleForPlatform('trainer')).toBe('trainer')
  })
})
