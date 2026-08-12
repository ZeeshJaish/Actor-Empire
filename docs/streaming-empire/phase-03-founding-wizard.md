# EMPIRE+ Phase 3 — Founding Wizard

Status: complete on the v7 contract
Player-facing scope: identity, audience promise, fixed review, atomic
incorporation, and cinematic handoff

See [Streaming Empire v7 — Authoritative Handoff](./README.md) for the connected
system overview.

## Entry contract

Phase 3 begins only after Phase 2 has stored:

```text
ownedStreamingPlatform.lifecycle = ELIGIBLE
```

The player must still hold at least $85M when they confirm incorporation.

## Three-screen founding flow

1. **Brand Studio**
   - platform name
   - logo direction
   - colour identity
   - sound ident with optional preview
2. **Audience Promise**
   - Event House
   - Binge Machine
   - Fandom Forever
   - World Stage
   - Everyone’s Screen
   - Technology First
   - Balanced
3. **Fixed Incorporation Review**
   - editable identity and promise summary
   - exact personal-cash charge
   - consumed setup amount and opening treasury
   - founder ownership, CEO, debt, and outside-capital terms
   - one final incorporation action

The promise is an opening creative direction, not a permanent gameplay class.
Founding has no launch-scale, funding-plan, server, executive, or partnership
choice.

## Resume and save behaviour

Wizard progress is stored at:

```text
player.ownedStreamingPlatform.foundingDraft
```

The draft contains only the current screen, brand identity, audience promise,
and update week. Saving it does not:

- create the company
- deduct cash
- create debt, equity, or outside capital
- grant technology, infrastructure, or reach
- hire executives
- add subscribers, catalog titles, or rights

Returning to an eligible career resumes the stored step and selections.

## Fixed incorporation economics

| Movement | Amount |
|---|---:|
| Personal cash charged | $85M |
| Legal, registration, foundational licensing, and platform setup consumed | $70M |
| Opening company treasury | $15M |

Every new v7 company starts with:

- `incorporationModel = FIXED_V7`
- 100% founder ownership
- founder as CEO
- $0 outside capital
- $0 debt
- no automatically appointed executives
- `infrastructureStrategy = UNDECIDED`
- Reach Level 0

The $70M consumed setup amount is not treasury and cannot be spent again.
Infrastructure, additional founder capital, and optional leadership are
deliberate company actions inside HQ.

## Atomic incorporation

Final confirmation validates the reviewed draft and liquid cash. One player
update then:

- deducts exactly $85M from personal cash
- creates the canonical platform identity
- stores the immutable v7 founding profile
- places exactly $15M in company treasury
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

The current owned-platform schema is v7. Founding state includes:

- compact `foundingDraft`
- `FIXED_V7` `foundingProfile`
- founder-led `leadership`
- incorporation entry in `finance.capitalActions`
- `treasuryCash` and `debtPrincipal`
- typed identity logo, sound ident, colours, and promise

Normalization retains legacy pre-v7 founding terms only for save migration.
New drafts and new companies never write those choices.

## Validation

Run:

```bash
npm run audit:streaming-founding-phase3
npm run audit:streaming-access-phase2
npm run audit:owned-streaming-foundation
npm run lint
```
