"""Flag likely mobile horizontal overflow: fixed pixel widths and non-wrapping
grids in the demo's page and component sources."""
import re, pathlib
root = pathlib.Path("apps/rcre-demo/src")
hits = []
for f in sorted(root.rglob("*.tsx")):
    for i, line in enumerate(f.read_text().splitlines(), 1):
        for pat in (r'\bw-\[\d{3,}px\]', r'\bmin-w-\[\d{3,}px\]',
                    r'grid-cols-[4-9](?![a-z])', r'\bwhitespace-nowrap\b'):
            if re.search(pat, line):
                # sm:/md:/lg: prefixed rules are desktop-only and safe
                bare = re.search(r'(?<![a-z:])' + pat, line)
                if bare and not re.search(r'(sm|md|lg|xl):' + pat.replace('\\b',''), line):
                    hits.append(f"{f.relative_to(root)}:{i}  {line.strip()[:110]}")
for h in hits: print(h)
print(f"{len(hits)} candidates")
