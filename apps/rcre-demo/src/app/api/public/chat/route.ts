import {NextRequest,NextResponse} from 'next/server'
import {randomBytes} from 'node:crypto'
import {answerPublicQuestion,askPublicChat,clearPublicChat,publicChatConfig,publicChatCookieSecure,publicChatHistory} from '@/lib/services/public-chat'
import {rateLimitRequest,SharedRateLimitUnavailableError} from '@/lib/services/rate-limit'
import {isProduction} from '@/lib/config/env'
export const runtime='nodejs'
const cookie='rcre-public-chat'
function visitor(req:NextRequest){const id=req.cookies.get(cookie)?.value;return id&&/^[a-f0-9]{64}$/.test(id)?id:randomBytes(32).toString('hex')}
function reply(id:string,data:unknown,status=200){const r=NextResponse.json(data,{status});r.headers.set('Cache-Control','no-store');r.cookies.set(cookie,id,{httpOnly:true,sameSite:'strict',path:'/api/public/chat',maxAge:30*86400,secure:publicChatCookieSecure()});return r}
function safe(req:NextRequest){return !req.headers.get('origin')||req.headers.get('origin')===req.nextUrl.origin}
export async function GET(req:NextRequest){const id=visitor(req);if(isProduction)return reply(id,{id,generation:'stateless',messages:[],updatedAt:new Date().toISOString(),historyPersistent:false,providerConfigured:false});return reply(id,{...publicChatHistory(id),historyPersistent:true,providerConfigured:publicChatConfig().enabled})}
export async function DELETE(req:NextRequest){if(!safe(req))return NextResponse.json({error:'Cross-origin request denied'},{status:403});const id=visitor(req);if(isProduction)return reply(id,{id,generation:'stateless',messages:[],updatedAt:new Date().toISOString(),historyPersistent:false,providerConfigured:false});return reply(id,{...clearPublicChat(id),historyPersistent:true,providerConfigured:publicChatConfig().enabled})}
export async function POST(req:NextRequest){
 if(!safe(req))return NextResponse.json({error:'Cross-origin request denied'},{status:403})
 const id=visitor(req)
 try{
  if(Number(req.headers.get('content-length')||0)>5000)return reply(id,{error:'Question too large'},413)
  const raw=await req.text();if(raw.length>5000)return reply(id,{error:'Question too large'},413)
  const data=JSON.parse(raw)
  if(isProduction){
   if(data.action==='retry')return reply(id,{error:'Questions are not saved in this session. Please ask again.'},409)
   if(typeof data.prompt!=='string')throw new Error('Enter a question.')
   const rate=await rateLimitRequest('public_chat',req.headers,8)
   if(!rate.allowed)return reply(id,{error:'Please wait a moment before asking another question.'},429)
   const message=await answerPublicQuestion(data.prompt)
   return reply(id,{id,generation:'stateless',messages:[message],updatedAt:message.at,historyPersistent:false,providerConfigured:false})
  }
  if(data.action==='retry'&&typeof data.messageId==='string')return reply(id,{...await askPublicChat(id,'',data.messageId),historyPersistent:true,providerConfigured:publicChatConfig().enabled})
  if(typeof data.prompt!=='string')throw new Error('Enter a question.')
  return reply(id,{...await askPublicChat(id,data.prompt),historyPersistent:true,providerConfigured:publicChatConfig().enabled})
 }catch(e){if(isProduction&&e instanceof SharedRateLimitUnavailableError)return unavailable();return reply(id,{error:isProduction?'The published site guide is temporarily unavailable.':(e as Error).message},isProduction?503:429)}
}

function unavailable(){return NextResponse.json({error:'The public site guide is temporarily unavailable. Please use the Contact page for help.'},{status:503,headers:{'Cache-Control':'no-store'}})}
