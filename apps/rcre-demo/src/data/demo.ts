/**
 * RCRE demo dataset.
 *
 * ALL SYNTHETIC. Every contact, lead, deal, task, number and message below is
 * invented for demonstration. No real client, lead, or transaction data appears
 * anywhere in this application.
 *
 * Real RCRE people (Julio Arango, Taquilla Allen and the agent roster) are used
 * only for identity — name, role, market — from public website information.
 * Every performance figure attached to them is synthetic and labelled as such.
 *
 * The dataset is built around SPECIFIC STORIES so the demo can make a business
 * point rather than showing filler:
 *
 *   1. Dana Whitfield  — hot buyer resurfacing after going quiet
 *   2. Marcus Ordonez  — lead nobody contacted (9 hours, Facebook)
 *   3. Priya Raghunathan — new YouTube lead, answered fast
 *   4. The Kowalczyks  — past client, closing anniversary approaching
 *   5. Beth Ferraro    — seller prospect engaging with content
 *   6. Nia Okonkwo     — recruit attending AI training, highly engaged
 *   7. Chad Vesely     — agent with overdue follow-ups (broker exception)
 */

export const DEMO_NOW = new Date()

const h = (n: number) => new Date(DEMO_NOW.getTime() - n * 3_600_000).toISOString()
const d = (n: number) => h(n * 24)
const ahead = (n: number) => new Date(DEMO_NOW.getTime() + n * 3_600_000).toISOString()

/** A specific clock time today (or +dayOffset), so appointments read sensibly
 *  regardless of when the demo is opened. */
const atHour = (hour: number, minute = 0, dayOffset = 0) => {
  const t = new Date(DEMO_NOW)
  t.setDate(t.getDate() + dayOffset)
  t.setHours(hour, minute, 0, 0)
  return t.toISOString()
}

// ---------------------------------------------------------------------------
// People — RCRE roster (public identity, synthetic performance)
// ---------------------------------------------------------------------------

export interface DemoUser {
  id: string
  name: string
  firstName: string
  role: 'agent' | 'broker'
  title: string
  market: string
  initials: string
  /** Real public headshot from rcregroup.com, where one was obtainable. */
  photo?: string
  /** Synthetic. Clearly labelled wherever displayed. */
  stats: { activeClients: number; pipelineValue: number; ytdClosings: number; avgResponseMinutes: number; trainingPct: number }
}

export const USERS: DemoUser[] = [
  {
    id: 'u-julio', name: 'Julio Arango', firstName: 'Julio', role: 'broker',
    title: 'Qualifying Broker', market: 'Jacksonville, FL', initials: 'JA',
    photo: '/brand/people/julio-arango.jpg',
    stats: { activeClients: 24, pipelineValue: 4_820_000, ytdClosings: 19, avgResponseMinutes: 11, trainingPct: 100 },
  },
  {
    id: 'u-taquilla', name: 'Taquilla Allen', firstName: 'Taquilla', role: 'broker',
    title: 'Managing Broker', market: 'Birmingham, AL', initials: 'TA',
    photo: '/brand/people/taquilla-allen.jpg',
    stats: { activeClients: 18, pipelineValue: 3_140_000, ytdClosings: 15, avgResponseMinutes: 14, trainingPct: 100 },
  },
  {
    id: 'u-sarah', name: 'Sarah Brockner', firstName: 'Sarah', role: 'agent',
    title: 'REALTOR®', market: 'Jacksonville, FL', initials: 'SB',
    stats: { activeClients: 14, pipelineValue: 2_410_000, ytdClosings: 9, avgResponseMinutes: 18, trainingPct: 72 },
  },
  {
    id: 'u-vito', name: 'Vito Lombardo', firstName: 'Vito', role: 'agent',
    title: 'REALTOR®', market: 'Birmingham, AL', initials: 'VL',
    stats: { activeClients: 11, pipelineValue: 1_680_000, ytdClosings: 7, avgResponseMinutes: 26, trainingPct: 45 },
  },
  {
    id: 'u-noor', name: 'Noor Bengtsson', firstName: 'Noor', role: 'agent',
    title: 'REALTOR®', market: 'St. Johns County, FL', initials: 'MO',
    stats: { activeClients: 16, pipelineValue: 3_020_000, ytdClosings: 12, avgResponseMinutes: 9, trainingPct: 88 },
  },
  {
    id: 'u-chad', name: 'Chad Vesely', firstName: 'Chad', role: 'agent',
    title: 'REALTOR®', market: 'Clay County, FL', initials: 'CV',
    stats: { activeClients: 9, pipelineValue: 1_150_000, ytdClosings: 4, avgResponseMinutes: 94, trainingPct: 20 },
  },
  {
    id: 'u-regiena', name: 'Regiena Brown', firstName: 'Regiena', role: 'agent',
    title: 'REALTOR®', market: 'Shelby County, AL', initials: 'RB',
    stats: { activeClients: 12, pipelineValue: 1_940_000, ytdClosings: 8, avgResponseMinutes: 21, trainingPct: 60 },
  },
]

export const AGENT = USERS.find(u => u.id === 'u-sarah')!
export const BROKER = USERS.find(u => u.id === 'u-taquilla')!

export const userById = (id: string) => USERS.find(u => u.id === id)

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export type Stage =
  | 'New Lead' | 'Attempting Contact' | 'Connected' | 'Appointment'
  | 'Active Buyer' | 'Active Seller' | 'Under Contract' | 'Closed' | 'Long-Term Nurture'

export type LeadSource =
  | 'Zillow' | 'Facebook' | 'Instagram' | 'YouTube' | 'Website' | 'Referral' | 'Open House' | 'Past Client'

export interface TimelineEvent {
  at: string
  kind: 'call' | 'text' | 'email' | 'note' | 'property_view' | 'property_saved' | 'email_open' | 'form' | 'appointment' | 'stage'
  direction: 'in' | 'out' | 'system'
  label: string
  detail?: string
}

export interface DemoContact {
  id: string
  firstName: string
  lastName: string
  initials: string
  stage: Stage
  source: LeadSource
  ownerId: string
  email: string
  phone: string
  location: string
  /** Synthetic search criteria. */
  budgetMin?: number
  budgetMax?: number
  intent?: string
  receivedAt: string
  firstTouchAt: string | null
  lastTouchAt: string | null
  lastInboundAt: string | null
  lastOutboundAt: string | null
  timeline: TimelineEvent[]
  /** Deterministic priority — computed by rules, never by a model. */
  priority: 'high' | 'medium' | 'low' | null
  /** The "why". Shown verbatim in the UI. */
  reasons: string[]
  recommendation?: string
  tags: string[]
  closingAnniversary?: string
  /** Convenience for the "new in 24h" filter. Set at module load. */
  firstReceivedRecent?: boolean

  /**
   * When this person entered their current stage.
   *
   * In production this comes from stage_transitions, accumulated from FUB
   * webhooks — FUB itself never reports it (see the reporting data model).
   * Here it is authored, so stage aging can be demonstrated honestly.
   */
  stageEnteredAt?: string

  /** The single next thing to do. Deterministic, never model-decided. */
  nextAction?: { label: string; due?: string; urgency: 'now' | 'today' | 'this week' }

  /** Present only when the person has a live transaction. */
  deal?: {
    stage: 'Under Contract' | 'Pending' | 'Closed'
    value: number
    closingDate: string
    /** What the transaction is waiting on right now. */
    milestone: string
    milestoneDue?: string
  }
}

/** Per-stage aging thresholds, in days. PLACEHOLDERS — RCRE has not set these. */
export const STAGE_THRESHOLD_DAYS: Partial<Record<Stage, number>> = {
  'New Lead': 2,
  'Attempting Contact': 7,
  'Connected': 14,
  'Appointment': 10,
  'Active Buyer': 45,
  'Active Seller': 45,
  'Under Contract': 60,
  'Long-Term Nurture': 120,
}

/** Days a contact has sat in its current stage. Null when unknown. */
export function daysInStage(c: DemoContact): number | null {
  if (!c.stageEnteredAt) return null
  return Math.floor((DEMO_NOW.getTime() - new Date(c.stageEnteredAt).getTime()) / 86_400_000)
}

/** True when the contact has exceeded the placeholder threshold for its stage. */
export function isStageStale(c: DemoContact): boolean {
  const days = daysInStage(c)
  const limit = STAGE_THRESHOLD_DAYS[c.stage]
  return days !== null && limit !== undefined && days > limit
}

export const CONTACTS: DemoContact[] = [
  // ── STORY 1: hot buyer resurfacing ────────────────────────────────────────
  {
    id: 'c-dana', firstName: 'Dana', lastName: 'Whitfield', initials: 'DW',
    stage: 'Active Buyer', source: 'Zillow', ownerId: 'u-sarah',
    email: 'dana.whitfield@example.invalid', phone: '(904) 555-0142',
    location: 'Mandarin, Jacksonville', budgetMin: 450_000, budgetMax: 500_000,
    intent: 'Relocating from Atlanta, wants to be under contract before school year',
    receivedAt: d(41), firstTouchAt: d(40), lastTouchAt: h(19),
    lastInboundAt: h(19), lastOutboundAt: d(9),
    priority: 'high',
    reasons: [
      'Viewed three properties in Mandarin this week',
      'Saved 4321 Windward Court',
      'Opened your last two emails',
      'No outbound contact in 9 days',
      'Activity sits inside her stated $450–500K range',
    ],
    recommendation: 'Reach out today while engagement is high.',
    tags: ['Buyer', 'Relocation', 'Mandarin'],
    timeline: [
      { at: h(19), kind: 'property_view', direction: 'in', label: 'Viewed 4321 Windward Court', detail: '$479,000 · Mandarin' },
      { at: h(26), kind: 'property_saved', direction: 'in', label: 'Saved 4321 Windward Court' },
      { at: d(2), kind: 'property_view', direction: 'in', label: 'Viewed 1180 Reed Island Drive', detail: '$465,000 · Mandarin' },
      { at: d(3), kind: 'email_open', direction: 'in', label: 'Opened "New in Mandarin this week"' },
      { at: d(4), kind: 'property_view', direction: 'in', label: 'Viewed 8802 Losco Road', detail: '$492,500 · Mandarin' },
      { at: d(6), kind: 'email_open', direction: 'in', label: 'Opened "Three homes you might like"' },
      { at: d(9), kind: 'call', direction: 'out', label: 'Call — left voicemail', detail: '1 min 12 s' },
      { at: d(16), kind: 'text', direction: 'out', label: 'Text sent' },
      { at: d(24), kind: 'appointment', direction: 'out', label: 'Showing — 3 properties in Mandarin' },
      { at: d(40), kind: 'call', direction: 'out', label: 'Call — connected', detail: '14 min' },
      { at: d(41), kind: 'form', direction: 'in', label: 'Zillow inquiry', detail: '4321 Windward Court' },
    ],
  },

  // ── STORY 2: lead nobody contacted ────────────────────────────────────────
  {
    id: 'c-marcus', firstName: 'Marcus', lastName: 'Ordonez', initials: 'MO',
    stage: 'New Lead', source: 'Facebook', ownerId: 'u-sarah',
    email: 'm.ordonez@example.invalid', phone: '(904) 555-0188',
    location: 'Riverside, Jacksonville', budgetMin: 300_000, budgetMax: 360_000,
    intent: 'First-time buyer, pre-approval in progress',
    receivedAt: h(9), firstTouchAt: null, lastTouchAt: null,
    lastInboundAt: h(9), lastOutboundAt: null,
    priority: 'high',
    reasons: [
      'Lead arrived 9 hours ago with no outbound contact',
      'Past the 1 hour brokerage response standard',
      'Source: Facebook lead campaign — Jacksonville First-Time Buyers',
    ],
    recommendation: 'Call now. Response time is the strongest predictor of conversion.',
    tags: ['Buyer', 'First-time', 'Unanswered'],
    timeline: [
      { at: h(9), kind: 'form', direction: 'in', label: 'Facebook lead form submitted', detail: 'Campaign: Jacksonville First-Time Buyers' },
    ],
  },

  // ── STORY 3: new lead, answered fast ──────────────────────────────────────
  {
    id: 'c-priya', firstName: 'Priya', lastName: 'Raghunathan', initials: 'PR',
    stage: 'Connected', source: 'YouTube', ownerId: 'u-sarah',
    email: 'priya.r@example.invalid', phone: '(904) 555-0119',
    location: 'St. Johns County', budgetMin: 520_000, budgetMax: 640_000,
    intent: 'Military relocation — NAS Jacksonville, PCS in October',
    receivedAt: h(12), firstTouchAt: h(11), lastTouchAt: h(11),
    lastInboundAt: h(12), lastOutboundAt: h(11),
    priority: 'medium',
    reasons: [
      'New lead answered in 47 minutes',
      'Buyer consultation booked for today at 4:00pm',
      'Source: YouTube — St. Johns Relocation Guide',
    ],
    recommendation: 'Consultation today — prep brief is ready.',
    tags: ['Buyer', 'Military', 'Relocation'],
    timeline: [
      { at: h(11), kind: 'appointment', direction: 'out', label: 'Buyer consultation booked', detail: 'Today, 4:00pm · RCRE Jacksonville office' },
      { at: h(11), kind: 'text', direction: 'out', label: 'Text — confirmed consultation' },
      { at: h(12), kind: 'form', direction: 'in', label: 'Website inquiry', detail: 'St. Johns Relocation Guide' },
    ],
  },

  // ── STORY 4: past client, closing anniversary ─────────────────────────────
  {
    id: 'c-kowalczyk', firstName: 'Ellis', lastName: 'Kowalczyk', initials: 'EK',
    stage: 'Long-Term Nurture', source: 'Past Client', ownerId: 'u-sarah',
    email: 'ellis.k@example.invalid', phone: '(205) 555-0164',
    location: 'Vestavia Hills, Birmingham',
    intent: 'Bought in 2023. Equity position now strong.',
    receivedAt: d(1120), firstTouchAt: d(1118), lastTouchAt: d(96),
    lastInboundAt: d(140), lastOutboundAt: d(96),
    priority: 'medium',
    reasons: [
      'Three-year closing anniversary in 6 days',
      'Estimated equity gain since purchase: $84,000 (synthetic)',
      'No contact in 96 days',
    ],
    recommendation: 'Anniversary note plus a current equity snapshot.',
    tags: ['Past Client', 'Anniversary'],
    closingAnniversary: ahead(6 * 24),
    timeline: [
      { at: d(96), kind: 'email', direction: 'out', label: 'Email — Birmingham market update' },
      { at: d(140), kind: 'email_open', direction: 'in', label: 'Opened "Vestavia Hills year in review"' },
      { at: d(1118), kind: 'stage', direction: 'system', label: 'Closed — 2612 Shades Crest Road', detail: '$412,000' },
    ],
  },

  // ── STORY 5: seller prospect engaging with content ────────────────────────
  {
    id: 'c-beth', firstName: 'Beth', lastName: 'Ferraro', initials: 'BF',
    stage: 'Attempting Contact', source: 'Website', ownerId: 'u-sarah',
    email: 'b.ferraro@example.invalid', phone: '(904) 555-0177',
    location: 'Ortega, Jacksonville',
    intent: 'Ran a home valuation twice. Likely considering a sale.',
    receivedAt: d(11), firstTouchAt: d(10), lastTouchAt: h(30),
    lastInboundAt: h(30), lastOutboundAt: d(6),
    priority: 'high',
    reasons: [
      'Requested a home valuation twice in 11 days',
      'Read "Timing your Duval County home sale" end to end',
      'Opened the last three market emails',
      'No outbound contact in 6 days',
    ],
    recommendation: 'Seller conversation — she is researching, not browsing.',
    tags: ['Seller', 'Valuation'],
    timeline: [
      { at: h(30), kind: 'form', direction: 'in', label: 'Home valuation requested (2nd time)', detail: '4407 Ortega Boulevard' },
      { at: d(3), kind: 'email_open', direction: 'in', label: 'Read "Timing your Duval County home sale"' },
      { at: d(6), kind: 'email', direction: 'out', label: 'Email — Ortega market snapshot' },
      { at: d(10), kind: 'call', direction: 'out', label: 'Call — no answer' },
      { at: d(11), kind: 'form', direction: 'in', label: 'Home valuation requested', detail: '4407 Ortega Boulevard' },
    ],
  },

  // ── Supporting cast ───────────────────────────────────────────────────────
  {
    id: 'c-tobias', firstName: 'Tobias', lastName: 'Fenwick', initials: 'TF',
    stage: 'New Lead', source: 'Zillow', ownerId: 'u-chad',
    email: 't.fenwick@example.invalid', phone: '(904) 555-0121',
    location: 'Orange Park', budgetMin: 280_000, budgetMax: 330_000,
    receivedAt: h(31), firstTouchAt: null, lastTouchAt: null,
    lastInboundAt: h(31), lastOutboundAt: null,
    priority: 'high',
    reasons: ['No outbound contact in 31 hours', 'Assigned to Chad Vesely'],
    recommendation: 'Escalate — well past the response standard.',
    tags: ['Buyer', 'Unanswered'],
    timeline: [{ at: h(31), kind: 'form', direction: 'in', label: 'Zillow inquiry' }],
  },
  {
    id: 'c-althea', firstName: 'Althea', lastName: 'Njoku', initials: 'AN',
    stage: 'Under Contract', source: 'Referral', ownerId: 'u-sarah',
    email: 'a.njoku@example.invalid', phone: '(904) 555-0155',
    location: 'Nocatee, St. Johns', budgetMin: 600_000, budgetMax: 700_000,
    intent: 'Under contract — inspection period ends Friday',
    receivedAt: d(74), firstTouchAt: h(74 * 24 - 1), lastTouchAt: h(20),
    lastInboundAt: h(20), lastOutboundAt: h(44),
    priority: 'high',
    reasons: ['Inspection contingency expires in 2 days', 'Repair request not yet submitted'],
    recommendation: 'Confirm repair request before the deadline.',
    tags: ['Buyer', 'Under Contract'],
    timeline: [
      { at: h(20), kind: 'text', direction: 'in', label: 'Text — "any word from the inspector?"' },
      { at: h(44), kind: 'email', direction: 'out', label: 'Email — inspection report forwarded' },
      { at: d(9), kind: 'stage', direction: 'system', label: 'Moved to Under Contract', detail: '$648,000 · 112 Tidewater Lane' },
    ],
  },
  {
    id: 'c-rowan', firstName: 'Rowan', lastName: 'Pike', initials: 'RP',
    stage: 'Appointment', source: 'Instagram', ownerId: 'u-sarah',
    email: 'rowan.pike@example.invalid', phone: '(904) 555-0133',
    location: 'Avondale, Jacksonville', budgetMin: 380_000, budgetMax: 440_000,
    receivedAt: d(6), firstTouchAt: h(6 * 24 - 1), lastTouchAt: d(1),
    lastInboundAt: d(1), lastOutboundAt: d(2),
    priority: 'medium',
    reasons: ['Showing scheduled Saturday', 'Three Avondale saves this week'],
    recommendation: 'Confirm Saturday and send the comps.',
    tags: ['Buyer', 'Avondale'],
    timeline: [
      { at: d(1), kind: 'property_saved', direction: 'in', label: 'Saved 2841 Herschel Street' },
      { at: d(2), kind: 'text', direction: 'out', label: 'Text — Saturday showing times' },
      { at: d(6), kind: 'form', direction: 'in', label: 'Instagram DM inquiry' },
    ],
  },
  {
    id: 'c-devrim', firstName: 'Devrim', lastName: 'Aksoy', initials: 'DA',
    stage: 'Active Seller', source: 'Referral', ownerId: 'u-sarah',
    email: 'd.aksoy@example.invalid', phone: '(904) 555-0190',
    location: 'Ortega, Jacksonville',
    intent: 'Listing goes live Thursday',
    receivedAt: d(21), firstTouchAt: h(21 * 24 - 2), lastTouchAt: d(2),
    lastInboundAt: d(4), lastOutboundAt: d(2),
    priority: 'medium',
    reasons: ['Listing live Thursday — marketing not yet built', 'Photos delivered yesterday'],
    recommendation: 'Build the listing campaign.',
    tags: ['Seller', 'Ortega'],
    timeline: [
      { at: d(2), kind: 'note', direction: 'system', label: 'Photography delivered' },
      { at: d(4), kind: 'call', direction: 'in', label: 'Call — pricing questions', detail: '22 min' },
      { at: d(21), kind: 'note', direction: 'system', label: 'Listing agreement signed' },
    ],
  },
  {
    id: 'c-lorna', firstName: 'Lorna', lastName: 'Baptiste', initials: 'LB',
    stage: 'Long-Term Nurture', source: 'Open House', ownerId: 'u-sarah',
    email: 'l.baptiste@example.invalid', phone: '(904) 555-0102',
    location: 'Riverside, Jacksonville', budgetMin: 340_000, budgetMax: 400_000,
    receivedAt: d(58), firstTouchAt: h(58 * 24 - 4), lastTouchAt: d(34),
    lastInboundAt: d(50), lastOutboundAt: d(34),
    priority: 'low',
    reasons: ['No contact in 34 days', 'Met at the Herschel Street open house'],
    tags: ['Buyer', 'Open House'],
    timeline: [
      { at: d(34), kind: 'email', direction: 'out', label: 'Email — Riverside listings' },
      { at: d(58), kind: 'form', direction: 'in', label: 'Open house registration' },
    ],
  },
  {
    id: 'c-hollis', firstName: 'Hollis', lastName: 'Trent', initials: 'HT',
    stage: 'Closed', source: 'Referral', ownerId: 'u-sarah',
    email: 'h.trent@example.invalid', phone: '(904) 555-0166',
    location: 'Julington Creek',
    receivedAt: d(230), firstTouchAt: d(229), lastTouchAt: d(52),
    lastInboundAt: d(52), lastOutboundAt: d(60),
    priority: null, reasons: [], tags: ['Past Client'],
    timeline: [{ at: d(120), kind: 'stage', direction: 'system', label: 'Closed — 1455 Bishop Estates Road', detail: '$538,000' }],
  },
  {
    id: 'c-imani', firstName: 'Imani', lastName: 'Castellanos', initials: 'IC',
    stage: 'Connected', source: 'Website', ownerId: 'u-sarah',
    email: 'i.castellanos@example.invalid', phone: '(904) 555-0147',
    location: 'Springfield, Jacksonville', budgetMin: 250_000, budgetMax: 300_000,
    receivedAt: d(4), firstTouchAt: h(4 * 24 - 1), lastTouchAt: d(3),
    lastInboundAt: d(3), lastOutboundAt: d(4),
    priority: 'low', reasons: ['Early conversation — no action needed today'],
    tags: ['Buyer'],
    timeline: [{ at: d(4), kind: 'form', direction: 'in', label: 'Website inquiry' }],
  },
  {
    id: 'c-garrick', firstName: 'Garrick', lastName: 'Mbeki', initials: 'GM',
    stage: 'Attempting Contact', source: 'YouTube', ownerId: 'u-sarah',
    email: 'g.mbeki@example.invalid', phone: '(904) 555-0158',
    location: 'Fleming Island', budgetMin: 420_000, budgetMax: 480_000,
    receivedAt: d(5), firstTouchAt: h(5 * 24 - 3), lastTouchAt: d(5),
    lastInboundAt: d(5), lastOutboundAt: d(5),
    priority: 'low', reasons: ['Two attempts, no connection yet'],
    tags: ['Buyer'],
    timeline: [{ at: d(5), kind: 'call', direction: 'out', label: 'Call — no answer' }],
  },
  {
    id: 'c-sunniva', firstName: 'Sunniva', lastName: 'Halvorsen', initials: 'SH',
    stage: 'Active Buyer', source: 'Zillow', ownerId: 'u-sarah',
    email: 's.halvorsen@example.invalid', phone: '(904) 555-0173',
    location: 'Ponte Vedra', budgetMin: 750_000, budgetMax: 900_000,
    receivedAt: d(33), firstTouchAt: h(33 * 24 - 2), lastTouchAt: d(4),
    lastInboundAt: d(4), lastOutboundAt: d(5),
    priority: 'medium', reasons: ['Two Ponte Vedra views this week', 'Highest budget in the pipeline'],
    tags: ['Buyer', 'Luxury'],
    timeline: [{ at: d(4), kind: 'property_view', direction: 'in', label: 'Viewed 305 Ocean Trace Way' }],
  },
  {
    id: 'c-emeka', firstName: 'Emeka', lastName: 'Adeyemi', initials: 'EA',
    stage: 'Appointment', source: 'Referral', ownerId: 'u-sarah',
    email: 'e.adeyemi@example.invalid', phone: '(904) 555-0111',
    location: 'Bartram Park', budgetMin: 400_000, budgetMax: 460_000,
    receivedAt: d(13), firstTouchAt: h(13 * 24 - 1), lastTouchAt: d(1),
    lastInboundAt: d(1), lastOutboundAt: d(1),
    priority: 'low', reasons: ['Listing presentation Monday'],
    tags: ['Seller'],
    timeline: [{ at: d(1), kind: 'appointment', direction: 'out', label: 'Listing presentation — Monday 10:00am' }],
  },
  {
    id: 'c-yusra', firstName: 'Yusra', lastName: 'Benali', initials: 'YB',
    stage: 'New Lead', source: 'Instagram', ownerId: 'u-sarah',
    email: 'y.benali@example.invalid', phone: '(904) 555-0128',
    location: 'Murray Hill', budgetMin: 290_000, budgetMax: 340_000,
    receivedAt: h(4), firstTouchAt: h(3), lastTouchAt: h(3),
    lastInboundAt: h(4), lastOutboundAt: h(3),
    priority: 'low', reasons: ['New lead, answered in 38 minutes'],
    tags: ['Buyer'],
    timeline: [{ at: h(4), kind: 'form', direction: 'in', label: 'Instagram lead form' }],
  },
  {
    id: 'c-porter', firstName: 'Porter', lastName: 'Quinlan', initials: 'PQ',
    stage: 'Long-Term Nurture', source: 'Open House', ownerId: 'u-sarah',
    email: 'p.quinlan@example.invalid', phone: '(904) 555-0139',
    location: 'Arlington', receivedAt: d(180), firstTouchAt: d(179), lastTouchAt: d(61),
    lastInboundAt: d(90), lastOutboundAt: d(61),
    priority: 'low', reasons: ['No contact in 61 days'],
    tags: ['Buyer'],
    timeline: [{ at: d(61), kind: 'email', direction: 'out', label: 'Email — quarterly check-in' }],
  },
]

// Mark recent arrivals once, so filters do not recompute a cutoff per render.
{
  const cutoff = h(24)
  for (const c of CONTACTS) c.firstReceivedRecent = c.receivedAt >= cutoff
}

export const contactById = (id: string) => CONTACTS.find(c => c.id === id)
export const contactsFor = (userId: string) => CONTACTS.filter(c => c.ownerId === userId)
export const fullName = (c: DemoContact) => `${c.firstName} ${c.lastName}`

// ---------------------------------------------------------------------------
// Tasks and appointments
// ---------------------------------------------------------------------------

export interface DemoTask {
  id: string; title: string; contactId: string | null; ownerId: string
  dueAt: string; done: boolean
}

export const TASKS: DemoTask[] = [
  { id: 't-1', title: 'Send Dana the Mandarin comparables', contactId: 'c-dana', ownerId: 'u-sarah', dueAt: d(2), done: false },
  { id: 't-2', title: 'Submit Njoku repair request', contactId: 'c-althea', ownerId: 'u-sarah', dueAt: ahead(6), done: false },
  { id: 't-3', title: 'Confirm Priya consultation', contactId: 'c-priya', ownerId: 'u-sarah', dueAt: ahead(2), done: false },
  { id: 't-4', title: 'Build 4407 Ortega Boulevard listing marketing', contactId: 'c-devrim', ownerId: 'u-sarah', dueAt: ahead(30), done: false },
  { id: 't-5', title: 'Follow up — Fenwick inquiry', contactId: 'c-tobias', ownerId: 'u-chad', dueAt: d(1), done: false },
  { id: 't-6', title: 'Call back — Orange Park buyer', contactId: null, ownerId: 'u-chad', dueAt: d(3), done: false },
]

export interface DemoAppointment {
  id: string; title: string; contactId: string | null; ownerId: string
  startsAt: string; location: string
}

export const APPOINTMENTS: DemoAppointment[] = [
  { id: 'a-1', title: 'Buyer consultation — Priya Raghunathan', contactId: 'c-priya', ownerId: 'u-sarah', startsAt: atHour(16, 0), location: 'RCRE Jacksonville office' },
  { id: 'a-2', title: 'Showing — 2841 Herschel Street', contactId: 'c-rowan', ownerId: 'u-sarah', startsAt: atHour(10, 30, 2), location: 'Avondale' },
]

// ---------------------------------------------------------------------------
// Listings — photography from RCRE's public CDN (public marketing imagery)
// ---------------------------------------------------------------------------

export interface DemoListing {
  id: string; address: string; city: string; state: string; price: number
  beds: number; baths: number; sqft: number
  status: 'Active' | 'Pending' | 'Coming Soon' | 'Sold'
  agentId: string; image: string
  leads: number; views: number; saves: number
  openHouse?: string
  marketingBuilt: boolean

  /** Listing workspace. */
  mlsNumber?: string
  listedAt?: string
  description?: string
  features?: string[]
  tasks?: { label: string; dueAt: string; done: boolean }[]
  /** Weekly engagement, oldest first. Drives the trend line. */
  engagementTrend?: number[]
  inquiries?: { name: string; contactId?: string; at: string; note: string }[]
}

const CDN = 'https://dlajgvw9htjpb.cloudfront.net/cms/f323ee62-121e-4828-9d99-6a87d5a410d2'

export const LISTINGS: DemoListing[] = [
  { id: 'l-1', address: '1180 Reed Island Drive', city: 'Jacksonville', state: 'FL', price: 465_000, beds: 4, baths: 3, sqft: 2_640, status: 'Active', agentId: 'u-sarah', image: `${CDN}/2140001/-7397065705979601706.jpg`, leads: 14, views: 892, saves: 31, openHouse: atHour(13, 0, 3), marketingBuilt: true },
  { id: 'l-2', address: '4407 Ortega Boulevard', city: 'Jacksonville', state: 'FL', price: 812_000, beds: 5, baths: 4, sqft: 3_910, status: 'Coming Soon', agentId: 'u-sarah', image: `${CDN}/2149693/3641587312916344571.jpg`, leads: 0, views: 0, saves: 0, marketingBuilt: false },
  { id: 'l-3', address: '2841 Herschel Street', city: 'Jacksonville', state: 'FL', price: 398_500, beds: 3, baths: 2, sqft: 1_980, status: 'Active', agentId: 'u-sarah', image: `${CDN}/2142903/-7137535826141618342.jpg`, leads: 9, views: 604, saves: 22, openHouse: atHour(13, 0, 2), marketingBuilt: true },
  { id: 'l-4', address: '112 Tidewater Lane', city: 'Ponte Vedra', state: 'FL', price: 648_000, beds: 4, baths: 3, sqft: 3_120, status: 'Pending', agentId: 'u-sarah', image: `${CDN}/2151796/3343387314812164337.jpg`, leads: 21, views: 1_403, saves: 58, marketingBuilt: true },
  { id: 'l-5', address: '5323 Poppy Drive', city: 'Jacksonville', state: 'FL', price: 342_000, beds: 3, baths: 2, sqft: 1_720, status: 'Active', agentId: 'u-noor', image: `${CDN}/2146627/-3364381895475510527.jpg`, leads: 6, views: 388, saves: 11, marketingBuilt: true },
  { id: 'l-6', address: '2137 Lane Avenue', city: 'Birmingham', state: 'AL', price: 289_000, beds: 3, baths: 2, sqft: 1_540, status: 'Active', agentId: 'u-vito', image: `${CDN}/21447159/9131614146729967442.jpg`, leads: 4, views: 241, saves: 8, marketingBuilt: false },
]

export const listingById = (id: string) => LISTINGS.find(l => l.id === id)

// ---------------------------------------------------------------------------
// Recruiting
// ---------------------------------------------------------------------------

export interface DemoRecruit {
  id: string; name: string; initials: string
  currentBrokerage: string; market: string
  stage: 'New Prospect' | 'Contacted' | 'Conversation' | 'Meeting' | 'Considering' | 'Onboarding' | 'Joined'
  ownerId: string
  engagement: 'high' | 'medium' | 'low'
  signals: string[]
  recommendation?: string
  lastTouchAt: string | null
  experience: string
  /** How they arrived — the trail the Academy and public site left behind. */
  journey?: { at: string; label: string; detail?: string }[]
  /** A drafted first message. Never sent; revealed on request. */
  outreach?: { channel: string; body: string }

  /** Deterministic recruiting priority — same discipline as lead priority. */
  priority?: 'high' | 'medium' | 'low'
  nextAction?: { label: string; urgency: 'now' | 'today' | 'this week' }
  /** Academy progress — the acquisition channel leadership wants to lean on. */
  training?: { coursesCompleted: number; coursesTotal: number; lastActivityAt: string | null }
  /** Public-site behaviour. Recruiting attribution, not client tracking. */
  websiteEngagement?: { joinPageViews: number; lastVisitAt: string | null; minutesOnSite: number }
  /** Where they are in onboarding, once they commit. */
  onboardingStep?: 'Not started' | 'Paperwork sent' | 'License transfer' | 'Systems setup' | 'Complete'

  /**
   * How this recruit first reached RCRE.
   *
   * 'ISA call' is RCRE's current outbound motion. Leadership's own assessment
   * is that it is not productive, and the demo shows why rather than asserting
   * it: the inbound channels produce recruits who are already engaged, and the
   * cold-call channel produces recruits who are not.
   */
  channel: RecruitChannel
}

export type RecruitChannel =
  | 'AI Academy' | 'Join page' | 'Facebook' | 'Instagram' | 'YouTube' | 'Referral' | 'ISA call'

export const RECRUITS: DemoRecruit[] = [
  {
    id: 'r-nia', name: 'Nia Okonkwo', initials: 'NO',
    currentBrokerage: 'Independent brokerage, Jacksonville', market: 'Duval County',
    stage: 'Considering', ownerId: 'u-julio', engagement: 'high',
    signals: [
      'Completed "ChatGPT Setup and Personalization" in the public Academy',
      'Started "Prompting for Real Estate" — 4 of 10 lessons',
      'Asked a question in the AI community and got two replies',
      'Visited the Join RCRE page twice this week',
      'Opened the last three recruiting emails',
      'No follow-up in 6 days',
    ],
    recommendation: 'Julio should contact today — engagement is at its peak.',
    lastTouchAt: d(6), experience: '7 years · 24 closings last year (synthetic)',
    channel: 'AI Academy',
    journey: [
      { at: d(34), label: 'Found the public AI Academy', detail: 'Organic search · "AI tools for realtors"' },
      { at: d(31), label: 'Enrolled in ChatGPT Setup and Personalization' },
      { at: d(19), label: 'Completed the course', detail: 'All 8 lessons · 3 weeks' },
      { at: d(12), label: 'Started Prompting for Real Estate', detail: '4 of 10 lessons so far' },
      { at: d(8),  label: 'Posted a question in the AI community', detail: '“How much client data is safe to put in ChatGPT?” · Jeremy and Taquilla replied' },
      { at: d(2),  label: 'Returned to the Academy', detail: 'Two lessons in one sitting' },
      { at: d(6),  label: 'Julio sent a first note', detail: 'Opened, no reply' },
      { at: d(3),  label: 'Read the Join RCRE page' },
      { at: d(1),  label: 'Read the Join RCRE page again', detail: 'Four minutes · reached the tools section' },
    ],
    outreach: {
      channel: 'Email · from Julio Arango',
      body: 'Nia — you finished ChatGPT Setup and Personalization, you are four lessons into Prompting for Real Estate, and you asked the privacy question in the community that half our agents were too polite to ask. So I will skip the pitch. The thing worth twenty minutes of your time is what our agents actually run day to day: the assistant reads your database and tells you who to call, and it drafts the listing marketing before you ask. Want to see it on your own numbers this week? — Julio',
    },
  },
  {
    id: 'r-desmond', name: 'Desmond Frayne', initials: 'DF',
    currentBrokerage: 'National franchise, Birmingham', market: 'Jefferson County',
    stage: 'Conversation', ownerId: 'u-taquilla', engagement: 'medium',
    signals: ['Two calls with Taquilla', 'Asked for the technology walkthrough', 'Comparing three brokerages'],
    recommendation: 'Send the platform demo link.',
    lastTouchAt: d(2), experience: '4 years · 11 closings last year (synthetic)',
    channel: 'ISA call',
  },
  {
    id: 'r-alina', name: 'Alina Vasquez', initials: 'AV',
    currentBrokerage: 'Boutique brokerage, St. Augustine', market: 'St. Johns County',
    stage: 'Meeting', ownerId: 'u-julio', engagement: 'high',
    signals: ['Office visit scheduled Thursday', 'Started "Building Your AI Twin"'],
    lastTouchAt: h(20), experience: '9 years · 31 closings last year (synthetic)',
    channel: 'Instagram',
  },
  {
    id: 'r-terrence', name: 'Terrence Boyd', initials: 'TB',
    currentBrokerage: 'Newly licensed', market: 'Clay County',
    stage: 'Contacted', ownerId: 'u-taquilla', engagement: 'low',
    signals: ['Downloaded the new-agent guide'],
    lastTouchAt: d(11), experience: 'Newly licensed',
    channel: 'ISA call',
  },
  {
    id: 'r-mireille', name: 'Mireille Duplantier', initials: 'MD',
    currentBrokerage: 'Team lead, national franchise', market: 'Duval County',
    stage: 'Onboarding', ownerId: 'u-julio', engagement: 'high',
    signals: ['Registered for next month\'s AI training', 'Leads a 4-agent team'],
    lastTouchAt: null, experience: '12 years · team of 4 (synthetic)',
    channel: 'Referral',
  },
]

export const recruitById = (id: string) => RECRUITS.find(r => r.id === id)

// ---------------------------------------------------------------------------
// Training — the AI Academy
// ---------------------------------------------------------------------------

export interface DemoCourse {
  id: string; title: string; blurb: string; lessons: number
  minutes: number; progress: number; level: 'Foundation' | 'Practitioner' | 'Advanced'
  outcomes: string[]
}

export const COURSES: DemoCourse[] = [
  { id: 'co-101', title: 'AI for Real Estate 101', blurb: 'What AI actually does for a working agent, and what it does not.', lessons: 8, minutes: 95, progress: 100, level: 'Foundation', outcomes: ['Tell useful AI apart from hype', 'Set up your assistant', 'Run your first week'] },
  { id: 'co-chatgpt', title: 'ChatGPT for Realtors', blurb: 'Practical prompting for listings, follow-up, and client questions.', lessons: 10, minutes: 120, progress: 100, level: 'Foundation', outcomes: ['Write listing copy that passes review', 'Build a reusable prompt library'] },
  { id: 'co-followup', title: 'AI Lead Follow-Up', blurb: 'Turn a database you have neglected into conversations this week.', lessons: 7, minutes: 80, progress: 60, level: 'Practitioner', outcomes: ['Prioritise by real behaviour', 'Draft in your own voice', 'Batch approve safely'] },
  { id: 'co-listing', title: 'AI Listing Marketing', blurb: 'From signed agreement to a full campaign in under an hour.', lessons: 9, minutes: 110, progress: 25, level: 'Practitioner', outcomes: ['Build a full campaign', 'Pass fair housing review first time'] },
  { id: 'co-social', title: 'AI Social Media', blurb: 'A month of content from one listing, without sounding like a robot.', lessons: 6, minutes: 70, progress: 0, level: 'Practitioner', outcomes: ['Plan a month in an hour', 'Keep your own voice'] },
  { id: 'co-twin', title: 'Building Your AI Twin', blurb: 'Teach the assistant your voice, your market, and your standards.', lessons: 8, minutes: 100, progress: 0, level: 'Advanced', outcomes: ['Capture your voice', 'Codify your process'] },
  { id: 'co-agents', title: 'Advanced AI Agents', blurb: 'Delegating real work safely — and knowing where to stop.', lessons: 11, minutes: 150, progress: 0, level: 'Advanced', outcomes: ['Design an approval workflow', 'Know what never to automate'] },
]

// ---------------------------------------------------------------------------
// Derived brokerage metrics — deterministic, computed from the data above
// ---------------------------------------------------------------------------

export function brokerageMetrics() {
  const dayAgo = h(24)
  const newLeads = CONTACTS.filter(c => c.receivedAt >= dayAgo).length
  const unanswered = CONTACTS.filter(c => !c.firstTouchAt).length

  const responses = CONTACTS
    .filter(c => c.firstTouchAt)
    .map(c => Math.round((new Date(c.firstTouchAt!).getTime() - new Date(c.receivedAt).getTime()) / 60_000))
    .filter(m => m >= 0)
    .sort((a, b) => a - b)
  const median = responses.length
    ? responses.length % 2 === 0
      ? Math.round((responses[responses.length / 2 - 1] + responses[responses.length / 2]) / 2)
      : responses[(responses.length - 1) / 2]
    : null

  const overdueByAgent = new Map<string, number>()
  for (const t of TASKS) {
    if (t.done || new Date(t.dueAt) >= DEMO_NOW) continue
    overdueByAgent.set(t.ownerId, (overdueByAgent.get(t.ownerId) ?? 0) + 1)
  }

  const bySource = new Map<string, number>()
  for (const c of CONTACTS) bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1)

  return {
    newLeads,
    unanswered,
    medianResponseMinutes: median,
    overdueAgents: [...overdueByAgent.entries()]
      .map(([id, count]) => ({ user: userById(id)!, count }))
      .sort((a, b) => b.count - a.count),
    activeDeals: CONTACTS.filter(c => c.stage === 'Under Contract').length,
    sources: [...bySource.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    engagedRecruits: RECRUITS.filter(r => r.engagement === 'high').length,
  }
}

/**
 * Stage entry, next action, and deal context.
 *
 * Authored rather than derived, because the point of the demo is to show a
 * specific brokerage situation: two contacts genuinely stale in stage, one
 * transaction with a contingency running out, and a clear single next action on
 * everyone who needs one.
 *
 * In production every one of these comes from a deterministic rule over
 * stage_transitions and activity — never from a model.
 */
const STAGE_ENTERED: Record<string, number> = {
  'c-dana': 12, 'c-marcus': 0, 'c-beth': 11, 'c-priya': 1,
  'c-althea': 21, 'c-kowalczyk': 240, 'c-rowan': 4, 'c-tobias': 1,
  'c-devrim': 9, 'c-imani': 34, 'c-hollis': 61, 'c-yusra': 3,
}

const NEXT_ACTION: Record<string, { label: string; urgency: 'now' | 'today' | 'this week' }> = {
  'c-dana':   { label: 'Text her about Windward Court', urgency: 'now' },
  'c-marcus': { label: 'Call — first contact, 9 hours overdue', urgency: 'now' },
  'c-beth':   { label: 'Send the Riverside seller net sheet', urgency: 'today' },
  'c-priya':  { label: 'Prep the 4:00pm consultation brief', urgency: 'today' },
  'c-althea': { label: 'Submit the repair request — contingency ends Friday', urgency: 'now' },
  'c-kowalczyk': { label: 'Anniversary note and equity update', urgency: 'this week' },
  'c-rowan':  { label: 'Confirm Thursday showing', urgency: 'this week' },
  'c-devrim': { label: 'Build the Ortega Boulevard listing campaign', urgency: 'today' },
  'c-imani':  { label: 'No touch in 34 days — re-engage', urgency: 'this week' },
  'c-hollis': { label: 'Long-term nurture check-in', urgency: 'this week' },
}

for (const c of CONTACTS) {
  const days = STAGE_ENTERED[c.id]
  if (days !== undefined) {
    c.stageEnteredAt = new Date(DEMO_NOW.getTime() - days * 86_400_000).toISOString()
  }
  const action = NEXT_ACTION[c.id]
  if (action) c.nextAction = action
}

// The one live transaction. Its contingency is the pipeline's urgent item.
{
  const althea = CONTACTS.find(c => c.id === 'c-althea')
  if (althea) {
    althea.deal = {
      stage: 'Under Contract',
      value: 648_000,
      closingDate: new Date(DEMO_NOW.getTime() + 26 * 86_400_000).toISOString(),
      milestone: 'Inspection contingency — repair request not yet submitted',
      milestoneDue: new Date(DEMO_NOW.getTime() + 2 * 86_400_000).toISOString(),
    }
  }
}

/**
 * Listing workspace and recruiting depth.
 *
 * Applied at module load so the arrays above stay readable. Every figure is
 * synthetic; the shapes match what the production integration would derive
 * from FUB events plus RCRE-owned marketing state.
 */
const LISTING_DETAIL: Record<string, Partial<DemoListing>> = {
  'l-1': {
    mlsNumber: 'NEFMLS 2140001', listedAt: d(38),
    description: 'Riverfront on a quiet cul-de-sac, renovated kitchen, dock with lift. The kind of house that sells itself once people stand on the back deck.',
    features: ['Dock with 10,000 lb lift', 'Renovated 2023', 'Impact windows', 'Two-car garage'],
    engagementTrend: [64, 88, 141, 173, 206, 220],
    tasks: [
      { label: 'Refresh photos — leaves are down since the shoot', dueAt: d(3), done: false },
      { label: 'Price review at 45 days', dueAt: d(7), done: false },
      { label: 'Schedule the next open house', dueAt: d(2), done: true },
    ],
    inquiries: [
      { name: 'Dana Whitfield', contactId: 'c-dana', at: d(2), note: 'Asked about the dock and flood insurance' },
      { name: 'Web inquiry — unmatched', at: d(5), note: 'Wanted a virtual walkthrough' },
    ],
  },
  'l-2': {
    mlsNumber: 'Pending assignment', listedAt: d(1),
    description: 'Ortega Boulevard, five bedrooms, deep lot. Photography landed yesterday; goes live Thursday.',
    features: ['1926 original detail', 'Guest house', 'Corner lot', 'Walk to Ortega Village'],
    engagementTrend: [0, 0, 0, 0, 0, 0],
    tasks: [
      { label: 'Build the marketing campaign', dueAt: d(1), done: false },
      { label: 'Confirm sign installation', dueAt: d(-1), done: false },
      { label: 'Write the single-property page', dueAt: d(-1), done: false },
    ],
  },
  'l-3': {
    mlsNumber: 'NEFMLS 2142903', listedAt: d(21),
    description: 'Avondale bungalow, walkable to the shops, original heart pine floors.',
    features: ['Heart pine floors', 'Detached studio', 'Fenced yard'],
    engagementTrend: [41, 77, 112, 138, 160, 176],
    tasks: [{ label: 'Follow up with Saturday open house visitors', dueAt: d(-1), done: false }],
    inquiries: [{ name: 'Rowan Beaulieu', contactId: 'c-rowan', at: d(3), note: 'Showing booked for Thursday' }],
  },
  'l-4': {
    mlsNumber: 'NEFMLS 2151796', listedAt: d(64),
    description: 'Ponte Vedra, under contract at $648,000. Inspection contingency is the live item.',
    features: ['Preserve lot', 'Summer kitchen', 'Three-car garage'],
    engagementTrend: [188, 302, 401, 402, 402, 403],
    tasks: [
      { label: 'Submit repair request — contingency expires Friday', dueAt: d(1), done: false },
      { label: 'Confirm appraisal appointment', dueAt: d(-3), done: false },
    ],
  },
}

for (const l of LISTINGS) {
  const extra = LISTING_DETAIL[l.id]
  if (extra) Object.assign(l, extra)
}

const RECRUIT_DETAIL: Record<string, Partial<DemoRecruit>> = {
  'r-nia': {
    priority: 'high',
    nextAction: { label: 'Julio should call today — engagement is at its peak', urgency: 'now' },
    training: { coursesCompleted: 1, coursesTotal: 14, lastActivityAt: d(12) },
    websiteEngagement: { joinPageViews: 2, lastVisitAt: d(1), minutesOnSite: 11 },
    onboardingStep: 'Not started',
  },
  'r-desmond': {
    priority: 'medium',
    nextAction: { label: 'Second attempt — first call went to voicemail', urgency: 'this week' },
    training: { coursesCompleted: 0, coursesTotal: 14, lastActivityAt: null },
    websiteEngagement: { joinPageViews: 0, lastVisitAt: null, minutesOnSite: 0 },
    onboardingStep: 'Not started',
  },
  'r-alina': {
    priority: 'high',
    nextAction: { label: 'She asked how agents work both coasts — send the multi-market brief', urgency: 'today' },
    training: { coursesCompleted: 1, coursesTotal: 14, lastActivityAt: d(5) },
    websiteEngagement: { joinPageViews: 3, lastVisitAt: d(2), minutesOnSite: 17 },
    onboardingStep: 'Not started',
  },
  'r-terrence': {
    priority: 'low',
    nextAction: { label: 'No engagement since the ISA call — move to nurture', urgency: 'this week' },
    training: { coursesCompleted: 0, coursesTotal: 14, lastActivityAt: null },
    websiteEngagement: { joinPageViews: 0, lastVisitAt: null, minutesOnSite: 0 },
    onboardingStep: 'Not started',
  },
  'r-mireille': {
    priority: 'high',
    nextAction: { label: 'Paperwork is out — chase the license transfer', urgency: 'today' },
    training: { coursesCompleted: 2, coursesTotal: 14, lastActivityAt: d(3) },
    websiteEngagement: { joinPageViews: 5, lastVisitAt: d(4), minutesOnSite: 24 },
    onboardingStep: 'License transfer',
  },
}

for (const r of RECRUITS) {
  const extra = RECRUIT_DETAIL[r.id]
  if (extra) Object.assign(r, extra)
}

export const PIPELINE_STAGES: Stage[] = [
  'New Lead', 'Attempting Contact', 'Connected', 'Appointment',
  'Active Buyer', 'Active Seller', 'Under Contract', 'Long-Term Nurture',
]
