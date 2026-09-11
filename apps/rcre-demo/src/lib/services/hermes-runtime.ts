import 'server-only'
import {createHash} from 'node:crypto'
import {readFileSync,existsSync} from 'node:fs'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'
import {storageRoot} from '@/lib/platform/store'
import {type PlatformActor,demoEnabled} from '@/lib/platform/auth'
const exec=promisify(execFile)
export function hermesState(identity:string){const key=createHash('sha256').update(identity).digest('hex').slice(0,20);const file=path.join(storageRoot,'hermes-workers',key,'state.json');return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):null}
export function hermesCredentials(ownerId:string,organizationId:string,endpoint:string){const identity=organizationId+':'+ownerId,s=hermesState(identity);if(!s||s.identity!==identity||s.state!=='running'||s.isolationProbePassed!==true||s.endpoint!==endpoint||!s.token)throw Error('Start and verify your dedicated OS-isolated RCRE worker first. A saved endpoint or activation flag is not isolation proof.');return {Authorization:'Bearer '+s.token}}
export async function hermesLifecycle(a:PlatformActor,action:'status'|'start'|'stop',model?:string){if(!demoEnabled())throw Error('Local runtime lifecycle is unavailable outside the local application');const root=path.dirname(storageRoot);const {stdout}=await exec(process.execPath,[path.join(root,'scripts/hermes-runtime.mjs'),action,a.organizationId+':'+a.userId,...(model?[model]:[])],{cwd:root,timeout:30000,maxBuffer:16000,encoding:'utf8',env:{NODE_ENV:process.env.NODE_ENV,PATH:process.env.PATH,TMPDIR:path.join(storageRoot,'tmp')}}).catch(e=>{if(e.stdout)return {stdout:e.stdout};throw e});return JSON.parse(stdout)}
