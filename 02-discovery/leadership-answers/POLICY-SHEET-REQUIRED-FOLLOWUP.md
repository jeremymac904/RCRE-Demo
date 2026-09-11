# Required follow-up — decision sheet

**For:** Taquilla Allen and Julio Arango · **From:** Jeremy McDonald
**Time to complete:** about ten minutes

You asked for an alert when required follow-up has not happened. We can build it — the detection
code is already written. It will not run until you tell us what "required" means, because
otherwise the system would be measuring your agents against **our** standard while appearing to
measure them against yours.

Four categories. Not fifty rules. These are the ones that change what the system does.

**Your answers do not have to be perfect.** They are stored as configuration, not code — you can
change any number later without anyone deploying anything. A rough answer today is worth far more
than a precise one next quarter, because until this is filled in the alert does not exist.

---

## 1 · NEW INTERNET LEAD
*Website forms, Facebook, Instagram, YouTube — anyone who raised their hand and does not know you yet.*

| Question | Your answer |
|---|---|
| First attempt required within | ______ minutes |
| Minimum attempts in the first 24 hours | ______ |
| Minimum attempts in the first 7 days | ______ |
| Required channels *(circle)* | call · text · email |
| Must attempts use **different** channels, or do three calls count? | ______ |
| Moves to nurture after | ______ days with no response |

## 2 · ZILLOW LEAD
*Separate because the economics and the expectation are different — and because you pay for these.*

| Question | Your answer |
|---|---|
| First attempt required within | ______ minutes |
| Minimum attempts in the first 24 hours | ______ |
| Minimum attempts in the first 7 days | ______ |
| Required channels *(circle)* | call · text · email |
| Must attempts use different channels? | ______ |
| Moves to nurture after | ______ days |

## 3 · PAST CLIENT AND SPHERE
*A different kind of failure. Nobody is racing you; the risk is that a year passes.*

| Question | Your answer |
|---|---|
| Minimum touches per year | ______ |
| Alert if no contact in | ______ days |
| Should closing anniversaries be automatic? | yes / no |
| Required channels *(circle)* | call · text · email · handwritten · any |

## 4 · RECRUITING PROSPECT
*Confidential pipeline. Usually licensed with someone else.*

| Question | Your answer |
|---|---|
| First contact after they engage *(course, event, Join page)* within | ______ hours |
| Minimum touches in the first 30 days | ______ |
| Alert if no contact in | ______ days |
| Who owns the follow-up: the ISA, Julio, Taquilla, or the agent who referred them? | ______ |

---

## Three questions that change how the alerts behave

**A. Who hears about a missed follow-up first?**

| | |
|---|---|
| ☐ | The agent only, quietly, with a chance to fix it |
| ☐ | The agent, then the team lead if still missed after ____ hours |
| ☐ | The agent and the managing broker at the same time |

*Our suggestion, for what it is worth: agent first, escalate second. An accountability system that
starts by reporting people to their broker gets resented, then gamed, then ignored. One that gives
them a chance to fix it first gets used.*

**B. Do business hours count?**

A lead arriving at 9pm Saturday — does the clock start immediately, or at the next business
morning? *(This one materially changes whether your response-time numbers look good or bad, and it
should reflect what you actually expect of people, not what makes the report flattering.)*

☐ Immediately, always · ☐ Business hours only · ☐ Business hours except Zillow · ☐ Other: ______

**C. Is there a floor nobody may go below, regardless of source?**

Some brokerages set one rule — "every lead gets a call attempt within an hour, full stop." If you
have one, it is simpler than four categories, and simple rules are the ones agents follow.

☐ Yes: ______________________ · ☐ No, per-category rules are right for us

---

## Two things we should say plainly

**This measures your agents.** Once these numbers exist, the system will produce a list of who is
not meeting them. That is what you asked for, and it is the right tool — but it is worth setting
numbers you are prepared to hold people to, rather than aspirational ones that make everybody look
non-compliant in week one.

**Start loose.** You can tighten later once you can see the real distribution. It is much easier to
raise a standard when the data shows people are already clearing it than to defend one that half
the brokerage fails on day one.

---

*Answers go into `follow_up_policies`, per organisation, versioned with an effective date — so
changing a rule does not retroactively rewrite whether someone was compliant last month.*
