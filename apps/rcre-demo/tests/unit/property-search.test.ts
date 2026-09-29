import {afterEach,describe,expect,it,vi} from 'vitest'
import {mapResoListing,mapProviderRecord} from '@/lib/property/mapping'
import {filterProperties,searchFixturePage,searchProperties,fixturesEnabled} from '@/lib/property/service'
import {makeSyntheticPropertyDataset} from '@/lib/property/fixtures'
import {NextRequest} from 'next/server'
import {GET as searchRoute} from '@/app/api/properties/route'
import {GET as detailRoute} from '@/app/api/properties/[id]/route'
import type {PropertyListing} from '@/lib/property/types'

afterEach(()=>{vi.unstubAllEnvs()})
const base={id:'provider:123',providerId:'provider',providerName:'Example MLS',mlsListingId:'123'}
describe('RESO normalization and search service',()=>{
 it('maps known RESO fields with safe null handling and retains provider-specific fields',()=>{
  const property=mapResoListing({ListingKey:'key-1',ListingKeyNumeric:31,StandardStatus:'Active',ListPrice:'420000',BedroomsTotal:'3',BathroomsFull:'2',BathroomsHalf:'1',BathroomsTotalInteger:'2',LivingArea:'1800',WaterfrontYN:'N',Latitude:'30.33',Longitude:'-81.65',VendorCustomField:{value:'kept'},UnknownField:'retained'},base)
  expect(property.listPrice).toBe(420000)
  expect(property.bedroomsTotal).toBe(3)
  expect(property.waterfrontYN).toBe(false)
  expect(property.latitude).toBe(30.33)
  expect(property.photos).toEqual([])
  expect(property.providerExtensions.UnknownField).toBe('retained')
  expect(property.providerExtensions.VendorCustomField).toEqual({value:'kept'})
  const sparse=mapResoListing({StandardStatus:'Active',ListPrice:null},base)
  expect(sparse.listPrice).toBeUndefined()
  expect(sparse.providerExtensions).toEqual({StandardStatus:'Active',ListPrice:null})
 })
 it('supports configurable field mappings and never overwrites source extensions',()=>{
  const property=mapProviderRecord({price:'bad',address:{city:'Orange Park'},flag:'Y' },[
   {source:'price',target:'listPrice',transform:'number'},
   {source:'address.city',target:'city',transform:'string'},
   {source:'flag',target:'poolPrivateYN',transform:'boolean'},
  ],base)
  expect(property.listPrice).toBeUndefined()
  expect(property.city).toBe('Orange Park')
  expect(property.poolPrivateYN).toBe(true)
  expect(property.providerExtensions).toMatchObject({price:'bad',address:{city:'Orange Park'}})
 })
 it('filters missing values as unknown rather than as a zero match',()=>{
  const records=makeSyntheticPropertyDataset(120)
  expect(filterProperties(records,{minPrice:250000,maxPrice:500000,minBeds:3}).every(p=>p.listPrice!>=250000&&p.listPrice!<=500000&&p.bedroomsTotal!>=3)).toBe(true)
  expect(filterProperties(records,{minLotArea:100000}).every(p=>p.lotSizeArea!>=100000)).toBe(true)
  expect(filterProperties(records,{priceReduced:true}).every(p=>p.originalListPrice!>p.listPrice!)).toBe(true)
  expect(filterProperties(records,{bounds:{north:30.5,south:29.5,east:-81.1,west:-82}}).every(p=>p.latitude!<=30.5&&p.latitude!>=29.5&&p.longitude!<=-81.1&&p.longitude!>=-82)).toBe(true)
 })
 it('keeps count and rows from the same fixture query and pages on the server',()=>{
  const rows=makeSyntheticPropertyDataset(160),result=searchFixturePage({state:'FL',sort:'price-asc',page:2,pageSize:10},rows)
  const filtered=filterProperties(rows,{state:'FL'}).sort((a,b)=>(a.listPrice??Infinity)-(b.listPrice??Infinity))
  expect(result.total).toBe(filtered.length)
  expect(result.items).toEqual(filtered.slice(10,20))
  expect(result.pages).toBe(Math.ceil(filtered.length/10))
 })
 it('fails closed to no inventory in production when no approved provider is configured',async()=>{
  vi.stubEnv('NODE_ENV','production')
  vi.stubEnv('RCRE_APP_MODE','production')
  const result=await searchProperties({state:'FL',page:1,pageSize:18})
  expect(result.sourceMode).toBe('pending')
  expect(result.items).toEqual([])
  expect(result.coverage).toBe('none')
 })
 it('property search and detail APIs do not expose fixture records in production',async()=>{
  vi.stubEnv('NODE_ENV','production')
  vi.stubEnv('RCRE_APP_MODE','local')
  const search=await searchRoute(new NextRequest('https://rcre.test/api/properties?state=FL'))
  expect(search.status).toBe(200)
  expect(await search.json()).toMatchObject({sourceMode:'pending',total:0,items:[]})
  const detail=await detailRoute(new Request('https://rcre.test/api/properties/fixture-property-0000001'),{params:Promise.resolve({id:'fixture-property-0000001'})})
  expect(detail.status).toBe(404)
 })
 it('never enables fixture inventory in a production runtime, even if a local flag is present',async()=>{
  vi.stubEnv('NODE_ENV','production')
  vi.stubEnv('RCRE_APP_MODE','local')
  expect(fixturesEnabled()).toBe(false)
  const result=await searchProperties({page:1,pageSize:18})
  expect(result.sourceMode).toBe('pending')
  expect(result.items).toEqual([])
 })
 it('enables explicitly local fixtures outside production and keeps each result marked',async()=>{
  vi.stubEnv('NODE_ENV','development')
  vi.stubEnv('RCRE_APP_MODE','local')
  expect(fixturesEnabled()).toBe(true)
  const result=await searchProperties({page:1,pageSize:18})
  expect(result.sourceMode).toBe('fixtures')
  expect(result.items).toHaveLength(18)
  expect(result.items.every((p:PropertyListing)=>p.fixture===true)).toBe(true)
 })
})
