"""Click-through of the Training experience Jeremy asked for (section 22).

Each step is a real request in the order he will click it. A step fails on a
wrong status or when the content that makes the step meaningful is absent.
"""
import urllib.request, urllib.error

BASE = 'http://localhost:3200'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_a, **_k): return None


OPENER = urllib.request.build_opener(NoRedirect)
AGENT, BROKER = 'u-sarah', 'u-julio'


def get(path, user=None):
    req = urllib.request.Request(BASE + path)
    if user:
        req.add_header('Cookie', f'rcre_demo_user={user}')
    try:
        with OPENER.open(req, timeout=150) as r:
            return r.status, r.read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, ''


STEPS = [
    ('Training overview',          '/training',                                  AGENT,  200, 'Community'),
    ('Community feed',             '/training/community',                        AGENT,  200, 'Training of the Day'),
    ('Filter a category',          '/training/community?category=Wins',          AGENT,  200, None),
    ('Filter AI Questions',        '/training/community?category=AI+Questions',  AGENT,  200, None),
    ('Training of the Day lesson', '/training/classroom/c02/c02-l05',            AGENT,  200, 'Stop Accepting the First Answer'),
    ('Classroom catalog',          '/training/classroom',                        AGENT,  200, 'ChatGPT Setup and Personalization'),
    ('Open a course',              '/training/classroom/c01',                    AGENT,  200, 'Settings and Personalization'),
    ('Open long course (19)',      '/training/classroom/c13',                    AGENT,  200, None),
    ('Lesson WITH video',          '/training/classroom/c01/c01-l01',            AGENT,  200, 'c01-l01.mp4'),
    ('Second video lesson',        '/training/classroom/c01/c01-l07',            AGENT,  200, 'c01-l07.mp4'),
    ('Lesson without video',       '/training/classroom/c04/c04-l01',            AGENT,  200, None),
    ('Ask what to learn next',     '/assistant?ask=learn-next',                  AGENT,  200, None),
    ("Ask today's training",       '/assistant?ask=todays-training',             AGENT,  200, None),
    ('Ask training on follow-up',  '/assistant?ask=training-on',                 AGENT,  200, None),
    ('Recruiting Academy signal',  '/recruiting/r-nia',                          BROKER, 200, 'AI community'),
    ('Join shows the Academy',     '/join',                                      None,   200, 'Prompting for Real Estate'),
    ('Join shows the community',   '/join',                                      None,   200, 'And a room to ask in'),
    # Negatives — the guards must hold.
    ('Agent cannot reach Command', '/command',                                   AGENT,  307, None),
    ('Anon cannot reach Training', '/training',                                  None,   307, None),
    ('Anon cannot reach Community','/training/community',                        None,   307, None),
    ('Bad course 404s',            '/training/classroom/nope',                   AGENT,  404, None),
    ('Mismatched lesson 404s',     '/training/classroom/c01/c02-l05',            AGENT,  404, None),
]

fails = 0
for label, path, user, want, needle in STEPS:
    code, body = get(path, user)
    ok = code == want
    found = True if needle is None else (needle.lower() in body.lower())
    if not (ok and found):
        fails += 1
    mark = 'ok  ' if (ok and found) else 'FAIL'
    extra = '' if found else f'  [missing: "{needle}"]'
    print(f'  {mark} {label:<28} {code}{extra}')

print(f'\n{fails} failing step(s) of {len(STEPS)}')
raise SystemExit(1 if fails else 0)
