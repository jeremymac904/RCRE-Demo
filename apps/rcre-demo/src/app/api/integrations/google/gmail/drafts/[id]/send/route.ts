import { z } from 'zod'
import { workspacePost } from '@/lib/google-workspace/routes'
const schema=z.object({approved:z.literal(true)})
export const dynamic='force-dynamic'
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return workspacePost((service,actor,body)=>service.gmailSendApprovedDraft(actor,id,schema.parse(body).approved),request,'/api/integrations/google/gmail/drafts/[id]/send')}
