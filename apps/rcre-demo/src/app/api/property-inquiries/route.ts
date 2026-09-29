import { NextRequest,NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getRecord,putRecord,transaction } from '@/lib/platform/store'
import { AccessError,directory,scopedOwner } from '@/lib/platform/auth'
import * as crm from '@/lib/platform/service'
import { getProperty,fixturesEnabled } from '@/lib/property/service'

export const runtime='nodejs'
const schema=z.object({name:z.string().trim().min(2).max(160),email:z.string().email().max(250),phone:z.string().trim().max(80).optional(),message:z.string().trim().min(3).max(3000),listingId:z.string().max(120),providerId:z.string().max(100),mlsListingId:z.string().max(120),market:z.enum(['Alabama','Florida']),agentWebsiteSlug:z.string().max(100).optional(),landingPage:z.string().max(500),utmSource:z.string().max(160).optional(),utmMedium:z.string().max(160).optional(),utmCampaign:z.string().max(160).optional(),referrer:z.string().max(500).optional(),consent:z.literal(true)})
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}})
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return fail('Cross-origin request denied.',403)
 try{
  const input=schema.parse(await req.json());const listing=await getProperty(input.listingId)
  if(!listing||listing.providerId!==input.providerId||listing.mlsListingId!==input.mlsListingId)return fail('Property details changed. Reload the property and try again.',409)
  if(!fixturesEnabled()&&listing.fixture)return fail('This property is not available.',404)
  crm.seed()
  const officeId=input.market==='Alabama'?'al':'fl';const leads=getRecord<any>('settings','leads:'+officeId)?.value??getRecord<any>('settings','leads')?.value??{}
  const configured=leads.routing?.[officeId];const people=directory('rcre-local').filter(person=>!person.disabled&&person.officeId===officeId&&['agent','team_leader'].includes(person.role));const mappedOwner=input.agentWebsiteSlug?getRecord<any>('agent_website_owner_mapping',input.agentWebsiteSlug)?.ownerId:undefined
  const recipient=people.find(person=>person.id===mappedOwner)||people.find(person=>person.id===configured)||people[0]||directory('rcre-local').find(person=>person.role==='broker_owner')
  if(!recipient)return fail('Property inquiry could not be assigned right now.',503)
  const id=randomUUID()
  const record={id,organizationId:recipient.organizationId,officeId,ownerId:recipient.id,status:'received locally',kind:'property',name:input.name,email:input.email,phone:input.phone??'',message:input.message,market:input.market,listingId:listing.id,providerId:listing.providerId,mlsListingId:listing.mlsListingId,agentWebsiteSlug:input.agentWebsiteSlug,propertyAddress:[listing.streetNumber,listing.streetName,listing.unitNumber,listing.city,listing.stateOrProvince,listing.postalCode].filter(Boolean).join(' '),source:input.agentWebsiteSlug?'Agent Website':'RCRE Website',landingPage:input.landingPage,utmSource:input.utmSource,utmMedium:input.utmMedium,utmCampaign:input.utmCampaign,referrer:input.referrer,consent:true,createdAt:new Date().toISOString()}
  return transaction(()=>{putRecord('inquiries',record);const contact=crm.createContact(recipient,{firstName:input.name.split(/\s+/)[0],lastName:input.name.split(/\s+/).slice(1).join(' '),email:input.email,phone:input.phone??'',market:input.market,officeId,ownerId:recipient.id,source:record.source,consent:true});putRecord('contacts',{...contact,propertyAttribution:{listingId:listing.id,providerId:listing.providerId,mlsListingId:listing.mlsListingId,landingPage:input.landingPage,utmSource:input.utmSource,utmMedium:input.utmMedium,utmCampaign:input.utmCampaign,createdAt:record.createdAt}});return NextResponse.json({id,status:'received locally',message:'Your request is saved to the RCRE local review system. No message was sent.'},{status:201,headers:{'Cache-Control':'no-store'}})})
 }catch(error){if(error instanceof z.ZodError)return fail('Complete the required contact fields and consent to be contacted.',400);if(error instanceof AccessError)return fail('Property inquiry could not be saved.',503);return fail('Property inquiry could not be saved. Please try again.',500)}
}
