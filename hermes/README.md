# RCRE Hermes assets

Profile, skill and hook **templates**. Nothing here is installed, activated, or
connected to a live Hermes instance — that requires Jeremy's authorization and
the pilot plan in `05-planning/RCRE-HERMES-PILOT-PLAN.md`.

**Extension posture (ADR-0009):** supported surfaces only — profiles, skills,
hooks, MCP. No Hermes core patches. No desktop fork. No `ROUTES_AREA` work.
An earlier project achieved custom Hermes UI by patching Hermes core while
claiming an upstream strategy; ADR-0009 exists because of it. Nothing in this
directory touches Hermes source.

## Layout

```
profiles/
  rcre-agent/    config.yaml · SOUL.md    — one per licensed agent
  rcre-broker/   config.yaml · SOUL.md    — broker-owner and managing brokers
skills/
  rcre-today/ rcre-lead-prioritization/ rcre-lead-follow-up/
  rcre-database-follow-up/ rcre-pipeline-accountability/
  rcre-business-coach/ rcre-broker-command/ rcre-procedures/
  rcre-marketing-assistant/
hooks/
  block-pii-memory.mjs   — pre_tool_call guard (blocking)
  rcre-pii-rules.json    — the rule table, shared with the tested implementation
```

Two profiles, not seven bots. A profile is a boundary; a skill is a topic. Seven
assistants would be seven sets of credentials, seven audit surfaces and seven
places for a rule to drift.

## Skills against the three confirmed functions

`04-requirements/RCRE-PRODUCT-REQUIREMENTS.md` defines three functions, and
leadership defined them. Every skill maps to one, or it is stated here that it
does not.

| Skill | Function |
|---|---|
| `rcre-lead-prioritization` | 1 — lead follow-up and prioritisation |
| `rcre-lead-follow-up` | 1 |
| `rcre-database-follow-up` | 1 |
| `rcre-today` | 1 and 2 — the daily surface over both |
| `rcre-pipeline-accountability` | 2 — pipeline and accountability |
| `rcre-broker-command` | 2, brokerage-wide. Broker profiles only |
| `rcre-business-coach` | 3 — personalised business coaching |
| `rcre-procedures` | 3 — the "RCRE procedures" half. **Placeholder: no corpus exists yet** (discovery items 7 and 13). It currently does one useful thing, which is decline to invent policy |
| `rcre-marketing-assistant` | 3 — "marketing ideas" is named in function 3. It is also the highest fair-housing risk in the product, and it is worth asking at pilot review whether it should ship at all |

## Distribution

Skills ship as a **private GitHub tap**:

```bash
hermes skills tap add rcre/rcre-skills   # GITHUB_TOKEN required for private
```

Version-controlled, drift-detected. Note that `hermes skills update` **skips
locally-edited skills** — so any rule that actually matters is enforced in the
RCRE MCP server or in a blocking hook, never only described in a skill.

## The PII memory guard — enforcement, not instruction

goal.md requires **no PII in Hermes long term memory**. A SOUL.md sentence is
guidance to a model. The control is `hooks/block-pii-memory.mjs`, registered as
a `pre_tool_call` hook in both profiles with `fail_closed: true`.

**Mechanism.** Hermes hands the pending tool call to the hook on stdin. The hook
classifies it, and if it is a write to long-term memory, scans every string in
the arguments against the rule table. On a match it emits
`{"action":"block","message":…}` and exits **2** — both documented block signals
— and the tool call does not run. Nothing is redacted or rewritten; the write
simply does not happen.

**What counts as a memory write.** Any tool whose name carries `memory`,
`remember`, `soul`, `journal`, `scratchpad` or `knowledge_base` and is not a
read verb (`get_`, `read_`, `search_`, `list_`, `find_`, `recall_`, `query_`,
`show_`, `load_`) — plus any file-writing tool whose arguments mention
`MEMORY.md`, `SOUL.md`, a `memories/` directory, or `~/.hermes`. That second
class matters: the file path is the obvious way around a memory-tool guard.

**What it blocks** (`hooks/rcre-pii-rules.json`):

| Category | Catches |
|---|---|
| email address | any address-shaped string |
| phone number | US formats with or without punctuation or country code |
| government identifier | SSN-shaped digits |
| street address | number + street-type word |
| financial figure | `$450,000`, `$450k` |
| account or licence number | runs of nine or more digits |
| date of birth | `date of birth`, `DOB`, `born on` |
| client financial status | pre-approved, pre-qualified, credit score, down payment, DTI, loan amount |
| client identity | a full name within eighty characters of client / lead / buyer / seller / prospect / borrower / customer, in either order |
| CRM record identifier | `person_id`, `contact id`, `lead-id`, `deal_id` |

**Fail closed.** The hook blocks — it does not allow — when the rule table
cannot be read, stdin is not JSON, the tool name cannot be found in the
envelope, a rule fails to compile, or the hook itself throws. `fail_closed: true`
in `config.yaml` covers the remaining case where the hook cannot be executed at
all.

**No PII in the refusal.** The block message names the *categories* matched,
never the matched text. A guard that echoes what it just refused to store has
created a second copy of it, in a log.

**Install** (per pilot machine, once):

```bash
mkdir -p ~/.hermes/rcre-hooks
cp RCRE/hermes/hooks/block-pii-memory.mjs \
   RCRE/hermes/hooks/rcre-pii-rules.json ~/.hermes/rcre-hooks/
chmod +x ~/.hermes/rcre-hooks/block-pii-memory.mjs
```

Requires Node 20+ on the agent machine, which the RCRE stack already assumes.
Verify the hook fires before the pilot:

```bash
echo '{"tool_name":"memory_write","tool_input":{"content":"Buyer Sarah Chen, 205-555-0134"}}' \
  | node ~/.hermes/rcre-hooks/block-pii-memory.mjs; echo "exit=$?"   # expect exit=2
```

**Where this stops being provable.** Two things cannot be verified without a
running Hermes install, and neither should be claimed as done:

1. **Matcher syntax and the stdin envelope.** The matcher globs in `config.yaml`
   and the field names Hermes puts on stdin come from the capability audit, not
   from a live instance. The hook is defensive about the envelope — it accepts
   `tool_name`, `toolName`, `tool.name`, `name` and blocks anything it cannot
   read — but the matcher strings must be checked against the Hermes hooks
   documentation on the pilot machine. Until then, the honest statement is that
   the guard is *written and tested*, not that it is *deployed*.
2. **A user who edits their own `config.yaml`.** Hermes profiles live on the
   agent's machine and the agent owns that file. Removing the hook is possible
   and nothing in Hermes prevents it. That is why the durable controls are
   server-side: the RCRE MCP server never returns message bodies, resolves
   identity from the credential, and gates every write behind a recorded
   approval. The hook reduces accidental leakage, which is the realistic failure
   mode; it is not a defence against a determined local user.

Four of the five guards in `01-research/hermes/HERMES-SECURITY-GUARDRAILS.md`
Layer C are **not built**: the protected-class term guard, the outbound guard,
the credential guard and the audit forwarder. Fair housing and outbound are
currently held by skill instruction plus the absence of any send tool. Do not
describe those four as implemented.

## The rule these templates exist to enforce

**Hermes holds no RCRE truth and no RCRE authority.** Every fact comes from the
RCRE MCP server, which resolves identity server-side. A skill is guidance to a
model; it is not a control.

## AI provider

Deliberately unset. Each user configures their own provider in Hermes — their
own subscription, an OAuth path, their own key, or a free or local model. RCRE
does not pay per-agent frontier inference and the architecture stays
provider-agnostic (ADR-0011). No file in this directory names a model vendor,
and a test asserts it.

---

## Academy content and Hermes — what belongs where

**Added 2026-08-24**, after the AI Advantage curriculum was imported into RCRE
(14 courses, 181 lessons, 220 prompts). Addendum Phase G.

The temptation with a real curriculum in hand is to give the agent's assistant all of it. That is
the wrong move, and the reason is worth stating once so nobody re-derives it later.

| Material | Where it belongs | Why |
|---|---|---|
| Course and lesson **metadata** — titles, descriptions, order, level, resources | RCRE data layer, read through `get_academy_progress` / `get_next_lesson` | Small, structured, changes when the curriculum changes. Retrieval through a tool means one source of truth and an audit trail. |
| Lesson **transcripts and video** | Nowhere yet | Not indexed, not retrievable. The tool descriptions say so explicitly rather than leaving it ambiguous. |
| The **220 student prompts** | Downloadable resources in the Academy | They are things an agent copies and uses, not context the model needs resident. |
| A **skill** teaching the agent how to help apply a lesson | `hermes/skills/` | Instructional, not data-bearing — which is the rule for every skill here. |
| Any of the above in **`MEMORY.md`** | **Never** | Hermes memory is personal, small, and for the agent's own preferences and working style. |

**The distinction that matters most:** the AI Advantage curriculum is *training content*, not *RCRE
brokerage procedure*. The `rcre-procedures` skill is still a placeholder with no corpus, and
importing the Academy does not fill it. Teaching an agent to prompt ChatGPT is not the same as
telling them how RCRE handles an escrow, and wiring the first into the second would produce an
assistant that answers brokerage-policy questions out of a marketing course.

**On the PII guard:** the memory hook blocks client PII, not course material. Lesson text is not
PII and would pass. The control that keeps the curriculum out of memory is that no tool writes it
there — absence, again, rather than a filter.
