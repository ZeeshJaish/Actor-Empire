# Historical streaming library — Phases 3 and 4

**Status:** Implemented locally on 2026-09-25. No commit, push, release, Phase 5 market listing, or Phase 6 rival/starter-grace change.

## Delivered

- Each new or migrated save receives a compact, versioned historical-catalogue recipe. It snapshots a deterministic seed, initialization week, frozen producer roster, generated-title count, and mutable overlays. The recipe is roughly kilobytes; no 2,000-object payload is added to `world.projects` or the hot save.
- The v1 generator resolves fictional screen titles on demand, with stable IDs/names, a 15% series share, in-game 1–10 public ratings, quality, commercial reach, prestige, budget, release week, region/language, and varied producers. Each title separately identifies its underlying rights holder; no streaming licence is invented. Existing game studios and fictional regional producers share the seed according to genre/budget weights. Platform and newly created producers are not credited before their in-world starting year; player-owned studios receive no fabricated inventory.
- The saved-first resolver preserves distinct canonical IDs, underlying ownership, and stored release results across `world.projects`, active releases, past projects, inherited/acquired studio catalogues, and released industry productions. Derived fields on older records are labelled as inferred rather than presented as stored facts. Duplicate projections merge by ID, not name. The seed fills the deficit to 2,000 at initialization; if ordinary world-project retention later removes records, migration appends only new seed indices without rerolling older ones.
- Existing title lookup can resolve seed identities, but the Content Market candidate pool remains unchanged until Phase 5. No streaming rights, payments, IP ownership, or historical award records are generated.
- Seeded titles may enter only a still-upcoming, unresolved award invitation near catalogue initialization. Existing film/series, following-year, and Emmy invite-week eligibility still apply. Saved award history and already-scheduled ballots remain authoritative; prior ceremonies are not reopened. A background ceremony with no player nominations now resolves winners from its saved invitation ballot, so an eligible seeded nominee does not disappear when that scheduled event is consumed.
- The recipe is protected by save integrity. Unsupported versions or a missing recipe in a new-format save fail visibly instead of silently creating a different library.

## Verification

Passed: `npm run audit:historical-catalogue-phase3-4`, `npm run audit:legacy-streaming-rights-phase1-2`, `npm run audit:save-migration`, `npm run audit:save-integrity`, `npm run audit:save-transfer`, `npm run audit:award-season-timing`, `npm run audit:deterministic-awards`, `npm run audit:streaming-rivals-global-awards-phase20`, `npm run build`, and `git diff --check`.

The focused audit checks 2,000 unique released IDs, exact 300/2,000 series mix, bounded historical dates/ratings, studio distribution and age, immutable seed records, saved-result precedence and same-name distinct IDs, compact recipe size, save/compaction/reopen identity, append-only retention recovery, invalid/missing recipe failure, no retroactive awards, film and Emmy eligibility, a frozen seeded ballot through a real non-player ceremony week, and no marketplace candidate integration yet.

`npm run lint` is not green. It reports the two existing `index.tsx` recovery-boundary errors at lines 51 and 115 and an unrelated `scripts/audit-ios-long-session-soak.ts:56` reference to `WorldState.aiCatalogue`; it reports no error in the Phase 3–4 files. `npm run audit:award-competition` fails at its world-release year-boundary scheduling assertion. `npm run audit:streaming-catalogue-packages-phase5` fails at its strategy-automation signing assertion. Both failing fixtures start from `INITIAL_PLAYER` without a historical catalogue and exercise code outside this phase; their baselines were not re-established here. `audit:award-night-flow` has no npm script entry and was not counted as a verification pass.

## Next boundary

The library foundation is real and reproducible, but it will **not fill the visible marketplace yet**. Phase 5 must feed the saved-first resolver into rights-valid discovery, search, collections, and final settlement; Phase 6 adds starter protection and rival competition. Neither is included here. A live player save and device validation remain for release hardening.
