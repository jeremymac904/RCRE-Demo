import { z } from 'zod'
import { workspaceGet, workspacePost } from '@/lib/google-workspace/routes'
const create=z.object({approved:z.literal(true),summary:z.string().min(1).max(250),start:z.string().max(100),end:z.string().max(100),timeZone:z.string().min(1).max(100),description:z.string().max(4000).optional(),location:z.string().max(500).optional(),calendarId:z.string().max(200).optional(),idempotencyKey:z.string().min(12).max(100)})
export const dynamic='force-dynamic'
export async function GET(request:Request){return workspaceGet((service,actor,url)=>service.calendarList(actor,{from:url.searchParams.get('from')??'',to:url.searchParams.get('to')??'',calendarId:url.searchParams.get('calendarId')??undefined}),request,'/api/integrations/google/calendar/events')}
export async function POST(request:Request){return workspacePost((service,actor,body)=>service.calendarCreate(actor,create.parse(body)),request,'/api/integrations/google/calendar/events')}
