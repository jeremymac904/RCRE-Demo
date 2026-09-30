import { NextRequest, NextResponse } from 'next/server'
import { searchProperties } from '@/lib/property/service'
import type { PropertySearchFilters } from '@/lib/property/types'
import { rateLimitRequest, SharedRateLimitUnavailableError } from '@/lib/services/rate-limit'

export const dynamic='force-dynamic'
export const runtime='nodejs'
const number=(v:string|null,min=0,max=100000000)=>{if(v===null||v==='')return undefined;const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:undefined}
const bool=(v:string|null)=>v==='true'?true:v==='false'?false:undefined
export async function GET(req:NextRequest){
 let quota
 try{quota=await rateLimitRequest('property_search',req.headers,90)}catch(error){if(error instanceof SharedRateLimitUnavailableError)return NextResponse.json({error:'Search is temporarily unavailable. Please try again shortly.'},{status:503,headers:{'Cache-Control':'no-store'}});throw error}
 if(!quota.allowed)return NextResponse.json({error:'Search is receiving too many requests. Try again in a moment.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(quota.retryAfterSeconds)}})
 const q=req.nextUrl.searchParams
 const state=q.get('state')
 if(state&&state!=='AL'&&state!=='FL')return NextResponse.json({error:'Select Alabama or Florida.'},{status:400})
 const bounds=[number(q.get('north'),-90,90),number(q.get('south'),-90,90),number(q.get('east'),-180,180),number(q.get('west'),-180,180)]
 const filters:PropertySearchFilters={query:q.get('q')?.slice(0,120)||undefined,state:state as 'AL'|'FL'|undefined,city:q.get('city')?.slice(0,80)||undefined,county:q.get('county')?.slice(0,80)||undefined,postalCode:q.get('postalCode')?.slice(0,20)||undefined,subdivision:q.get('subdivision')?.slice(0,120)||undefined,mlsListingId:q.get('mls')?.slice(0,80)||undefined,minPrice:number(q.get('minPrice')),maxPrice:number(q.get('maxPrice')),minBeds:number(q.get('beds'),0,20),minBaths:number(q.get('baths'),0,20),propertyType:q.get('type')?.slice(0,80)||undefined,propertySubType:q.get('subtype')?.slice(0,80)||undefined,minLivingArea:number(q.get('minSqft')),maxLivingArea:number(q.get('maxSqft')),minLotArea:number(q.get('minLotArea')),minLotAcres:number(q.get('acres')),minYearBuilt:number(q.get('yearBuilt'),1600,2200),maxYearBuilt:number(q.get('maxYearBuilt'),1600,2200),minGarageSpaces:number(q.get('garage'),0,50),pool:bool(q.get('pool')),waterfront:bool(q.get('waterfront')),newConstruction:bool(q.get('newConstruction')),openHouse:bool(q.get('openHouse')),priceReduced:bool(q.get('priceReduced')),maxDaysOnMarket:number(q.get('maxDom'),0,10000),status:(['Active','Coming Soon','Pending','Closed','Withdrawn','Unknown'].includes(q.get('status')||'')?q.get('status'):undefined) as PropertySearchFilters['status'],sort:(['newest','price-asc','price-desc','beds','baths','living-area','days-on-market','updated'].includes(q.get('sort')||'')?q.get('sort'):'newest') as PropertySearchFilters['sort'],page:number(q.get('page'),1,100000)||1,pageSize:number(q.get('pageSize'),1,100)||18}
 if(bounds.every(x=>x!==undefined)&&bounds[0]!>bounds[1]!){filters.bounds={north:bounds[0]!,south:bounds[1]!,east:bounds[2]!,west:bounds[3]!}}
 try{const result=await searchProperties(filters);return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'Property search could not be completed. Try again.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
