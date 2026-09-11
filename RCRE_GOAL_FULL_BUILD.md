# RCRE FULL BUILD GOAL

## Governing Mission

Take the existing RCRE project from its current state to a polished, functional, demo ready and pilot ready brokerage operating system that Jeremy can confidently present to RCRE leadership, agents, recruits and future brokerage partners.

This is an EXECUTION GOAL.

It is not a planning exercise.
It is not another architecture phase.
It is not permission to produce more strategy documents instead of software.

Use the existing RCRE project as the source of truth. Read the relevant architecture, ADRs, leadership feedback, Follow Up Boss research, Hermes research, website audit, demo code, MVP code, tests, requirements and planning documents before changing material behavior.

Do not restart the project.

Reuse what is good.
Replace what is weak.
Finish what is incomplete.
Integrate the work into one coherent product.

The goal is complete only when Jeremy can open one local URL and demonstrate the entire RCRE technology story without apologizing for unfinished UX, dead navigation, fake functionality, broken flows, unexplained placeholders or obvious prototype quality.

## Hard Workspace Rule

ALL RCRE project work stays inside the RCRE folder.

Everything outside RCRE is READ ONLY.

Do not create project files in Desktop, Documents, Downloads, /tmp, another project, Jeremy's home folders, another LegendsOS directory or any other location outside RCRE.

Do not modify the live RCRE website, production Follow Up Boss, production Meta assets, production Google assets, send real email, send real SMS, publish real social media, use real client PII or create production webhooks unless Jeremy explicitly authorizes it.

If a normal Claude Code support file such as .claude/launch.json lives outside RCRE, do not modify it. Use commands from inside RCRE instead.

## Execution Mode

Act simultaneously as Lead Engineer, Product Manager, Product Designer, UX Lead, AI Architect, Integration Architect, QA Lead, Security Reviewer and Technical Program Manager.

Use as many parallel Claude Code subagents as are genuinely useful.

Parallelize independent work aggressively across:

1. Agent experience and RCRE Today
2. RCRE AI assistant
3. CRM intelligence and contact workspace
4. Pipeline and listings
5. Broker Command and reporting
6. Recruiting
7. Marketing
8. Training
9. Follow Up Boss integration
10. Hermes profiles and skills
11. MCP and permissions
12. Website and recruiting experience
13. Responsive QA
14. Security and RLS
15. Automated testing
16. Demo script verification

Do not create agent theater.

Every subagent must have a clear scope, an isolated file boundary where practical, a defined deliverable and a verification requirement.

The lead session owns integration.

Subagents do not get to independently redefine architecture.

Do not stop after every milestone.

Continue until the Definition of Done is satisfied.

Ask Jeremy only for a genuine blocker involving production credentials, production access, irreversible external actions, money or purchases, legal or compliance policy, RCRE business policy that cannot responsibly be inferred, destructive operations, real customer communications or another explicit governance approval.

For reversible local development decisions, make the decision and continue.

## Verified Business Direction

RCRE leadership has validated the central product thesis.

Follow Up Boss remains the incumbent CRM during the MVP and pilot.

RCRE is NOT building a generic replacement CRM first.

RCRE is building an intelligence, accountability, AI, automation, recruiting, marketing, training and management layer around Follow Up Boss.

The three highest value AI functions confirmed by RCRE leadership are:

1. Lead Follow Up and Prioritization
2. Pipeline and Accountability Management
3. Personalized Business Coach and Assistant

These three functions are the scope defense.

Any proposed feature that does not materially improve one of these three areas should be deferred unless required for recruiting, management or integration.

RCRE is the proving ground.

The product should work for RCRE first.

The architecture should not make future multi brokerage packaging prohibitively expensive.

Do NOT build SaaS billing, white label administration, marketplace features or multi brokerage onboarding yet.

Preserve organization scoped architecture and tenant safe permissions from day one.

## Product Positioning

RCRE should not be presented as a brokerage that gives agents ChatGPT, a brokerage that merely offers AI classes, a generic CRM, a chatbot company or another SaaS dashboard.

The positioning is closer to:

RCRE provides agents with an AI powered real estate business operating system that helps them follow up, stay organized, manage their pipeline, market their business, learn AI and grow.

AI is a differentiator inside a broader brokerage growth system.

RCRE's broader recruiting pillars confirmed by leadership include:

Systems and structure
Hands on coaching and mentorship
Multi market opportunities
Business development and growth
Accountability and performance coaching
Agent training and education

The product and public recruiting experience should reflect all of these.

## Design Direction

The current premium RCRE light mode design direction is approved.

Light mode is default.
Dark mode remains available.

Use the verified RCRE visual identity:
Syne display typography
Nunito Sans body typography
RCRE brass/gold accent
near black ink
premium real estate minimalism
hairline dividers
restrained depth
clean editorial spacing.

Do not broadly redesign the visual system again unless a real UX problem requires it.

No generic purple AI styling.
No glowing hacker interface.
No admin dashboard filled with equal cards.
No excessive gradients.
No excessive rounded cards.
No cluttered management screens.

Use hierarchy.
Use real estate context.
Use agent headshots and property imagery where appropriate and safe.

Every meaningful row, item, card, prospect, contact, listing and agent should open the correct record.

No fake buttons.
No dead navigation.
No developer controls in the final demo.

Synthetic data should be clear but unobtrusive.

## Demo Authentication

Provide a polished demo persona picker or login experience.

At minimum:
Agent Demo
Managing Broker Demo

Use real public RCRE identities only where appropriate for the persona shell.

All associated business numbers, performance data, leads, clients, deals and metrics are synthetic.

Do not fabricate public claims about real people.

## RCRE Today

RCRE Today is the primary agent operating screen.

It must immediately answer:

Who should I contact today?
Why should I contact them?
Which leads have not been followed up?
What is overdue?
Which leads are sitting too long?
What appointments matter today?
What pipeline items require action?
What are my three highest priority actions?
How should I time block my day?
What can RCRE AI prepare or handle for me?

Do not create a wall of equal cards.

Use clear hierarchy.

Recommended structure:
Morning briefing
Top priority client
Three priority actions
Today's Plan / time blocks
Unanswered leads
Stage aging
Appointments
Pipeline movement
Recent high intent activity
Tasks
Coming up

Every surfaced insight must explain WHY.

The product value is the explanation, not the badge.

## RCRE AI

RCRE AI is one of the stars of the demo.

It should feel like an agentic brokerage assistant, not a generic chatbot.

It must visibly understand the agent, their Follow Up Boss style book, lead history, pipeline, appointments, tasks, property activity, marketing context, RCRE procedures where available and individual performance patterns.

Core demo prompts must work:

Who should I contact today?
Why should I contact Dana?
Draft the text.
Plan my day.
Show me leads nobody followed up with.
Show me my pipeline.
Handle what you can for me.
What needs my approval?

The assistant must clearly distinguish:
DONE
DRAFTED / NOT SENT
NEEDS APPROVAL
PROHIBITED OR UNAVAILABLE

Do not imply that a scripted demo response is live model reasoning if it is not.

The demo can be deterministic, but it must be coherent and context aware.

Approval interactions should work.

Nothing should actually send in demo mode.

## Personalized Business Coach

Leadership explicitly wants a personalized business coach.

The assistant should be able to use synthetic performance patterns to coach.

Examples:
Strong first response speed but weak long term follow up
Too many stale leads
Low appointment conversion
Poor status hygiene
Inconsistent database follow up
No protected time blocks

The coach should provide daily priorities, scripts, time block recommendations, specific action steps, marketing ideas, follow up coaching and performance observations.

Avoid generic motivational filler.

The coaching should be based on actual demo data signals.

## CRM Intelligence

Follow Up Boss remains the CRM conceptually.

RCRE adds intelligence.

Build a polished contact experience with search, filters, stage, source, assigned agent, market, last touch, next action, stage aging, AI priority, status hygiene, tasks, appointments, deal context, property interests, engagement, timeline and recommended action.

Clicking a contact opens a full workspace.

The contact workspace should make the next best action obvious.

CRM screens should be especially strong in light mode for all day usability.

## Pipeline

Show the agent's real estate book clearly.

Use stages appropriate to RCRE such as:
New Lead
Attempting Contact
Connected
Appointment
Active Buyer
Active Seller
Under Contract
Closed
Long Term Nurture

Expose time in stage, next action, overdue follow up, assigned agent, lead source and deal status.

Do not build drag and drop unless it is stable and materially improves the demo.

## RCRE Command

RCRE Command is the management exception screen.

Leadership's management pain is manual verification.

The first screen should answer:

Which leads need attention?
Which agents need attention?
Who is not following up?
Which leads were never contacted?
Which leads are sitting too long?
Which agents have stale statuses?
What is first response performance?
What requires management attention today?
Which recruiting prospects need attention?

Do not put forty charts on Command.

Exceptions first.
Details one level deeper.

Use human context such as agent names, headshots, lead names and reasons.

## Reporting

Build a meaningful reporting drill down.

Leadership specifically wants visibility from lead assignment through closing.

Support demo reporting by Agent, Lead source, Stage, Market and Time period.

Metrics where supported:
Assigned leads
First response time
Contact attempts
Appointments
Appointment rate
Lead to appointment conversion
Lead to contract conversion
Lead to close conversion
Stage aging
Pipeline fallout
Contracts
Closings
Lead source performance

Do not fake unavailable metrics.

If a metric cannot be supported, show it as unavailable or omit it.

The demo data should contain intentional management stories rather than random numbers.

## Lead Accountability

This is P0.

Build the intelligence needed to identify unanswered leads, first touch delay, overdue follow up, status aging, required follow up failures once policy exists, stale leads, stale stages and missed tasks.

Follow up rules and stage aging thresholds must remain organization configurable.

Do not silently invent brokerage policy.

Until RCRE policy is supplied, demo the behavior using clearly synthetic configuration.

## Alabama Routing

Support the discovered routing pattern:

Leadership to Team Lead to Agent.

The model should support initial recipient, team lead, final assigned agent, assignment timestamp, reassignment timestamp and assignment history.

Do not assume team lead equals managing broker.

## Recruiting

Recruiting is a major RCRE weakness and a major product opportunity.

Build a real recruiting operating concept.

Support prospect pipeline, source, engagement, last contact, next action, AI training engagement, website engagement, meeting, considering, onboarding, joined and nurture.

Show acquisition sources such as Referral, AI Academy, Facebook, Instagram, YouTube and ISA Cold Call.

The demo should intentionally show that warmer digital and education driven recruiting creates higher engagement than cold ISA calls.

Do not fabricate that as a public claim.

It is a demo story using synthetic data.

A recruit detail screen should explain why someone is considered engaged.

## Marketing

RCRE currently lacks a strong agent marketing system.

Show a credible future RCRE Marketing workspace covering Listing Campaign, Open House Campaign, Social Content, Email, Video Script, Buyer Campaign, Seller Campaign, Database Campaign, Past Client Campaign and Personal Branding.

At least one workflow must be interactive end to end.

The listing campaign should demonstrate select listing, AI analyzes context, social output, email output, video script, open house plan, follow up campaign, fair housing or compliance check and approval state.

Do not build ten half working generators.

One excellent working flow plus polished previews is better.

## Listings

Provide a polished listing workspace.

Show property, status, price, agent, marketing status, engagement, open house, tasks, leads, campaign status and AI marketing action.

Listing visuals must be reliable during a demo.

Do not depend on fragile third party image URLs.

Generated or bundled demo visuals are acceptable if clearly demo assets.

## Training

Show RCRE AI Academy as a meaningful recruiting and retention benefit.

Keep the LMS lightweight.

Demonstrate curriculum such as:
AI for Real Estate 101
Prompting for Real Estate
ChatGPT for Realtors
AI Lead Follow Up
AI Listing Marketing
AI Social Media
Building Your AI Twin
Advanced AI Agents

Show progress and continue learning behavior.

Do not build an oversized learning platform.

## Public RCRE Technology Experience

Provide a polished public technology landing experience and Join RCRE experience.

It should explain the broader agent growth system, not only AI.

Use verified RCRE branding and verified public information.

Do not invent splits, fees, testimonials, production or benefits not confirmed by RCRE.

Use the product itself as a recruiting proof point.

Include polished product previews or screenshots for RCRE Today, RCRE AI, CRM Intelligence, Marketing and Training.

## Website Strategy

Do not rebuild the live Luxury Presence site during this goal.

Maintain an implementation ready backlog for improving Buyer lead generation, Seller lead generation, Recruiting, Agent showcase, Local SEO, Technical SEO, AEO, Generative search visibility, Content authority, Conversion, Follow Up Boss integration, Attribution, Google Business Profile alignment, Search Console and Video.

Do not create mass AI location pages.

Original local expertise matters more than page volume.

## Follow Up Boss

Finish the local integration architecture to pilot ready quality.

Support the verified Follow Up Boss API and webhook model.

Requirements:
server side credentials only
read only production default
historical backfill architecture
pagination
rate limiting
resume checkpoints
idempotency
event ledger
normalization
assignment history
stage history
first touch tracking
last touch tracking
reporting derivations
sync failure recovery

Do not store message bodies unless necessary.

Prefer metadata.

Do not read unsupported notes if the architecture says notes are excluded.

Do not fabricate SMS read receipts.

SMS delivery and read are different things.

Email opens, property views and website activity may be tracked separately as engagement signals.

Production FUB calls require Jeremy authorization.

## Hermes

Hermes is the preferred personal agent runtime.

Do not fork Hermes core.
Do not patch Hermes Desktop core.

Use supported profiles, skills, MCP and hooks.

Provide pilot ready templates for RCRE Agent and RCRE Broker.

Focused skills should include RCRE Today, Lead Prioritization, Follow Up, Database Follow Up, Plan My Day, Business Coaching, Broker Command, Marketing Assistant and RCRE Procedures where knowledge exists.

Do not build 39 skills simply because they were previously listed.

Build the skills that support the three core AI functions.

## AI Providers

Do not design the commercial model around RCRE paying Claude inference fees per agent.

Users may use supported providers through Hermes.

Where supported, users may use their ChatGPT subscription through the Hermes OpenAI or Codex OAuth route.

Other supported provider subscriptions or user supplied credentials may be used.

RCRE controlled default inference should favor free or local models where practical.

The product must remain provider agnostic.

Do not hard code Anthropic.
Do not hard code OpenAI.

## MCP

The RCRE MCP server is the controlled bridge between Hermes and RCRE data.

No unrestricted SQL.
No generic database query tool.

Use narrow tools such as:
get_my_today
get_hot_leads
get_unanswered_leads
get_stale_leads
get_contact
get_contact_history
get_tasks
get_appointments
get_pipeline
get_agent_performance
get_broker_exceptions
get_source_performance
draft_follow_up
request_task_creation
request_stage_update

Model supplied user IDs or roles are never authoritative.

Resolve identity and authority server side.

Write tools require approval.

No send tool in the MVP.

Audit every tool call.

Do not log raw sensitive values unnecessarily.

## Security

Maintain organization scoped data, row level security, FORCE ROW LEVEL SECURITY where appropriate, deny by default policies, least privilege, service role separation, server only secrets, read only production defaults, approval gates, audit logs, no unrestricted DB MCP, no PII in Hermes long term memory and no autonomous high risk actions.

Protect against PII entering Hermes memory through direct input or file path routes.

Hooks must fail closed where required.

Prohibited actions include changing listing prices, editing executed contracts, executing contracts, sending legally sensitive communications without approval, fair housing judgments, protected class targeting, committing brokerage funds, deleting critical records, changing brokerage policy and unsupervised legal advice.

Technical enforcement beats prompt instructions.

## Demo Data

Use high quality synthetic data that tells intentional stories.

Include 15 to 25 contacts, buyers, sellers, past clients, Zillow leads, Facebook leads, Instagram leads, YouTube leads, website leads, referrals, appointments, tasks, property activity, email engagement metadata, text metadata, pipeline stages, deals, listings, open houses and 3 to 5 recruiting prospects.

Create clear stories:
Hot buyer resurfacing
Lead nobody contacted
Lead sitting too long
Past client opportunity
Seller prospect engaging with content
Recruit attending AI training
Agent with overdue follow up
Agent with poor status hygiene
Strong lead source
Weak lead source

Avoid meaningless filler.

## Demo Flow

The finished demo should support this story end to end.

Agent:
1. Open landing page.
2. Enter Demo Agent.
3. Open RCRE Today.
4. See priority lead.
5. Ask RCRE AI why.
6. Draft a follow up.
7. Show approval state.
8. Open contact.
9. Review timeline and next action.
10. Search CRM.
11. Open Pipeline.
12. Open Listing.
13. Build marketing campaign.
14. Open Training.
15. Ask RCRE AI to plan the day.
16. Ask what needs approval.

Broker:
17. Sign out.
18. Enter Managing Broker.
19. Open RCRE Command.
20. Review management exceptions.
21. Open unanswered lead.
22. Open agent activity.
23. Open full funnel reporting.
24. Show fallout.
25. Open Recruiting.
26. Open engaged recruit.
27. Explain AI Academy engagement.
28. Return to Join RCRE experience.

This story should take approximately 5 to 8 minutes.

## Responsive Quality

Verify major screens at desktop, laptop, tablet and mobile.

Critical mobile screens:
Today
RCRE AI
Contacts
Contact detail
Command
Recruiting

Do not force desktop tables into mobile.

Use appropriate responsive layouts.

No horizontal overflow.
No clipped navigation.
No unreadable controls.

## Testing and Verification

Maintain existing tests and expand only where valuable.

Before completion, verify all relevant typechecks, production builds, MVP tests, demo tests, RLS, FORCE RLS, role isolation, agent scoping, broker visibility, recruiting isolation, MCP authorization, PII memory guard, FUB backfill, FUB normalization, webhook idempotency, out of order events, duplicate events, read only enforcement, first touch derivation, stage aging derivation, reporting metrics, critical click paths, both persona flows, light mode, dark mode, responsive routes, console errors, dead links and dead buttons.

Fix failures before claiming completion.

Do not lower test expectations simply to get green.

## Documentation Discipline

Do not create documentation volume for its own sake.

Only create or update documents needed to operate, verify, hand off or govern the product.

Prefer working software over another research report.

Do not continue external design research unless a specific unresolved problem requires it.

If documentation conflicts with this goal, update it clearly and preserve historical reasoning where appropriate.

## Stop Conditions

Do NOT stop because a feature is future work, a UI is good enough, one subagent finished, tests compile, another document could be written, the product has mocked data or there is a reversible local implementation decision.

Continue until the final acceptance criteria are met.

DO stop if production credentials are required, production write access is required, a legal or compliance decision is required, an RCRE business policy is required, money must be spent, an irreversible external action is needed or Jeremy must explicitly authorize the next action.

## Final Acceptance Criteria

Before claiming completion:

1. Start the final demo locally.
2. Leave it running.
3. Provide one URL.
4. Provide Demo Agent and Demo Broker instructions.
5. Personally execute the full 28 step demo story.
6. Verify every major route in light mode.
7. Verify every major route in dark mode.
8. Verify critical mobile routes.
9. Run all test suites.
10. Run production builds.
11. Confirm security checks.
12. Confirm no production systems were changed.
13. Confirm nothing outside RCRE was modified.
14. Produce a concise final report with:
What is fully functional
What is simulated
What is pilot ready
What requires credentials
What requires RCRE policy
What requires production authorization
Known limitations
Security posture
Tests passing
Exact recommended demo sequence

Then STOP.

Leave the demo running for Jeremy.

The objective is not to produce another plan.

The objective is to finish the strongest possible RCRE demo and pilot ready brokerage operating system from the current project.
