# EMPIRE+ Phase 3 — Founding Wizard

Status: complete on the simplified founding contract
Player-facing scope: legal brand identity, founding manifesto, articles,
atomic incorporation, and pre-launch headquarters handoff

See [Streaming Empire v7 — Authoritative Handoff](./README.md) for the connected
system overview.

## Entry contract

Phase 3 begins only after Phase 2 has stored:

```text
ownedStreamingPlatform.lifecycle = ELIGIBLE
```

The player must still hold at least $85M when they confirm incorporation.

## Simplified founding flow

1. Start Platform cinematic
2. Platform name
3. Mark or uploaded logo
4. Wordmark lockup
5. Typeface
6. Brand colours
7. Founding manifesto and audience promise
8. Articles of Incorporation and animated signature
9. Corporate seal and fixed $85M payment

The promise is an opening creative direction, not a permanent gameplay class.
Founding has no ident, storefront, opening-market, infrastructure, server,
executive, launch-scale, funding-plan, or partnership choice.

## Resume and save behaviour

Wizard progress is stored at:

```text
player.ownedStreamingPlatform.foundingDraft
```

The draft contains only the current screen, legal brand identity, audience
promise, manifesto, and update week. Saving it does not:

- create the company
- deduct cash
- create debt, equity, or outside capital
- grant technology, infrastructure, or reach
- select an ident, storefront, opening market, or server city
- create an infrastructure draft or spending commitment
- hire executives
- add subscribers, catalog titles, or rights

Returning to an eligible career resumes the stored step and selections.

## Fixed incorporation economics

| Movement | Amount |
|---|---:|
| Personal cash charged | $85M |
| Legal, registration, foundational licensing, and platform setup consumed | $85M |
| Opening company treasury | $0 |

Every new v8 company starts with:

- `incorporationModel = FIXED_V8_ZERO_TREASURY`
- 100% founder ownership
- founder as CEO
- $0 outside capital
- $0 debt
- no automatically appointed executives
- `infrastructureStrategy = UNDECIDED`
- unconfigured service identity and storefront
- no market operations or infrastructure draft
- no installed technology capabilities or technology levels
- Reach Level 0

The entire $85M formation payment is consumed and cannot be spent again.
Infrastructure, founder capital, and optional leadership are deliberate
company actions inside HQ. Finance opens first so the operating account can be
funded explicitly.

## Atomic incorporation

Final confirmation validates the reviewed draft and liquid cash. One player
update then:

- deducts exactly $85M from personal cash
- creates the canonical platform identity
- stores the immutable v8 founding profile
- opens company treasury at exactly $0
- records the debt-free, undiluted incorporation capital action
- installs the founder as current CEO with an empty appointment roster
- clears the temporary draft
- records `FOUNDATION_CREATED`
- stores `platform-incorporated`
- transitions `ELIGIBLE -> FOUNDING`
- queues a fact-backed `FOUNDING_KEYNOTE`

Repeated confirmation returns `ALREADY_INCORPORATED` and cannot charge again.
Failed validation leaves player cash and company state unchanged.

## Cinematic behaviour

The registration scene and founding reveal read already-committed identity and
financial facts. The reveal is skippable, replayable, keyboard-contained, and
reduced-motion aware. It records only `VIEWED` or `DISMISSED` presentation
status; skipping cannot reverse incorporation.

## Save schema

The current owned-platform schema is v23. Founding state includes:

- compact `foundingDraft`
- `FIXED_V8_ZERO_TREASURY` `foundingProfile` for new companies, with historical `FIXED_V7` records preserved
- founder-led `leadership`
- incorporation entry in `finance.capitalActions`
- `treasuryCash` and `debtPrincipal`
- exact visual mark or uploaded logo, wordmark lockup, typeface, colours,
  manifesto, and gameplay promise

Normalization retains old sound ident, Day-One Market, and server fields only
for incorporated legacy companies. New drafts and new companies never write
those operational choices.

## Validation

Run:

```bash
npm run audit:streaming-founding-phase3
npm run audit:streaming-simplified-founding-phase2
npm run audit:streaming-canonical-foundation-phase1
npm run audit:streaming-access-phase2
npm run audit:owned-streaming-foundation
npm run build
```
