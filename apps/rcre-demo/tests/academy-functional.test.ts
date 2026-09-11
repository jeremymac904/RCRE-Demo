import { describe,it,expect,afterAll } from 'vitest'
import {unlinkSync} from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { academy } from '../src/data/academy'
import { byteRange, academyAssetPath, protectedHref } from '../src/lib/academy-media'
import { assignmentsFor, courseAllowed, manageAcademy, progressFor, updateProgress,publicCourseAllowed,academyConfig } from '../src/lib/academy-service'
import {createAcademyUpload,academyUploadFor} from '../src/lib/academy-uploads'
import { communityAction,communityPosts } from '../src/lib/academy-community'
import type { PlatformActor } from '../src/lib/platform/auth'
import { getRecord,readRecords,deleteRecord } from '../src/lib/platform/store'
const org='academy-test-'+randomUUID()
const agent:PlatformActor={id:'a',userId:'a',organizationId:org,role:'agent',name:'Test Learner',market:'Florida',teamId:'fl',officeId:'fl'}
const trainer:PlatformActor={...agent,id:'t',userId:'t',role:'trainer',name:'Test Trainer'}
const other:PlatformActor={...agent,id:'b',userId:'b'}
const lesson=academy.lessons[0]
afterAll(()=>{for(const kind of ['academy_progress','academy_policy','academy_assignment','academy_course','community_post','academy_config','academy_upload'])for(const r of readRecords<{id:string;organizationId:string}>(kind))if(r.organizationId===org){if(kind==='academy_upload'){try{unlinkSync(path.resolve(process.cwd(),'../../runtime/academy-uploads',r.id))}catch{}}deleteRecord(kind,r.id)}})
describe('Academy functional local persistence and authorization',()=>{
 it('stores independent progress, bookmarks and resume positions',()=>{updateProgress(agent,{lessonId:lesson.id,complete:true,bookmark:true,seconds:28});expect(progressFor(agent).completedLessonIds).toContain(lesson.id);expect(progressFor(agent).positions[lesson.id]).toBe(28);expect(progressFor(other).completedLessonIds).toEqual([]);expect(getRecord('academy_progress',org+':a')).not.toBeNull();updateProgress(agent,{lessonId:lesson.id,complete:false});expect(progressFor(agent).completedLessonIds).not.toContain(lesson.id)})
 it('rejects learner authoring and enforces course enrollment on progress',()=>{expect(()=>manageAcademy(agent,{action:'policy',courseId:lesson.courseId})).toThrow();manageAcademy(trainer,{action:'policy',courseId:lesson.courseId,roles:['trainer']});expect(courseAllowed(agent,lesson.courseId)).toBe(false);expect(()=>updateProgress(agent,{lessonId:lesson.id,complete:true})).toThrow();expect(courseAllowed(trainer,lesson.courseId)).toBe(true)})
 it('assigns by role and keeps unrelated learners out',()=>{manageAcademy(trainer,{action:'assignment',courseId:lesson.courseId,targetType:'role',target:'agent',due:'2026-10-01'});expect(assignmentsFor(agent)).toHaveLength(1);expect(assignmentsFor({...other,role:'marketing_admin'})).toHaveLength(0)})
 it('preserves course revisions and rejects stale editor saves',()=>{const c=manageAcademy(trainer,{title:'Document walkthrough',body:'Use supplied synthetic report.',status:'draft'}) as {id:string;version:number};manageAcademy(trainer,{id:c.id,version:c.version,title:'Document walkthrough',body:'Updated approved teaching material.',status:'review'});expect(()=>manageAcademy(trainer,{id:c.id,version:1,title:'Conflict',body:'Stale body'})).toThrow('changed')})
})
describe('Academy instructor administration',()=>{
 it('requires independent review before publishing custom content',()=>{const draft=manageAcademy(trainer,{title:'Custom training',body:'Supplied local lesson',status:'review'}) as {id:string;version:number};expect(()=>manageAcademy(trainer,{...draft,title:'Custom training',body:'Supplied local lesson',status:'published'})).toThrow('different');const reviewer={...trainer,id:'reviewer'};const published=manageAcademy(reviewer,{...draft,title:'Custom training',body:'Supplied local lesson',status:'published'}) as {id:string;version:number};manageAcademy(trainer,{action:'assignment',courseId:published.id,targetType:'role',target:'agent',due:'2026-10-02'});expect(assignmentsFor(agent).some(a=>a.courseId===published.id)).toBe(true)})
 it('denies custom resource delivery before publication and permits enrolled published delivery',()=>{const file=createAcademyUpload(trainer,'synthetic-lesson.txt','text/plain',Buffer.from('Synthetic approved training material'));expect(()=>academyUploadFor(agent,file.id)).toThrow();const draft=manageAcademy(trainer,{title:'Resource lesson',body:'Read this supplied resource',status:'review',resources:[file.id]}) as {id:string;version:number};manageAcademy({...trainer,id:'reviewer'},{...draft,title:'Resource lesson',body:'Read this supplied resource',status:'published',resources:[file.id]});expect(academyUploadFor(agent,file.id).bytes.toString()).toContain('Synthetic approved')})
 it('allows explicit preview only for rights-cleared source courses and saves categories/order',()=>{manageAcademy(trainer,{action:'policy',courseId:'c01',roles:[],publicPreview:true});expect(publicCourseAllowed('c01',org)).toBe(true);expect(()=>manageAcademy(trainer,{action:'policy',courseId:'c03',roles:[],publicPreview:true})).toThrow('rights');manageAcademy(trainer,{action:'config',categories:['Questions','Brokerage notices'],order:academy.courses.map(c=>c.id).reverse()});expect(academyConfig(org).categories).toEqual(['Questions','Brokerage notices']);expect(academyConfig(org).order[0]).toBe('c14')})
})
describe('Community identity controls',()=>{
 it('persists posts, comments and per-user reactions',()=>{const p=communityAction(agent,{action:'create',title:'Working through a lesson',body:'My local question'}) as {id:string};communityAction(other,{action:'comment',id:p.id,body:'A useful reply'});communityAction(other,{action:'like',id:p.id});const saved=communityPosts(agent).find(x=>x.id===p.id)!;expect(saved.comments[0].author).toBe('Test Learner');expect(saved.likes).toEqual(['b']);expect(()=>communityAction(other,{action:'edit',id:p.id,body:'Overwrite'})).toThrow();expect(()=>communityAction(other,{action:'pin',id:p.id})).toThrow();communityAction(trainer,{action:'pin',id:p.id});expect(communityPosts(agent)[0].pinned).toBe(true)})
 it('protects drafts and organization isolation',()=>{const p=communityAction(agent,{action:'create',title:'Private',body:'Draft',draft:true}) as {id:string};expect(communityPosts(other).some(x=>x.id===p.id)).toBe(false);expect(()=>communityAction({...other,organizationId:'elsewhere'},{action:'comment',id:p.id,body:'No'})).toThrow()})
})
describe('Protected media range delivery',()=>{
 it('supports bounded and suffix ranges and rejects malformed requests',()=>{expect(byteRange('bytes=0-1023',2048)).toEqual({start:0,end:1023});expect(byteRange('bytes=-128',2048)).toEqual({start:1920,end:2047});expect(()=>byteRange('bytes=9999-',2048)).toThrow();expect(()=>byteRange('bytes=0-1,4-5',2048)).toThrow()})
 it('maps every protected resource out of public directories',()=>{expect(protectedHref('/academy/video/a.mp4')).toBe('/api/academy/media/video/a.mp4');expect(academyAssetPath('/academy/video/a.mp4')).toContain('/training-assets/protected/video/');expect(()=>academyAssetPath('/academy/../secret')).toThrow()})
})
