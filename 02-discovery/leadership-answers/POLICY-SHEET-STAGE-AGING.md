# Stage aging — configuration sheet

**For:** Taquilla Allen and Julio Arango · **From:** Jeremy McDonald
**Time to complete:** about five minutes

You asked for an alert when a lead has been sitting in a stage too long. Same situation as the
follow-up sheet: the alerting is built, and it needs your numbers rather than ours.

Two questions per stage:

1. **How long** may someone sit here before it is a problem?
2. **Who hears about it** — agent, team lead, managing broker, owner?

---

| Stage | Alert after | Who is told |
|---|---|---|
| **New Lead** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |
| **Attempting Contact** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |
| **Connected** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |
| **Appointment** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |
| **Active Buyer** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |
| **Active Seller** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |
| **Under Contract** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |
| **Long-Term Nurture** | ______ days | ☐ agent ☐ team lead ☐ broker ☐ owner |

*Tick more than one where more than one should hear it. Leave a stage blank to mean "never alert
on this one" — Long-Term Nurture is a reasonable candidate.*

---

## Three notes before you fill it in

**New Lead and Attempting Contact are the ones that matter.** A lead stuck in New Lead is a lead
nobody has touched, which you have already told us is the core problem. The later stages are worth
watching but rarely urgent — an Active Buyer can legitimately spend three months looking.

**Under Contract is different in kind.** Time there is not a performance signal; it is the length
of an escrow. What you probably want alerted is not the duration but a *contingency date passing* —
which is a different feature, and worth telling us if you want it.

**These are not the same as the follow-up rules.** Follow-up asks *did the agent do the work*.
Stage aging asks *has this person stopped moving*, regardless of effort. A lead can be worked
diligently and still stall — and that is a coaching conversation, not a compliance one.

---

## First-draft thresholds, if it helps to react rather than start blank

**These are ours, not yours.** They are here because reacting to a number is faster than inventing
one. Cross them out freely — a number you disagree with is doing its job.

| Stage | Suggested | Reasoning |
|---|---|---|
| New Lead | 2 days | Beyond this it is not a new lead, it is a missed one |
| Attempting Contact | 7 days | A week of attempts without connecting means try a different channel |
| Connected | 14 days | Connected but not progressing usually means unqualified or unmotivated |
| Appointment | 10 days | An appointment that never converts to activity did not really happen |
| Active Buyer | 45 days | Long enough for a real search, short enough to catch someone who quietly stopped |
| Active Seller | 45 days | Same |
| Under Contract | 60 days | Beyond a normal escrow; something has gone wrong |
| Long-Term Nurture | *no alert* | The point of nurture is that it is slow |

---

*Answers go into `stage_aging_policies`, per organisation. Every threshold is configurable per
brokerage — nothing here is hard-coded, and changing a number takes effect immediately without a
deploy.*
