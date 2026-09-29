import 'server-only'
import { makeSyntheticPropertyDataset } from './fixtures'
import { providerAdapters, providerCatalog } from './providers'
import type { PropertyListing, PropertySearchFilters, SearchResult } from './types'

export function fixtures():PropertyListing[]{return makeSyntheticPropertyDataset(64)}
export function fixturesEnabled(){return process.env.RCRE_APP_MODE==='local'||process.env.NODE_ENV!=='production'}

const normalized=(v:string|number|undefined)=>String(v??'').trim().toLocaleLowerCase()
function includes(haystack:string|undefined,needle:string|undefined){return !needle||normalized(haystack).includes(normalized(needle))}
export function filterProperties(records:PropertyListing[],f:PropertySearchFilters):PropertyListing[]{
 const q=normalized(f.query)
 return records.filter(p=>{
  const address=[p.streetNumber,p.streetName,p.unitNumber].filter(Boolean).join(' ')
  const text=[address,p.city,p.countyOrParish,p.stateOrProvince,p.postalCode,p.subdivisionName,p.mlsListingId,p.publicRemarks].join(' ').toLocaleLowerCase()
  if(q&&!text.includes(q))return false
  if(f.state&&p.stateOrProvince!==f.state)return false
  if(f.city&&!includes(p.city,f.city))return false
  if(f.county&&!includes(p.countyOrParish,f.county))return false
  if(f.postalCode&&!includes(p.postalCode,f.postalCode))return false
  if(f.subdivision&&!includes(p.subdivisionName,f.subdivision))return false
  if(f.mlsListingId&&!includes(p.mlsListingId,f.mlsListingId))return false
  if(f.minPrice!==undefined&&(p.listPrice===undefined||p.listPrice<f.minPrice))return false
  if(f.maxPrice!==undefined&&(p.listPrice===undefined||p.listPrice>f.maxPrice))return false
  if(f.minBeds!==undefined&&(p.bedroomsTotal===undefined||p.bedroomsTotal<f.minBeds))return false
  if(f.minBaths!==undefined&&(p.bathroomsTotal===undefined||p.bathroomsTotal<f.minBaths))return false
  if(f.propertyType&&!includes(p.propertyType,f.propertyType))return false
  if(f.propertySubType&&!includes(p.propertySubType,f.propertySubType))return false
  if(f.minLivingArea!==undefined&&(p.livingArea===undefined||p.livingArea<f.minLivingArea))return false
  if(f.maxLivingArea!==undefined&&(p.livingArea===undefined||p.livingArea>f.maxLivingArea))return false
  if(f.minLotArea!==undefined&&(p.lotSizeArea===undefined||p.lotSizeArea<f.minLotArea))return false
  if(f.minLotAcres!==undefined&&(p.lotSizeAcres===undefined||p.lotSizeAcres<f.minLotAcres))return false
  if(f.minYearBuilt!==undefined&&(p.yearBuilt===undefined||p.yearBuilt<f.minYearBuilt))return false
  if(f.maxYearBuilt!==undefined&&(p.yearBuilt===undefined||p.yearBuilt>f.maxYearBuilt))return false
  if(f.minGarageSpaces!==undefined&&(p.garageSpaces===undefined||p.garageSpaces<f.minGarageSpaces))return false
  if(f.pool!==undefined&&p.poolPrivateYN!==f.pool)return false
  if(f.waterfront!==undefined&&p.waterfrontYN!==f.waterfront)return false
  if(f.newConstruction!==undefined&&p.newConstructionYN!==f.newConstruction)return false
  if(f.openHouse&&p.openHouses.length===0)return false
  if(f.status&&p.standardStatus!==f.status)return false
  if(f.maxDaysOnMarket!==undefined&&(p.daysOnMarket===undefined||p.daysOnMarket>f.maxDaysOnMarket))return false
  if(f.priceReduced&&!(p.originalListPrice!==undefined&&p.listPrice!==undefined&&p.originalListPrice>p.listPrice))return false
  if(f.bounds&&((p.latitude??Number.POSITIVE_INFINITY)>f.bounds.north||(p.latitude??Number.NEGATIVE_INFINITY)<f.bounds.south||(p.longitude??Number.POSITIVE_INFINITY)>f.bounds.east||(p.longitude??Number.NEGATIVE_INFINITY)<f.bounds.west))return false
  return true
 })
}
export function sortProperties(records:PropertyListing[],sort:PropertySearchFilters['sort']='newest'){
 const dates=(p:PropertyListing)=>Date.parse(p.modificationTimestamp??p.listingContractDate??'')||0
 const number=(v:number|undefined)=>v??Number.NEGATIVE_INFINITY
 return [...records].sort((a,b)=>sort==='price-asc'?number(a.listPrice)-number(b.listPrice):sort==='price-desc'?number(b.listPrice)-number(a.listPrice):sort==='beds'?number(b.bedroomsTotal)-number(a.bedroomsTotal):sort==='baths'?number(b.bathroomsTotal)-number(a.bathroomsTotal):sort==='living-area'?number(b.livingArea)-number(a.livingArea):sort==='days-on-market'?number(a.daysOnMarket)-number(b.daysOnMarket):dates(b)-dates(a))
}
export function searchFixturePage(filters:PropertySearchFilters,all=fixtures()):SearchResult{
 const page=Math.max(1,Math.floor(filters.page??1)),pageSize=Math.max(1,Math.min(100,Math.floor(filters.pageSize??24)))
 const found=sortProperties(filterProperties(all,filters),filters.sort),total=found.length
 return {items:found.slice((page-1)*pageSize,page*pageSize),total,page,pageSize,pages:Math.ceil(total/pageSize),sourceMode:'fixtures',coverage:'complete',providers:[{providerId:'rcre-demo-fixtures',status:'Local review data',count:all.length}],generatedAt:new Date().toISOString()}
}
export function searchPending(filters:PropertySearchFilters):SearchResult{
 const page=Math.max(1,Math.floor(filters.page??1)),pageSize=Math.max(1,Math.min(100,Math.floor(filters.pageSize??24)))
 return {items:[],total:0,page,pageSize,pages:0,sourceMode:'pending',coverage:'none',providers:providerCatalog().map(p=>({providerId:p.id,status:p.status})),generatedAt:new Date().toISOString()}
}
export async function searchProperties(filters:PropertySearchFilters):Promise<SearchResult>{
 if(fixturesEnabled())return searchFixturePage(filters)
 const adapters=providerAdapters()
 // Provider contracts are deliberately fail closed until agreements, schemas and access paths are approved.
 const states=new Set(filters.state?[filters.state]:['AL','FL'])
 const attempted=adapters.filter(a=>providerCatalog().some(p=>p.id===a.providerId&&p.states.some(s=>states.has(s))&&p.status==='connected'&&p.compliance.status==='approved'))
 if(!attempted.length)return searchPending(filters)
 const responses=await Promise.allSettled(attempted.map(a=>a.search(filters)))
 const gathered:PropertyListing[]=[]
 const providers=responses.map((result,index)=>{const providerId=attempted[index]!.providerId;if(result.status==='rejected')return {providerId,status:'degraded',error:'Provider request did not complete'};gathered.push(...result.value.items);return {providerId,status:'connected',count:result.value.items.length}})
 const unique=new Map(gathered.map(item=>[`${item.providerId}:${item.listingKey??item.mlsListingId}`,item]))
 const sorted=sortProperties(filterProperties([...unique.values()],filters),filters.sort),page=Math.max(1,Math.floor(filters.page??1)),pageSize=Math.max(1,Math.min(100,Math.floor(filters.pageSize??24))),total=sorted.length
 return {items:sorted.slice((page-1)*pageSize,page*pageSize),total,page,pageSize,pages:Math.ceil(total/pageSize),sourceMode:'live',coverage:providers.some(p=>p.status==='degraded')?'partial':'complete',providers,generatedAt:new Date().toISOString()}
}
export async function getProperty(id:string):Promise<PropertyListing|null>{
 if(fixturesEnabled())return fixtures().find(p=>p.id===id)??null
 for(const adapter of providerAdapters()){const p=providerCatalog().find(x=>x.id===adapter.providerId);if(!p||p.status!=='connected'||p.compliance.status!=='approved')continue;try{const listing=await adapter.getListing(id);if(listing)return listing}catch{/* continue to remaining approved providers */}}
 return null
}
export {providerCatalog}
