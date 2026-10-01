import {afterEach,describe,expect,it,vi} from 'vitest'
import {escapeSitemapValue,sitemapXml} from '../../src/lib/public/sitemap'
import {publicAgents,type PublicContent} from '../../src/lib/public/content'

const cms:PublicContent[]=[
  {id:'/blog/approved',status:'published',revision:1,title:'Approved',description:'',body:'',published:{title:'Approved',description:'',body:''}},
  {id:'/blog/hidden',status:'archived',revision:2,title:'Hidden',description:'',body:''},
  {id:'/pages/no-index',status:'published',revision:1,title:'No index',description:'',body:'',published:{title:'No index',description:'',body:'',noIndex:true}},
]

describe('public sitemap projection',()=>{
  it('uses only the supplied published CMS projection and currently visible canonical agent routes',()=>{
    const active=publicAgents.filter(person=>person.slug!=='lekeshia-jones').map(person=>person.slug)
    const xml=sitemapXml(cms,['/blog/hidden'],active)
    expect(xml).toContain('https://rcregroup.com/blog/approved')
    expect(xml).not.toContain('https://rcregroup.com/blog/hidden')
    expect(xml).not.toContain('https://rcregroup.com/pages/no-index')
    expect(xml).not.toContain('https://rcregroup.com/agent/lekeshia-jones')
    expect(xml).toContain('https://rcregroup.com/agent/julio-arango')
  })

  it('escapes sitemap locations and excludes all profile routes when no visible profile projection exists',()=>{
    const xml=sitemapXml(cms,[],[])
    expect(escapeSitemapValue('/a&b<"')).toBe('/a&amp;b&lt;&quot;')
    for(const person of publicAgents)expect(xml).not.toContain(`/agent/${person.slug}`)
  })
})

afterEach(()=>vi.unstubAllEnvs())
