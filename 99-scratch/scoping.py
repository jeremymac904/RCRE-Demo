"""Role scoping check.

An agent must never reach broker surfaces or another agent's client records.
Recruiting is the sharpest case: prospects are usually licensed at another
brokerage, and leaking that pipeline to the agent roster is a real-world harm.
"""
import urllib.request, urllib.error

BASE = 'http://localhost:3200'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Do not follow redirects.

    The whole point of these cases is the redirect itself — a 307 to /today is
    the scoping control working. Following it turns every correct denial into a
    200 and the test reports a breach that is not there.
    """
    def redirect_request(self, *_args, **_kwargs): return None


OPENER = urllib.request.build_opener(NoRedirect)


def status(path, user):
    req = urllib.request.Request(BASE + path)
    if user: req.add_header('Cookie', f'rcre_demo_user={user}')
    try:
        with OPENER.open(req) as r: return r.status
    except urllib.error.HTTPError as e: return e.code

CASES = [
    # (path, persona, expected, why)
    ('/command',            'u-sarah', 307, 'broker-only surface'),
    ('/command/reporting',  'u-sarah', 307, 'broker-only reporting'),
    ('/recruiting',         'u-sarah', 307, 'confidential recruiting pipeline'),
    ('/recruiting/r-nia',   'u-sarah', 307, 'confidential recruit record'),
    ('/agents',             'u-sarah', 307, 'broker-only roster'),
    ('/agents/u-chad',      'u-sarah', 307, 'broker-only agent record'),
    ('/crm/c-tobias',       'u-sarah', 404, "another agent's contact"),
    ('/today',              'u-julio', 307, 'agent surface, broker redirected'),
    ('/command',            'u-julio', 200, 'broker may see Command'),
    ('/recruiting/r-nia',   'u-julio', 200, 'broker may see recruiting'),
    ('/crm/c-tobias',       'u-julio', 200, 'broker sees whole brokerage'),
    ('/crm/c-dana',         'u-sarah', 200, "agent sees their own contact"),
    ('/today',              None,      307, 'unauthenticated redirected'),
    ('/command',            None,      307, 'unauthenticated redirected'),
]

fails = 0
for path, user, expected, why in CASES:
    got = status(path, user)
    ok = got == expected
    if not ok: fails += 1
    print(f"  {'ok ' if ok else 'FAIL'}  {(user or 'anon'):9} {path:24} got {got}, want {expected}  — {why}")
print(f"\n{fails} scoping failure(s)")
raise SystemExit(1 if fails else 0)
