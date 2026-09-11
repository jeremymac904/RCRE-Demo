import {appendFileSync,mkdirSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),log=path.join(root,'runtime/logs/local-worker.log')
if(!process.env.RCRE_LOCAL_WORKER_KEY||process.env.RCRE_APP_MODE!=='local')throw Error('Explicit local worker mode and private key required')
mkdirSync(path.dirname(log),{recursive:true})
let active=false,stopped=false
async function tick(){if(active||stopped)return;active=true;try{const r=await fetch(`http://127.0.0.1:${process.env.RCRE_PORT??3200}/api/local-worker`,{method:'POST',headers:{authorization:'Bearer '+process.env.RCRE_LOCAL_WORKER_KEY},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Local worker HTTP '+r.status);const result=await r.json();if(result.processed||result.reminders?.created)appendFileSync(log,JSON.stringify({at:new Date().toISOString(),...result})+'\n')}catch(e){appendFileSync(log,JSON.stringify({at:new Date().toISOString(),status:'retrying',error:e instanceof Error?e.message:'Unavailable'})+'\n')}finally{active=false}}
const timer=setInterval(tick,15000);setTimeout(tick,3000)
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;clearInterval(timer);process.exit(0)})
