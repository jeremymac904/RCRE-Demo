import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {PublicShell} from '@/components/public/PublicShell'
import {PropertyDetail} from '@/components/public/PropertyDetail'
import {getProperty} from '@/lib/property/service'
export const dynamic='force-dynamic'
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const p=await getProperty(id);if(!p)return {title:'Property unavailable | RCRE Group',robots:{index:false,follow:true}};return {title:(p.streetName?[p.streetNumber,p.streetName,p.city,p.stateOrProvince].filter(Boolean).join(' '):'Property details')+' | RCRE Group',description:p.publicRemarks||'Review property details and source information.',robots:{index:false,follow:true},openGraph:{title:p.streetName?[p.streetNumber,p.streetName,p.city,p.stateOrProvince].filter(Boolean).join(' '):'Property details',images:p.photos[0]?[{url:p.photos[0].url}]:undefined}}}
export default async function PropertyDetailPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const property=await getProperty(id);if(!property)notFound();return <PublicShell><PropertyDetail property={property}/></PublicShell>}
