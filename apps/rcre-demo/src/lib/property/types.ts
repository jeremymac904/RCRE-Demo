/** Provider-neutral subset of RESO Web API concepts used by the RCRE property service. */
export type MarketState = 'AL' | 'FL'
export type PropertyStatus = 'Active' | 'Coming Soon' | 'Pending' | 'Closed' | 'Withdrawn' | 'Unknown'

export interface PropertyImage {
  id: string
  url: string
  order: number
  caption?: string
  mediaType?: string
  sourceUpdatedAt?: string
}

export interface PropertyOpenHouse {
  id: string
  startAt: string
  endAt?: string
  timezone?: string
  remarks?: string
}

export interface PropertyListing {
  id: string
  providerId: string
  providerName: string
  mlsSystem?: string
  mlsListingId: string
  listingKey?: string
  listingKeyNumeric?: string
  propertyType?: string
  propertySubType?: string
  standardStatus: PropertyStatus
  localStatus?: string
  listPrice?: number
  originalListPrice?: number
  closePrice?: number
  bedroomsTotal?: number
  bathroomsFull?: number
  bathroomsHalf?: number
  bathroomsTotal?: number
  livingArea?: number
  lotSizeArea?: number
  lotSizeAcres?: number
  yearBuilt?: number
  stories?: number
  garageSpaces?: number
  parkingTotal?: number
  streetNumber?: string
  streetName?: string
  unitNumber?: string
  city?: string
  countyOrParish?: string
  stateOrProvince?: string
  postalCode?: string
  subdivisionName?: string
  latitude?: number
  longitude?: number
  publicRemarks?: string
  directions?: string
  schoolDistrict?: string
  elementarySchool?: string
  middleOrJuniorSchool?: string
  highSchool?: string
  waterfrontYN?: boolean
  poolPrivateYN?: boolean
  newConstructionYN?: boolean
  associationYN?: boolean
  associationFee?: number
  taxAnnualAmount?: number
  parcelNumber?: string
  listingContractDate?: string
  modificationTimestamp?: string
  pendingTimestamp?: string
  closeDate?: string
  daysOnMarket?: number
  cumulativeDaysOnMarket?: number
  virtualTourURL?: string
  listingOfficeName?: string
  listingAgentName?: string
  buyerOfficeName?: string
  buyerAgentName?: string
  photos: PropertyImage[]
  photoCount?: number
  openHouses: PropertyOpenHouse[]
  sourceAttribution?: string
  requiredDisclaimer?: string
  dataFreshness?: 'current' | 'stale' | 'unknown'
  lastSourceUpdate?: string
  providerExtensions: Record<string, unknown>
  fixture?: boolean
}

export interface PropertySearchFilters {
  query?: string
  state?: MarketState
  city?: string
  county?: string
  postalCode?: string
  subdivision?: string
  mlsListingId?: string
  minPrice?: number
  maxPrice?: number
  minBeds?: number
  minBaths?: number
  propertyType?: string
  propertySubType?: string
  minLivingArea?: number
  maxLivingArea?: number
  minLotArea?: number
  minLotAcres?: number
  minYearBuilt?: number
  maxYearBuilt?: number
  minGarageSpaces?: number
  pool?: boolean
  waterfront?: boolean
  newConstruction?: boolean
  openHouse?: boolean
  status?: PropertyStatus
  maxDaysOnMarket?: number
  priceReduced?: boolean
  bounds?: { north: number; south: number; east: number; west: number }
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'beds' | 'baths' | 'living-area' | 'days-on-market' | 'updated'
  page?: number
  pageSize?: number
}

export interface SearchResult {
  items: PropertyListing[]
  total: number
  page: number
  pageSize: number
  pages: number
  sourceMode: 'fixtures' | 'live' | 'pending'
  coverage: 'complete' | 'partial' | 'none'
  providers: Array<{ providerId: string; status: string; count?: number; error?: string }>
  generatedAt: string
}

export type ProviderStatus = 'not_configured' | 'waiting_for_agreement' | 'waiting_for_credentials' | 'ready_for_connection' | 'connected' | 'degraded' | 'disabled'
export interface ProviderCapabilities {
  activeListings: boolean
  comingSoon: boolean
  pending: boolean
  closed: boolean
  openHouses: boolean
  history: boolean
  members: boolean
  offices: boolean
  photos: boolean
  virtualTours: boolean
  documents: boolean
  geographicFields: boolean
  waterfront: boolean
  newConstruction: boolean
  land: boolean
  farm: boolean
  rental: boolean
  manufacturedHomes: boolean
  incrementalUpdates: boolean
  mapBounds: boolean
}

export interface ProviderCompliance {
  status: 'pending' | 'approved'
  displayName: string
  logoUrl?: string
  requiredAttribution?: string
  requiredDisclaimer?: string
  copyrightText?: string
  listingBrokerageRule?: string
  refreshIntervalHours?: number
  photoMode: 'remote' | 'cached' | 'local-derivative' | 'not-approved'
  permittedStatuses: PropertyStatus[]
  soldDisplayAllowed: boolean | null
  openHouseRules?: string
  indexing: 'pending' | 'allowed' | 'noindex'
  agreementReference?: string
  approvedAt?: string
}

export interface ProviderDescriptor {
  id: string
  name: string
  systems: string[]
  states: MarketState[]
  status: ProviderStatus
  accessPaths: string[]
  credentialConfigured: boolean
  agreementApproved: boolean
  mode: 'live-query' | 'incremental-mirror' | 'hybrid' | 'disabled'
  capabilities: ProviderCapabilities
  compliance: ProviderCompliance
  lastSuccessfulSync?: string
  lastAttemptedSync?: string
  listingCount?: number
  dataAgeMinutes?: number
  error?: string
}

export interface ProviderConnection {
  ok: boolean
  providerId: string
  checkedAt: string
  message: string
}

export interface ProviderAdapter {
  readonly providerId: string
  testConnection(): Promise<ProviderConnection>
  discoverCapabilities(): Promise<ProviderCapabilities>
  discoverMetadata(): Promise<Record<string, unknown>>
  search(filters: PropertySearchFilters, cursor?: string): Promise<{ items: PropertyListing[]; nextCursor?: string; total?: number }>
  getListing(id: string): Promise<PropertyListing | null>
  getPhotos(id: string): Promise<PropertyImage[]>
  getOpenHouses(id: string): Promise<PropertyOpenHouse[]>
  getMembers?(): Promise<Record<string, unknown>[]>
  getOffices?(): Promise<Record<string, unknown>[]>
  getMarketStatus?(): Promise<Record<string, unknown>>
  syncSince?(timestamp: string, cursor?: string): Promise<{ items: PropertyListing[]; deletedIds: string[]; nextCursor?: string; checkpoint?: string }>
}

export interface FieldMapping { source: string; target: keyof PropertyListing; transform?: 'string' | 'number' | 'boolean' | 'date' }
