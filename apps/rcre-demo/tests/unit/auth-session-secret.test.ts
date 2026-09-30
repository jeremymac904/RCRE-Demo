import {afterEach,describe,expect,it,vi} from 'vitest'

vi.mock('server-only',()=>({}))
vi.mock('@/lib/platform/store',()=>({getRecord:()=>undefined,putRecord:vi.fn(),readRecords:()=>[]}))
import {createSession} from '@/lib/platform/auth'

afterEach(()=>vi.unstubAllEnvs())

describe('session signing secret boundary',()=>{
 it('refuses to sign production sessions without a private configured key',()=>{
  vi.stubEnv('NODE_ENV','production')
  vi.stubEnv('RCRE_DEMO_ENABLED','1')
  vi.stubEnv('RCRE_SESSION_SECRET','')
  expect(()=>createSession('u-taquilla')).toThrow('Session signing is not configured')
 })
 it('accepts a sufficiently long server configured production key',()=>{
  vi.stubEnv('NODE_ENV','production')
  vi.stubEnv('RCRE_DEMO_ENABLED','1')
  vi.stubEnv('RCRE_SESSION_SECRET','a'.repeat(48))
  expect(createSession('u-julio')).toContain('.')
 })
})
