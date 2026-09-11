# Hermes Bots and Messaging Gateways for RCRE

**Date:** 2026-08-19
**Covers:** Phase 7

---

## 1. The finding that settles the question

From the official Bot Mode documentation:

> **"A Bot *is* a Hermes profile — isolated config, memory, skills, credentials, and chat history
> under `~/.hermes/profiles/<name>/`."**

Bot Mode is a **UI layer over profiles**, not a separate system. Everything is visible from the CLI:
`hermes -p <bot> chat` opens the same agent, and bot routines appear in `hermes cron list`.

Therefore the proposed roster — RCRE Broker Bot, Marketing Bot, Listing Bot, Lead Bot, Training Bot,
Recruiting Bot, Transaction Bot — is not a design choice about bots. **It is a question about how
many isolated profiles RCRE wants to provision, credential, update, and audit.**

Each additional bot means: another `HERMES_HOME`, another `.env`, another `auth.json`, another
memory store, another skill set to keep current, another cron namespace, another MCP configuration,
another local audit database.

---

## 2. Evaluating the proposed bot roster

| Proposed bot | Separate profile? | Recommendation |
|---|---|---|
| RCRE Broker Bot | **Yes** | **Keep.** Genuinely different entitlements (whole-brokerage read, recruiting access), different data scope, different risk posture. This is the one case where isolation is a security requirement, not a convenience. |
| RCRE Recruiting Bot | **Maybe** | **Merge into the broker profile initially.** Split later only if a dedicated recruiter exists who must not see production or client data. Discovery question B9 decides this. |
| RCRE Marketing Bot | No | **Skill + toolset within the agent profile.** Marketing work is agent-contextual — it needs *this agent's* listings, brand, and voice. A separate profile would have none of that. |
| RCRE Listing Bot | No | **Skill.** Same reasoning, more strongly: listing work is inseparable from the agent's book. |
| RCRE Lead Bot | No | **Skill + cron routine.** Lead work is the agent's core job, not a side conversation. |
| RCRE Transaction Bot | No | **Skill.** Needs the agent's transactions. |
| RCRE Training Bot | **Optional** | **Skill first.** A separate Academy profile is only justified if RCRE offers the public/external tier to non-RCRE agents, where isolation from brokerage data becomes mandatory. |

### Recommended structure

**Three profile archetypes, not seven bots:**

1. **`rcre-agent`** — one per licensed agent. Carries every agent-facing skill. Marketing, listing,
   lead, and transaction "bots" are skills and command-palette entries inside it.
2. **`rcre-broker`** — brokerage-wide entitlements. RCRE Command, recruiting, accountability,
   exceptions.
3. **`rcre-admin` / `rcre-staff`** — function-scoped for TC, marketing staff, ops.

Plus, if and when the external funnel launches: **`rcre-academy-public`**, deliberately isolated
from all brokerage data.

### Why fewer profiles is the right call

- **Context.** An agent's assistant is valuable *because* it knows the agent's book, voice, and
  history. Splitting into seven bots fragments exactly the context that creates the value.
- **Operations.** Seven profiles × 13 agents = 91 provisioned environments. That is unmanageable
  with no central admin console (Capability Audit L2/L3).
- **User experience.** "Which bot do I ask?" is a tax on the user. A single assistant that routes
  internally by skill is a better product.
- **Cost.** Each profile is a separate model configuration and a separate set of scheduled runs.

### Where multiple bots genuinely earn their place

**Group chats.** Bot Mode supports 2–6 bots in a room with *"up to three serial rounds of member
turns"*, `@name` handoffs, and `@user` escalation for *"real judgement calls."* One legitimate RCRE
use: a **listing launch room** where an agent bot, a marketing bot, and a compliance-reviewer bot
collaborate on a campaign, escalating the fair-housing call to a human. That is a real workflow, not
theatre — but it is a **Phase 5+ experiment**, not a launch requirement.

---

## 3. Messaging channels — what a Realtor would actually use

Hermes supports 25+ platforms. Most are irrelevant to a US brokerage. Ranked by real utility:

### Tier 1 — build these

| Channel | Why | Notes |
|---|---|---|
| **SMS** | **The single most important channel.** Agents live in text. Delivers the morning brief, exception alerts, and "new lead" pings to the one app they always have open | Text-only. Ideal for *notification + short reply*, not for research |
| **Desktop / portal** | The primary work surface | Covered in the desktop strategy |
| **Email** | Digests, weekly reviews, anything long | Universal, no adoption cost |

### Tier 2 — likely valuable, decide at discovery

| Channel | Condition |
|---|---|
| **Microsoft Teams or Slack** | Whichever RCRE already runs internally (discovery C5). Excellent for the **broker** briefing and for team rooms. Full-featured: voice, images, files, threads, reactions |
| **Google Chat** | If RCRE is on Google Workspace |
| **WhatsApp** | Meaningful in South Florida markets (Broward, Miami-Dade), where it is a primary business channel |

### Tier 3 — deliberately not now

Telegram (low US Realtor adoption, though excellent technically), Discord (wrong register for a
brokerage), iMessage via BlueBubbles/Photon (needs a dedicated Mac and is fragile), Signal, Matrix,
Mattermost, IRC, ntfy, SimpleX, LINE, Home Assistant, and all Chinese platforms (DingTalk, Feishu,
WeCom, WeChat, QQ, Yuanbao).

**The temptation to enable many channels should be resisted.** Every gateway is credentials, an
allowlist, a service to keep running, and a support surface. Two channels done well beat eight
half-configured.

---

## 4. What messaging is genuinely good for — and what it is not

**Good:** push notification of exceptions and new leads · the morning brief · quick capture (voice
note after a showing) · one-line status questions · approving a queued action · after-hours
coverage alerts.

**Bad:** dense structured work (pipelines, tables, bulk edits) · anything requiring review of a long
draft · anything needing side-by-side comparison · first-time onboarding.

**The mobile insight.** The desktop strategy identifies mobile as Hermes Desktop's biggest gap.
**SMS and the RCRE web portal together are the mobile answer** — SMS for push and quick reply, the
responsive portal for anything structured. That combination is genuinely sufficient and requires no
native app.

---

## 5. Security and authorization

Hermes gateway authorization is **default-deny**: per-platform allow-all → DM pairing approved list
→ platform allowlist → global allowlist → global allow-all → deny.

For RCRE:

- **Never enable allow-all on any platform.** Explicit allowlists only.
- DM pairing (8-char codes, 1-hour expiry, 5-failure lockout, `chmod 0600`) is the provisioning path
  for adding an agent to a bot.
- Use `allow_admin_from` and `user_allowed_commands` so agents cannot run admin slash commands.
- **A gateway is a route into an agent's full toolset.** Treat a compromised phone as a compromised
  agent session. Offboarding must revoke gateway allowlist entries alongside MCP credentials.
- **Client PII over SMS is a real exposure.** Briefings delivered by SMS should reference contacts by
  first name and record ID, not full details. Full detail lives behind the portal.
- Consider a `pre_gateway_dispatch` hook (which can `skip` or `rewrite`) to strip or redact
  sensitive content on lower-trust channels.

---

## 6. Recommendation

1. **Do not build seven bots.** Build **three profile archetypes** with role-scoped skills. The
   proposed "bots" become skills and command-palette entries inside the agent profile.
2. **The one true separate bot is the broker profile**, because its entitlements genuinely differ.
3. **Two channels at launch: SMS and one internal channel** (Teams/Slack/Google Chat, per discovery).
   Email as a third for digests.
4. **SMS + responsive portal is RCRE's mobile strategy.** No native app required.
5. **Group-chat multi-bot collaboration is a Phase 5+ experiment**, evaluated on whether it beats a
   single agent with good skills — not adopted because it demos well.
6. **Authorization is default-deny, allowlist-only, with offboarding revoking gateway access.**
