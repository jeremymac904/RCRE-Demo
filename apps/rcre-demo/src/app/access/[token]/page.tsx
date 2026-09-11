import {AccessFlow} from '@/components/AccessFlow'
export const metadata={robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{token:string}>}){return <AccessFlow mode="access" token={(await params).token}/>}
