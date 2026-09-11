import {describe,it,expect} from 'vitest'
import {validatePublicRedirect} from '../src/lib/public/redirects'
import type {PublicContent} from '../src/lib/public/content'
const record=(id:string,target?:string):PublicContent=>({id,title:'Local page',description:'',body:'Content',revision:1,status:'published',published:{title:'Local page',description:'',body:'Content',redirectTo:target}})
describe('public redirect publishing',()=>{
 it('allows a clean existing public destination',()=>expect(()=>validatePublicRedirect('/pages/old','/financing',[])).not.toThrow())
 it.each(['/today','/api/session','https://example.com','//example.com','/contact?email=test','/contact#inquiry','/pages/../contact','/pages/missing'])('rejects private, malformed, external, or unpublished destinations %s',target=>expect(()=>validatePublicRedirect('/pages/old',target,[])).toThrow())
 it('rejects a self-loop',()=>expect(()=>validatePublicRedirect('/about','/about',[])).toThrow())
 it('rejects a multi-page loop',()=>expect(()=>validatePublicRedirect('/pages/a','/pages/b',[record('/pages/a'),record('/pages/b','/pages/a')])).toThrow())
 it('allows a published custom target',()=>expect(()=>validatePublicRedirect('/pages/a','/pages/b',[record('/pages/b')])).not.toThrow())
 it('rejects archived targets',()=>expect(()=>validatePublicRedirect('/pages/a','/contact',[{...record('/contact'),status:'archived'}])).toThrow())
 it('rejects a redirect on dedicated pages outside this handler',()=>expect(()=>validatePublicRedirect('/financing','/contact',[])).toThrow())
})
