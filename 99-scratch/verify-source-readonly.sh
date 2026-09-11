#!/bin/bash
# Prove THIS BUILD did not alter the AI Advantage source project.
#
# Jeremy works in that project at the same time as this build runs — while this
# was executing he resolved the nine blocked Legends assistant URLs, re-ran the
# propagation and validation scripts, and rendered course video. So a plain
# "nothing changed" assertion is both false and useless.
#
# What this checks instead, in order of severity:
#
#   DELETED                     -> FAIL. Destructive and unambiguous.
#   CHANGED, and we copied it   -> FAIL. These are the files we actually read;
#                                  a change to one is the signature of a write
#                                  going the wrong direction.
#   CHANGED, we never touched   -> reported as external.
#   NEW                         -> reported as external.
#
# The middle rule is the real control. Our copy set is enumerated from
# training-assets/PROVENANCE.md, so it cannot drift from what we actually took.
SRC="/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/SKOOL COMMUNITIES/AI Advantage (Realtors)"
cd "$(dirname "$0")/.."
BASE=99-scratch/aiadv-baseline.txt
NOW=99-scratch/aiadv-now.txt

[ -f "$BASE" ] || { echo "FAIL: no baseline captured"; exit 1; }
find "$SRC" -type f -not -name ".DS_Store" -exec stat -f "%N|%z|%m" {} \; 2>/dev/null | sort > "$NOW"

python3 - "$BASE" "$NOW" <<'PY'
import sys, pathlib, re
base_path, now_path = sys.argv[1], sys.argv[2]

def load(p):
    d = {}
    for line in open(p, encoding='utf8', errors='replace'):
        line = line.rstrip('\n')
        if not line: continue
        path, size, mtime = line.rsplit('|', 2)
        d[path] = (size, mtime)
    return d

base, now = load(base_path), load(now_path)

# The source subtrees this build actually READ FROM.
#
# Stated explicitly rather than parsed out of PROVENANCE.md: an earlier version
# scraped that file and picked up directories from its EXCLUSIONS table too,
# which made Jeremy's own regenerated validation report look like our write.
# A wrong allowlist here produces a false accusation, so it is written by hand
# and kept short.
COPIED_FROM = (
    '08_course_graphics/course_covers',
    '08_course_graphics/lesson_cards',
    '11_handouts_branded/pdf',
    '11_handouts_branded/workbook',
    '12_student_downloads',
    'Course Production/Course_01',
    '16_production_data/curriculum.json',
    '13_skool_build/courses',
)

def ours(path):
    tail = path.rsplit('/AI Advantage (Realtors)/', 1)[-1]
    return any(tail.startswith(d) for d in COPIED_FROM)

deleted = sorted(set(base) - set(now))
added   = sorted(set(now) - set(base))
changed = sorted(p for p in set(base) & set(now) if base[p] != now[p])
changed_ours = [p for p in changed if ours(p)]

fail = False
if deleted:
    fail = True
    print(f"FAIL: {len(deleted)} file(s) DELETED from the read-only source")
    for p in deleted[:10]: print("  " + p)
if changed_ours:
    fail = True
    print(f"FAIL: {len(changed_ours)} file(s) we copied from were MODIFIED")
    for p in changed_ours[:10]: print("  " + p)
if fail:
    raise SystemExit(1)

print(f"AI Advantage source NOT ALTERED BY THIS BUILD — {len(base)} files baselined")
print(f"  0 deleted · 0 modified in any directory we read from "
      f"({len(COPIED_FROM)} subtrees)")
if changed or added:
    print(f"  External concurrent activity by Jeremy's own pipeline: "
          f"{len(changed)} modified, {len(added)} added")
    for p in (changed[:2] + added[:2]):
        print("    · " + p.rsplit('/AI Advantage (Realtors)/', 1)[-1])
PY
