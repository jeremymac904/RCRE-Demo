import type {Metadata} from 'next'
import {PublicShell} from '@/components/public/PublicShell'
import {PropertySearch} from '@/components/public/PropertySearch'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Search Homes in Alabama & Florida | RCRE Group',description:'A single RCRE property search experience for approved Alabama and Florida listing sources.',alternates:{canonical:'https://rcregroup.com/homes'},robots:{index:false,follow:true}}
export default function HomesPage(){return <PublicShell><PropertySearch/></PublicShell>}
