# Requirements

**Status:** Not yet written. Blocked on discovery.

Requirements are deliberately not drafted before RCRE leadership answers
[../02-discovery/DISCOVERY-QUESTIONS.md](../02-discovery/DISCOVERY-QUESTIONS.md). Writing them now
would mean inventing a brokerage rather than describing this one — and the prior work in this
workspace shows what happens when specification outruns confirmed need.

## What lands here, and when

| Document | Written after | Covers |
|---|---|---|
| `FUNCTIONAL-REQUIREMENTS.md` | Discovery answers | What each surface must do, by role |
| `DATA-REQUIREMENTS.md` | C1, C2, D1, D7 | Entities, fields, retention, ownership, migration from whatever exists today |
| `PERMISSION-MATRIX.md` | A3, A5, F6 | Role × resource × action. Drives RLS policies directly |
| `COMPLIANCE-REQUIREMENTS.md` | F1–F9 | Fair housing, MLS display rules, license display, TCPA consent, state advertising rules |
| `INTEGRATION-REQUIREMENTS.md` | C5–C11 | What connects to what, in what direction, with what auth |
| `NON-FUNCTIONAL.md` | H1, H2 | Availability, performance, backup, audit, data residency |

## Interim

Until these exist, the working scope is
[../03-architecture/RCRE-ECOSYSTEM-ARCHITECTURE.md](../03-architecture/RCRE-ECOSYSTEM-ARCHITECTURE.md)
and the assumptions in [../02-discovery/ASSUMPTIONS-REGISTER.md](../02-discovery/ASSUMPTIONS-REGISTER.md).
