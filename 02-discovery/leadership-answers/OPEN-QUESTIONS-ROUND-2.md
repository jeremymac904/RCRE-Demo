# Open questions — round 2

**Raised:** 2026-08-24, after [Taquilla Allen's answers](2026-08-24-TAQUILLA-ALLEN.md).
**For:** Taquilla Allen and Julio Arango.

Round 1 asked what RCRE needs. These are the questions that Taquilla's answers *created* — mostly
because she asked for things that require a policy decision only the brokerage can make.

Ordered by what blocks work.

---

## Blocking — work stops without these

### 1. What counts as "required follow-up"? — **blocks a P0 alert**

You asked for an alert when required follow-up has not occurred. We can build it the day you
define it. Right now we cannot, because "required" is a brokerage standard, not a technical one,
and if we invent a default the system will quietly enforce *our* standard against *your* agents.

Concretely, for a new lead:

- How many attempts, over what period, before it counts as properly worked?
- Does it differ by source? (A Zillow lead and a past-client referral probably deserve different
  cadences.)
- Do the attempts have to be across different channels — call, then text, then email — or does
  three calls count?
- At what point do you want to hear about it: after the first missed step, or at the end?

A rough answer unblocks us. It does not have to be final; make it configurable and revise it once
you can see the numbers.

### 2. How long may a lead sit in each stage before you hear about it?

Same shape of question, for the stage-aging alert. We need a number per stage — New Lead,
Attempting Contact, Connected, Appointment, Active Buyer, Active Seller, Under Contract,
Long-Term Nurture. The demo shows placeholders so you can see the concept; they are ours, not
yours, and they are labelled that way.

### 3. May we register Follow Up Boss webhooks now? — **time-sensitive**

This is the one with a cost that grows every week we wait.

Four of the seven metrics you asked for — **response time, contact attempts, time in stage, and
where leads fall out** — cannot be calculated from Follow Up Boss's history. FUB tells us a
contact's *current* stage; it does not tell us when it changed. That history has to be recorded as
it happens, from webhooks, starting the day we connect.

So the funnel report can only ever go back as far as the day we turn this on. Every week of delay
is a week of reporting you will never be able to produce.

Registering webhooks is read-only. It does not write to Follow Up Boss, does not change what
agents see, and does not touch your data. It only listens.

We would need: authorisation to proceed, and confirmation that RCRE's FUB plan and API permission
level allow webhook registration (assumption A-16).

---

## Needed soon — shapes the build

### 4. The Alabama team lead — what is that role, exactly?

You mentioned that in Alabama, leads sometimes go to a team lead who then distributes them. That
is a role between broker and agent, and no prior document accounted for it.

- Is it a formal role, or a senior agent who happens to do it?
- Which agents does a team lead cover?
- Should a team lead see their team's numbers in Command — response times, unanswered leads,
  overdue follow-ups?
- Should they receive the alerts, instead of or as well as you and Julio?

This decides whether the permission model has two roles or three, which is cheaper to settle now.

### 5. "Customisable dashboards" — how customisable?

That phrase spans an order of magnitude. Two readings:

- **Narrow** — the report is fixed; you choose agent, source, stage, market and period, and save
  the combinations you use often. *(This is what we have built.)*
- **Broad** — you assemble your own dashboards from a library of widgets, arranged how you like.

The narrow version is done. The broad version is a project. Which did you mean?

### 6. What else is in the stack?

The technology question asked about transaction management, e-signature, accounting and file
storage, and the answer covered Follow Up Boss and marketing. We have recorded the rest as
*unknown* rather than *none*, because a two-state brokerage necessarily has them.

- Transaction management — Dotloop, SkySlope, Brokermint, something else?
- E-signature — DocuSign, Authentisign, built into the transaction platform?
- Accounting / commission disbursement?
- File storage — Google Drive, Dropbox, SharePoint?
- Email — Google Workspace or Microsoft 365?

Not to integrate all of them. To know what exists before we assume it does not.

---

## Worth a conversation

### 7. Text read receipts — the honest answer, and what to do instead

You asked to see when someone has read a text. **That is not possible over SMS**, and not because
of Follow Up Boss. Text messaging has a *delivered* signal and no *read* signal — there is nothing
for any vendor to show. In the US, business texts on ordinary 10-digit numbers often cannot even
confirm the handset received it, only that the carrier accepted it.

Channels that *do* have real read receipts are RCS, WhatsApp Business, and Facebook/Instagram
messaging. Moving to one of those is a genuine option, but it is a change to how every agent talks
to every client — consent, deliverability and compliance all move with it. Worth discussing on its
own merits; not something we can switch on.

What we would build instead, and what we think actually answers your question:

- Delivered / not delivered
- **They replied** — the only unambiguous signal that something landed
- Email opened, link clicked
- Property views, searches and site visits after the message
- Inbound calls

A client who opened two emails and viewed three homes after your text has told you more than a
read receipt would. We will not label any of that "read".

### 8. What does the ISA do now, and what happens to that work?

You said the ISA making recruiting calls has not been productive. Before we design something to
replace it:

- What does the ISA actually do day to day, and where do they record it?
- Roughly what does the current motion produce — calls, conversations, meetings, joins?
- Is the goal to replace that work, or to give that person better leads to call?

That last one matters. A recruiting system that feeds a person warm, engaged prospects is a
different build from one that removes the role.

### 9. RCRE procedures — do they exist in writing?

The third AI function you defined is a coach that understands "RCRE procedures". We have nothing
that describes them. Onboarding checklists, listing procedures, transaction steps, compliance
requirements, scripts, training material — in any form, however rough.

Without this, the coach can talk about real estate in general. With it, it can talk about how RCRE
does things, which is the entire difference.

### 10. Does Julio see it the same way?

Everything in this round came from one of two brokers. Where Julio's priorities differ, we would
rather know now than discover it in a demo.

---

## Not asked, deliberately

We have not asked about commission splits, fees, budget or timeline. Those shape the commercial
agreement, not the product, and we do not need them to keep building.
