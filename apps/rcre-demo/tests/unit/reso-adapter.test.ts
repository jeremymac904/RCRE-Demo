import {describe,expect,it,vi} from 'vitest'
import {ResoWebApiAdapter} from '@/lib/property/reso-adapter'

const metadata=`<Schema><EntityType Name="Property"><Property Name="ListingKey"/><Property Name="ListingId"/><Property Name="StandardStatus"/><Property Name="ListPrice"/><Property Name="Latitude"/><Property Name="Longitude"/><Property Name="ModificationTimestamp"/></EntityType><EnumType Name="StandardStatus"><Member Name="Active"/><Member Name="Pending"/></EnumType></Schema>`
const listing={ListingKey:'k1',ListingId:'MLS-1',StandardStatus:'Active',ListPrice:525000,City:'Jacksonville',StateOrProvince:'FL'}
const fixtureFetch=vi.fn(async(input:URL|string|Request,_init?:RequestInit)=>{
 const url=new URL(input instanceof Request?input.url:String(input))
 if(url.pathname.endsWith('$metadata'))return new Response(metadata,{status:200})
 return new Response(JSON.stringify({'@odata.count':2,value:[listing],...(url.searchParams.get('cursor')?{}:{'@odata.nextLink':'https://provider.example/reso/Property?$skiptoken=next'})}),{status:200,headers:{'content-type':'application/json'}})
})
function adapter(fetcher:typeof fetch=fixtureFetch){return new ResoWebApiAdapter({providerId:'fixture-provider',providerName:'Fixture MLS',serviceRoot:'https://provider.example/reso',listingsResource:'Property',getAccessToken:async()=>'fixture-token',fetcher})}

describe('generic RESO web API adapter contract',()=>{
 it('discovers metadata and only claims explicitly supported status and configured resources',async()=>{
  const api=adapter()
  const found=await api.discoverMetadata()
  const caps=await api.discoverCapabilities()
  expect(found.availableFields).toContain('ListingKey')
  expect(found.standardStatuses).toEqual(['Active','Pending'])
  expect(caps.activeListings).toBe(true)
  expect(caps.pending).toBe(true)
  expect(caps.closed).toBe(false)
  expect(caps.comingSoon).toBe(false)
  expect(caps.openHouses).toBe(false)
  expect(caps.mapBounds).toBe(true)
 })
 it('uses bearer credentials server side, maps provider provenance, and follows same-origin cursors only',async()=>{
  fixtureFetch.mockClear()
  const api=adapter()
  const first=await api.search({state:'FL',minPrice:400000,pageSize:1})
  expect(first.items[0]).toMatchObject({providerId:'fixture-provider',mlsListingId:'MLS-1',listPrice:525000,fixture:false})
  expect(first.total).toBe(2)
  expect(first.nextCursor).toContain('url:https://provider.example/reso/Property')
  expect(fixtureFetch.mock.calls[0]?.[1]).toMatchObject({method:'GET',headers:{Authorization:'Bearer fixture-token'}})
  const second=await api.search({state:'FL',pageSize:1},first.nextCursor)
  expect(second.items).toHaveLength(1)
  expect(fixtureFetch.mock.calls[1]?.[0]).toBeInstanceOf(URL)
  await expect(api.search({pageSize:1},'url:https://attacker.example/Property')).rejects.toThrow('outside its approved service root')
 })
 it('rejects non-HTTPS production service roots and hides failed connection credentials',async()=>{
  vi.stubEnv('NODE_ENV','production')
  expect(()=>new ResoWebApiAdapter({providerId:'p',providerName:'P',serviceRoot:'http://provider.example/reso',listingsResource:'Property',getAccessToken:async()=> 'secret'})).toThrow('must use HTTPS')
  const failing=adapter(async()=>new Response('denied',{status:403}))
  const result=await failing.testConnection()
  expect(result.ok).toBe(false)
  expect(result.message).not.toContain('fixture-token')
  vi.unstubAllEnvs()
 })
})
