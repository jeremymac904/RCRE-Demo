// Development + test fixtures.
//
// SYNTHETIC DATA ONLY. No real client PII, no real RCRE agents, no real leads.
// Names are obviously fictional. This file is never loaded in production —
// see src/lib/config/env.ts dataMode().

import type { MemorySeed } from '@/lib/db/repository'
import type { Activity, ActivityKind, ActivityDirection } from '@/lib/types'

export const ORG_ID    = '00000000-0000-4000-8000-000000000001'
export const BROKER_ID = '00000000-0000-4000-8000-000000000010'
export const AGENT_A   = '00000000-0000-4000-8000-000000000011'
export const AGENT_B   = '00000000-0000-4000-8000-000000000012'

/** Fixed "now" so fixtures and tests are deterministic. */
export const NOW = '2026-08-19T15:00:00.000Z'

const hoursAgo = (h: number) => new Date(new Date(NOW).getTime() - h * 3600_000).toISOString()
const daysAgo  = (d: number) => hoursAgo(d * 24)

let activitySeq = 0
function act(
  personId: string, userId: string | null, kind: ActivityKind,
  direction: ActivityDirection, occurredAt: string, summary: string,
): Activity {
  activitySeq += 1
  return {
    id: `act-${activitySeq}`,
    organizationId: ORG_ID,
    personId, userId, kind, direction, occurredAt, summary,
    sourceSystem: 'fub',
    fubResourceType: null,
    fubResourceId: null,
    metadata: {},
  }
}

export function buildSeed(): MemorySeed {
  activitySeq = 0

  const people: MemorySeed['people'] = [
    // Hot opportunity: repeated inbound, no outbound for 9 days.
    {
      id: 'p-hot', organizationId: ORG_ID, fubPersonId: 1001,
      firstName: 'Dana', lastName: 'Whitfield',
      emails: [{ value: 'dana.whitfield@example.invalid' }],
      phones: [{ value: '+15550100001' }],
      stage: 'Nurture', source: 'Zillow',
      assignedUserId: AGENT_A, assignedFubUserId: 501,
      tags: ['buyer'], price: 385000,
      firstReceivedAt: daysAgo(40), firstAssignedAt: daysAgo(40),
      firstTouchAt: daysAgo(38), lastTouchAt: daysAgo(1),
      lastInboundAt: daysAgo(1), lastOutboundAt: daysAgo(9),
      isBuyer: true, isSeller: false, budgetMin: 350000, budgetMax: 425000,
      birthday: null, deletedInFub: false,
    },
    // Unanswered: arrived 3h ago, never touched.
    {
      id: 'p-unanswered', organizationId: ORG_ID, fubPersonId: 1002,
      firstName: 'Marcus', lastName: 'Ordonez',
      emails: [{ value: 'marcus.ordonez@example.invalid' }],
      phones: [{ value: '+15550100002' }],
      stage: 'Lead', source: 'Facebook Lead Ad',
      assignedUserId: AGENT_A, assignedFubUserId: 501,
      tags: [], price: null,
      firstReceivedAt: hoursAgo(3), firstAssignedAt: hoursAgo(3),
      firstTouchAt: null, lastTouchAt: null,
      lastInboundAt: hoursAgo(3), lastOutboundAt: null,
      isBuyer: true, isSeller: false, budgetMin: null, budgetMax: null,
      birthday: null, deletedInFub: false,
    },
    // New lead, answered promptly — contributes to median response.
    {
      id: 'p-new', organizationId: ORG_ID, fubPersonId: 1003,
      firstName: 'Priya', lastName: 'Raghunathan',
      emails: [{ value: 'priya.r@example.invalid' }], phones: [],
      stage: 'Lead', source: 'YouTube Ads',
      assignedUserId: AGENT_A, assignedFubUserId: 501,
      tags: [], price: null,
      firstReceivedAt: hoursAgo(6), firstAssignedAt: hoursAgo(6),
      firstTouchAt: hoursAgo(5), lastTouchAt: hoursAgo(5),
      lastInboundAt: hoursAgo(6), lastOutboundAt: hoursAgo(5),
      isBuyer: true, isSeller: false, budgetMin: null, budgetMax: null,
      birthday: null, deletedInFub: false,
    },
    // Stale.
    {
      id: 'p-stale', organizationId: ORG_ID, fubPersonId: 1004,
      firstName: 'Ellis', lastName: 'Kowalczyk',
      emails: [], phones: [{ value: '+15550100004' }],
      stage: 'Past Client', source: 'Referral',
      assignedUserId: AGENT_A, assignedFubUserId: 501,
      tags: ['past-client'], price: null,
      firstReceivedAt: daysAgo(400), firstAssignedAt: daysAgo(400),
      firstTouchAt: daysAgo(399), lastTouchAt: daysAgo(95),
      lastInboundAt: daysAgo(120), lastOutboundAt: daysAgo(95),
      isBuyer: false, isSeller: true, budgetMin: null, budgetMax: null,
      birthday: null, deletedInFub: false,
    },
    // Belongs to AGENT_B — used to prove cross-agent isolation.
    {
      id: 'p-other-agent', organizationId: ORG_ID, fubPersonId: 1005,
      firstName: 'Tobias', lastName: 'Fenwick',
      emails: [], phones: [],
      stage: 'Lead', source: 'Zillow',
      assignedUserId: AGENT_B, assignedFubUserId: 502,
      tags: [], price: null,
      firstReceivedAt: hoursAgo(2), firstAssignedAt: hoursAgo(2),
      firstTouchAt: null, lastTouchAt: null,
      lastInboundAt: hoursAgo(2), lastOutboundAt: null,
      isBuyer: true, isSeller: false, budgetMin: null, budgetMax: null,
      birthday: null, deletedInFub: false,
    },
  ]

  const activity: Activity[] = [
    // Dana's inbound engagement cluster (drives "hot").
    act('p-hot', null, 'property_view',  'inbound',  daysAgo(1), 'Viewed listing'),
    act('p-hot', null, 'property_view',  'inbound',  daysAgo(2), 'Viewed listing'),
    act('p-hot', null, 'property_view',  'inbound',  daysAgo(3), 'Viewed listing'),
    act('p-hot', null, 'property_saved', 'inbound',  daysAgo(2), 'Saved listing'),
    act('p-hot', null, 'em_open',        'inbound',  daysAgo(4), 'Opened email'),
    act('p-hot', AGENT_A, 'call',        'outbound', daysAgo(9), 'Call: Left message'),
    act('p-hot', AGENT_A, 'call',        'outbound', daysAgo(38), 'Call: Connected'),
    // Marcus: inbound only.
    act('p-unanswered', null, 'inquiry', 'inbound', hoursAgo(3), 'Form inquiry'),
    // Priya: answered.
    act('p-new', null, 'inquiry',  'inbound',  hoursAgo(6), 'Form inquiry'),
    act('p-new', AGENT_A, 'text',  'outbound', hoursAgo(5), 'Text message'),
    // Ellis: long ago.
    act('p-stale', AGENT_A, 'email', 'outbound', daysAgo(95), 'Email: Market update'),
  ]

  return {
    organizations: [{ id: ORG_ID, name: 'RCRE Group (fixture)', slug: 'rcre-fixture' }],
    users: [
      { id: BROKER_ID, organizationId: ORG_ID, email: 'broker@example.invalid', fullName: 'Fixture Broker', role: 'broker', fubUserId: 500, isActive: true },
      { id: AGENT_A,   organizationId: ORG_ID, email: 'agent.a@example.invalid', fullName: 'Fixture Agent A', role: 'agent',  fubUserId: 501, isActive: true },
      { id: AGENT_B,   organizationId: ORG_ID, email: 'agent.b@example.invalid', fullName: 'Fixture Agent B', role: 'agent',  fubUserId: 502, isActive: true },
    ],
    people,
    activity,
    tasks: [
      { id: 't-1', organizationId: ORG_ID, personId: 'p-hot', assignedUserId: AGENT_A, fubTaskId: 9001, title: 'Send Dana the Mandarin Lakes comps', dueAt: daysAgo(2), isCompleted: false },
      { id: 't-2', organizationId: ORG_ID, personId: 'p-new', assignedUserId: AGENT_A, fubTaskId: 9002, title: 'Confirm Priya buyer consult', dueAt: NOW, isCompleted: false },
      { id: 't-3', organizationId: ORG_ID, personId: null,    assignedUserId: AGENT_B, fubTaskId: 9003, title: 'Agent B private task', dueAt: daysAgo(1), isCompleted: false },
    ],
    appointments: [
      { id: 'ap-1', organizationId: ORG_ID, personId: 'p-new', assignedUserId: AGENT_A, fubAppointmentId: 7001, title: 'Buyer consultation', startsAt: new Date(new Date(NOW).setUTCHours(21, 0, 0, 0)).toISOString(), endsAt: null, location: 'Office', outcome: null },
    ],
    deals: [
      { id: 'd-1', organizationId: ORG_ID, personId: 'p-hot', ownerUserId: AGENT_A, fubDealId: 6001, fubPipelineId: 1, name: 'Whitfield purchase', stage: 'Under Contract', price: 385000, projectedCloseOn: null, closedAt: null, status: 'active', lastStageChangeAt: daysAgo(21) } as MemorySeed['deals'][number],
    ],
    recruitingProspects: [
      { id: 'r-1', organizationId: ORG_ID, fullName: 'Fixture Prospect', email: 'prospect@example.invalid', phone: null, currentBrokerage: 'Another Brokerage (fixture)', market: 'Jacksonville', stage: 'engaged', isConfidential: true, ownerUserId: BROKER_ID, firstReceivedAt: daysAgo(5), firstTouchAt: daysAgo(4), lastTouchAt: daysAgo(1) },
    ],
  }
}
