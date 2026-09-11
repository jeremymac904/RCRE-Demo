/**
 * Scripted assistant conversations.
 *
 * DELIBERATELY DETERMINISTIC. No model call is made anywhere in this demo.
 *
 * That is an honest choice, not a shortcut: RCRE's AI provider is
 * per-agent and provider-agnostic (ADR-0011), so there is no single model this
 * demo could speak for. What the demo shows is the *shape* of the experience —
 * what the assistant knows, how it explains itself, and where it stops and asks.
 *
 * Every fact the assistant states below traces to the demo dataset. Nothing is
 * invented at render time.
 */

export type ToolCall = { label: string; detail: string }

export type Block =
  | { type: 'text'; text: string }
  | { type: 'reasons'; heading: string; items: string[] }
  | { type: 'draft'; channel: 'Text message' | 'Email'; to: string; body: string }
  | { type: 'plan'; ready: string[]; approval: string[] }
  | { type: 'actions'; items: { label: string; primary?: boolean }[] }
  | { type: 'source'; contactId: string; name: string; summary: string }

export interface Turn {
  id: string
  prompt: string
  /** Short label used on the suggested-prompt chips. */
  chip: string
  tools: ToolCall[]
  blocks: Block[]
}

export const SUGGESTED = [
  'who-today', 'why-dana', 'draft-dana', 'plan-my-day', 'unanswered', 'handle-it', 'approvals',
  'pipeline', 'learn-next', 'todays-training', 'training-on',
] as const

export const TURNS: Record<string, Turn> = {
  'who-today': {
    id: 'who-today',
    chip: 'Who should I contact today?',
    prompt: 'Who should I contact today?',
    tools: [
      { label: 'rcre.get_my_today', detail: '5 signals across 14 contacts' },
      { label: 'rcre.get_hot_leads', detail: '3 contacts with recent inbound activity' },
    ],
    blocks: [
      { type: 'text', text: 'Four people, in this order.' },
      {
        type: 'reasons',
        heading: 'Today',
        items: [
          'Dana Whitfield — three Mandarin views this week, saved one, no contact in nine days. She is the one that matters.',
          'Marcus Ordonez — Facebook lead from nine hours ago that nobody has answered.',
          'Beth Ferraro — ran a home valuation twice in eleven days. That is a seller, not a browser.',
          'Althea Njoku — inspection contingency expires in two days and the repair request is not in.',
        ],
      },
      { type: 'text', text: 'Priya’s consultation is at 4:00pm. I have a prep brief ready when you want it.' },
      { type: 'actions', items: [{ label: 'Open Dana', primary: true }, { label: 'Draft all four' }, { label: 'Prep Priya brief' }] },
    ],
  },

  'why-dana': {
    id: 'why-dana',
    chip: 'Why should I contact Dana?',
    prompt: 'Why should I contact Dana Whitfield?',
    tools: [
      { label: 'rcre.get_contact', detail: 'Dana Whitfield' },
      { label: 'rcre.get_contact_history', detail: '11 events since April' },
    ],
    blocks: [
      {
        type: 'text',
        text: 'She came back this week after going quiet, and nobody has reached out.',
      },
      {
        type: 'reasons',
        heading: 'What changed',
        items: [
          'Viewed three Mandarin properties in the last seven days',
          'Saved 4321 Windward Court — $479,000',
          'Opened your last two emails',
          'All of it sits inside her stated $450–500K range',
          'Your last outbound was a voicemail nine days ago',
        ],
      },
      {
        type: 'source',
        contactId: 'c-dana',
        name: 'Dana Whitfield',
        summary: 'Active Buyer · Zillow · Mandarin, Jacksonville · relocating from Atlanta',
      },
      {
        type: 'text',
        text: 'She told you in April she wanted to be under contract before the school year. That is about seven weeks out now.',
      },
      { type: 'actions', items: [{ label: 'Draft a text', primary: true }, { label: 'Draft an email' }, { label: 'Create a task' }, { label: 'Open contact' }] },
    ],
  },

  'draft-dana': {
    id: 'draft-dana',
    chip: 'Draft the text',
    prompt: 'Draft the text.',
    tools: [
      { label: 'rcre.get_contact', detail: 'Dana Whitfield' },
      { label: 'rcre.draft_follow_up', detail: 'channel: text · consent: on file' },
    ],
    blocks: [
      { type: 'text', text: 'Here it is. It references what she actually looked at, so it does not read like a template.' },
      {
        type: 'draft',
        channel: 'Text message',
        to: 'Dana Whitfield · (904) 555-0142',
        body: 'Hi Dana — saw you were back looking at Mandarin this week. Windward Court is a good one; I know that street well and there are two more coming that haven’t hit yet. Want me to line up a few for Saturday morning? — Sarah, RCRE',
      },
      {
        type: 'text',
        text: 'I have not sent anything. Approve it and it goes out from your number, and I will log it against her record.',
      },
      { type: 'actions', items: [{ label: 'Approve and send', primary: true }, { label: 'Edit' }, { label: 'Try a different angle' }] },
    ],
  },

  /**
   * The coaching turn.
   *
   * Leadership named three agent problems — consistent follow-up, organisation
   * and time blocking — and defined "personalised business coach" as one of the
   * three functions the product exists to perform. Follow-up is answered by
   * every other turn here. This one answers the other two, and it is the turn
   * that distinguishes a coach from a search box: it declines to list
   * everything, and it says what to drop.
   */
  'plan-my-day': {
    id: 'plan-my-day',
    chip: 'Plan my day',
    prompt: 'Plan my day.',
    tools: [
      { label: 'rcre.get_my_today', detail: '7 signals' },
      { label: 'rcre.get_appointments', detail: '1 today, 1 later this week' },
      { label: 'rcre.get_agent_performance', detail: 'median first response: 18 min' },
    ],
    blocks: [
      {
        type: 'text',
        text: 'One fixed commitment today, and about three hours of work that actually moves something. Here is how I would arrange it.',
      },
      {
        type: 'reasons',
        heading: 'Suggested blocks',
        items: [
          '9:00–9:30 — Marcus Ordonez and the new leads. Speed is the whole game here; nine hours is already long.',
          '9:30–10:15 — Dana. This is the block that matters. Do not put it after lunch.',
          '2:00–2:30 — Clear what is overdue, so it stops following you around.',
          '3:00–3:30 — Build the Ortega Boulevard campaign. It goes live Thursday.',
          '4:00 — Priya\u2019s consultation. Your brief is ready.',
          '4:30–5:00 — Database follow-up. This is the block to sacrifice if the day slips.',
        ],
      },
      {
        type: 'text',
        text: 'One observation, since you asked for the day and not just the list. Your median first response is 18 minutes, which is well ahead of the brokerage. Where you lose people is at day nine \u2014 the follow-up after the first conversation. Dana is that pattern exactly, and so were two of the four that went quiet last month.',
      },
      {
        type: 'text',
        text: 'So if the day slips, protect the 9:30 block and let the database follow-up move to Friday. It is the one thing here that will still be there tomorrow.',
      },
      { type: 'actions', items: [{ label: 'Open Dana', primary: true }, { label: 'Prep Priya brief' }, { label: 'Open pipeline' }] },
    ],
  },

  'unanswered': {
    id: 'unanswered',
    chip: 'Show me leads nobody followed up with',
    prompt: 'Show me leads nobody has followed up with.',
    tools: [{ label: 'rcre.get_unanswered_leads', detail: 'threshold: 60 minutes' }],
    blocks: [
      { type: 'text', text: 'Two, and one of them is not yours.' },
      {
        type: 'reasons',
        heading: 'Never contacted',
        items: [
          'Marcus Ordonez — 9 hours. Facebook, Jacksonville First-Time Buyers campaign. Assigned to you.',
          'Tobias Fenwick — 31 hours. Zillow. Assigned to Chad Vesely.',
        ],
      },
      {
        type: 'text',
        text: 'Tobias is outside your book so I have not drafted anything, but Taquilla will see it in her exceptions tomorrow morning.',
      },
      { type: 'actions', items: [{ label: 'Call Marcus', primary: true }, { label: 'Draft to Marcus' }] },
    ],
  },

  'handle-it': {
    id: 'handle-it',
    chip: 'Handle what you can for me',
    prompt: 'Handle what you can for me today.',
    tools: [
      { label: 'rcre.get_my_today', detail: '5 signals' },
      { label: 'rcre.get_tasks', detail: '4 open · 1 overdue' },
      { label: 'rcre.draft_follow_up', detail: '3 drafts prepared' },
    ],
    blocks: [
      { type: 'text', text: 'I have done everything that does not need a decision from you. The rest is waiting.' },
      {
        type: 'plan',
        ready: [
          'Drafted a follow-up to Dana referencing the Mandarin properties she viewed',
          'Prepared the consultation brief for Priya at 4:00pm — financing status, three matching listings, PCS timeline',
          'Assembled Friday’s database follow-up list — 9 contacts with no touch in 30 days',
          'Pulled the Mandarin comparables for Dana’s overdue task',
        ],
        approval: [
          'Send the text to Dana',
          'Move Beth Ferraro to Active Seller',
          'Create a follow-up task for Marcus Ordonez',
        ],
      },
      {
        type: 'text',
        text: 'Nothing in the second list happens until you approve it. Sending, stage changes and anything a client sees always stops here.',
      },
    ],
  },

  'approvals': {
    id: 'approvals',
    chip: 'What needs my approval?',
    prompt: 'What needs my approval?',
    tools: [{ label: 'rcre.list_pending_approvals', detail: '3 pending · 0 expired' }],
    blocks: [
      { type: 'text', text: 'Three things. Two are one-click; the third I would look at first.' },
      {
        type: 'plan',
        ready: [],
        approval: [
          'Send the follow-up text to Dana Whitfield',
          'Move Beth Ferraro to Active Seller',
          'Create a follow-up task for Marcus Ordonez',
        ],
      },
      {
        type: 'text',
        text: 'Beth is the one worth a second look. Moving her to Active Seller changes how she is counted in the brokerage pipeline, and she has not said out loud that she is selling — she has run a valuation twice and read the timing article. Strong signal, not a stated intention.',
      },
      {
        type: 'text',
        text: 'Nothing here expires, and nothing happens until you approve it.',
      },
    ],
  },

  /**
   * The Academy turn.
   *
   * Every course and lesson named here is real — they come from the approved
   * AI Advantage curriculum now copied into RCRE, not from anything invented
   * for this demo.
   *
   * It is deterministic lookup over course metadata, not semantic retrieval,
   * and the response says so rather than implying a capability that does not
   * exist. The addendum is explicit on that point, and it matters more here
   * than elsewhere: a recruiting demo that overstates the training is
   * overstating the thing RCRE would be recruiting on.
   */
  'learn-next': {
    id: 'learn-next',
    chip: 'What should I learn next?',
    prompt: 'What should I learn next?',
    tools: [
      { label: 'rcre.get_academy_progress', detail: 'Course 1 complete · Course 2 in progress' },
      { label: 'rcre.get_next_lesson', detail: 'deterministic — next incomplete lesson in order' },
    ],
    blocks: [
      {
        type: 'text',
        text: 'You finished ChatGPT Setup and Personalization. You are four lessons into Prompting for Real Estate, so the next one is “Stop Accepting the First Answer”.',
      },
      {
        type: 'reasons',
        heading: 'Why that one, today',
        items: [
          'It is the next lesson in order, and the course builds on itself.',
          'It carries six prompts — more than any other lesson in the course.',
          'It is the habit behind the Dana draft you just reviewed: the first version is a starting point, not the message.',
        ],
      },
      {
        type: 'text',
        text: 'After that course, Real Estate Marketing Pro is the one that would pay off soonest for you — you have a listing going live Thursday with no campaign built.',
      },
      {
        type: 'text',
        text: 'To be straight about what I am doing here: I am reading the course list and your progress, in order. I am not searching the lesson content — that is not built yet.',
      },
      { type: 'actions', items: [{ label: 'Open the Academy', primary: true }, { label: 'Open pipeline' }] },
    ],
  },

  /**
   * "Show me today's training."
   *
   * Resolves the community's Training of the Day to its real lesson. The
   * Community post and the Classroom lesson are the same object seen from two
   * sides, which is the point — the assistant is reading the same metadata the
   * screens read, not a separate script.
   */
  'todays-training': {
    id: 'todays-training',
    chip: "Show me today's training",
    prompt: "Show me today's training.",
    tools: [
      { label: 'rcre.get_training_of_the_day', detail: 'community · pinned' },
      { label: 'rcre.get_next_lesson', detail: 'Course 2 · Lesson 5' },
    ],
    blocks: [
      {
        type: 'text',
        text: 'Jeremy posted “Stop Accepting the First Answer” this morning — Prompting for Real Estate, lesson 5 of 10. It happens to be exactly where you left off.',
      },
      {
        type: 'reasons',
        heading: 'What it covers',
        items: [
          'The first answer is a draft, not the message. Push back on it the way you would with a junior assistant.',
          'Six prompts attached — the most of any lesson in the course.',
          'Two agents replied to the post already; Vito said it fixed his listing descriptions.',
        ],
      },
      {
        type: 'text',
        text: 'It is written and approved. The video for that one has not been filmed yet — two of the 181 lessons are recorded so far.',
      },
      { type: 'actions', items: [{ label: 'Open the lesson', primary: true }, { label: 'Open the Academy' }] },
    ],
  },

  /**
   * "Do we have training on X?" — the lookup question, answered honestly.
   *
   * This is deterministic matching over course and lesson TITLES, not search
   * over lesson content. The response says so, because claiming otherwise
   * would be claiming a capability that does not exist.
   */
  'training-on': {
    id: 'training-on',
    chip: 'Do we have training on lead follow-up?',
    prompt: 'Do we have training on lead follow-up?',
    tools: [{ label: 'rcre.get_next_lesson', detail: 'title match · 14 courses, 181 lessons' }],
    blocks: [
      { type: 'text', text: 'Yes, in two places, and they do different jobs.' },
      {
        type: 'reasons',
        heading: 'Closest matches',
        items: [
          'Realtor Coach and Sales Roleplay — course 7. Practise the call against an AI that pushes back before you make it for real.',
          'Real Estate Marketing Pro, lesson 5 — Database Reactivation. For the people who went quiet rather than the ones who just came in.',
          'Prompting for Real Estate — course 2. Not follow-up specifically, but it is what makes every draft above sound like you.',
        ],
      },
      {
        type: 'text',
        text: 'To be precise about how I found those: I matched against course and lesson titles. I am not searching inside the lessons — that is not built.',
      },
      { type: 'actions', items: [{ label: 'Open the Academy', primary: true }] },
    ],
  },

  'pipeline': {
    id: 'pipeline',
    chip: 'What’s happening with my pipeline?',
    prompt: 'What is happening with my pipeline?',
    tools: [{ label: 'rcre.get_pipeline', detail: '14 active · 1 under contract' }],
    blocks: [
      { type: 'text', text: 'Steady, with one thing that needs you this week.' },
      {
        type: 'reasons',
        heading: 'Movement',
        items: [
          'Althea Njoku is under contract at $648,000 — inspection ends Friday',
          '4407 Ortega Boulevard goes live Thursday and has no marketing built yet',
          'Two buyers moved to Appointment this week',
          'Nine contacts have had no contact in 30 days',
        ],
      },
      {
        type: 'text',
        text: 'Ortega Boulevard is the gap. Photography landed yesterday and it is live in two days — I can build the campaign now if you want it ready to review tonight.',
      },
      { type: 'actions', items: [{ label: 'Build the Ortega campaign', primary: true }, { label: 'Open pipeline' }] },
    ],
  },
}

export const turnFor = (id: string): Turn | undefined => TURNS[id]
