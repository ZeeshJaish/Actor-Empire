# Adaptive Performance Phase 6: Non-rendering Freeze Hardening

## Objective

Reduce Android ANR risk from long JavaScript main-thread tasks without lowering visual quality, changing simulation outcomes, or weakening save integrity.

## Evidence

The current mature-save benchmark is roughly 40 MB and can hold Process Week for multiple seconds. The largest measured slices are world streaming viewing, customer/economy simulation, and owned streaming processing. Persistence then immediately performs synchronous preparation before IndexedDB receives the save.

Adaptive rendering cannot solve these stalls because they are CPU and serialization work, not GPU quality work.

## Design

1. Add a budget-aware cooperative task controller. It yields only after a continuous work budget is exceeded, so fast devices do not pay a yield at every checkpoint.
2. Place checkpoints at stable simulation boundaries. Never yield inside an atomic state mutation or transaction.
3. Preserve deterministic simulation. Checkpoints must not consume randomness, modify dates, or alter state.
4. Separate Process Week, persistence preparation, and IndexedDB transfer into distinct browser tasks.
5. Keep the existing verified generation save and atomic promotion path. Phase 6 must not split a canonical save across independently committed records.
6. Remove repeated entitlement and route calculations from world streaming loops using per-week indexes and caches.
7. Lazy-load heavy screens that are not needed for startup gameplay. Keep the loading, start, creation, and home surfaces eager.
8. Continue using the existing bounded histories and offscreen-mount capability contract to release unreachable UI resources.

## Quality contract

- No global visual downgrade.
- High-end devices remain on the same visual profile.
- Week results remain deterministic for the same state, time, and random seed.
- The input player remains immutable.
- A failed save leaves the previous verified generation untouched.
- The processing overlay paints before heavy work begins.
- Yielding is adaptive to actual elapsed work, not device labels alone.

## Verification

- Unit audit for cooperative scheduling and fallback behavior.
- Deterministic Process Week parity audit with yielding enabled and disabled.
- Streaming cache correctness audit.
- Existing week save-safety, save-integrity, and late-game benchmarks.
- Production build with separate lazy screen chunks and no TypeScript/build regressions.
