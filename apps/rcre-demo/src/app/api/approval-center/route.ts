import {requireActor,can,AccessError} from '@/lib/platform/auth'
import {canEditMarketing} from '@/lib/platform/service'
import {readRecords} from '@/lib/platform/store'
import {listTransactions,drafts} from '@/lib/services/transactions'
import {academyReviews} from '@/lib/academy-service'
export const dynamic='force-dynamic'
export async function GET(){try{const a=await requireActor();const rows:{id:string;title:string;kind:string;state:string;version:number;href:string}[]=[];if(can(a,'transactions.read'))for(const t of listTransactions(a))for(const d of drafts(a,t.id))if(d.state==='awaiting_approval')rows.push({id:d.id,title:t.address,kind:'Inspection coordination draft',state:d.state,version:d.version,href:'/transactions/'+t.id});if(can(a,'marketing'))for(const m of readRecords<any>('marketing'))if(canEditMarketing(a,m)&&['review','approved','scheduled'].includes(m.status))rows.push({id:m.id,title:m.title,kind:'Marketing content',state:m.status,version:m.version,href:'/marketing?content='+m.id});rows.push(...academyReviews(a));return Response.json(rows)}catch(e){return Response.json({error:e instanceof Error?e.message:'Unable to load approvals'},{status:e instanceof AccessError?e.status:500})}}
