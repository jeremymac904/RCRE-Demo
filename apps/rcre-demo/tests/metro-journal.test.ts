import {describe,it,expect} from 'vitest'
import {metroJournals,metroArticles,metroRoutes,journalStories} from '../src/lib/public/metro-journal'
import {publicAgents,communities,publicRoutes,articles as legacy} from '../src/lib/public/content'
describe('regional journals',()=>{
 it('has unique reachable hub and article routes',()=>{expect(new Set(metroRoutes).size).toBe(9);for(const route of metroRoutes)expect(publicRoutes).toContain(route)})
 it('ties every guide to a real regional hub and substantive original sections',()=>{for(const a of metroArticles){expect(metroJournals.some(m=>m.slug===a.metroSlug)).toBe(true);expect(a.sections.length).toBeGreaterThanOrEqual(4);expect(a.sections.map(s=>s.text).join(' ').split(/\s+/).length).toBeGreaterThan(200);expect(a.sources.length).toBeGreaterThan(1)}})
 it('only connects existing source-backed agents and counties',()=>{for(const m of metroJournals){for(const a of m.agentSlugs)expect(publicAgents.some(p=>p.slug===a)).toBe(true);for(const c of m.counties)expect(communities.some(p=>p.slug===c)).toBe(true)}})
 it('does not turn South Florida historical sales into assigned-agent claims',()=>{const m=metroJournals.find(m=>m.slug==='south-florida')!;expect(m.agentSlugs).toEqual([]);expect(m.evidenceNote).toContain('Historical sales alone')})
})

describe('one coherent journal index',()=>{
 it('combines every seeded story once and preserves explicit regional assignments',()=>{const rows=journalStories(legacy);expect(rows).toHaveLength(metroArticles.length+legacy.length);expect(new Set(rows.map(a=>a.slug)).size).toBe(rows.length);expect(rows.find(a=>a.slug==='whats-new-on-the-over-the-mountain-table-this-summer')?.metroSlug).toBe('birmingham');expect(rows.find(a=>a.slug==='where-duval-countys-fall-2026-restaurant-wave-is-actually-landing')?.metroSlug).toBe('jacksonville')})
 it('preserves published overrides and archive while assigning custom articles only to Brokerage',()=>{const first=metroArticles[0];const rows=journalStories(legacy,{['/blog/'+first.slug]:{title:'Published revised title',description:'New description',body:'Words'},'/blog/custom-jacksonville-title':{title:'Jacksonville custom',description:'Unassigned',body:'Words'},'/blog/metros/private-hub':{title:'Hub',description:'Not story',body:'Words'},'/today':{title:'Private',description:'Private',body:'Words'}},['/blog/'+legacy[0].slug]);expect(rows.find(a=>a.slug===first.slug)?.title).toBe('Published revised title');expect(rows.find(a=>a.slug==='custom-jacksonville-title')?.metroSlug).toBe('brokerage');expect(rows.some(a=>a.slug===legacy[0].slug)).toBe(false);expect(rows.some(a=>a.slug.includes('private'))).toBe(false)})
 it('omits redirected stories rather than advertising stale article bodies',()=>{const a=metroArticles[0];expect(journalStories(legacy,{['/blog/'+a.slug]:{title:'Old',description:'Old',body:'Old',redirectTo:'/contact'}}).some(r=>r.slug===a.slug)).toBe(false)})
})
