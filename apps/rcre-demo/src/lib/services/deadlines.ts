export interface DeadlineTerm { id:string; label:string; sourceTerm:string; effectiveDate:string; days:number|null; convention:'calendar'|'business'; timezone:string; holidays:string[]; confirmed:boolean; override?:string; overrideReason?:string }
export function calculateDeadline(term:DeadlineTerm): {date:string|null; reason:string} {
  if (!term.confirmed || !term.sourceTerm.trim() || term.days === null) return {date:null,reason:'Contract term and manual confirmation required'}
  if (!Number.isInteger(term.days) || term.days < 0 || term.days > 730) return {date:null,reason:'Days must be an integer from 0 to 730'}
  try { new Intl.DateTimeFormat('en-US',{timeZone:term.timezone}).format() } catch { return {date:null,reason:'Valid timezone required'} }
  if (term.override) return /^\d{4}-\d{2}-\d{2}$/.test(term.override) && Number.isFinite(Date.parse(term.override+'T12:00:00Z')) && new Date(term.override+'T12:00:00Z').toISOString().slice(0,10)===term.override && term.overrideReason?.trim() ? {date:term.override,reason:`Manual override: ${term.overrideReason}`} : {date:null,reason:'Override requires a valid date and reason'}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(term.effectiveDate)) return {date:null,reason:'Valid effective date required'}
  const date = new Date(`${term.effectiveDate}T12:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==term.effectiveDate) return {date:null,reason:'Invalid effective date'}
  // Date-only arithmetic avoids local DST hours. Effective day excluded, final day included.
  let counted=0
  while(counted < term.days) {date.setUTCDate(date.getUTCDate()+1); const key=date.toISOString().slice(0,10); if(term.convention==='calendar'||(date.getUTCDay()!==0&&date.getUTCDay()!==6&&!term.holidays.includes(key))) counted++}
  return {date:date.toISOString().slice(0,10),reason:`${term.days} ${term.convention} days after effective date; ${term.timezone}; effective day excluded`}
}
