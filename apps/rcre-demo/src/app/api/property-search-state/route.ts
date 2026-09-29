import { NextRequest,NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getRecord,putRecord } from '@/lib/platform/store'
import { fixturesEnabled,fixtures } from '@/lib/property/service'
export const runtime='nodejs'
const filters=z.record(z.string(),z.string().max(160)).refine(v=>Object.keys(v).length<=36)
const schema=z.object({favorites:z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/)).max(100),searches:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(80),filters})).max(50)})
type State=z.infer<typeof schema>&{id:string}
function idFor(req:NextRequest){const value=req.cookies.get('rcre-property-visitor')?.value;return value&&/^[0-9a-f-]{36}$/i.test(value)?value:randomUUID()}
function response(id:string,state:State){const res=NextResponse.json({favorites:state.favorites,searches:state.searches});res.cookies.set('rcre-property-visitor',id,{httpOnly:true,sameSite:'strict',path:'/api',maxAge:31536000,secure:process.env.NODE_ENV==='production'});res.headers.set('Cache-Control','no-store');return res}
export async function GET(req:NextRequest){const id=idFor(req),state=await getRecord<State>('property_search_state',id);return response(id,state||{id,favorites:[],searches:[]})}
export async function PUT(req:NextRequest){const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:'Cross-origin updates are not allowed.'},{status:403});try{const data=schema.parse(await req.json());const ids=new Set(fixturesEnabled()?fixtures().map(f=>f.id):[]);if(data.favorites.some(f=>fixturesEnabled()&&!ids.has(f)))return NextResponse.json({error:'A saved property is no longer available.'},{status:409});const id=idFor(req),state={id,...data};putRecord('property_search_state',state);return response(id,state)}catch{return NextResponse.json({error:'Saved search data is invalid.'},{status:400})}}
