import { workspaceGet } from '@/lib/google-workspace/routes'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return workspaceGet((service,actor,url)=>service.gmailSearch(actor,url.searchParams.get('q')??''),request,'/api/integrations/google/gmail/search') }
