# ADR-0014 — RCRE will not promise SMS read receipts; it will report engagement instead

**Status:** **APPROVED** — 2026-08-24 by Jeremy McDonald, with the leadership discovery it derives from
**Date:** 2026-08-24
**Decision owner:** Jeremy McDonald
**Basis:** [Taquilla Allen, 2026-08-24](../../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md) §1;
verification in [FUB-CAPABILITY-VERIFICATION.md §8.1](../../08-mvp/FUB-CAPABILITY-VERIFICATION.md)

## Context

RCRE's managing broker asked for the ability to see when a client has read a text message sent
through Follow Up Boss. It is a reasonable request and an obvious gap from a user's point of view.

It is also not deliverable over SMS. SMS carries a delivery receipt and no read event; there is no
read signal for any vendor in the chain to surface. FUB's Inbox Apps API does expose a `Read`
message status, which makes it look available, but that field is *written by an integrating app*
that has obtained a read signal from a channel that produces one — RCS, WhatsApp, Facebook
messaging. FUB does not detect reads on its own SMS traffic, and neither could we.

The failure mode this ADR exists to prevent is specific: shipping a "Read" indicator populated by
a proxy — an email open, a link click, a site visit — and letting leadership believe it means the
text was read. That would be worse than not building it, because management decisions about agent
performance would rest on a label that is not true.

## Decision

**We will not display, imply, or promise SMS read status anywhere in the product.**

We will instead surface the signals that genuinely exist, each labelled as itself:

- Delivered / not delivered (from `textMessagesUpdated`)
- **They replied** — treated as the primary "it landed" signal, because it is the only unambiguous one
- Email opened, email link clicked (`emEventsOpened`, `emEventsClicked`)
- Property views, searches, site visits (`/v1/events`)
- Inbound calls (`callsCreated`)

No aggregate may be named "read", "seen", or "opened" unless every input to it is genuinely that.

Where a UI would naturally show a read indicator, it shows **contact engagement since the last
outbound touch** instead — which answers the underlying question, "did this land?", better than a
read receipt would, because a reply or a property view is intent and a read is not.

If leadership wants true read receipts, the honest path is a **channel change** — RCS or WhatsApp
Business — and it must be presented to them as a change to how every agent communicates with every
client, with its own cost, consent and compliance implications. It is not a feature toggle.

## Alternatives considered

**Show a "Read" badge driven by email opens or site activity.** Rejected. It is the requested
label attached to different data. Leadership would use it to evaluate agents.

**Show nothing and say the request is not possible.** Rejected as incomplete. The stated request
cannot be met; the underlying need can be, and largely is.

**Move RCRE texting to RCS or WhatsApp now.** Rejected as premature — a communications-platform
decision affecting clients, consent, deliverability and compliance, made on the strength of one
sentence in a discovery answer. Worth raising with leadership; not worth assuming.

## Consequences

**Easy:** every engagement number in RCRE Command is defensible, because each traces to a real
event. Nobody has to caveat the dashboard.

**Hard:** a conversation with Taquilla in which the answer to a direct request is "not that, but
here is the thing you actually wanted." That conversation is the deliverable, and it should happen
before the reporting surface is demonstrated, not after.

**Accepted cost:** RCRE may still want read receipts badly enough to change channel. This ADR does
not prevent that; it prevents pretending.

## Revisit when

- RCRE decides to adopt RCS or WhatsApp Business for client messaging, **or**
- FUB ships native read status on its own SMS traffic (which would require a protocol change
  beneath them), **or**
- US carriers ship a read-receipt mechanism for A2P long-code SMS.
