import {stopOwnedProcess} from './hermes-process.mjs'
import {mkdirSync,writeFileSync,readFileSync,existsSync,realpathSync,openSync,closeSync} from 'node:fs'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes,createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))
const [action='status',identity,model='rcre-local-unconfigured']=process.argv.slice(2)
if(!identity||!/^rcre-local:[a-zA-Z0-9_-]{1,100}$/.test(identity))throw Error('A canonical local owner identity is required')
if(!/^[a-zA-Z0-9_.:/-]{1,120}$/.test(model)||/cloud|remote/i.test(model))throw Error('Only an existing permitted local model may be selected')
const key=createHash('sha256').update(identity).digest('hex').slice(0,20),worker=path.join(root,'runtime/hermes-workers',key),statePath=path.join(worker,'state.json')
const source='/Users/jeremymcdonald/.hermes/hermes-agent',python=path.join(source,'venv/bin/python'),sandbox='/usr/bin/sandbox-exec'
mkdirSync(worker,{recursive:true,mode:0o700});if(!realpathSync(worker).startsWith(root+path.sep))throw Error('Worker storage escaped RCRE')
const read=()=>existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{identity,state:'stopped',reason:'No isolated worker has been started'}
const save=s=>writeFileSync(statePath,JSON.stringify({...s,identity,updatedAt:new Date().toISOString()},null,2),{mode:0o600})
const publicState=s=>{const {token,...safe}=s;return {...safe,storage:worker,modelExecutionVerified:false,paidFallback:false}}
const quote=s=>JSON.stringify(s)
const port=18800+parseInt(key.slice(0,4),16)%800
const env={PATH:'/usr/bin:/bin:/usr/sbin:/sbin',LANG:'en_US.UTF-8',HERMES_HOME:worker,PYTHONPATH:source,PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1',TMPDIR:path.join(worker,'tmp'),TMP:path.join(worker,'tmp'),TEMP:path.join(worker,'tmp'),XDG_CACHE_HOME:path.join(worker,'cache'),XDG_CONFIG_HOME:path.join(worker,'config'),XDG_DATA_HOME:path.join(worker,'data'),UV_CACHE_DIR:path.join(worker,'cache/uv'),API_SERVER_ENABLED:'true',API_SERVER_HOST:'127.0.0.1',API_SERVER_PORT:String(port),OPENAI_BASE_URL:'http://127.0.0.1:11434/v1',OPENAI_API_KEY:'local-ollama-no-paid-service',HERMES_DISABLE_UPDATE_CHECK:'1'}
async function health(s){if(!s.token||!s.endpoint)return false;try{const r=await fetch(s.endpoint+'/v1/toolsets',{headers:{authorization:'Bearer '+s.token},signal:AbortSignal.timeout(1500)});if(!r.ok)return false;const data=await r.json();const rows=Array.isArray(data)?data:data.toolsets??data.data;if(!Array.isArray(rows))return false;return rows.every(t=>t.enabled!==true)}catch{return false}}
if(action==='status'){const s=read();if(s.state==='running'&&!await health(s)){s.state='unavailable';s.reason='Worker is not responding with a verified empty toolset';save(s)}console.log(JSON.stringify(publicState(s)))}
else if(action==='stop'){const s=read();await stopOwnedProcess(s,worker);save({...s,state:'stopped',reason:'Stopped locally',token:undefined,pid:undefined});console.log(JSON.stringify(publicState(read())))}
else if(action==='start'){
 const previous=read();let permitted=false;try{const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(2000)});const data=await r.json();permitted=r.ok&&data.models?.some(m=>m.name===model)}catch{}if(!permitted){save(previous.pid?{...previous,requestedStartError:'Requested model is unavailable; existing worker state retained. Stop it explicitly if required.'}:{...previous,state:'blocked',reason:'No selected existing local Ollama model is available. No model downloaded, paid service called, or worker started.'});console.log(JSON.stringify(publicState(read())));process.exit(0)}
 if(previous.model===model&&await health(previous)){console.log(JSON.stringify(publicState(previous)));process.exit(0)}await stopOwnedProcess(previous,worker);save({...previous,state:'stopped',pid:undefined,token:undefined});
 if(process.platform!=='darwin'||!existsSync(sandbox)||!existsSync(python))throw Error('Verified macOS sandbox and installed read-only Hermes Python runtime are required')
 for(const dir of ['tmp','cache','config','data','skills'])mkdirSync(path.join(worker,dir),{recursive:true,mode:0o700})
 const token=randomBytes(32).toString('hex');env.API_SERVER_KEY=token
 const runtimeRoot=path.dirname(path.dirname(realpathSync(python)))
 const profile=`(version 1)\n(deny default)\n(allow process*)\n(allow sysctl-read)\n(allow mach-lookup)\n(allow file-read-metadata)\n(allow file-read* (subpath "/System") (subpath "/usr") (subpath "/Library/Apple") (subpath "/dev") (subpath ${quote(source)}) (subpath ${quote(runtimeRoot)}) (subpath ${quote(worker)}))\n(allow file-write* (subpath ${quote(worker)}))\n(allow network-bind (local ip "localhost:${port}"))\n(allow network-inbound (local ip "localhost:${port}"))\n(allow network-outbound (remote ip "localhost:11434"))\n`
 const policy=path.join(worker,'sandbox.sb');writeFileSync(policy,profile,{mode:0o600})
 // Probe a sibling RCRE path: the process must be unable to read or write it.
 const sibling=path.join(root,'runtime/hermes-workers',key+'-isolation-probe');mkdirSync(sibling,{recursive:true,mode:0o700});writeFileSync(path.join(sibling,'private.txt'),'synthetic isolation fixture',{mode:0o600})
 const probe=`import pathlib,sys\np=pathlib.Path(${JSON.stringify(sibling)})\ntry:\n p.joinpath('private.txt').read_text();sys.exit(9)\nexcept PermissionError: pass\ntry:\n p.joinpath('forbidden.txt').write_text('unexpected');sys.exit(10)\nexcept PermissionError: pass\npathlib.Path(${JSON.stringify(path.join(worker,'probe-ok'))}).write_text('isolated')\n`
 const tested=spawnSync(sandbox,['-f',policy,python,'-B','-c',probe],{env,cwd:worker,encoding:'utf8',timeout:10000});if(tested.status!==0){save({state:'blocked',reason:'OS isolation probe failed; Hermes was not started',diagnostic:JSON.stringify({status:tested.status,signal:tested.signal,error:tested.error?.message,stderr:String(tested.stderr).slice(0,1000),stdout:String(tested.stdout).slice(0,300)})});console.log(JSON.stringify(publicState(read())));process.exit(1)}
 writeFileSync(path.join(worker,'config.yaml'),JSON.stringify({model:{default:model,provider:'custom',base_url:'http://127.0.0.1:11434/v1'},platform_toolsets:{api_server:[],cli:[]},mcp_servers:{},memory:{memory_enabled:false,user_profile_enabled:false},agent:{max_turns:1},browser:{extension_control:{enabled:false}},terminal:{cwd:worker}},null,2),{mode:0o600})
 writeFileSync(path.join(worker,'SOUL.md'),'RCRE isolated drafting worker. No terminal, filesystem, messaging, browsing, memory, or external tools are enabled. Only scoped context supplied by RCRE may be used. No paid fallback.',{mode:0o600})
 const log=openSync(path.join(worker,'worker.log'),'a',0o600)
 const child=spawn(sandbox,['-f',policy,python,'-B','-c','from hermes_cli.main import main; main()','gateway','run'],{env,cwd:worker,stdio:['ignore',log,log],detached:true});closeSync(log);child.unref()
 const s={state:'starting',pid:child.pid,endpoint:'http://127.0.0.1:'+port,token,model,isolationProbePassed:true,reason:'Starting an OS-sandboxed dedicated owner runtime'};save(s)
 for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,1000));if(await health(s)){s.state='running';s.reason='Dedicated worker responds with no enabled native tools; inference is not verified';save(s);break}}
 if(s.state!=='running'){await stopOwnedProcess(s,worker);s.pid=undefined;s.token=undefined;s.state='blocked';s.reason='Hermes did not reach verified empty-toolset health; inspect the owner-contained worker log';save(s)}
 console.log(JSON.stringify(publicState(read())))
}else throw Error('Unknown lifecycle action')
