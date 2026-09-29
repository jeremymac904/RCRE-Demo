import {redirect} from 'next/navigation'
export default async function AgentListings({params}:{params:Promise<{slug:string}>}){const {slug}=await params;redirect('/homes?agent='+encodeURIComponent(slug))}
