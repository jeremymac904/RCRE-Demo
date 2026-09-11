"""Broker-only crawl, unbuffered, with progress. Split out because the reporting
filter permutations make the broker persona much larger than the others."""
import sys
sys.argv = sys.argv
exec(open('99-scratch/crawl.py').read().split('for user, seeds in [')[0])

seen, bad = crawl('u-julio', ['/command', '/recruiting', '/agents', '/crm', '/listings', '/pipeline'])
print(f"=== u-julio — {len(seen)} URLs ===")
for c, u, s in sorted(bad): print(f"   {c}  {u}   (linked from {s})")
if not bad: print("   all 200")

seen, bad = crawl(None, ['/', '/join', '/login'])
print(f"=== public — {len(seen)} URLs ===")
for c, u, s in sorted(bad): print(f"   {c}  {u}   (linked from {s})")
if not bad: print("   all 200")
