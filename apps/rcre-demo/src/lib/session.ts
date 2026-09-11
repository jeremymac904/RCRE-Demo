import { actorOrNull } from './platform/auth'
import {getSetting} from './platform/service'
import {getRecord} from './platform/store'
import { USERS, type DemoUser } from '@/data/demo'
export { SESSION_COOKIE } from './platform/auth'
export async function currentUser():Promise<(DemoUser & {platformRole:import('./platform/auth').PlatformRole})|null>{const a=await actorOrNull();if(!a)return null;const prefs=getSetting(a,'personal').value;const original=USERS.find(u=>u.id===a.id)??USERS[2];return {...original,id:a.id,name:prefs?.name||a.name,firstName:(prefs?.name||a.name).split(' ')[0],initials:a.name.split(' ').map(n=>n[0]).join(''),photo:getRecord('profile_photos',a.organizationId+':'+a.id)?'/api/profile/photo':undefined,title:a.role.replaceAll('_',' '),market:a.market,role:['broker_owner','managing_broker','team_leader'].includes(a.role)?'broker':'agent',platformRole:a.role}}
