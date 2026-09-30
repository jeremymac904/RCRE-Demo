import {requireActor,AccessError} from '@/lib/platform/auth'
import {loadOnboarding,saveOnboarding} from '@/lib/platform/onboarding'
export const dynamic='force-dynamic'
function respondError(error:unknown){return Response.json({error:error instanceof Error?error.message:'Request failed'},{status:error instanceof AccessError?error.status:(error as {issues?:unknown})?.issues?400:(error as {status?:unknown})?.status===503?503:500})}
export async function GET(){try{const a=await requireActor();return Response.json({...loadOnboarding(a),persistence:'local-development-only'},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return respondError(error)}}
export async function PUT(request:Request){try{if(Number(request.headers.get('content-length')??0)>30000)throw new AccessError('Payload too large',413);const origin=request.headers.get('origin');if(origin&&new URL(origin).host!==new URL(request.url).host)throw new AccessError('Origin mismatch');const a=await requireActor(),profile=saveOnboarding(a,await request.json());return Response.json({profile,persistence:'local-development-only'})}catch(error){return respondError(error)}}
