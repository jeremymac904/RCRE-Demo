import { parseBoundedFormData, RequestBodyTooLargeError } from '@/lib/http/read-bounded-body'
import { academyPersistenceAvailable } from '@/lib/academy-service'
import { actorOrNull } from '@/lib/platform/auth'
import { saveAttachment } from '@/lib/academy-attachments'
export async function POST(req:Request){if(!academyPersistenceAvailable())return Response.json({error:'This Training or Community action is unavailable until durable production storage is connected. No changes were saved.'},{status:503});const a=await actorOrNull();if(!a)return Response.json({error:'Sign in required'},{status:401});try{const form=await parseBoundedFormData(req,6*1024*1024);const file=form.get('file');if(!(file instanceof File))throw new Error('Choose a file');return Response.json(saveAttachment(a,file.name,file.type,new Uint8Array(await file.arrayBuffer())))}catch(e){return Response.json({error:(e as Error).message},{status:e instanceof RequestBodyTooLargeError?413:400})}}
