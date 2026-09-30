import { z } from 'zod'
import { workspaceGet, workspacePost } from '@/lib/google-workspace/routes'
const schema=z.object({name:z.string().min(1).max(255),mimeType:z.string().min(3).max(120),contentBase64:z.string().min(1).max(15_000_000)})
export const dynamic='force-dynamic'
export async function GET(request:Request){return workspaceGet((service,actor,url)=>service.driveList(actor,url.searchParams.get('q')??''),request)}
export async function POST(request:Request){return workspacePost((service,actor,body)=>service.driveCreate(actor,schema.parse(body)),request)}
