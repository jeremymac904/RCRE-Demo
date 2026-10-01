import { describe, expect, it } from 'vitest'
import { createInvitation } from '@/lib/auth/invitations'
import { decryptMailPayload } from '@/lib/auth/mail'
import { configureAuthPersistenceForTests, hashSecret, type AuthActorRow, type AuthPersistence, type EncryptedMailPayload, type MemberSummary } from '@/lib/auth/persistence'
import type { PlatformActor, PlatformRole } from '@/lib/platform/auth'

class TestAuthStore implements AuthPersistence {
  users = new Map<string, { id: string; org: string; email: string; name: string; role: PlatformRole; office: string; team: string; market: string; active: boolean; status: string; lastLogin: string | null }>()
  identities = new Map<string, string>()
  invites = new Map<string, { id: string; userId: string; org: string; email: string; name: string; role: PlatformRole; office: string; team: string; hash: string; expiresAt: Date; status: string; payload: EncryptedMailPayload; acceptedAt: string | null }>()
  sessions = new Map<string, { id: string; userId: string; expiresAt: Date; revoked: boolean }>()
  mail: Array<{ id: string; payload: EncryptedMailPayload; recipient: string; attemptCount: number; status: string }> = []
  addActive(user: { id: string; org: string; email: string; name: string; role: PlatformRole; office?: string }) {
    this.users.set(user.id, { ...user, office: user.office ?? 'fl', team: user.office ?? 'fl', market: user.office ?? 'Florida', active: true, status: 'active', lastLogin: null })
  }
  actor(user: NonNullable<ReturnType<TestAuthStore['users']['get']>>, sessionId?: string): AuthActorRow { return { id: user.id,userId:user.id,organizationId:user.org,role:user.role,name:user.name,market:user.market,officeId:user.office,teamId:user.team,sessionId } }
  async linkGoogle(input: { email: string; subject: string; name: string; invitationTokenHash: string | null }) {
    const linkedId = this.identities.get(input.subject)
    if (linkedId) { const user=this.users.get(linkedId); return user?.active && user.email===input.email ? this.actor(user) : null }
    const matches = [...this.users.values()].filter(user => user.email===input.email && user.active)
    if (matches.length > 1) return null
    let user = matches[0]
    if (!user) {
      const invite=this.invites.get(input.invitationTokenHash ?? '')
      if (!invite || invite.status!=='pending' || invite.expiresAt.getTime()<=Date.now() || invite.email!==input.email) return null
      user=this.users.get(invite.userId)!
      if (!user || user.status!=='invited') return null
      const prior=[...this.identities.entries()].find(([,id])=>id===user!.id)?.[0]
      if (prior && prior!==input.subject) return null
      user.active=true;user.status='active';user.name=input.name
      invite.status='accepted';invite.acceptedAt=new Date().toISOString()
    }
    const existing=[...this.identities.entries()].find(([subject,id])=>id===user!.id&&subject!==input.subject)
    if (existing) return null
    this.identities.set(input.subject,user.id);user.lastLogin=new Date().toISOString()
    return this.actor(user)
  }
  async issueSession(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    const user=this.users.get(input.userId)
    if (!user?.active || !this.identitiesHasUser(user.id) || input.expiresAt<=new Date()) return null
    const id=`session-${this.sessions.size+1}`;this.sessions.set(input.tokenHash,{id,userId:user.id,expiresAt:input.expiresAt,revoked:false});return {sessionId:id}
  }
  identitiesHasUser(id:string){return [...this.identities.values()].includes(id)}
  async validateSession(hash:string) { const session=this.sessions.get(hash);const user=session&&this.users.get(session.userId);return session&&!session.revoked&&session.expiresAt.getTime()>Date.now()&&user?.active?this.actor(user,session.id):null }
  async revokeSession(hash:string) { const row=this.sessions.get(hash);if(!row||row.revoked)return false;row.revoked=true;return true }
  async listSessions(actor:PlatformActor) { return [...this.sessions.values()].filter(row=>row.userId===actor.id).map(row=>({id:row.id,createdAt:new Date().toISOString(),expiresAt:row.expiresAt.getTime(),revoked:row.revoked,lastUsedAt:null,deviceLabel:null})) }
  async revokeSessionById(actor:PlatformActor,id:string) { const row=[...this.sessions.values()].find(session=>session.id===id&&session.userId===actor.id);if(!row||row.revoked)return false;row.revoked=true;return true }
  async rotateSession(input: { oldTokenHash:string;newTokenHash:string;expiresAt:Date }) { const row=this.sessions.get(input.oldTokenHash);if(!row||row.revoked||row.expiresAt<=new Date())return null;row.revoked=true;const next=await this.issueSession({userId:row.userId,tokenHash:input.newTokenHash,expiresAt:input.expiresAt});return next }
  async invitationStatus(hash:string) { const row=this.invites.get(hash);return row?{valid:row.status==='pending'&&row.expiresAt.getTime()>Date.now(),email:row.email,expiresAt:row.expiresAt.toISOString(),name:row.name}:null }
  async listInvitations(actor:PlatformActor) { return [...this.invites.values()].filter(row=>row.org===actor.organizationId&&(actor.role==='broker_owner'||row.office===actor.officeId)).map(row=>({id:row.id,email:row.email,name:row.name,role:row.role,status:row.status,createdAt:new Date().toISOString(),expiresAt:row.expiresAt.toISOString(),acceptedAt:row.acceptedAt,mailStatus:'queued'})) }
  async createInvitation(actor:PlatformActor,input:{email:string;name:string;role:PlatformRole;officeId:string;teamId:string;market:string;tokenHash:string;expiresAt:Date;payload:EncryptedMailPayload}) {
    if ([...this.users.values()].some(user=>user.org===actor.organizationId&&user.email===input.email&&['active','invited'].includes(user.status))) throw new Error('duplicate email')
    const id=`invite-${this.invites.size+1}`,userId=`user-${this.users.size+1}`
    this.users.set(userId,{id:userId,org:actor.organizationId,email:input.email,name:input.name,role:input.role,office:input.officeId,team:input.teamId,market:input.market,active:false,status:'invited',lastLogin:null})
    this.invites.set(input.tokenHash,{id,userId,org:actor.organizationId,email:input.email,name:input.name,role:input.role,office:input.officeId,team:input.teamId,hash:input.tokenHash,expiresAt:input.expiresAt,status:'pending',payload:input.payload,acceptedAt:null})
    this.mail.push({id,payload:input.payload,recipient:input.email,attemptCount:0,status:'queued'});return {invitationId:id,userId}
  }
  async resendInvitation(_actor:PlatformActor,_id:string,_input:{tokenHash:string;expiresAt:Date;payload:EncryptedMailPayload}) { return false }
  async cancelInvitation(_actor:PlatformActor,id:string) { const row=[...this.invites.values()].find(inv=>inv.id===id);if(!row||row.status!=='pending')return false;row.status='cancelled';const user=this.users.get(row.userId);if(user){user.status='disabled';user.active=false}return true }
  async listMembers(actor:PlatformActor):Promise<MemberSummary[]> { return [...this.users.values()].filter(u=>u.org===actor.organizationId).map(u=>({userId:u.id,organizationId:u.org,canonicalPersonId:null,email:u.email,name:u.name,platformRole:u.role,active:u.active,accountStatus:u.status,officeId:u.office,teamId:u.team,market:u.market,lastLoginAt:u.lastLogin})) }
  async updateMember(_actor:PlatformActor,id:string,change:{role:PlatformRole;officeId:string;teamId:string;market:string;active:boolean}) { const user=this.users.get(id);if(!user)return false;user.role=change.role;user.office=change.officeId;user.team=change.teamId;user.market=change.market;user.active=change.active;user.status=change.active?'active':'disabled';if(!change.active)for(const s of this.sessions.values())if(s.userId===id)s.revoked=true;return true }
  async revokeUserSessions(_actor:PlatformActor,id:string) { let n=0;for(const s of this.sessions.values())if(s.userId===id&&!s.revoked){s.revoked=true;n++}return n }
  async claimMail(limit:number) { return this.mail.filter(m=>m.status==='queued').slice(0,limit).map(m=>({id:m.id,recipient:m.recipient,ciphertext:m.payload.ciphertext,nonce:m.payload.nonce,tag:m.payload.tag,attemptCount:m.attemptCount})) }
  async finishMail(id:string,result:{success:boolean}) { const row=this.mail.find(m=>m.id===id);if(row)row.status=result.success?'sent':'retry' }
}

const leader: PlatformActor={id:'leader-1',userId:'leader-1',organizationId:'org-1',role:'broker_owner',name:'RCRE Owner',market:'Both',teamId:'all',officeId:'all'}

describe('Google invitation and durable-session behavior via local auth test double', () => {
  it('accepts one verified matching invitation once and creates no duplicate user', async () => {
    const store=new TestAuthStore();configureAuthPersistenceForTests(store)
    process.env.RCRE_MAIL_OUTBOX_KEY=Buffer.alloc(32,4).toString('base64url');process.env.RCRE_PUBLIC_URL='https://rcre.example'
    const invitation=await createInvitation(leader,{email:'new.agent@example.com',name:'New Agent',role:'agent',officeId:'fl'})
    const invite=[...store.invites.values()][0]
    const message=decryptMailPayload(invite.payload)
    const token=new URL(message.text.split('\n').find(line=>line.startsWith('https://'))!).pathname.split('/').pop()!
    expect(invite.hash).toBe(hashSecret(token))
    expect(invite.payload.ciphertext.toString('utf8')).not.toContain(token)
    expect(await store.linkGoogle({email:'other@example.com',subject:'google-subject-123456',name:'New Agent',invitationTokenHash:hashSecret(token)})).toBeNull()
    const actor=await store.linkGoogle({email:'new.agent@example.com',subject:'google-subject-123456',name:'New Agent',invitationTokenHash:hashSecret(token)})
    expect(actor?.userId).toBe(invite.userId)
    expect(invite.status).toBe('accepted')
    expect(store.users.size).toBe(1)
    expect(await store.linkGoogle({email:'new.agent@example.com',subject:'different-subject-123456',name:'Other',invitationTokenHash:hashSecret(token)})).toBeNull()
    configureAuthPersistenceForTests(null);delete process.env.RCRE_MAIL_OUTBOX_KEY;delete process.env.RCRE_PUBLIC_URL
    expect(invitation.status).toBe('queued')
  })

  it('stores only hashed session tokens, rotates atomically, and enforces revocation/deactivation', async () => {
    const store=new TestAuthStore();store.addActive({id:'user-1',org:'org-1',email:'a@example.com',name:'Agent',role:'agent'})
    store.identities.set('google-subject-1234','user-1')
    const first='opaque-cookie-token',firstHash=hashSecret(first)
    expect(await store.issueSession({userId:'user-1',tokenHash:firstHash,expiresAt:new Date(Date.now()+60_000)})).not.toBeNull()
    expect(store.sessions.has(first)).toBe(false)
    expect((await store.validateSession(firstHash))?.role).toBe('agent')
    const secondHash=hashSecret('rotated-cookie-token')
    expect(await store.rotateSession({oldTokenHash:firstHash,newTokenHash:secondHash,expiresAt:new Date(Date.now()+60_000)})).not.toBeNull()
    expect(await store.validateSession(firstHash)).toBeNull()
    expect(await store.validateSession(secondHash)).not.toBeNull()
    await store.updateMember(leader,'user-1',{role:'team_leader',officeId:'fl',teamId:'fl',market:'Florida',active:true})
    expect((await store.validateSession(secondHash))?.role).toBe('team_leader')
    await store.updateMember(leader,'user-1',{role:'team_leader',officeId:'fl',teamId:'fl',market:'Florida',active:false})
    expect(await store.validateSession(secondHash)).toBeNull()
    // Reactivation must not revive a session revoked at deactivation.
    await store.updateMember(leader,'user-1',{role:'team_leader',officeId:'fl',teamId:'fl',market:'Florida',active:true})
    expect(await store.validateSession(secondHash)).toBeNull()
  })

  it('revokes every device token while a role change is reflected on the next validation', async () => {
    const store=new TestAuthStore();store.addActive({id:'user-2',org:'org-1',email:'b@example.com',name:'Agent',role:'agent'})
    store.identities.set('google-subject-5678','user-2')
    const firstHash=hashSecret('device-one'),secondHash=hashSecret('device-two')
    await store.issueSession({userId:'user-2',tokenHash:firstHash,expiresAt:new Date(Date.now()+60_000)})
    await store.issueSession({userId:'user-2',tokenHash:secondHash,expiresAt:new Date(Date.now()+60_000)})
    await store.updateMember(leader,'user-2',{role:'team_leader',officeId:'fl',teamId:'fl',market:'Florida',active:true})
    expect((await store.validateSession(firstHash))?.role).toBe('team_leader')
    expect((await store.validateSession(secondHash))?.role).toBe('team_leader')
    expect(await store.revokeUserSessions(leader,'user-2')).toBe(2)
    expect(await store.validateSession(firstHash)).toBeNull()
    expect(await store.validateSession(secondHash)).toBeNull()
  })
})
