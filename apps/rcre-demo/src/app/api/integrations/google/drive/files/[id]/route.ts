import { NextResponse } from 'next/server'
import { AccessError, requireActor } from '@/lib/platform/auth'
import { getGoogleWorkspaceService } from '@/lib/google-workspace/service'
export const dynamic='force-dynamic'
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireActor(),{id}=await params;return NextResponse.json(await getGoogleWorkspaceService().driveRead(actor,id),{headers:{'cache-control':'private, no-store'}})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Drive is unavailable'},{status:error instanceof AccessError?error.status:503})}}
