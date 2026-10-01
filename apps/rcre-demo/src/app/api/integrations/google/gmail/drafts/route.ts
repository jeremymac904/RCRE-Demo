import { z } from 'zod'
import { workspacePost } from '@/lib/google-workspace/routes'
const schema=z.object({to:z.string().email().max(320),subject:z.string().min(1).max(500),body:z.string().min(1).max(20000)})
export const dynamic='force-dynamic'
export async function POST(request:Request){return workspacePost((service,actor,body)=>service.gmailDraft(actor,schema.parse(body)),request,'/api/integrations/google/gmail/drafts')}
