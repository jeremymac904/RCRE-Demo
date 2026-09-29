import { performance } from 'node:perf_hooks'
import { makeSyntheticPropertyDataset } from '@/lib/property/fixtures'
import type { PropertyListing } from '@/lib/property/types'

export type PropertyBenchmarkQuery = {
  text?: string
  state?: 'FL' | 'AL'
  city?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minBathrooms?: number
  propertySubType?: string
  pool?: boolean
  waterfront?: boolean
  newConstruction?: boolean
  openHouse?: boolean
  bounds?: { south: number; west: number; north: number; east: number }
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'beds-desc' | 'area-desc' | 'dom-asc'
  page?: number
  pageSize?: number
}

/** In-memory reference search. This is not a database/provider benchmark. */
export function searchSyntheticProperties(dataset: readonly PropertyListing[], query: PropertyBenchmarkQuery = {}) {
  const text = query.text?.trim().toLocaleLowerCase()
  const city = query.city?.trim().toLocaleLowerCase()
  const matching = dataset.filter((property) => {
    if (query.state && property.stateOrProvince !== query.state) return false
    if (city && property.city?.toLocaleLowerCase() !== city) return false
    if (text) {
      const haystack = [
        property.streetNumber ?? '', property.streetName ?? '', property.city ?? '',
        property.countyOrParish ?? '', property.stateOrProvince ?? '', property.postalCode ?? '',
        property.subdivisionName ?? '', property.mlsListingId,
      ].join(' ').toLocaleLowerCase()
      if (!haystack.includes(text)) return false
    }
    if (query.minPrice !== undefined && (property.listPrice ?? 0) < query.minPrice) return false
    if (query.maxPrice !== undefined && (property.listPrice ?? 0) > query.maxPrice) return false
    if (query.minBedrooms !== undefined && (property.bedroomsTotal ?? 0) < query.minBedrooms) return false
    if (query.minBathrooms !== undefined && (property.bathroomsTotal ?? 0) < query.minBathrooms) return false
    if (query.propertySubType && property.propertySubType !== query.propertySubType) return false
    if (query.pool !== undefined && property.poolPrivateYN !== query.pool) return false
    if (query.waterfront !== undefined && property.waterfrontYN !== query.waterfront) return false
    if (query.newConstruction !== undefined && property.newConstructionYN !== query.newConstruction) return false
    if (query.openHouse !== undefined && (property.openHouses.length > 0) !== query.openHouse) return false
    if (query.bounds) {
      const { south, west, north, east } = query.bounds
      if (!((property.latitude ?? 0) >= south && (property.latitude ?? 0) <= north && (property.longitude ?? 0) >= west && (property.longitude ?? 0) <= east)) return false
    }
    return true
  })
  const sorters: Record<NonNullable<PropertyBenchmarkQuery['sort']>, (a: PropertyListing, b: PropertyListing) => number> = {
    newest: (a, b) => (b.modificationTimestamp ?? '').localeCompare(a.modificationTimestamp ?? ''),
    'price-asc': (a, b) => (a.listPrice ?? 0) - (b.listPrice ?? 0),
    'price-desc': (a, b) => (b.listPrice ?? 0) - (a.listPrice ?? 0),
    'beds-desc': (a, b) => (b.bedroomsTotal ?? 0) - (a.bedroomsTotal ?? 0),
    'area-desc': (a, b) => (b.livingArea ?? 0) - (a.livingArea ?? 0),
    'dom-asc': (a, b) => (a.daysOnMarket ?? 0) - (b.daysOnMarket ?? 0),
  }
  if (query.sort) matching.sort(sorters[query.sort])
  const page = Math.max(1, Math.floor(query.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 24)))
  return { total: matching.length, page, pageSize, items: matching.slice((page - 1) * pageSize, page * pageSize) }
}

export type SearchBenchmarkMeasurement = { queryName: string; elapsedMs: number; resultCount: number; firstPageCount: number }
export type PropertyBenchmarkReport = {
  scope: 'in-memory synthetic baseline; not PostgreSQL or provider performance'
  datasetCount: number
  generationMs: number
  queries: SearchBenchmarkMeasurement[]
}

const QUERIES: Array<[string, PropertyBenchmarkQuery]> = [
  ['combined market/price/bedrooms', { state: 'FL', minPrice: 250_000, maxPrice: 650_000, minBedrooms: 3, sort: 'price-asc', page: 1, pageSize: 24 }],
  ['city plus pool and open house', { city: 'Jacksonville', pool: true, openHouse: true, sort: 'newest', pageSize: 24 }],
  ['text location query', { text: 'Birmingham', state: 'AL', pageSize: 24 }],
  ['map bounds', { bounds: { south: 29.8, west: -81.9, north: 30.4, east: -81.3 }, sort: 'price-desc', pageSize: 24 }],
  ['subtype plus price range', { state: 'AL', propertySubType: 'Acreage', minPrice: 150_000, maxPrice: 900_000, sort: 'area-desc', pageSize: 24 }],
]

export function benchmarkSyntheticPropertySearch(datasetCount: number): PropertyBenchmarkReport {
  const generationStarted = performance.now()
  const dataset = makeSyntheticPropertyDataset(datasetCount)
  const generationMs = performance.now() - generationStarted
  const queries = QUERIES.map(([queryName, query]) => {
    const started = performance.now()
    const result = searchSyntheticProperties(dataset, query)
    return { queryName, elapsedMs: Number((performance.now() - started).toFixed(3)), resultCount: result.total, firstPageCount: result.items.length }
  })
  return { scope: 'in-memory synthetic baseline; not PostgreSQL or provider performance', datasetCount, generationMs: Number(generationMs.toFixed(3)), queries }
}

if (process.argv[1]?.endsWith('run-benchmark.ts')) {
  const sizes = process.argv.slice(2).map(Number)
  const counts = sizes.length ? sizes : [10_000, 100_000]
  for (const count of counts) console.log(JSON.stringify(benchmarkSyntheticPropertySearch(count)))
}
