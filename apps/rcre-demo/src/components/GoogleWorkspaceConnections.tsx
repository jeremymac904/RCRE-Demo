'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type ServiceStatus = { service: 'gmail'|'calendar'|'drive'; status: string; account: string|null; scopes: string[]; connectedAt: string|null; lastError: string|null }
const details = {
  gmail: { title: 'Gmail', description: 'Search your mail, open selected messages, save drafts, and send only after your explicit approval.', connect: 'Connect Gmail' },
  calendar: { title: 'Google Calendar', description: 'Read events and create or update events only after you confirm the change.', connect: 'Connect Calendar' },
  drive: { title: 'Google Drive', description: 'Access files you have authorized for RCRE and create private RCRE files without changing sharing.', connect: 'Connect Drive' },
}
export function GoogleWorkspaceConnections() {
  const [services,setServices]=useState<ServiceStatus[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState('')
  const load=useCallback(async()=>{try{const response=await fetch('/api/integrations/google',{cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error??'Google Workspace status is unavailable');setServices(data.services??[]);setError('')}catch(e){setError(e instanceof Error?e.message:'Google Workspace status is unavailable')}},[])
  useEffect(()=>{void load()},[load])
  const disconnect=async(service:ServiceStatus['service'])=>{setBusy(service);setError('');setNotice('');try{const response=await fetch('/api/integrations/google/disconnect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({service})}),data=await response.json();if(!response.ok)throw new Error(data.error??'Disconnect failed');if(data.providerRevoked===false)setNotice('RCRE has removed this connection. Google did not confirm revoking its authorization; you can also remove RCRE from your Google Account security settings.');await load()}catch(e){setError(e instanceof Error?e.message:'Disconnect failed')}finally{setBusy('')}}
  return <section className="mx-auto max-w-5xl p-5 sm:p-8 lg:p-10">
    <Link href="/settings" className="text-sm text-brass-ink">← Settings</Link>
    <p className="mt-7 text-sm uppercase tracking-[.15em] text-brass-ink">Your connected accounts</p>
    <h1 className="mt-2 font-display text-3xl sm:text-4xl">Google Workspace</h1>
    <p className="mt-4 max-w-3xl text-chalk-muted">Connect the Google services you choose to use inside RCRE. Google sign-in is separate; granting Gmail, Calendar, or Drive access is optional and each service connects independently to your account.</p>
    {notice&&<p role="status" className="mt-5 border border-amber-400/40 p-3 text-amber-100">{notice}</p>}{error&&<p role="alert" className="mt-5 border border-red-400/40 p-3 text-red-200">{error}</p>}
    <div className="mt-8 divide-y divide-hair border-y border-hair">
      {(['gmail','calendar','drive'] as const).map(key=>{const status=services.find(item=>item.service===key),meta=details[key],connected=status?.status==='connected',scopes=status?.scopes??[];return <article key={key} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl">{meta.title}</h2><span className={`rounded-full px-3 py-1 text-xs ${connected?'bg-emerald-900/40 text-emerald-200':'bg-ink-elevated text-chalk-muted'}`}>{status?.status==='reauth_required'?'Reconnect needed':connected?'Connected':'Not connected'}</span></div><p className="mt-2 max-w-2xl text-sm text-chalk-muted">{meta.description}</p>{status?.account&&<p className="mt-2 text-sm">Account: <span className="text-chalk-muted">{status.account}</span></p>}{scopes.length>0&&<p className="mt-1 break-words text-xs text-chalk-faint">Granted access: {scopes.map(scope=>scope.split('/').at(-1)?.replaceAll('.',' ')??scope).join(' · ')}</p>}</div>
        <div className="flex flex-wrap gap-2">{connected?<button disabled={busy===key} onClick={()=>void disconnect(key)} className="min-h-11 border border-hair px-4 py-2 disabled:opacity-50">{busy===key?'Disconnecting…':'Disconnect'}</button>:<a className="inline-flex min-h-11 items-center border border-brass-fill px-4 py-2 text-brass-ink hover:bg-brass-fill/10" href={`/api/integrations/google/connect?service=${key}`}>{status?.status==='reauth_required'?'Reconnect':meta.connect}</a>}</div>
      </article>})}
    </div>
    <p className="mt-6 text-sm text-chalk-faint">Refresh credentials are encrypted at rest. Your RCRE profile and Google identity remain separate from each optional service connection.</p>
    <button onClick={()=>void load()} className="mt-4 min-h-11 border border-hair px-4 py-2">Refresh connection status</button>
  </section>
}
