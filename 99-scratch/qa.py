"""Static QA sweep over the demo app.

Checks the UX-quality bar in goal.md that a typecheck cannot catch:
dead buttons, hardcoded colours (which break dark mode), and page-level
horizontal overflow risk. Run before claiming completion.
"""
import re, pathlib, sys

SRC = pathlib.Path("apps/rcre-demo/src")
fails = []

def rel(p): return str(p.relative_to(SRC))

# --- 1. Dead buttons -------------------------------------------------------
# A <button> with no onClick in a file that is not a client component does
# nothing when clicked. goal.md forbids fake buttons outright.
for f in SRC.rglob("*.tsx"):
    text = f.read_text()
    is_client = text.lstrip().startswith("'use client'")
    for i, line in enumerate(text.splitlines(), 1):
        if "<button" not in line:
            continue
        # Look ahead a few lines — props are often wrapped.
        window = "\n".join(text.splitlines()[i - 1:i + 4])
        if "onClick" in window or 'type="submit"' in window:
            continue
        if not is_client:
            fails.append(f"DEAD BUTTON  {rel(f)}:{i}  {line.strip()[:70]}")

# --- 2. Hardcoded colours --------------------------------------------------
# The theme swaps CSS custom properties. A literal hex or rgb() in a component
# does not swap, so it survives into dark mode as a light-mode colour.
HEX = re.compile(r'(?:bg|text|border|ring|fill|stroke|from|to|via)-\[#[0-9a-fA-F]{3,8}\]')
RAW = re.compile(r'(?:color|background(?:-color)?)\s*:\s*[\'"]?#[0-9a-fA-F]{3,8}')
for f in SRC.rglob("*.tsx"):
    for i, line in enumerate(f.read_text().splitlines(), 1):
        if HEX.search(line) or RAW.search(line):
            # globals.css owns the palette; components must not.
            fails.append(f"HARDCODED COLOUR  {rel(f)}:{i}  {line.strip()[:70]}")

# --- 3. Horizontal overflow risk -------------------------------------------
# Wide content is fine inside an overflow-x-auto container and a page-level
# scrollbar otherwise. Flag fixed widths that are not obviously contained.
WIDE = re.compile(r'\bmin-w-\[(\d{3,})px\]')
for f in SRC.rglob("*.tsx"):
    lines = f.read_text().splitlines()
    for i, line in enumerate(lines, 1):
        m = WIDE.search(line)
        if not m or int(m.group(1)) < 400:
            continue
        context = "\n".join(lines[max(0, i - 6):i])
        if "overflow-x-auto" not in context and "overflow-auto" not in context:
            fails.append(f"OVERFLOW RISK  {rel(f)}:{i}  {line.strip()[:70]}")

# --- 4. ADR-0016: no unearned compliance claims ----------------------------
# The UI may say a review is REQUIRED. It may not say a check PASSED unless
# something actually evaluates the content and is capable of failing it.
PASSED_CLAIM = re.compile(
    r'\b(fair.housing|compliance|legal|disclosure)\b[^\n]{0,40}\b(check\s+)?(passed|cleared|verified|approved|ok)\b',
    re.I)
for f in SRC.rglob("*.tsx"):
    for i, line in enumerate(f.read_text().splitlines(), 1):
        if line.strip().startswith(('*', '//')):
            continue  # comments may discuss the history
        if PASSED_CLAIM.search(line):
            fails.append(f"UNEARNED COMPLIANCE CLAIM  {rel(f)}:{i}  {line.strip()[:70]}")

# --- 5. ADR-0014: no SMS read receipts anywhere in the UI -------------------
READY = re.compile(r'\b(read receipt|marked as read|has read|seen your text|read your text)\b', re.I)
for f in SRC.rglob("*.ts*"):
    for i, line in enumerate(f.read_text().splitlines(), 1):
        if READY.search(line) and "ADR-0014" not in line and "no read" not in line.lower():
            fails.append(f"ADR-0014  {rel(f)}:{i}  {line.strip()[:70]}")

for x in fails:
    print(x)
print(f"\n{len(fails)} issue(s)")
sys.exit(1 if fails else 0)
