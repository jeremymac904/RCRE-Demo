"""Crawl every internal link reachable in the demo, per persona. Reports non-200s
and the page that linked to them."""
import re, time, urllib.request, urllib.parse

BASE = 'http://localhost:3200'
SKIP = re.compile(r'^/_next/|\.(png|jpg|jpeg|ico|svg|webp)$')

def dedupe_key(u):
    """Identity for visit-tracking.

    `from` only affects the back link's label, never the page. Counting it as
    part of a URL's identity makes the crawl combinatorial — every filter
    permutation of the report gets re-crawled once per referrer — without
    testing anything new.
    """
    p = urllib.parse.urlsplit(u)
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query) if k != 'from']
    return urllib.parse.urlunsplit(('', '', p.path, urllib.parse.urlencode(sorted(q)), ''))


def crawl(user, seeds):
    seen, queue, bad = set(), [(s, 'seed') for s in seeds], []
    while queue:
        u, src = queue.pop(0)
        key = dedupe_key(u)
        if key in seen: continue
        seen.add(key)
        p = urllib.parse.urlsplit(u)
        safe = urllib.parse.urlunsplit(
            ('', '', urllib.parse.quote(p.path), urllib.parse.quote(p.query, safe='=&'), ''))
        req = urllib.request.Request(BASE + safe)
        if user: req.add_header('Cookie', f'rcre_demo_user={user}')

        # The dev server compiles routes on demand and will reset the connection
        # under a tight loop. Retry transport errors, and only record a genuine
        # HTTP status as a finding — a dropped socket is a crawler problem, not
        # an application one, and conflating the two produces false failures.
        html = None
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=90) as r:
                    html = r.read().decode('utf8', 'replace')
                break
            except urllib.error.HTTPError as e:
                bad.append((e.code, u, src)); break
            except Exception:
                time.sleep(1 + attempt * 2)
        else:
            bad.append(('CONN', u, src))
        if html is None: continue
        time.sleep(0.15)
        for h in sorted(set(re.findall(r'href="(/[^"#]*)"', html))):
            h = h.replace('&amp;', '&')
            if SKIP.search(h) or dedupe_key(h) in seen: continue
            queue.append((h, u))
    return seen, bad

for user, seeds in [
    ('u-sarah', ['/today','/crm','/listings','/pipeline','/training','/marketing','/assistant']),
    ('u-julio', ['/command','/recruiting','/agents','/crm','/listings','/pipeline']),
    (None,      ['/','/join','/login']),
]:
    seen, bad = crawl(user, seeds)
    print(f"=== {user or 'public'} — {len(seen)} URLs ===")
    for c, u, s in sorted(bad): print(f"   {c}  {u}   (linked from {s})")
    if not bad: print("   all 200")
