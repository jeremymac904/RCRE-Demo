# Alabama routing and assignment history

**Date:** 2026-08-24
**Basis:** [Taquilla Allen](../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md) §2
**Schema:** [0002_reporting_and_routing.sql](../apps/rcre/supabase/migrations/0002_reporting_and_routing.sql)

## What leadership described

> "Most leads come directly to the agents. In some cases, Julio or I will answer the lead and
> assign it to an agent. In Alabama, we sometimes answer the lead and assign it to the team lead,
> who then distributes it to an agent."

Three paths, and the third has a hop nothing in the data model represented:

```
A.  source ──────────────────────────────────────────────► agent
B.  source ──► Julio / Taquilla ─────────────────────────► agent
C.  source ──► leadership ──► ALABAMA TEAM LEAD ─────────► agent
```

## Why this is a correctness problem, not a modelling nicety

Response time is the metric leadership cares about most, and path C breaks it.

If response time is measured from **lead arrival**, then a lead that spent six hours with
leadership and a team lead before reaching an agent charges those six hours to the agent. Alabama
agents would look systematically slower than Florida agents for reasons entirely outside their
control — and leadership would be looking at a report that blames the wrong people.

So the system measures two different things and never adds them together:

| Metric | From → to | Whose problem |
|---|---|---|
| **Time to route** | lead received → final agent assigned | Leadership and routing |
| **First response time** | final agent assigned → first outbound touch | The agent |

Both are worth knowing. Six hours of routing delay is a real finding — it is just a finding about
the routing process, not about the agent.

## The role: a team lead is not a managing broker

The user's instruction was explicit, and it matches the business. A team lead:

- sees **their own team's** leads, agents and numbers
- does **not** see the brokerage
- receives **their team's** exception alerts
- distributes leads within the team
- has no recruiting visibility (that pipeline is confidential to the brokers)

The `rcre_user_role` enum already carried `team_lead`; what was missing was any way to know *which*
agents a given team lead covers.

## Follow Up Boss already models this

This was going to be invented. It does not need to be.

| FUB | Field | What it gives us |
|---|---|---|
| `GET /v1/teams` | `id`, `name`, `userIds[]`, **`leaderIds[]`** | Teams and who leads them |
| `GET /v1/users` | `role`, **`isOwner`**, `teamIds[]`, **`teamLeaderOf[]`** | Per-user role and leadership |
| `GET /v1/ponds` | — | Shared holding pools, if RCRE uses them |
| `GET /v1/groups/roundRobin` | — | Automatic distribution, if configured |

Sourcing the role from FUB rather than from an RCRE-only table matters more than it might seem:
there is then **one place** a person is made a team lead. If RCRE promotes someone in FUB, RCRE's
reporting follows automatically — nobody has to remember to update a second system, and the two
cannot drift apart and start disagreeing about who is responsible for whom.

`teams.market` is the one RCRE-owned field here, because FUB has no concept of a market and
leadership wants Alabama and Florida separable.

## What the schema adds

**`teams` / `team_members`** — mirror of FUB teams, with `is_leader` from `leaderIds`.

**`assignment_history`** — one row per hop. The fields that carry the Alabama chain:

| Field | Purpose |
|---|---|
| `from_user_id` → `to_user_id` | The hop |
| `reason` | `leadership_routed`, `team_lead_distributed`, `round_robin`, `manual_reassignment`… |
| `assigned_at` / `released_at` | How long each holder had it |
| `is_initial_receipt` | The first hop — where time-to-route starts |
| `is_final_agent` | The working agent — where response time starts |
| `team_id` | Which team's process this went through |
| `detected_via` | `webhook` (measured) or `backfill` (inferred) |

A path-C lead produces three rows; a path-A lead produces one. The same query answers both,
because "the assignment where `is_final_agent = true`" is well-defined either way.

## How a hop is detected

FUB has **no assignment history and no assignment event**. There is no `peopleAssigned` webhook.

The only signal is `peopleUpdated`, which fires on any change to a person. The handler must:

1. Resolve the person from the URI in the webhook payload
2. Compare `assignedUserId` against the stored value
3. If it changed: close the current `assignment_history` row (`released_at`, `is_current = false`)
   and open a new one
4. If it did not change: discard — this is the majority of `peopleUpdated` traffic

Inferring `reason` from the roles involved:

| From → to | Inferred reason |
|---|---|
| null → agent | `initial` |
| null → broker/owner | `initial`, `is_initial_receipt = true` |
| broker/owner → team lead | `leadership_routed` |
| team lead → agent | `team_lead_distributed` |
| agent → agent | `manual_reassignment` |
| pond → agent | `pond_claim` |

**This inference is a heuristic and should be labelled as one.** It reads intent from a role
transition, and a broker who happens to also be an agent will occasionally be misclassified. The
*timestamps* are facts; the *reason* is a guess, and reports should lean on the former.

## What cannot be recovered

**Assignment history before webhook activation does not exist and cannot be reconstructed.** FUB
tells us who owns a lead now. It has never recorded who owned it before, so there is nothing to
read.

At backfill we write a single `assignment_history` row per person with
`detected_via = 'backfill'`, `assigned_at = people.created` (a known approximation), and
`is_final_agent = true`. It is a starting point, not history, and it is marked as such so that
time-to-route and true first-response are computed only over `detected_via = 'webhook'` rows.

## Open questions for leadership

Recorded on the [round-2 sheet](../02-discovery/leadership-answers/OPEN-QUESTIONS-ROUND-2.md);
repeated here because they block the permission model:

1. Are RCRE's teams **already set up in Follow Up Boss** with the right leaders? If so this is
   configuration, not construction. If not, setting them up in FUB is the cheapest way to make
   RCRE reporting correct.
2. Should a team lead see their team's Command exceptions?
3. Should a team lead receive alerts instead of, or as well as, the managing broker?
4. Does Florida have team leads too, or is this Alabama-only? *(We have built for either.)*
5. Does RCRE use **ponds** or **round-robin** distribution? Both would appear as assignment hops
   and should be classified rather than read as manual routing.
