/**
 * RCRE's recruiting proposition — the six pillars.
 *
 * WHY THIS FILE EXISTS AT ALL.
 * Taquilla Allen, RCRE's managing broker, was asked in writing why an agent
 * should choose RCRE. She named six things and none of them was AI:
 *
 *   systems and structure · hands-on coaching and mentorship ·
 *   multi-market opportunities · business development and growth ·
 *   accountability and performance coaching · agent training and education
 *
 * The earlier public pages led with the technology, which misrepresents the
 * brokerage. AI is a differentiator INSIDE this story, not the headline. The
 * copy therefore lives in one place so the landing page and the recruiting
 * page can never drift into telling two different stories.
 *
 * EVERY CLAIM BELOW is traceable to the leadership answers document or to
 * publicly verifiable fact (two states, the brokerage name, the broker roles).
 * There are deliberately no commission splits, fees, caps, testimonials,
 * production numbers or agent counts, because RCRE has supplied none.
 */

export interface Pillar {
  /** Editorial grouping. Six equal cards read like filler; three themes read
   *  like a brokerage that knows what it offers. */
  group: 'The structure' | 'The people' | 'The room to grow'
  /** Leadership's own words for the pillar. Do not paraphrase these. */
  name: string
  headline: string
  body: string
  /** How the pillar shows up in an agent's actual week — used on /join, where
   *  the reader is deciding, not browsing. */
  week: string
}

export const PILLARS: Pillar[] = [
  {
    group: 'The structure',
    name: 'Systems and structure',
    headline: 'A defined way of working, not a login and good luck',
    body:
      'Leads arrive on known paths — straight to the agent, or through a broker, or through the Alabama team lead — and they land in the CRM the whole brokerage runs on. Same records, same stages, same expectations, in both states.',
    week: 'You always know where a lead came from, who owns it, and what stage it is in.',
  },
  {
    group: 'The structure',
    name: 'Accountability and performance coaching',
    headline: 'Someone notices, and that is the point',
    body:
      'Whether follow-up actually happened is tracked rather than assumed. A lead nobody contacted, or one sitting too long in a stage, surfaces to you and to your broker while it is still a coaching conversation instead of a lost deal.',
    week: 'Nothing quietly rots in your database for three weeks without anyone saying so.',
  },
  {
    group: 'The people',
    name: 'Hands-on coaching and mentorship',
    headline: 'Brokers who are still in the work',
    body:
      'Julio Arango and Taquilla Allen answer live leads themselves and hand them to agents. Coaching here comes from people doing the same job in the same week — not from a quarterly meeting and a slide deck.',
    week: 'You can ask the person who assigned you the lead how they would work it.',
  },
  {
    group: 'The people',
    name: 'Agent training and education',
    headline: 'Education that ends in something you can run',
    body:
      'The RCRE AI Academy teaches lead follow-up, listing marketing and practical AI in short courses built around a working agent’s week. The opening courses are open to agents outside RCRE, not only ours.',
    week: 'Short courses you can finish between showings, with an outcome you use the same week.',
  },
  {
    group: 'The room to grow',
    name: 'Multi-market opportunities',
    headline: 'Two states, one brokerage',
    body:
      'RCRE operates in Alabama and Florida — Birmingham and Jacksonville, with a team-lead layer in Alabama that Florida does not have. Relocation, referral and expansion business can stay inside the brokerage instead of leaving it.',
    week: 'A client moving between markets is still your client.',
  },
  {
    group: 'The room to grow',
    name: 'Business development and growth',
    headline: 'A plan for where the next deal comes from',
    body:
      'Database, past clients, listings, social and referrals treated as a business to develop. RCRE is building the agent marketing system it has not had, rather than telling agents to solve it privately.',
    week: 'Your growth is an agenda item with your broker, not a private problem.',
  },
]

const GROUPS = ['The structure', 'The people', 'The room to grow'] as const

/**
 * The landing-page arrangement: three named themes, two pillars each.
 * A rule-separated editorial list, not a grid of cards.
 */
export function PublicPillars() {
  return (
    <div>
      {GROUPS.map((group, gi) => {
        const items = PILLARS.filter(p => p.group === group)
        return (
          <div
            key={group}
            className={`grid gap-8 py-12 lg:grid-cols-12 lg:gap-12 lg:py-16 ${
              gi > 0 ? 'border-t border-hair' : ''
            }`}
          >
            <div className="lg:col-span-3">
              <p className="eyebrow">{group}</p>
            </div>

            <div className="space-y-10 lg:col-span-9 lg:space-y-12">
              {items.map(p => (
                <div key={p.name}>
                  <p className="text-micro uppercase tracking-[0.16em] text-chalk-faint">{p.name}</p>
                  <h3 className="mt-2 max-w-2xl font-display text-h3 font-600 text-chalk">
                    {p.headline}
                  </h3>
                  <p className="mt-3 max-w-prose text-body text-chalk-muted">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
