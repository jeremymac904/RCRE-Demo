import {NextRequest,NextResponse} from 'next/server'
import {requireActor} from '@/lib/platform/auth'
import {mcpRequest} from '@/lib/services/mcp'
export const runtime='nodejs';export const dynamic='force-dynamic'
/** Stateless MCP Streamable HTTP JSON response transport. Cookie is a local session credential only. */
export async function POST(req:NextRequest){try{const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==req.headers.get('host'))return NextResponse.json({error:'Origin denied'},{status:403});const actor=await requireActor();const request=await req.json();if(Array.isArray(request))return NextResponse.json({error:'Batch requests unsupported'},{status:400});if(request.method==='notifications/initialized')return new NextResponse(null,{status:202});return NextResponse.json(mcpRequest(actor,request),{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:(e as Error).message},{status:403})}}
export async function GET(){return new NextResponse(null,{status:405,headers:{Allow:'POST'}})}
