import {requireActor,AccessError,type PlatformActor} from '@/lib/platform/auth'
import {dayPlan,acceptDayBlock} from '@/lib/platform/day-plan'
import {dayPlanDurable,acceptDayBlockDurable} from '@/lib/platform/day-plan-durable'
import {dataMode} from '@/lib/config/env'
import {recordCaughtRouteFailure} from '@/lib/operations/caught-route-failure'
export const dynamic='force-dynamic'
export async function GET(req:Request){let actor:PlatformActor|null=null;try{actor=await requireActor();const day=new URL(req.url).searchParams.get('day')??'';return Response.json(dataMode()==='live'?await dayPlanDurable(actor,day):dayPlan(actor,day))}catch(e){const response=fail(e);await recordCaughtRouteFailure(req,'/api/day-plan',actor,response.status,e);return response}}
export async function POST(req:Request){let actor:PlatformActor|null=null;try{const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)throw new AccessError('Origin mismatch');if(!origin&&process.env.NODE_ENV==='production')throw new AccessError('Origin verification required');actor=await requireActor();const b=await req.json();return Response.json(dataMode()==='live'?await acceptDayBlockDurable(actor,b.day,b.key):acceptDayBlock(actor,b.day,b.key))}catch(e){const response=fail(e);await recordCaughtRouteFailure(req,'/api/day-plan',actor,response.status,e);return response}}
function fail(e:unknown){const status=e instanceof AccessError?e.status:503;return Response.json({error:status>=500?'Day planning is temporarily unavailable.':e instanceof Error?e.message:'Unable to plan day'},{status,headers:{'Cache-Control':'private, no-store'}})}
