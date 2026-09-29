import type { FieldMapping, PropertyListing } from './types'

const pathValue = (source: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, source)

function coerce(value: unknown, transform?: FieldMapping['transform']): unknown {
  if (value === null || value === undefined || value === '') return undefined
  if (!transform) return value
  if (transform === 'string') return String(value)
  if (transform === 'number') { const number = typeof value === 'number' ? value : Number(value); return Number.isFinite(number) ? number : undefined }
  if (transform === 'boolean') {
    if (typeof value === 'boolean') return value
    if (value === 'Y' || value === 'Yes' || value === 1 || value === 'true') return true
    if (value === 'N' || value === 'No' || value === 0 || value === 'false') return false
    return undefined
  }
  if (transform === 'date') { const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? undefined : date.toISOString() }
}

/** Provider metadata drives this mapping; unknown provider fields are retained verbatim. */
export function mapProviderRecord(raw: Record<string, unknown>, mappings: FieldMapping[], base: Pick<PropertyListing, 'id' | 'providerId' | 'providerName' | 'mlsListingId'>): PropertyListing {
  const mapped: Record<string, unknown> = {}
  for (const mapping of mappings) {
    const value = coerce(pathValue(raw, mapping.source), mapping.transform)
    if (value !== undefined) mapped[mapping.target] = value
  }
  const photos = Array.isArray(mapped.photos) ? mapped.photos : []
  const openHouses = Array.isArray(mapped.openHouses) ? mapped.openHouses : []
  return {
    ...base,
    ...mapped,
    photos: photos as PropertyListing['photos'],
    openHouses: openHouses as PropertyListing['openHouses'],
    providerExtensions: { ...raw },
  } as PropertyListing
}

export function mapResoListing(raw: Record<string, unknown>, base: Pick<PropertyListing, 'id' | 'providerId' | 'providerName' | 'mlsListingId'>): PropertyListing {
  const mappings: FieldMapping[] = [
    ['ListingKey','listingKey','string'],['ListingKeyNumeric','listingKeyNumeric','string'],['PropertyType','propertyType','string'],['PropertySubType','propertySubType','string'],
    ['StandardStatus','standardStatus','string'],['ListPrice','listPrice','number'],['OriginalListPrice','originalListPrice','number'],['ClosePrice','closePrice','number'],
    ['BedroomsTotal','bedroomsTotal','number'],['BathroomsFull','bathroomsFull','number'],['BathroomsHalf','bathroomsHalf','number'],['BathroomsTotalInteger','bathroomsTotal','number'],
    ['LivingArea','livingArea','number'],['LotSizeArea','lotSizeArea','number'],['LotSizeAcres','lotSizeAcres','number'],['YearBuilt','yearBuilt','number'],
    ['Stories','stories','number'],['GarageSpaces','garageSpaces','number'],['ParkingTotal','parkingTotal','number'],['StreetNumber','streetNumber','string'],
    ['StreetName','streetName','string'],['UnitNumber','unitNumber','string'],['City','city','string'],['CountyOrParish','countyOrParish','string'],
    ['StateOrProvince','stateOrProvince','string'],['PostalCode','postalCode','string'],['SubdivisionName','subdivisionName','string'],['Latitude','latitude','number'],['Longitude','longitude','number'],
    ['PublicRemarks','publicRemarks','string'],['Directions','directions','string'],['SchoolDistrict','schoolDistrict','string'],['ElementarySchool','elementarySchool','string'],
    ['MiddleOrJuniorSchool','middleOrJuniorSchool','string'],['HighSchool','highSchool','string'],['WaterfrontYN','waterfrontYN','boolean'],['PoolPrivateYN','poolPrivateYN','boolean'],
    ['NewConstructionYN','newConstructionYN','boolean'],['AssociationYN','associationYN','boolean'],['AssociationFee','associationFee','number'],['TaxAnnualAmount','taxAnnualAmount','number'],
    ['ParcelNumber','parcelNumber','string'],['ListingContractDate','listingContractDate','date'],['ModificationTimestamp','modificationTimestamp','date'],['PendingTimestamp','pendingTimestamp','date'],
    ['CloseDate','closeDate','date'],['DaysOnMarket','daysOnMarket','number'],['CumulativeDaysOnMarket','cumulativeDaysOnMarket','number'],['VirtualTourURLUnbranded','virtualTourURL','string'],
    ['ListOfficeName','listingOfficeName','string'],['ListAgentFullName','listingAgentName','string'],['BuyerOfficeName','buyerOfficeName','string'],['BuyerAgentFullName','buyerAgentName','string'],
  ].map(([source,target,transform])=>({source:source!,target:target as keyof PropertyListing,transform:transform as FieldMapping['transform']}))
  const mapped=mapProviderRecord(raw,mappings,base)
  const rawStatus=String(raw.StandardStatus??'')
  const allowed=['Active','Coming Soon','Pending','Closed','Withdrawn']
  const standardStatus=allowed.includes(rawStatus)?rawStatus as PropertyListing['standardStatus']:'Unknown'
  const full=coerce(raw.BathroomsFull,'number') as number|undefined
  const half=coerce(raw.BathroomsHalf,'number') as number|undefined
  const decimal=coerce(raw.BathroomsTotalDecimal,'number') as number|undefined
  const integer=coerce(raw.BathroomsTotalInteger,'number') as number|undefined
  const bathroomsTotal=decimal??(full!==undefined||half!==undefined?(full??0)+(half??0)*0.5:integer)
  return {...mapped,standardStatus,localStatus:rawStatus||undefined,bathroomsTotal}
}
