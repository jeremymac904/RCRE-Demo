import { z } from 'zod'
import { workspacePatch } from '@/lib/google-workspace/routes'
const schema=z.object({eventId:z.string().min(5).max(1024),approved:z.literal(true),summary:z.string().min(1).max(250).optional(),start:z.string().max(100).optional(),end:z.string().max(100).optional(),timeZone:z.string().min(1).max(100).optional(),description:z.string().max(4000).optional(),location:z.string().max(500).optional(),calendarId:z.string().max(200).optional()})
export const dynamic='force-dynamic'
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){return workspacePatch((service,actor,body)=>service.calendarUpdate(actor,schema.parse(body)),request,context.params,'/api/integrations/google/calendar/events/[id]')}
