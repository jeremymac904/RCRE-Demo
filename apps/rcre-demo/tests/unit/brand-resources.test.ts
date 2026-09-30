import { describe, expect, it } from 'vitest'
import {
  BRAND_ITEMS, brandComplianceReadiness, canAccessBrandResources, isBrandAdmin, licenseForState,
  type BrandAgent,
} from '@/lib/brand-resources'

const profile = (market: string, license = 'public-license-value'): Pick<BrandAgent, 'market' | 'license'> => ({ market, license })

describe('Brand Resources role and data guards', () => {
  it('allows only known RCRE roles into the authenticated resource area', () => {
    for (const role of ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer']) {
      expect(canAccessBrandResources(role)).toBe(true)
    }
    expect(canAccessBrandResources('consumer')).toBe(false)
    expect(canAccessBrandResources('')).toBe(false)
  })

  it('keeps legal/configuration administration limited to broker leadership', () => {
    expect(isBrandAdmin('broker_owner')).toBe(true)
    expect(isBrandAdmin('managing_broker')).toBe(true)
    expect(isBrandAdmin('agent')).toBe(false)
    expect(isBrandAdmin('marketing_admin')).toBe(false)
  })

  it('does not map a multi-state license string onto either state without evidence', () => {
    expect(licenseForState(profile('Florida'), 'Florida')).toBe('public-license-value')
    expect(licenseForState(profile('Alabama'), 'Alabama')).toBe('public-license-value')
    expect(licenseForState(profile('Alabama & Florida', 'license-a, license-b'), 'Florida')).toBeNull()
    expect(licenseForState(profile('Alabama & Florida', 'license-a, license-b'), 'Alabama')).toBeNull()
    expect(licenseForState({ license: '', market: 'Jacksonville, Birmingham', licenses: [{ state: 'Florida', number: 'FL-verified' }, { state: 'Alabama', number: 'AL-verified' }] }, 'Florida')).toBe('FL-verified')
    expect(licenseForState({ license: '', market: 'Jacksonville, Birmingham', licenses: [{ state: 'Florida', number: 'FL-verified' }, { state: 'Alabama', number: 'AL-verified' }] }, 'Alabama')).toBe('AL-verified')
    expect(licenseForState({ license: '', market: 'Jacksonville', licenses: [{ state: 'Florida', number: 'FL-verified' }, { state: 'Florida', number: 'FL-other' }] }, 'Florida')).toBeNull()
    expect(licenseForState(profile('Florida', ''), 'Florida')).toBeNull()
  })

  it('fails the print compliance gate closed while exact state copy is unapproved', () => {
    expect(brandComplianceReadiness('Alabama')).toMatchObject({ ready: false, status: 'pending' })
    expect(brandComplianceReadiness('Florida')).toMatchObject({ ready: false, status: 'pending' })
  })

  it('offers requested brand resources without fabricated prices or ordering claims', () => {
    expect(BRAND_ITEMS.map((item) => item.title)).toContain('Business cards')
    expect(BRAND_ITEMS.map((item) => item.title)).toContain('Email signatures')
    expect(JSON.stringify(BRAND_ITEMS)).not.toMatch(/\\$\\s?\\d|checkout|buy now|order now/i)
  })
})

