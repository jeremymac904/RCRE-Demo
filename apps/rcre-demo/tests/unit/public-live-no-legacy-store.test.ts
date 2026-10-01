import {afterEach,describe,expect,it,vi} from 'vitest'

vi.mock('../../src/lib/platform/store',()=>({
  getRecord:vi.fn(()=>{throw new Error('legacy SQLite must not be read in production')}),
  readRecords:vi.fn(()=>{throw new Error('legacy SQLite must not be read in production')}),
}))

describe('public production rendering',()=>{
  afterEach(()=>{vi.unstubAllEnvs();vi.resetModules()})

  it('uses approved static defaults and never reads SQLite for public configuration or profiles',async()=>{
    vi.stubEnv('NODE_ENV','production')
    vi.stubEnv('DATABASE_URL','')
    vi.stubEnv('RCRE_ORGANIZATION_ID','')
    vi.resetModules()
    const store=await import('../../src/lib/platform/store')
    const publicServer=await import('../../src/lib/public/server')

    expect(await publicServer.getLender()).toMatchObject({name:'Jeremy McDonald'})
    expect(await publicServer.getBrokerage()).toMatchObject({displayName:'River City Real Estate Group'})
    expect(await publicServer.getPublicRecord('/')).toBeUndefined()
    expect(await publicServer.publishedPages()).toEqual([])
    expect(await publicServer.archivedPublicPaths()).toEqual([])
    expect(await publicServer.publicAgentDirectorySlugs()).not.toContain('lekeshia-jones')
    expect(await publicServer.resolvePublicProfile('/agent/lekeshia-jones')).toBeUndefined()
    expect(store.getRecord).not.toHaveBeenCalled()
    expect(store.readRecords).not.toHaveBeenCalled()
  })
})
