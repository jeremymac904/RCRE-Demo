import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {getRecord,putRecord} from '@/lib/platform/store'
import {properties} from '@/lib/public/properties'
export const runtime='nodejs'
const schema=z.object({favorites:z.array(z.string().refine(id=>properties.some(p=>p.id===id))).max(100),searches:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(80),filters:z.object({q:z.string().max(120),market:z.enum(['All','Alabama','Florida']),beds:z.enum(['0','2','3','4']),max:z.string().max(12).refine(x=>x===''||Number.isFinite(Number(x))&&Number(x)>=0),sort:z.enum(['price-asc','price-desc','beds'])})})).max(50)})
type State=z.infer<typeof schema>&{id:string}
function visitor(req:NextRequest){const id=req.cookies.get('rcre-public-visitor')?.value;return id&&/^[0-9a-f-]{36}$/.test(id)?id:randomUUID()}
function response(id:string,state:State){const res=NextResponse.json({favorites:state.favorites,searches:state.searches});res.cookies.set('rcre-public-visitor',id,{httpOnly:true,sameSite:'strict',path:'/api/public',maxAge:60*60*24*365,secure:process.env.NODE_ENV==='production'&&process.env.RCRE_MODE==='production'});res.headers.set('Cache-Control','no-store');return res}
export async function GET(req:NextRequest){const id=visitor(req),state=await getRecord<State>('public_search',id);return response(id,state||{id,favorites:[],searches:[]})}
export async function PUT(req:NextRequest){if(req.headers.get('origin')&&req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Cross-origin write denied'},{status:403});try{const data=schema.parse(await req.json());const id=visitor(req);const state={id,...data};await putRecord('public_search',state);return response(id,state)}catch{return NextResponse.json({error:'Invalid saved search. Use a name, supported filters, and fewer than 50 saved searches.'},{status:400})}}
