#!/bin/bash
# Final acceptance verification for the RCRE build (goal.md §Testing).
# Run from RCRE/. Does NOT run the production build — that clobbers the running
# dev server's .next, so it is done separately at handoff time.
set -u
cd "$(dirname "$0")/.."
fail=0
step() { printf "\n=== %s ===\n" "$1"; }

step "Canonical app typecheck"
(cd apps/rcre-demo && npx tsc --noEmit) || fail=1

step "Canonical app tests (domain layer + UI)"
(cd apps/rcre-demo && npx vitest run 2>&1 | tail -5) || fail=1

step "Legacy apps/rcre still builds (not yet archived)"
(cd apps/rcre && npx tsc --noEmit) || fail=1

step "Static QA sweep (dead buttons, hardcoded colours, overflow, ADR-0014)"
python3 99-scratch/qa.py || fail=1

step "Role scoping (agent must not reach broker or recruiting surfaces)"
python3 99-scratch/scoping.py || fail=1

step "Full 32-step demo story (agent + broker)"
python3 99-scratch/demo-story.py || fail=1

step "Training click-through (Community + Classroom + Academy AI)"
python3 99-scratch/training-story.py || fail=1

step "AI Advantage source project unmodified (read-only rule)"
./99-scratch/verify-source-readonly.sh || fail=1

step "Nothing outside RCRE modified by this session"
# Anchored on when THIS session began touching RCRE (09:30 on 2026-08-26), not
# on a hardcoded date carried over from an earlier session — that stale
# threshold started flagging Jeremy's own Loan Factory files from the previous
# day as if this build had written them. A check that cries wolf about someone
# else's work is worse than no check.
SESSION_START="2026-08-26 09:30:00"

if grep -qi "rcre" ../.claude/launch.json 2>/dev/null; then
  echo "FAIL: ../.claude/launch.json contains an RCRE entry"; fail=1
else
  echo "../.claude/launch.json — clean, no RCRE entry"
fi

outside=$(find .. -maxdepth 3 -newermt "$SESSION_START" -type f \
  -not -path "../RCRE/*" -not -path "*/node_modules/*" -not -path "../.git/*" \
  -not -name ".DS_Store" -not -path "../.claude/*" \
  -not -path "../SKOOL COMMUNITIES/*" 2>/dev/null)
if [ -n "$outside" ]; then
  echo "MODIFIED OUTSIDE RCRE BY THIS SESSION:"; echo "$outside"; fail=1
else
  echo "no file outside RCRE modified since $SESSION_START"
fi

printf "\n=== RESULT: %s ===\n" "$([ $fail -eq 0 ] && echo PASS || echo FAIL)"
exit $fail
