import 'server-only'
import {actorOrNull} from '../platform/auth'
import type {Actor} from '../db/repository'
import {repositoryRoleForPlatform} from './role-mapping'
/** Legacy domain adapter. Identity is always resolved through canonical sessions. */
export async function getActor():Promise<Actor|null>{const a=await actorOrNull();if(!a)return null;return {userId:a.id,organizationId:a.organizationId,role:repositoryRoleForPlatform(a.role)}}
