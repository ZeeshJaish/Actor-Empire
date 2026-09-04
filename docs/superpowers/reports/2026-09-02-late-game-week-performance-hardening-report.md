# Late-Game Process Week Performance Hardening Report

**Date:** 2026-09-02  
**Scope:** Project A exit addendum A8P, before Project B

## Player-facing result

- Tapping **Process Week** now commits the processing state at a browser paint boundary before the synchronous simulation begins. The player receives immediate visual feedback instead of a frozen-looking tap.
- Local weekly flavor text no longer adds an artificial 300 ms wait. The selected text and probability remain unchanged.
- Large mature saves continue to use IndexedDB as the authoritative save. Their optional localStorage compatibility mirror now avoids a futile full JSON serialization when canonical collection counts already prove it cannot fit.
- No new management screen, prompt, or player workload was added.

## Simulation and save result

- `processGameWeek` still retains its first full-state transaction clone and rollback boundary.
- The second full-state clone existed only to compare the actor career arc. It is replaced with the small derived `ActorCareerArc` snapshot, with exact transition parity covered by audit.
- Successful processed weeks now use a trusted canonical UI commit path. Imported, loaded, cheat, and component-originated updates still run the complete migration path.
- The rights-calendar pass now indexes renewal cases by contract and caches effective studio management per seller, avoiding repeated scans and policy normalization on large contract registries.
- No history, contract, project, financial record, or outcome was deleted for timing.

## Deterministic mature-save benchmark

The benchmark creates an age-82 player with:

- one active production house;
- one active player-owned streaming platform;
- 40 player catalogue titles;
- 1,500 seeded world releases before canonical compaction;
- 2,000 seeded AI slate records before canonical compaction; and
- 6,000 canonical active rights contracts.

After 20 consecutive deterministic real `processGameWeek` turns, the compacted save retained 74 world projects, 534 AI slate records, 6,018 rights contracts, all 40 player titles, and a 13,358,381-byte save.

Measured desktop result:

| Segment | p50 | p95 | max |
| --- | ---: | ---: | ---: |
| Weekly simulation | 71.11 ms | 94.11 ms | 95.20 ms |
| Persistence compaction | 12.95 ms | 22.30 ms | 26.19 ms |
| IndexedDB structured-clone proxy | 30.20 ms | 34.99 ms | 35.42 ms |
| Trusted UI commit | 0.45 ms | 0.56 ms | 0.66 ms |
| Complete measured path | 139.41 ms | **158.06 ms** | 170.73 ms |

The audit constructs a same-run legacy-equivalent path from the removed actor snapshot, migration, and 300 ms delay. That path measured 559.46 ms p95, so the final path is 71.8% lower. The audit permanently requires at least a 35% p95 reduction.

A simple 4x CPU-time proxy is 632.24 ms at p95, below the 3,000 ms low-end proxy budget. This is a derived proxy, not a measurement on Tecno, Redmi, Samsung, or iPhone hardware; real-device throttled evidence remains unavailable in this local environment.

## Verification evidence

Passed:

- `npm run audit:late-game-week-performance` — 20 deterministic real weeks, zero input mutations, 20 exact advances, p95 158.06 ms.
- `npm run audit:actor-career-arcs`
- `npm run audit:player-ui-state`
- `npm run audit:week-processing-scheduler`
- `npm run audit:save-mirror`
- `npm run audit:weekly-event-performance`
- `npm run audit:streaming-rights-calendar-phase4`
- `npm run audit:week-processing-save-safety`
- `npm run audit:save-migration`
- `npm run build`
- `git diff --check`

The production build completed with the existing large-bundle and mixed dynamic/static import warnings.

Repository-wide `npm run lint` still exits non-zero only on the previously documented older owned-streaming fixture drift (`publicManifesto`, `networkPlacements`, obsolete acquisition enums/rack timestamp, and older rival fixture fields). No A8P-owned TypeScript diagnostic remains.

## Remaining boundary

- The transaction clone is still the largest single measured simulation sub-step, but it is deliberately retained for weekly rollback safety.
- The 13 MB stress fixture is larger than an ordinary early/mid-game save. It demonstrates headroom; it does not promise identical wall-clock time on every physical phone.
- Project B remains approval-gated. A8P changes only the shared Process Week foundation that Project B will reuse.
