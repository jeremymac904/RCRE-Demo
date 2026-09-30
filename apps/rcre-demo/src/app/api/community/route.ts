import { academyPersistenceAvailable } from '@/lib/academy-service'
import { actorOrNull } from '@/lib/platform/auth'
import { communityPosts,communityAction } from '@/lib/academy-community'
import { academyManager } from '@/lib/academy-service'
export async function GET(){if(!academyPersistenceAvailable())return Response.json({error:'This Training or Community action is unavailable until durable production storage is connected. No changes were saved.'},{status:503});const a=await actorOrNull();return a?Response.json({posts:communityPosts(a),userId:a.id,moderator:academyManager(a)}):Response.json({error:'Sign in required'},{status:401})}
export async function POST(req:Request){if(!academyPersistenceAvailable())return Response.json({error:'This Training or Community action is unavailable until durable production storage is connected. No changes were saved.'},{status:503});const a=await actorOrNull();if(!a)return Response.json({error:'Sign in required'},{status:401});try{return Response.json(communityAction(a,await req.json()))}catch(e){return Response.json({error:(e as Error).message},{status:/permission|Only the author|unavailable/.test((e as Error).message)?403:400})}}
