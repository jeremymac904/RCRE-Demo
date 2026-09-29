import type { PropertyListing } from './types'

/** Deterministic synthetic listings for development, QA, and performance tests only. */
const MARKETS = [
  { state: 'FL', city: 'Jacksonville', county: 'Duval', zip: '32207', subdivision: 'San Marco', lat: 30.3077, lon: -81.6557 },
  { state: 'FL', city: 'Orange Park', county: 'Clay', zip: '32073', subdivision: 'Orange Park Estates', lat: 30.1661, lon: -81.7065 },
  { state: 'FL', city: 'St. Augustine', county: 'St. Johns', zip: '32084', subdivision: 'Historic District', lat: 29.9012, lon: -81.3124 },
  { state: 'FL', city: 'Middleburg', county: 'Clay', zip: '32068', subdivision: 'Black Creek', lat: 30.0689, lon: -81.8604 },
  { state: 'AL', city: 'Birmingham', county: 'Jefferson', zip: '35209', subdivision: 'Homewood', lat: 33.4487, lon: -86.8000 },
  { state: 'AL', city: 'Hoover', county: 'Jefferson', zip: '35226', subdivision: 'Trace Crossings', lat: 33.4054, lon: -86.8114 },
  { state: 'AL', city: 'Pelham', county: 'Shelby', zip: '35124', subdivision: 'Oak Mountain', lat: 33.2857, lon: -86.8097 },
  { state: 'AL', city: 'Jasper', county: 'Walker', zip: '35501', subdivision: 'Walker County Acreage', lat: 33.8312, lon: -87.2775 },
] as const
const TYPES = [
  ['Residential', 'Single Family Residence'], ['Residential', 'Condominium'], ['Residential', 'Townhouse'],
  ['Residential', 'Manufactured Home'], ['Residential', 'New Construction'], ['Residential Lease', 'Apartment'],
  ['Land', 'Unimproved Land'], ['Land', 'Acreage'], ['Farm', 'Farm'], ['Commercial', 'Investment Property'],
] as const
const STATUSES = ['Active', 'Coming Soon', 'Pending', 'Closed'] as const
const STREETS = ['Riverwalk', 'Oak Hollow', 'Magnolia Ridge', 'Cypress Bend', 'Heritage Oaks', 'Meadow Run', 'Pine Creek', 'Harbor View']
const roundThousand = (n: number) => Math.round(n / 1000) * 1000

/** The same non-real test listing is returned for the same sequence number. */
export function makeSyntheticProperty(index: number): PropertyListing {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError('index must be a non-negative safe integer')
  const market = MARKETS[index % MARKETS.length]
  const [propertyType, propertySubType] = TYPES[Math.floor(index / 2) % TYPES.length]
  const standardStatus = STATUSES[Math.floor(index / 3) % STATUSES.length]
  const listPrice = roundThousand(125_000 + ((index * 7_919 + Math.floor(index / 10) * 3_107) % 1_475_000))
  const baseTime = Date.UTC(2026, 0, 1) + (index % 270) * 86_400_000
  const iso = new Date(baseTime).toISOString()
  const streetNumber = String(100 + ((index * 37) % 8_900))
  const streetName = STREETS[Math.floor(index / 8) % STREETS.length]
  const mlsListingId = `DEMO-${String(index + 1).padStart(7, '0')}`
  const landOrFarm = propertyType === 'Land' || propertyType === 'Farm'
  const acres = landOrFarm ? 0.5 + (index % 300) / 10 : (index % 20) / 100
  const photoUrl = `https://images.example.invalid/rcre-fixture/${index % 24}.webp`
  const daysOnMarket = (index * 13) % 121

  return {
    id: `fixture-property-${String(index + 1).padStart(7, '0')}`,
    fixture: true,
    providerId: `fixture-${market.state.toLowerCase()}`,
    providerName: `${market.state} Development Fixture`,
    mlsSystem: 'Synthetic RESO-shaped fixture',
    mlsListingId,
    listingKey: `fixture-key-${index + 1}`,
    listingKeyNumeric: String(index + 1),
    propertyType,
    propertySubType,
    standardStatus,
    listPrice,
    originalListPrice: listPrice + (index % 5 === 0 ? 10_000 : 0),
    ...(standardStatus === 'Closed' ? { closePrice: roundThousand(listPrice * (0.94 + (index % 11) / 100)) } : {}),
    bedroomsTotal: landOrFarm ? 0 : 1 + ((index * 5) % 6),
    bathroomsFull: landOrFarm ? 0 : 1 + ((index * 3) % 4),
    bathroomsHalf: landOrFarm ? 0 : index % 3 === 0 ? 1 : 0,
    bathroomsTotal: landOrFarm ? 0 : 1 + ((index * 3) % 4) + (index % 3 === 0 ? 0.5 : 0),
    livingArea: landOrFarm ? 0 : 650 + ((index * 113) % 4_500),
    lotSizeArea: Math.round(acres * 43_560),
    lotSizeAcres: Number(acres.toFixed(2)),
    yearBuilt: 1940 + (index % 87),
    stories: 1 + (index % 3),
    garageSpaces: index % 5,
    parkingTotal: 1 + (index % 5),
    streetNumber,
    streetName,
    ...(propertySubType === 'Condominium' ? { unitNumber: `Unit ${1 + (index % 90)}` } : {}),
    city: market.city,
    countyOrParish: market.county,
    stateOrProvince: market.state,
    postalCode: market.zip,
    subdivisionName: market.subdivision,
    latitude: Number((market.lat + (((index * 17) % 10_000) / 100_000 - 0.05)).toFixed(6)),
    longitude: Number((market.lon + (((index * 29) % 10_000) / 100_000 - 0.05)).toFixed(6)),
    publicRemarks: `Synthetic fixture ${mlsListingId}: ${propertySubType} in ${market.city}, ${market.state}. Not active MLS inventory.`,
    schoolDistrict: `${market.state} local school district (fixture)`,
    waterfrontYN: index % 17 === 0,
    poolPrivateYN: index % 7 === 0,
    newConstructionYN: propertySubType === 'New Construction',
    associationYN: propertySubType === 'Condominium',
    ...(propertySubType === 'Condominium' ? { associationFee: 175 + (index % 8) * 25 } : {}),
    taxAnnualAmount: Math.round(listPrice * 0.011),
    listingContractDate: iso,
    modificationTimestamp: new Date(baseTime + (index % 4) * 3_600_000).toISOString(),
    ...(standardStatus === 'Pending' ? { pendingTimestamp: new Date(baseTime + 86_400_000).toISOString() } : {}),
    ...(standardStatus === 'Closed' ? { closeDate: new Date(baseTime + 45 * 86_400_000).toISOString() } : {}),
    daysOnMarket,
    cumulativeDaysOnMarket: daysOnMarket + (index % 35),
    listingOfficeName: `Fixture Brokerage ${1 + (index % 5)}`,
    listingAgentName: `Demo Agent ${1 + (index % 13)}`,
    photoCount: 1 + (index % 6),
    photos: [{ id: `fixture-photo-${index + 1}`, url: photoUrl, order: 0, mediaType: 'image/webp' }],
    openHouses: index % 19 === 0 ? [{ id: `fixture-open-house-${index + 1}`, startAt: new Date(baseTime + 3 * 86_400_000).toISOString(), endAt: new Date(baseTime + 3 * 86_400_000 + 2 * 3_600_000).toISOString() }] : [],
    dataFreshness: 'unknown',
    lastSourceUpdate: new Date(baseTime + (index % 4) * 3_600_000).toISOString(),
    providerExtensions: { fixtureSequence: index, fixture: true },
  }
}

export function makeSyntheticPropertyDataset(count: number): PropertyListing[] {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('count must be a non-negative safe integer')
  return Array.from({ length: count }, (_, index) => makeSyntheticProperty(index))
}

export const syntheticPropertySamples = [makeSyntheticProperty(0), makeSyntheticProperty(1), makeSyntheticProperty(4)] as const
