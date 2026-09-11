# Meeting requirements traceability — 2026-08-26

**Source:** `RCRE & Jeremy AI + - 2026_08_26 09_58 EDT` — Gemini notes (with full transcript) and the
44:15 screen recording.
**Present:** Jeremy McDonald · Julio Arango (Qualifying Broker) · Taquilla Allen (Managing Broker).

## How to read this

Timestamps are **transcript** times. The recording starts later than the meeting — Jeremy asked
"do you guys mind if I record this?" at transcript **00:03:41** — so **recording time ≈ transcript
time − 3:41**. Frames cited below were pulled at the converted offset and are in
`99-scratch/meeting-frames/`.

**Where the notes and the recording disagree, the recording wins.** Disagreements are in §D.

Classification: **SAT** already satisfied · **ENH** needs enhancement · **NEW** new feature ·
**INT** integration required · **POL** policy decision required · **EXT** external blocker.

---

## A. What was actually on screen

This matters more than it sounds: **the meeting was a live demo of the current RCRE build**, so
leadership's reactions are reactions to what exists today, not to a concept.

| Transcript | Recording | Frame shows | Verified |
|---|---|---|---|
| 00:04:49 | 00:01:08 | **RCRE Command**, signed in as Taquilla Allen, Managing Broker — "Who needs attention, which leads, which agents, which pipeline stages, which recruits", 3 new leads / 2 never answered / 2 hr median first response / 1 under contract, Leads Nobody Answered (Marcus Ordonez 9h, Tobias Fenwick 31h), Where Leads Came From | ✅ our build |
| 00:07:24 | 00:03:43 | **Campaign builder** on 4407 Ortega Boulevard — Instagram post, sphere email, open house plan, 45-second video script, and the buttons `APPROVE AND SCHEDULE` / `EDIT` / `SEND TO BROKER FOR REVIEW`, with Jeremy's cursor on the approval button as he offers approval routing | ✅ our build |
| 00:08:38 | 00:04:57 | **Training → Community**, signed in as Sarah Brockner — Training of the Day ("Stop Accepting the First Answer", Lesson 5 of 10, 6 prompts, 4 of 10 complete), category chips, composer, About This Community | ✅ our build |
| 00:23:00 | 00:19:19 | **Hermes Agent** — SESSIONS/BOTS, Capabilities · Messaging · Artifacts · Scheduled jobs, capability catalog (Canva, Context7, Dropbox, Figma, Fireflies, Gamma, GitLab…), Skills 154 / Tools 20 / MCP, and an MCP JSON config wired to n8n webhooks. A live error is visible: `AttributeError: 'Server' object has no attribute 'list_tools'` | ✅ Jeremy's own tooling |

---

## B. Material requirements

### B1 — Broker oversight of agent lead contact — **Taquilla's first and most emphatic ask**

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R1 | Reduce clicks to see who contacted whom | 00:09:xx | *"I don't want to have to go through so many funnels to see who's been contacting who"* | ENH |
| R2 | Open one agent, see that agent's leads | 00:10:05 | *"I want to be able to … go into one of the agents things and look at their leads"* | ENH |
| R3 | Contacted vs **not** contacted, per agent | 00:10:05 | *"needs to see who they have contacted and who they haven't contacted"* | ENH |
| R4 | Overdue surfacing with a day-level threshold | 00:10:05 | *"what's going on with this person that hasn't been touched … one day overdue"* | ENH + **POL** |
| R5 | Make it easier for her **and the manager** | 00:10:05 | *"make it easier on myself and and the manager"* | ENH |
| R6 | Leadership will use the platform for follow-up oversight | 00:33:54 | *"me and Julio would definitely be using it for keeping up with the leads, um how they're following up in there"* | SAT/ENH |
| R7 | Bots to show where the ball is being dropped | 00:26:48 | *"help with … managing some of the leads and seeing where dropping the ball at, you know, who's not making contact"* | ENH |
| R8 | Push work down so leadership stops doing it | 00:27:45 | *"we're trying to be able to pass these tasks down to other people so we're not having to do these things"* | NEW |

**R4 is a signal, not a policy.** "One day overdue" is the first concrete threshold leadership has
ever named. It still needs confirming against the stage-aging sheet, which remains unanswered.

### B2 — Training authored by RCRE

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R9 | Taquilla authors her own courses alongside Jeremy's | 00:10:05 | *"I'm building my classroom as well"* | NEW |
| R10 | Zillow call handling, using real recorded live calls | 00:10:57 | *"I have some now where I've already did Zillow calls and how to handle those … actually taking a live call recording that and being able to place that in there"* | NEW |
| R11 | Named like *Zillow 101 — initial phone call* | 00:10:57 | *"okay Zillow uh 101 uh initial phone call"* | NEW |
| R12 | ChatGPT account setup — what to turn on and off | 00:11:55 | *"I walk them through how they can set up their account, what to turn on, what to turn off"* | NEW |
| R13 | Prompting module | 00:11:55 | *"going into prompting"* | SAT (course 2 exists) |
| R14 | **Inspection report → email to Margie** | 00:11:55 | *"you just drop the inspection report in there and put the numbers that the people want to have done and have [ChatGPT] pull it and then say email to Margie and it does"* | NEW |
| R15 | Document walkthroughs — buyer representation forms, filled on camera | 00:28:12 | *"I'm just walking through the documents … if you're representing the buyer, so all of your documents you need to have and I'm walking them through and showing them how to fill it out"* | NEW |
| R16 | **Conditional assignment** — not everyone is on Zillow | 00:28:12 | *"not every agent in the future is going to be on Zillow, right? But those are need to have access to those things"* | NEW |
| R17 | Her training teaches ChatGPT use, not an embedded model | 00:13:07 | *"mine is just going to be just showing them how to use it, not GBT actually built into it … like if they had their own subscription"* | SAT |

### B3 — Documents, contracts and transaction coordination

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R18 | Fill lender forms from a templates folder | 00:28:54 | *"go into this customer's folder and fill out the FHA case number request form"* | NEW |
| R19 | Fill the purchase contract from instruction | 00:29:48 | *"go fill out the purchase contract. This is the price that we want … it's just going to go fill the contract out for them"* | NEW + **POL** |
| R20 | Leadership reaction — this is the headline | 00:29:48 | Taquilla: *"See, that to me that's next level."* | — |
| R21 | Route for e-sign, return executed doc | 00:29:48 | *"send the buyer or the seller … the contract to be e-signed … and then once it's e-signed have it come back in"* | NEW + INT |
| R22 | Margie is the **Florida** TC | 00:30:47 | Julio: *"Florida"* — TC coverage for Alabama is unstated | **POL** |
| R23 | TC send-out timelines are RCRE's to define | 00:30:47 | *"you can give me like the timelines of when you would want the transaction coordinator to send stuff out"* | **POL** |
| R24 | **Draft → review → approve → send** | 00:30:47 | *"the agent will draft the email and then all you got to do is go in, review it, make sure everything looks good on it, approve it, and send it"* | SAT (pattern) / NEW (for docs) |

### B4 — Dotloop and the single workspace

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R25 | Integrate with Dotloop | 00:30:47 | Julio: *"So that would integrate with our with our dot loop then, right?"* | **EXT — see §C** |
| R26 | Dotloop is e-sign and little else, to them | 00:30:47 | Jeremy: *"Is dotloop more than e-signing?"* — Julio: *"no, not really."* Taquilla concurs | — |
| R27 | ~$500/month, Zillow product, encouraged not required | 00:31:57 | *"it's like five something a month … it's a Zillow product"* / *"Not so much requires but highly encourages"* | — |
| R28 | Open-source e-sign is an option | 00:31:57 | *"there's some open-source e-signing platforms that it would be really easy to just build them in"* | NEW |
| R29 | Zillow is consolidating around FUB | 00:32:58 | Julio: *"Zillow is trying to integrate all their systems … basically everything works out of follow-up boss"* | — |
| R30 | **Agents must not work two CRMs** | 00:32:58 | *"not really having them go into two different CRM because that's going to be crazy for them. That's we seen how that works"* | NEW |
| R31 | Agents work out of RCRE, FUB underneath | 00:33:54 | Jeremy: *"it is nice that it can integrate with Follow-up Boss. they really could just work out of your system … update the files, put the notes in there"* | NEW + INT |
| R32 | Co-generated leads may sit outside FUB | 00:33:54 | Taquilla: *"if we do decide to partner … and start generating leads on our own you don't want them in follows anyway"* — Jeremy: *"as long as they're not going to go to any other mortgage person"* | **POL** |

### B5 — AI providers and cost

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R33 | Claude/ChatGPT too expensive for internal work | 00:14:02 | *"Claude and Chat GPT are going to be your most expensive ones to put in. So I really wouldn't recommend it"* | SAT (ADR-0011) |
| R34 | OpenRouter — $10 balance, free models, 10k prompts/day | 00:14:02 | *"as long as you have a $10 balance … a bunch of free models … 10,000 prompts per day on them for free"* | ENH |
| R35 | DeepSeek and MiniMax as cheap paid options | 00:15:06–00:16:06 | *"Deep Seek which is really good and pretty affordable"* / *"Mini Max is also really good and affordable"* | ENH |
| R36 | **Image generation is the exception** — custom GPT on the user's own subscription | 00:15:06 | *"the chat GPT image generation is definitely the best … making a custom GPT for your brokerage where they would just use their existing chat GPT subscription"* | NEW |
| R37 | Local models on a Mac Studio ⇒ no AI bill | 00:25:34 | *"you can use local models … and then you wouldn't have any AI bill at all"* | ENH |

### B6 — Hermes / cloud agent

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R38 | Persistent memory, auto-created skills | 00:19:27 | *"it just remembers everything and it creates what are called skills"* | SAT (design) |
| R39 | Role-based bots; a lead bot delegating to specialists | 00:19:27 | *"create different bots that have different personalities and different roles … tell the team leader what to do, that the team leader is going to assign work to the other bots"* | NEW |
| R40 | Sign in with an existing ChatGPT subscription | 00:20:45 | *"anybody that would have like a chat GPT subscription, they can actually sign in through their chat GPT subscription"* | SAT (ADR-0011) |
| R41 | MCP servers and n8n automation | 00:21:56 | *"you can also connect it to what's called MCP servers … two different N8N"* | SAT/ENH |
| R42 | Messaging surfaces — Telegram, Gmail, Google Chat, SMS | 00:23:00 | *"connect it to like Telegram, Gmail, Google chat, text messaging"* | NEW + **POL** |
| R43 | **Always-on hosting** — his machine must stay awake | 00:23:00 | *"my computer never goes to sleep. And so this does have to be open if you're hosting it locally … but you can also host this on a VPS"* | NEW |
| R44 | Voice — talk instead of type | 00:24:20 | *"you can do different voice models … you just talk to it and you don't even ever have to type"* | NEW |
| R45 | Cloud and remote gateways | 00:24:20 | *"when it comes to the gateways, you'll see mine's local, but you can set it up on the cloud … remote gateways"* | NEW |
| R46 | Per-model billing visibility | 00:24:20 | *"you can really track your billing on it"* | NEW |
| R47 | The platform itself recruits | 00:26:12 | Taquilla: *"some of the stuff that you're saying to me will draw agents … when you come here this is what you're going to have access to"* | SAT |

### B7 — Marketing, community, recruiting

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R48 | Campaign builder producing images, video, copy | 00:07:24 | *"we can have it create the images, videos, copy"* | SAT (copy) / ENH (media) |
| R49 | New-agent marketing routed for approval | 00:07:24 | *"any type of new agents would have to send it to their team leader or one of you for approval"* | SAT |
| R50 | A marketing catalog | 00:07:24 | *"a whole entire marketing catalog … listing campaigns, open house, social media content, past client"* | ENH → **Content Library** |
| R51 | Community feed with YouTube links and PDFs | 00:07:24 | *"you can go in post, you can link YouTube videos, put PDF attachments"* | SAT / ENH (attachments) |
| R52 | 30/90-day calendar approved up front, then autopilot | 00:08:38 | *"a 30-day calendar where you kind of approve upfront or 90-day … then just set it on autopilot so it starts going in and just every morning scheduling everything out"* | NEW |
| R53 | **External Skool community** as recruiting funnel + coaching revenue | 00:16:06–00:17:16 | *"I would recommend having a school community and using that as a way to also kind of attract real estate agents to join your brokerage … you could also set up having like a real estate coaching as well. That way you can also have income"* | NEW (external) |
| R54 | Two agents in Alabama; recruiting is the need | 00:34:56 | *"Right now we have two … we're trying to recruit more agents"* | — |
| R55 | Declined a $15k recruiting vendor | 00:34:56 | *"they wanted I think like $15,000 or something crazy"* | — |

### B8 — Lead generation and website

| # | Requirement | Time | Quote | Class |
|---|---|---|---|---|
| R56 | 90-day Alabama ad test, contingent on speed | 00:35–00:36:00 | *"if it's something to where that they can commit to calling those leads within the first 5 minutes … we could definitely test that for about 90 days"* | NEW + **POL** |
| R57 | Zillow benchmark: 5–40% at close, no monthly spend | 00:37:01 | *"Zillow will range anywhere from 5 to 40% based on their price points"* / *"No"* monthly | — |
| R58 | Birmingham and surrounding | 00:37:01 | *"we're in Birmingham and the surrounding areas"* | — |
| R59 | USDA and first-time buyer first; DSCR doubtful | 00:38:04–00:39:08 | Jeremy: *"USDA … and first-time buyer would probably get the most leads"*; Julio: *"Definitely USDA … DSCR I think cuz rents are still pretty low over there"* | NEW |
| R60 | Florida MLS breadth | 00:39:08 | Julio: *"I got Miami, MLS, Access, Orlando, Stellar, Gainesville … pretty much state coverage as far as MLS's"* | INT |
| R61 | One agent in North Miami; others could refer | 00:40:23 | *"just one on the team if I needed to … a couple down there that would could do referrals"* | — |
| R62 | Speed to lead is the shared premise | 00:41:40 | Julio: *"you got to pick up you know speed to lead"* | NEW |
| R63 | **Leave Luxury Presence** | 00:41:40+ | Taquilla: *"come away from that and build something else, Jeremy?"* — Jeremy: *"Yes. Yes."* — Taquilla: *"I think we kind of already thinking about that"* | NEW |
| R64 | Persistent site AI assistant that knows every page | 00:42:42 | *"a persistent like AI assistant that people can talk to that knows what's on every single page"* | NEW |
| R65 | Automated SEO + AEO + GEO blogging | 00:42:42 | *"consistent blog posts that are maximized for SEO, AEO, and GEO, which the last two, those are for AI agents"* | NEW |
| R66 | Evidence it works | 00:42:42 | *"I think I've had four or five closings so far from ChatGPT this year"* | — |
| R67 | Two phases — blog **and** Google Business Profile | 00:42:42 | *"it's two phases. So the blog portion on the website and then Google business"* | NEW |
| R68 | Only Facebook exists; add Instagram and YouTube | 00:44:47 | Taquilla: *"No, we just have one for Facebook."* Jeremy: *"I would set one up for Instagram and YouTube"* | **EXT** (RCRE action) |
| R69 | YouTube buyers are late-funnel | 00:44:47 | *"when people go on YouTube and they're looking about buying a home, they're typically ready to buy"* | NEW |
| R70 | YouTube as content: podcasts, coaching playlist | 00:44:47 | *"podcasts with different agents … home inspectors … insurance people … a playlist that's dedicated for people that are wanting to learn about becoming a [Realtor]"* | NEW |
| R71 | **Deliverable: a double-clickable local HTML file** | 00:47:02 | *"it's just going to be a HTML file so you'll download it to your computer and just double click on it … make notes on"* | NEW |

---

## C. External blocker — Dotloop

**Verified independently, twice.** Dotloop's API License Agreement restricts use of Dotloop Data
*"for research purposes, product development or improvement, or in connection with any type of
artificial intelligence, machine learning, or similar technology, whether for model
development/training **or for any other purpose**."*

The final clause is the one that matters: this is **not** limited to training. RCRE AI may not
process Dotloop Data at all.

The API itself is capable — OAuth 2.0, loops, participants, documents (upload and download),
folders, contacts, tasks, templates, activities, webhooks, ~100 requests/minute, developer
registration and approval required.

**Consequence:** integration is possible **deterministically**, but the AI boundary must run one
way. Documents RCRE AI touches must originate in RCRE — uploaded by the agent or generated by
RCRE — and may then be pushed to Dotloop for signature. Nothing retrieved from Dotloop may enter
an AI path. See `INTEGRATION_AND_RISK_MATRIX.md`.

Sources: [Dotloop API License Agreement](https://www.dotloop.com/api-license-agreement/) ·
[Dotloop Public API v2 developer guide](https://dotloop.github.io/public-api/)

---

## D. Where the notes and the recording disagree

| # | Gemini notes say | The recording says | Why it matters |
|---|---|---|---|
| D1 | *"maintain 'Follow-up Boss' as the central CRM, integrating all automation and tools directly into it"* | Taquilla's requirement is that agents not work **two** CRMs (00:32:58). Jeremy's answer is the opposite direction of integration: *"they really could just work out of your system"* (00:33:54) — RCRE is the workspace, FUB the system of record underneath | This is the single most consequential architectural sentence in the meeting, and the notes point the arrow the wrong way. Building "automation inside FUB" is a different product from "RCRE as the workspace over FUB" |
| D2 | *"building a School community"* | **Skool** — the SaaS community platform (skool.com). Gemini transcribed it as "School" throughout | Reads as a generic idea rather than a specific external product with a business model attached |
| D3 | *"targeting DSCR investor prospects, USDA, and first-time buyers"* in Alabama | Julio pushed back in the room: *"ESCR uh probably be a little tougher … cuz rents are still pretty low over there"* (00:39:08). Jeremy himself only offered to *"do a little bit of homework and see if that's even a community that would be worth trying"* | The notes present a contested item as agreed. DSCR belongs in Miami/Central Florida on this evidence, not Birmingham |
| D4 | *"Taquilla Allen requested enhanced visibility into agent lead contact statuses"* | Understates it. This was her opening ask, she raised it first and unprompted, and she gave a threshold — *"one day overdue"* | It is the top-priority requirement of the meeting, not one bullet among four |
| D5 | Decisions list omits it | **Approval-gated document preparation** — Jeremy's *"draft … review … approve … send"* (00:30:47) is the control that makes contract automation safe, and it was stated as the recommended pattern | Absent from the notes' decisions, so it could be lost |
| D6 | *"Jeremy proposed using AI agents to automate administrative tasks, such as filling out purchase contracts"* | Accurate, but omits Taquilla's reaction — *"See, that to me that's next level"* (00:29:48) — the strongest positive signal in 48 minutes | Priority evidence |
| D7 | Silent on it | Lead-ownership side agreement (00:33:54): co-generated leads need not go to FUB, conditioned on mortgage referrals not going to another loan officer | A commercial term with data-routing consequences |
| D8 | *"Some recordings unavailable"* | The recording runs 44:15 and starts at transcript 00:03:41 | Anyone mapping notes to video without the offset will land ~4 minutes early |
