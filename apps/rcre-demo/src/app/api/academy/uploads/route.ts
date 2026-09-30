import { parseBoundedFormData, RequestBodyTooLargeError } from '@/lib/http/read-bounded-body'
import { academyPersistenceAvailable } from '@/lib/academy-service'
import {actorOrNull} from '@/lib/platform/auth'
import {academyManager} from '@/lib/academy-service'
import {createAcademyUpload} from '@/lib/academy-uploads'
export async function POST(req:Request){if(!academyPersistenceAvailable())return Response.json({error:'This Training or Community action is unavailable until durable production storage is connected. No changes were saved.'},{status:503});const a=await actorOrNull();if(!a)return Response.json({error:'Sign in required'},{status:401});if(!academyManager(a))return Response.json({error:'Trainer permission required'},{status:403});try{const form=await parseBoundedFormData(req,101*1024*1024),file=form.get('file');if(!(file instanceof File)||file.size>100*1024*1024)throw new Error('Choose a resource up to 100 MB');return Response.json(createAcademyUpload(a,file.name,file.type,Buffer.from(await file.arrayBuffer())))}catch(e){return Response.json({error:(e as Error).message},{status:e instanceof RequestBodyTooLargeError?413:400})}}
