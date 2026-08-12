# EMPIRE+ Phase 1 — Platform Foundation

Status: complete  
Player-facing screens: intentionally unchanged

## Purpose

Create the durable foundation for the player's directly owned streaming
platform before adding unlock, founding, or dashboard screens.

This phase does not reuse `StreamingState`. That existing type represents one
movie or show licensed to a third-party platform. EMPIRE+ is a company-level
domain stored at `player.ownedStreamingPlatform`.

## Reused Actor Empire systems

- `getAbsoluteWeek(age, currentWeek)` remains the shared game clock.
- `migratePlayerSave` remains the only player-save migration entrypoint.
- `compactPlayerForPersistence` remains the save-size protection entrypoint.
- Existing projects remain the source of truth for titles; the owned platform
  stores project IDs only.
- The existing premium system remains the purchase foundation. Phase 1 adds an
  access-policy seam but no product, price, SKU, receipt grant, or store UI.
- Cinematics follow the existing state-driven approach, but use a private
  serializable queue until a later phase builds the presentation layer.

## Added foundation

### Owned platform state

`OwnedStreamingPlatformState` includes:

- versioned lifecycle and identity
- direct founder ownership
- infrastructure strategy and capacity
- eight future technology branches
- the seven CEO Pulse metrics
- project-ID catalog references
- deterministic simulation seed
- bounded weekly snapshots and cause markers
- idempotent event ledger
- fact-backed cinematic queue

### Save safety

- Save migration version 27 initializes and repairs the owned-platform state.
- Invalid rates, ownership, health, capacity, and lifecycle values are clamped.
- Weekly history, ledger, cinematic queue, catalog references, milestones, and
  processed-week keys have hard persistence limits.
- Reprocessing the same absolute week cannot duplicate a snapshot or ledger
  event.

### Access policy

The resolver supports:

- `DEVELOPMENT_FREE`
- `RELEASE_FREE`
- `REQUIRES_CORE_ENTITLEMENT`

It exposes explicit locked, available, checking, error, founding, active, and
suspended states for later UI work. It cannot alter capacity, technology,
subscribers, cash, or simulation outcomes.

No commercial price or product identifier is locked in this phase.

## Deliberately deferred

- unlock rules and the first player-facing entry screen
- founding/customization wizard
- live integration with the weekly game loop
- subscriber, churn, revenue, cost, and server-load formulas
- dashboards, graphs, cutscenes, and animations
- billing product registration and backend receipt verification
- all Phase 2 systems

## Validation

Run:

```bash
npm run audit:owned-streaming-foundation
npm run audit:save-migration
npm run audit:save-transfer
npm run lint
```

The focused audit covers legacy migration, corruption repair, deterministic
randomness, weekly idempotency, cinematic fact requirements, bounded
persistence, and access-policy separation.

## Next implementation boundary

The next phase may build the unlock/entry experience by reading:

- `player.ownedStreamingPlatform.lifecycle`
- the future career-eligibility selector
- `resolveStreamingAccess(...)`

It should not create a second streaming save object or put owned-platform state
into `player.flags`.
