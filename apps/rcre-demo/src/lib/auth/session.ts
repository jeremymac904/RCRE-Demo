import 'server-only'
import {actorOrNull} from '../platform/auth'
import type {Actor} from '../db/repository'
/** Legacy domain adapter. Identity is always resolved through canonical sessions. */
export async function getActor():Promise<Actor|null>{const a=await actorOrNull();if(!a)return null;const roleMap={agent:'agent',team_leader:'team_lead',managing_broker:'broker',broker_owner:'owner',transaction_coordinator:'staff',marketing_admin:'staff',trainer:'viewer'} as const;return {userId:a.id,organizationId:a.organizationId,role:roleMap[a.role]}}
