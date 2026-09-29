import { NextResponse } from 'next/server'
import { getProperty } from '@/lib/property/service'
export const dynamic='force-dynamic'
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id))return NextResponse.json({error:'Property not found.'},{status:404});const item=await getProperty(id);return item?NextResponse.json(item,{headers:{'Cache-Control':'private, no-store'}}):NextResponse.json({error:'This property is not available in the current search.'},{status:404})}
