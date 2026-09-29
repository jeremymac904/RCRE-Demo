import { describe, expect, it } from 'vitest'
import { makeSyntheticProperty, makeSyntheticPropertyDataset } from '@/lib/property/fixtures'
import { benchmarkSyntheticPropertySearch, searchSyntheticProperties } from '@/lib/property-bench/run-benchmark'

describe('synthetic normalized property fixtures', () => {
  it('is deterministic, explicitly fixture-marked, and covers both states and RESO fields', () => {
    expect(makeSyntheticProperty(0)).toEqual(makeSyntheticProperty(0))
    const rows = makeSyntheticPropertyDataset(800)
    expect(new Set(rows.map((row) => row.stateOrProvince))).toEqual(new Set(['FL', 'AL']))
    expect(rows.every((row) => row.fixture && row.mlsListingId.startsWith('DEMO-'))).toBe(true)
    expect(rows.some((row) => row.propertyType === 'Land' && (row.lotSizeAcres ?? 0) > 0)).toBe(true)
    expect(rows.some((row) => row.newConstructionYN)).toBe(true)
    expect(rows.some((row) => row.openHouses.length > 0)).toBe(true)
    expect(rows.every((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))).toBe(true)
  })

  it('filters compound criteria and returns bounded deterministic pages', () => {
    const rows = makeSyntheticPropertyDataset(2_000)
    const query = { state: 'FL' as const, minPrice: 300_000, maxPrice: 700_000, minBedrooms: 3, sort: 'price-asc' as const, page: 2, pageSize: 12 }
    const result = searchSyntheticProperties(rows, query)
    expect(result.total).toBeGreaterThan(12)
    expect(result.items).toHaveLength(12)
    expect(result.items.every((row) => row.stateOrProvince === 'FL' && (row.listPrice ?? 0) >= 300_000 && (row.listPrice ?? 0) <= 700_000 && (row.bedroomsTotal ?? 0) >= 3)).toBe(true)
    expect(searchSyntheticProperties(rows, query)).toEqual(result)
  })

  it('supports map bounds and clamps paging limits', () => {
    const rows = makeSyntheticPropertyDataset(1_000)
    const result = searchSyntheticProperties(rows, { bounds: { south: 29.8, west: -81.9, north: 30.4, east: -81.3 }, page: -2, pageSize: 1_000 })
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(100)
    expect(result.items.length).toBeLessThanOrEqual(100)
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((row) => (row.latitude ?? 0) >= 29.8 && (row.latitude ?? 0) <= 30.4 && (row.longitude ?? 0) >= -81.9 && (row.longitude ?? 0) <= -81.3)).toBe(true)
  })

  it('benchmarks 10k and 100k fixture search without claiming database performance', () => {
    const tenK = benchmarkSyntheticPropertySearch(10_000)
    expect(tenK.scope).toContain('not PostgreSQL')
    expect(tenK.queries).toHaveLength(5)
    expect(tenK.queries.every((measurement) => Number.isFinite(measurement.elapsedMs) && measurement.firstPageCount <= 24)).toBe(true)

    const hundredK = benchmarkSyntheticPropertySearch(100_000)
    expect(hundredK.datasetCount).toBe(100_000)
    expect(hundredK.scope).toContain('in-memory synthetic baseline')
    expect(hundredK.queries.every((measurement) => Number.isFinite(measurement.elapsedMs) && measurement.firstPageCount <= 24)).toBe(true)
  }, 30_000)
})
