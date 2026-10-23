# Lightweight movie-title variation and collision protection

## Implemented behavior

- New fictional titles use 15 structures, expanded shared vocabulary and palettes for all 17 existing genres. No new genre or UI was added.
- A case/whitespace-normalized temporary Set reserves names within each generation batch. Six random attempts are followed by a finite deterministic subtitle fallback, including for a stuck random source.
- Streaming Original briefs now receive real genre-based titles. Accepted names are remembered; repeated previews do not mutate saves or quotes. Commit-time revalidation handles a competing reservation without changing candidate identity or economic terms. Existing saved plans and films are not renamed.
- Director referral cards use the actual project title. Famous originals respect pending/current reservations and the existing released-film flags; an exhausted famous pool returns no premium offer instead of recycling a completed original.
- `world.recentProjectTitles` stores only `{ title, week }` entries. Entries expire when their age reaches 104 game weeks; at most 1,024 are retained. This derived memory is independent of film archives, ownership, contracts and money. Existing active projects, ongoing franchise slates/contracts and owned IP stay reserved through their existing records even outside the recent window.
- Old saves bootstrap from at most 1,024 player-archive records and 1,024 retained world records. Year-only legacy player records use the latest plausible week in their recorded year. This affects naming hints only. Actual saved titles, duplicate historical names, IDs and financial facts are preserved.
- Naming does not traverse the full player career archive or materialize the virtual historical catalogue during generation. Immutable world project/production containers reuse weakly cached indexes. Studio title indexes are created lazily only when a valid greenlight is actually handed off.

## Verification

The original implementation failed all eight focused generation regressions and the memory expiry/cap checks before repair.

`npm run audit:project-titles` passes eight generation checks, five memory/save checks and four cache/performance checks. Coverage includes constant-RNG collisions, normalized name variants, 400 seeded casting batches, director labels, exhausted/pending famous originals, distinct actual streaming movie commissions, expiry boundaries, hard entry limits, old-save preservation and reload clocks.

`npm run audit:project-title-flow` passes real sourcing → commitment → commissioning → three verified save/reload cycles → twelve real weekly advances across year rollover → new offers. The original production title and canonical ID remained stable. Cash and rights contracts were unchanged by reload; the buffer stayed bounded.

Crowded-world naming benchmark, 100 batches of 25 titles including the bounded memory update:

| Fixture/result | Measurement |
| --- | ---: |
| Retained world films | 20,000 |
| Active productions | 5,000 |
| Recent naming entries | 1,024 |
| First index build | 5.37 ms |
| Warm median | 0.68 ms |
| Warm p95 | 1.09 ms |
| Warm maximum | 3.48 ms |
| Serialized fixture naming buffer | 47,049 bytes |

Guarded getters confirmed no full career-archive or virtual historical-catalogue reads. These are local naming-only measurements, not native frame-time or full Next Week clearance. Old inactive names outside the 104-week/1,024-entry window may deliberately be reused.

Also passed: platform AI production, studio B6 handoff, save migration, save integrity, save generations/recovery, inheritance, reported-bug regressions, relationship sync, full workspace TypeScript check and the memory-guarded production build. Build output is isolated at `/tmp/actor-project-title-build`; Vite still reports its large-chunk warning.

## Existing unrelated audit failure

`audit:platform-ai-sourcing` reaches an existing assertion at `scripts/audit-platform-ai-sourcing.ts:443`: the player-rights fixture returns `INVALID_TERMS` where it expects `RIGHTS_UNAVAILABLE`. A read-only esbuild comparison using HEAD versions of all changed pre-existing production/type files reproduces exactly the same failure. This task does not change the rights terms/validation code or suppress the assertion.

Unrelated concurrent workspace work was retained. No personal save slot was opened or changed. Nothing was committed or pushed in this task.
