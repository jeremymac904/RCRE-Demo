import { randomUUID } from 'node:crypto'
import { readRecords, getRecord, putRecord, deleteRecord } from './platform/store'
import { academyManager,academyConfig } from './academy-service'
import type { PlatformActor } from './platform/auth'
export type Post={attachments?:{id:string;name:string}[];id:string;organizationId:string;ownerId:string;author:string;category:string;title:string;body:string;lessonId:string;draft:boolean;pinned:boolean;createdAt:string;likes:string[];comments:{id:string;ownerId:string;author:string;body:string;at:string}[]}
export function communityPosts(a:PlatformActor){return readRecords<Post>('community_post').filter(p=>p.organizationId===a.organizationId&&(!p.draft||p.ownerId===a.id)).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.createdAt.localeCompare(a.createdAt))}
const clean=(v:unknown,max=10000)=>String(v||'').trim().slice(0,max)
export function communityAction(a:PlatformActor,b:Record<string,unknown>){const old=b.id?getRecord<Post>('community_post',String(b.id)):null;if(old&&old.organizationId!==a.organizationId)throw new Error('Post unavailable')
 if(b.action==='create'){const attachments=Array.isArray(b.attachments)?b.attachments.map(String).map(id=>{const file=getRecord<{id:string;name:string;ownerId:string;organizationId:string}>('community_attachment',id);if(!file||file.ownerId!==a.id||file.organizationId!==a.organizationId)throw new Error('Attachment unavailable');return {id:file.id,name:file.name}}):[];const body=clean(b.body),title=clean(b.title,180);if(!body||!title)throw new Error('Add a title and message');return putRecord('community_post',{id:randomUUID(),organizationId:a.organizationId,ownerId:a.id,attachments,author:a.name,category:clean(b.category,80)||academyConfig(a.organizationId).categories[0],title,body,lessonId:clean(b.lessonId,100),draft:b.draft===true,pinned:false,createdAt:new Date().toISOString(),likes:[],comments:[]})}
 if(!old||old.draft&&old.ownerId!==a.id)throw new Error('Post unavailable')
 if(b.action==='like')old.likes=old.likes.includes(a.id)?old.likes.filter(x=>x!==a.id):[...old.likes,a.id]
 else if(b.action==='comment'){const body=clean(b.body);if(!body)throw new Error('Write a comment');old.comments.push({id:randomUUID(),ownerId:a.id,author:a.name,body,at:new Date().toISOString()})}
 else if(b.action==='pin'){if(!academyManager(a))throw new Error('Moderator permission required');old.pinned=!old.pinned}
 else if(b.action==='edit'){if(old.ownerId!==a.id)throw new Error('Only the author can edit');const body=clean(b.body);if(!body)throw new Error('Write a message');old.body=body;old.title=clean(b.title,180)||old.title;old.draft=b.draft===true}
 else if(b.action==='delete'){if(old.ownerId!==a.id&&!academyManager(a))throw new Error('Moderator permission required');deleteRecord('community_post',old.id);return {id:old.id}}
 else throw new Error('Unknown action')
 return putRecord('community_post',old)
}
