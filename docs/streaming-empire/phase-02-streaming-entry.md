# EMPIRE+ Phase 2 — Streaming Entry

Status: complete
Player-facing scope: scene-first business preview, career qualification, and registration clearance

## Player flow

1. Open Streaming Platform from Lifestyle.
2. Enter a Level 0 headquarters preview—not an access or payment page.
3. Inspect the company, content, technology, and audience operating rooms.
4. See live founder qualification from existing career values.
5. Reach every required threshold.
6. Open Platform Registration and permanently store clearance in the career save.

Phase 2 ends at the registration chamber. Platform identity, audience promise,
and fixed incorporation belong to Phase 3.

## Launch qualification

All three requirements are mandatory:

- Liquid cash: `$85M`
- Fame: `65`
- Reputation: `55`

The screen reads these values directly from existing Actor Empire player state.
Phase 2 does not create duplicate progress counters and studio ownership,
business equity, rights value, or partnerships do not bypass the requirements.

The readiness percentage is the average capped progress across the three
metrics. The player also sees the number cleared and their current bottleneck.

## Saved transition

Opening Platform Registration performs the only Phase 2 lifecycle transition:

```text
LOCKED -> ELIGIBLE
```

The transition:

- is validated by the eligibility service
- is idempotent
- creates a deterministic `LIFECYCLE_CHANGED` ledger fact
- stores the `streaming-launch-clearance` milestone
- does not charge money or energy
- does not create subscribers, servers, technology, catalog rights, or a platform identity

Skipping directly from `LOCKED` to `ACTIVE` remains invalid.

## Screen architecture

### Level 0 business preview

- shared `StreamingVisualScene` Level 0 headquarters art
- clear promise that every server, title, audience, and territory is earned
- four scene-driven previews: company, content, technology, and audience
- direct action to qualification or registration, depending on live state

### Founder qualification

- `$85M` Personal Cash
- `65` Fame
- `55` Reputation
- current/target values and honest progress bars
- launch action enabled only when all three pass
- saved-clearance state for returning careers

## UI/UX rules

- Mobile-first and safe-area aware
- Strong business-simulation hierarchy rather than a generic gate
- Scene art followed by operating rooms, qualification, and the first-ten-minutes path
- Minimum 44px touch targets for actions
- Lucide icons only
- Dialog semantics for the clearance moment
- Explicit `$85M = $70M consumed + $15M treasury` explanation
- Dynamic viewport sizing and reduced-motion support
- No fake owned catalog, invisible errors, or qualification shortcut

## Reused systems

- `player.money`
- `player.stats.fame`
- `player.stats.reputation`
- Phase 1 platform lifecycle, metrics, capacity, catalog references, deterministic ledger, migration, and compaction
- Existing Lifestyle navigation and bottom-navigation visibility behavior
- Existing commercial policy seam without surfacing it as the purpose of the screen

## Deliberately deferred to Phase 3 and later

- platform naming, logo, colors, sound ident, and brand promise
- fixed incorporation
- infrastructure strategy and capacity purchase inside HQ
- optional executives and later board systems
- subscription products and pricing
- real catalog import and licensing
- live Originals commissioning
- weekly streaming simulation
- dashboards, graphs, and detailed title analysis
- store purchase implementation

## Validation

Run:

```bash
npm run audit:streaming-access-phase2
npm run audit:owned-streaming-foundation
npm run audit:save-migration
npm run audit:save-transfer
npm run lint
npm run build
```
