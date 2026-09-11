"""Execute the 28-step demo story from RCRE_GOAL_FULL_BUILD.md end to end.

Every step is a real request against the running app, in the order Jeremy would
click it, with the persona he would be signed in as. A step fails if the route
does not return 200 (or the documented redirect) or if the content that makes
the step meaningful is absent.
"""
import re, urllib.request, urllib.error

BASE = 'http://localhost:3200'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_a, **_k): return None


OPENER = urllib.request.build_opener(NoRedirect)


def get(path, user=None):
    req = urllib.request.Request(BASE + path)
    if user: req.add_header('Cookie', f'rcre_demo_user={user}')
    try:
        with OPENER.open(req, timeout=120) as r:
            return r.status, r.read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, ''


AGENT, BROKER = 'u-sarah', 'u-julio'

STEPS = [
    (1,  'Open landing page',            '/',                          None,   200, 'Systems and structure'),
    (2,  'Enter Demo Agent',             '/login',                     None,   200, 'Sarah Brockner'),
    (3,  'Open RCRE Today',              '/today',                     AGENT,  200, 'Good'),
    (4,  'See priority lead',            '/today',                     AGENT,  200, 'Dana Whitfield'),
    (5,  'Ask RCRE AI why',              '/assistant?ask=why-dana',    AGENT,  200, None),
    (6,  'Draft a follow up',            '/assistant?ask=draft-dana',  AGENT,  200, None),
    (7,  'Show approval state',          '/assistant?ask=approvals',   AGENT,  200, None),
    (8,  'Open contact',                 '/crm/c-dana?from=/today',    AGENT,  200, 'Dana Whitfield'),
    (9,  'Timeline and next action',     '/crm/c-althea',              AGENT,  200, 'Submit the repair request'),
    (10, 'Search CRM',                   '/crm?q=mandarin',            AGENT,  200, 'Dana'),
    (11, 'Open Pipeline',                '/pipeline',                  AGENT,  200, None),
    (12, 'Open Listing',                 '/listings/l-2?from=/today',  AGENT,  200, 'Ortega'),
    (13, 'Build marketing campaign',     '/listings/l-2',              AGENT,  200, None),
    (14, 'Open Training',                '/training',                  AGENT,  200, 'ChatGPT Setup and Personalization'),
    (14.1,'Open a real course',          '/training/classroom/c02',              AGENT,  200, 'Prompting for Real Estate'),
    (14.2,'Open lesson WITH video',      '/training/classroom/c01/c01-l01',      AGENT,  200, 'c01-l01.mp4'),
    (14.3,'Open lesson without video',   '/training/classroom/c02/c02-l05',      AGENT,  200, 'Video in production'),
    (15, 'Ask RCRE AI to plan the day',  '/assistant?ask=plan-my-day', AGENT,  200, None),
    (15.1,'Ask what to learn next',      '/assistant?ask=learn-next',  AGENT,  200, None),
    (16, 'Ask what needs approval',      '/assistant?ask=approvals',   AGENT,  200, None),
    (17, 'Sign out',                     '/login',                     None,   200, 'Choose a view'),
    (18, 'Enter Managing Broker',        '/command',                   BROKER, 200, 'Good'),
    (19, 'Open RCRE Command',            '/command',                   BROKER, 200, 'need'),
    (20, 'Review management exceptions', '/command',                   BROKER, 200, 'Leads nobody answered'),
    (21, 'Open unanswered lead',         '/crm/c-marcus?from=/command',BROKER, 200, 'Marcus Ordonez'),
    (22, 'Open agent activity',          '/agents/u-chad?from=/command',BROKER,200, 'Chad Vesely'),
    (23, 'Open full funnel reporting',   '/command/reporting?from=/command', BROKER, 200, 'First response'),
    (24, 'Show fallout',                 '/command/reporting',         BROKER, 200, 'Where leads fall out'),
    (25, 'Open Recruiting',              '/recruiting',                BROKER, 200, 'Where they came from'),
    (26, 'Open engaged recruit',         '/recruiting/r-nia?from=/recruiting', BROKER, 200, 'Nia Okonkwo'),
    (27, 'Explain AI Academy engagement','/recruiting/r-nia',          BROKER, 200, 'ChatGPT Setup and Personalization'),
    (28, 'Return to Join RCRE',          '/join',                      None,   200, 'Prompting for Real Estate'),
]

fails = 0
for n, label, path, user, want, needle in STEPS:
    code, body = get(path, user)
    ok = code == want
    found = True if needle is None else (needle.lower() in body.lower())
    if not (ok and found):
        fails += 1
    mark = 'ok ' if (ok and found) else 'FAIL'
    extra = '' if found else f'  [missing: "{needle}"]'
    print(f'  {mark} {str(n):>5}. {label:<32} {code}{extra}')

print(f'\n{fails} failing step(s) of {len(STEPS)}')
raise SystemExit(1 if fails else 0)
