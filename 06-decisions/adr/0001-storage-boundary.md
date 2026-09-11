# ADR-0001 — All RCRE work stays inside `RCRE/`; everything outside is read-only

**Status:** Accepted
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald

## Context

RCRE work happens inside `Jeremy's_2026_Master_Build_Folder`, a drive containing roughly 110
top-level entries of prior and active work — several of which are live production systems
(LegendsOS at legendsos.app), several of which are client-sensitive (Loan Factory), and several of
which contain real PII. An agent working loosely across that drive can damage unrelated systems,
leak data between clients, or create a second, divergent copy of this project.

The workspace's own history shows this risk is real: there are four near-identical copies of
`realtor_cobranded_marketing_gpt_knowledge`, duplicate `Loan_Factory_Coaching_Final_Rebuild`
folders, seven near-duplicate `PROJECT-INVENTORY` files, and `.bak-*` files used as version
control.

## Decision

1. Every file created for RCRE lives inside `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`.
   No exceptions — including temporary files, caches, build output, and session scratch.
2. Everything outside `RCRE/` is read-only. Inspect in place. Copy in; never move in. Never modify.
3. Before running any command that could write outside `RCRE/`, stop and check where it writes.
   If output cannot be redirected into `RCRE/`, ask Jeremy before proceeding.
4. Session scratchpads under `/private/tmp` are out of bounds. Use `RCRE/99-scratch/`.

Full rules in [GOVERNANCE.md](../../GOVERNANCE.md).

## Alternatives considered

- **Work across the drive and tidy up later.** Rejected — the drive's existing duplication is
  direct evidence that cleanup does not happen.
- **Use the standard session scratchpad for temp files.** Rejected — Jeremy explicitly excluded
  `/tmp`, and scratch files routinely become load-bearing.
- **A separate top-level drive location outside the master folder.** Rejected — Jeremy designated
  `RCRE/` inside the master folder as the workspace.

## Consequences

- Easy: the whole project is one portable, auditable, deletable directory.
- Easy: reasoning about what is "ours" versus "reference."
- Hard: some tools need explicit configuration to keep output local.
- Accepted cost: occasional friction when a tool wants to write elsewhere. Storage discipline
  outranks convenience.

## Revisit when

Never, unless Jeremy changes the engagement's workspace.
