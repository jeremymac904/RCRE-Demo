import {NextRequest,NextResponse} from 'next/server'
import {randomBytes} from 'node:crypto'
import {askPublicChat,clearPublicChat,publicChatConfig,publicChatHistory} from '@/lib/services/public-chat'
export const runtime='nodejs'
const cookie='rcre-public-chat'
function visitor(req:NextRequest){const id=req.cookies.get(cookie)?.value;return id&&/^[a-f0-9]{64}$/.test(id)?id:randomBytes(32).toString('hex')}
function reply(id:string,data:unknown,status=200){const r=NextResponse.json(data,{status});r.headers.set('Cache-Control','no-store');r.cookies.set(cookie,id,{httpOnly:true,sameSite:'strict',path:'/api/public/chat',maxAge:30*86400,secure:process.env.RCRE_MODE==='production'});return r}
function safe(req:NextRequest){return !req.headers.get('origin')||req.headers.get('origin')===req.nextUrl.origin}
export async function GET(req:NextRequest){const id=visitor(req);return reply(id,{...publicChatHistory(id),providerConfigured:publicChatConfig().enabled})}
export async function DELETE(req:NextRequest){if(!safe(req))return NextResponse.json({error:'Cross-origin request denied'},{status:403});const id=visitor(req);return reply(id,{...clearPublicChat(id),providerConfigured:publicChatConfig().enabled})}
export async function POST(req:NextRequest){if(!safe(req))return NextResponse.json({error:'Cross-origin request denied'},{status:403});const id=visitor(req);try{if(Number(req.headers.get('content-length')||0)>5000)return reply(id,{error:'Question too large'},413);const raw=await req.text();if(raw.length>5000)return reply(id,{error:'Question too large'},413);const data=JSON.parse(raw);if(data.action==='retry'&&typeof data.messageId==='string')return reply(id,{...await askPublicChat(id,'',data.messageId),providerConfigured:publicChatConfig().enabled});if(typeof data.prompt!=='string')throw new Error('Enter a question.');return reply(id,{...await askPublicChat(id,data.prompt),providerConfigured:publicChatConfig().enabled})}catch(e){return reply(id,{error:(e as Error).message},429)}}
