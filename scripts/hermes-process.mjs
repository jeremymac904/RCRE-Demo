import {spawnSync} from 'node:child_process'
import path from 'node:path'
const pause=()=>new Promise(resolve=>setTimeout(resolve,100))
export function ownedProcess(pid,worker){
 if(!Number.isInteger(pid)||pid<2)throw Error('Invalid worker process identity')
 const result=spawnSync('/bin/ps',['-p',String(pid),'-o','stat=','-o','command='],{encoding:'utf8'})
 if(result.status===1)return false
 if(result.status!==0)throw Error('Unable to verify worker process ownership')
 const command=result.stdout.trim();if(!command||command.startsWith('Z'))return false
 if(!command.includes(path.join(worker,'sandbox.sb')))throw Error('Refusing to signal a process without this owner’s exact sandbox policy')
 return true
}
export async function stopOwnedProcess(state,worker){
 if(!state.pid)return
 if(!ownedProcess(state.pid,worker))return
 process.kill(-state.pid,'SIGTERM')
 for(let i=0;i<20;i++){await pause();if(!ownedProcess(state.pid,worker))return}
 if(ownedProcess(state.pid,worker))process.kill(-state.pid,'SIGKILL')
 for(let i=0;i<20;i++){await pause();if(!ownedProcess(state.pid,worker))return}
 throw Error('Worker did not stop; process identity retained for recovery')
}
