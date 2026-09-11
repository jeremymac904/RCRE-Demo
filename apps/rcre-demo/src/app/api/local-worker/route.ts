import {timingSafeEqual} from 'node:crypto'
import {PERSONAS} from '@/lib/platform/auth'
import {processCalendarReminders} from '@/lib/platform/service'
import {localDispatch} from '@/lib/platform/library'
import {putRecord} from '@/lib/platform/store'
export const dynamic='force-dynamic'
export async function POST(req:Request){const expected=process.env.RCRE_LOCAL_WORKER_KEY,provided=req.headers.get('authorization')?.replace(/^Bearer /,'');if(process.env.RCRE_APP_MODE!=='local'||!expected||!provided||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return Response.json({error:'Local worker authentication required'},{status:401});try{const owner={...PERSONAS.find(a=>a.role==='broker_owner')!,id:'local-worker',userId:'local-worker',name:'Local schedule worker'};const result={...localDispatch(owner),reminders:processCalendarReminders(owner)};putRecord('local_worker',{id:owner.organizationId,lastRun:new Date().toISOString(),status:'healthy',processed:result.processed,reminders:result.reminders,externalMessagesSent:0});return Response.json(result)}catch(e){putRecord('local_worker',{id:'rcre-local',lastRun:new Date().toISOString(),status:'failed',error:e instanceof Error?e.message:'Local worker failed'});return Response.json({error:'Local worker failed; queued records remain available'},{status:500})}}
