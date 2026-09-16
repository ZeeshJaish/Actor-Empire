# World Economy WE8 — Economy, History, Performance, and Save Safety

**Date:** 2026-09-11
**Status:** Approved design; implementation plan pending owner review
**Roadmap:** `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

## 1. Purpose

WE8 is the integration and hardening phase for WE1–WE7. It must prove that the shared population, audience, streaming competition, customer, viewing, and all-platform economy remain balanced, deterministic, performant, and recoverable across ordinary play, extreme shocks, old saves, and multi-generation games.

WE8 is not another parallel economy engine. It extends the existing weekly transaction, save generations, integrity manifests, migration, compaction, diagnostics, and long-run audit systems.

## 2. Player promise

After WE8:

- Process Week never commits a partial result;
- a retry starts from the same valid week and produces the same WE1–WE7 outcome;
- an interrupted write cannot silently replace the last valid save;
- old and malformed saves are repaired when the damaged data is derived or optional;
- protected career, dynasty, ownership, project, contract, and financial history is never discarded as a performance shortcut;
- long-running games remain bounded without making the world feel empty;
- major audience or financial changes have concise explanations in existing game surfaces;
- no cohort administration is added for casual players.

## 3. Chosen architecture

### 3.1 Recommended: layered deterministic hardening

WE8 will add small, composable layers around the existing systems:

1. candidate-state validation after the game loop;
2. canonical WE1–WE7 reconciliation;
3. deterministic state-size and workload policies;
4. existing compaction and integrity preparation;
5. candidate write, read-back, and generation promotion;
6. UI commit only after persistence succeeds;
7. bounded player-facing explanations from committed facts.

This approach is selected because each failure can be attributed to one boundary without duplicating the simulation.

### 3.2 Rejected: one monolithic 400-year audit

A single large test can reveal a crash, but it cannot identify whether the failure came from population, customers, viewing, platform finance, compaction, migration, or persistence. WE8 will retain a full soak test but combine it with focused invariant and scenario audits.

### 3.3 Rejected: wall-clock gameplay shortcuts

The game must not produce different results because one phone is slower. No business fact may be skipped based on elapsed milliseconds, device model, frame rate, or memory pressure. Workload modes must be selected from deterministic state characteristics and may only defer or aggregate non-critical presentation work.

## 4. Existing systems to reuse

WE8 will extend these established boundaries:

- `services/gameLoop.ts`: canonical weekly gameplay calculation and stage callbacks;
- `App.tsx`: process lock, paint yield, post-week synchronization, verified persistence, failure presentation, and UI commit;
- `services/savePreparation.ts`: migration, compaction, protected-state comparison, size estimation, and recovery-checkpoint policy;
- `services/saveGenerations.ts`: exclusive candidate writes, read-back verification, current/previous generations, promotion, and recovery;
- `services/saveIntegrity.ts`: integrity manifests and protected-state fingerprints;
- `services/saveCompaction.ts`: bounded persistence representation with referential-integrity protection;
- `services/saveMirror.ts`: IndexedDB authority and the 3.5 MB optional local-storage mirror budget;
- `services/saveMigration.ts`: versioned, idempotent old-save normalization;
- `services/weekProcessingScheduler.ts`: immediate processing-state paint before heavy work;
- `services/weekProcessingRecovery.ts`: stage-aware player-facing retry/recovery guidance;
- WE1–WE7 normalizers, fingerprints, snapshots, and focused long-run audits;
- existing Platform AI, studio AI, industry media, rights, acquisition, and dynasty long-run fixtures.

The current order already persists a processed candidate before calling `commitProcessedWeekPlayer`. WE8 hardens the candidate and world-integrity checks inside that transaction rather than replacing the flow.

## 5. Canonical integrity model

### 5.1 Two validation tiers

**Runtime critical validation** runs on every candidate week and stays proportional to the bounded current state. It checks only facts capable of corrupting gameplay or persistence.

**Deep audit validation** runs in development and release verification. It performs expensive cross-system reconciliation, historical replay, scenario comparison, and full collection scans.

Deep validation must never be silently shipped as per-week work.

### 5.2 Runtime invariants

The candidate is rejected if any of these are true:

- age/week did not advance exactly once;
- canonical money, revenue, cost, population, household, subscriber, viewer, or share values are non-finite;
- a protected identity or material financial record disappears during compaction;
- WE1 country/global population does not reconcile;
- WE4 allocated paid accounts exceed eligible demand;
- WE5 platform/country/global customers do not reconcile with WE4;
- WE6 viewing exceeds the available paid, shared, and piracy access paths;
- WE6 assigns title viewing where canonical rights or localization availability forbids it;
- WE7 platform totals do not reconcile with WE5 customers or WE6 viewing;
- the player is charged or paid the same canonical streaming amount twice;
- an acquired platform retains an AI-only operating-cost advantage;
- current histories exceed their declared bounds.

Small rounding differences use explicit currency/account tolerances. Tolerances cannot conceal lost identities or duplicated revenue.

### 5.3 Repair classification

Validation outcomes have three classes:

- `VALID`: continue to persistence;
- `REBUILD_DERIVED`: regenerate a malformed cache, snapshot, market share, or presentation summary from canonical inputs, then validate once more;
- `ABORT_PROTECTED`: do not persist or advance; keep the previous generation and show retry/recovery guidance.

Only derived and optional data may be rebuilt automatically. Protected gameplay records are never guessed.

### 5.4 Persisted health summary

WE8 may persist one compact versioned summary containing:

- schema version;
- last validated absolute week;
- source fingerprints for WE1–WE7;
- workload mode;
- bounded warning codes;
- state-size counters;
- last successful migration version.

Raw traces, stack dumps, and per-record validation details remain diagnostic-only and are not stored in the player save.

## 6. Atomic Process Week contract

The authoritative sequence is:

`previous player → deterministic week candidate → post-week sync → critical validation → compaction/protected comparison → candidate write → read-back verification → generation promotion → UI commit`

Rules:

- the input player remains immutable;
- one tap can create at most one active run;
- success advances exactly one week;
- any failure before promotion leaves the previous valid generation authoritative;
- any failure after promotion reloads the promoted generation rather than recomputing a second outcome;
- UI state changes only after verified persistence;
- retry uses the same stable week seed for WE1–WE7 and every stochastic weekly subsystem brought into the WE8 transaction;
- analytics and diagnostics cannot affect gameplay results.

Existing process locks, cooldowns, stage breadcrumbs, and recovery messages remain in place.

## 7. Determinism policy

The same normalized input save, absolute week, and simulation version must produce the same candidate results.

WE8 will audit the full Process Week call graph for `Math.random`, `Date.now`, unordered object iteration, locale-sensitive sorting, and signed-zero/float serialization differences. Week gameplay randomness will use stable scoped seeds. Real timestamps may still be used for telemetry and save metadata, but never to choose a gameplay outcome.

Changing a simulation version may intentionally change future weeks, but migration must preserve all already committed history.

## 8. History and compaction policy

### 8.1 Protected legacy

Compaction must preserve material identity and outcomes for:

- dynasty members and dynasty career archives;
- completed and active player projects;
- awards and major career milestones;
- owned businesses, subsidiaries, universes, and acquisitions;
- active productions and rights contracts;
- important historical ownership transfers;
- balances, debts, investments, streaming treasury, and entitlements.

### 8.2 Bounded operational history

Weekly platform signals, market snapshots, customer transitions, viewing summaries, media chatter, and AI decision evidence use documented bounds. Older operational history may become monthly, annual, or era summaries after its detailed retention window expires.

Aggregation must preserve totals and material extrema: opening value, closing value, total flows, minimum, maximum, and the IDs of material events.

### 8.3 Regenerable state

Market shares, dashboard summaries, derived explanations, sorting indexes, and other projections are rebuilt from canonical records when absent or malformed.

### 8.4 Referential integrity wins

An ordinary history limit cannot remove a record still referenced by a protected project, contract, acquisition, universe, award, or dynasty archive. The existing compaction rule remains authoritative.

## 9. Deterministic workload modes

WE8 defines modes from persisted collection counts and save size, not device speed:

- `NORMAL`: ordinary bounded collections and full current-week presentation generation;
- `LARGE_SAVE`: canonical calculations remain exact, while dormant history is aggregated and non-critical presentation generation is bounded;
- `LEGACY_RECOVERY`: migration and protected checkpoints take priority before ordinary progression resumes.

All modes produce the same canonical financial, population, rights, customer, viewing, and platform outcomes from the same inputs. Only cache shape, history resolution, and when optional presentation items are materialized may differ.

## 10. Performance strategy

### 10.1 Eliminate repeated work

- normalize each canonical subsystem once per absolute week;
- reuse WE1–WE7 fingerprints and same-week identity fast paths;
- avoid full-save JSON serialization during ordinary calculation;
- index active records before loops instead of repeatedly scanning historical collections;
- process active rights, productions, platforms, and current countries rather than dormant archives;
- compact at the persistence boundary, not repeatedly inside subsystems;
- defer optional media/presentation generation until after canonical facts exist.

### 10.2 Performance gates

The current desktop reference gates remain:

- normal late-game Process Week p95 at or below 350 ms;
- annual/save-heavy p95 at or below 750 ms.

WE8 will add separately reported calculation, validation, compaction, clone, persistence, and UI-commit timings.

Mobile gates must be measured on at least one current/high-tier device and one constrained Android-class device. The provisional experience goals are:

- processing feedback paints before heavy work;
- normal weeks complete near one second on the constrained tier;
- annual or recovery-heavy weeks remain below two seconds where practical;
- no unexplained frozen UI or repeated tap can create another week run.

If hardware cannot meet a provisional target, the report must identify the actual slow stage and optimization path. It must not claim mobile readiness from desktop Node timings alone.

## 11. Scenario and shock matrix

Each scenario uses fixed seeds and asserts finite, reconcilable, bounded outcomes:

- baseline growth;
- recession and reduced entertainment budgets;
- inflation with unchanged pricing;
- economic boom;
- population ageing and household changes;
- connectivity expansion;
- affordability-focused regional growth;
- premium-price success among suitable cohorts;
- price war and subscription fatigue;
- password-sharing expansion and enforcement;
- piracy shock;
- content drought;
- breakout local-language hit;
- global franchise hit;
- weak catalogue with heavy marketing;
- research/localization advantage;
- platform distress, bankruptcy, and emergency AI funding;
- regional entrant, well-funded entrant, and global giant creation;
- acquisition before and after distress;
- player acquisition removing AI assistance;
- rights expiry and territorial loss.

The market may lose individual companies, but active entertainment demand must remain serviceable by surviving or newly generated platforms.

## 12. Long-run verification matrix

### 12.1 Fixtures

- fresh save with no player streaming platform;
- newly launched player platform;
- mature production house plus streaming platform;
- acquired giant platform;
- distressed platform and funding rescue;
- multi-generation dynasty with archived careers;
- large but valid save;
- old pre-WE save migrated forward;
- malformed derived WE state;
- interrupted candidate/current save generation.

### 12.2 Horizons

- focused invariant tests for one week and boundary weeks;
- continuous full-game runs with periodic save/reload for ordinary CI;
- 400-year / 20,800-week WE engine runs;
- a dedicated full Process Week 20,800-week soak for release verification rather than every developer run;
- reload checkpoints at quarterly, annual, decade, acquisition, and migration boundaries.

The final report separates engine-horizon evidence, full-game-loop evidence, and real-device evidence.

## 13. Save migration and corruption tests

WE8 will cover:

- every supported old migration version reaching the latest version idempotently;
- 24 MB-plus legacy detection and recovery checkpoints;
- 50–400 MB synthetic legacy payloads without silent truncation;
- valid current generation with missing mirror;
- missing or corrupted current generation with valid previous generation;
- interrupted candidate write;
- mismatched integrity manifest;
- malformed optional WE1–WE7 states;
- export/import round trip;
- browser restart between write and promotion;
- update followed immediately by Process Week.

An unverified legacy save is migrated, compacted, protected-state compared, and written as a verified generation before it is treated as fully safe.

## 14. Player-facing explanations

WE8 does not add a technical dashboard. It provides a small explanation adapter sourced only from committed WE facts and reuses:

- the streaming CEO weekly report;
- Audience Desk and Analytics Center;
- Forbes and existing news/media systems;
- the current week-failure/recovery presentation.

Examples:

- “Higher pricing increased revenue, but value-plan churn rose in India.”
- “Hindi dubbing improved completion and retention.”
- “A rival price cut weakened new subscriptions.”
- “Sharing expanded reach but reduced paid conversion.”
- “The previous verified week was restored after an interrupted save.”

Only material changes are surfaced. Routine weeks remain quiet.

## 15. Error handling and observability

Diagnostics record:

- run ID and save slot;
- starting and candidate absolute weeks;
- current stage and elapsed time;
- collection-size counters;
- workload mode;
- invariant code and repair classification;
- whether candidate write, read-back, promotion, or recovery completed.

Errors shown to players remain short and actionable. Detailed traces stay in development diagnostics and non-fatal reporting. No personal or save-content payload is added to analytics.

## 16. Testing deliverables

WE8 implementation will add focused commands for:

- world reconciliation;
- deterministic retry and save/reload;
- atomic week transaction failures;
- shock matrix;
- history compaction and protected identities;
- malformed-state repair classification;
- migration/version matrix;
- large-save persistence and recovery;
- desktop stage-performance budgets;
- 400-year engine soak;
- 400-year full-game release soak;
- mobile/browser responsiveness and duplicate-input prevention.

Existing WE1–WE7, Platform AI, ecosystem, acquisition, save, week-recovery, and production-build checks remain mandatory regressions.

## 17. Non-goals

- building the future cinema-chain gameplay;
- individual records for billions of people;
- exposing raw cohort controls to casual players;
- guaranteeing that every AI company survives;
- using device performance to alter business results;
- deleting protected legacy to satisfy a byte target;
- replacing IndexedDB with a new persistence backend;
- redesigning the current streaming UI.

## 18. Completion gate

WE8 is complete only when:

- WE1–WE7 country, platform, and global totals reconcile;
- identical normalized inputs produce identical WE outcomes;
- every successful action advances exactly one week;
- every failed action advances zero weeks and preserves the prior valid generation;
- save/reload and retry remain deterministic;
- derived corruption repairs safely and protected corruption aborts safely;
- migration is idempotent across the supported version matrix;
- protected dynasty, project, ownership, rights, and financial records survive compaction;
- bounded histories and state-size budgets pass;
- desktop performance gates pass;
- real-device evidence is reported separately and honestly;
- 400-year engine and release-soak tests complete without population drift, duplicate revenue, runaway subscriptions, save bloat, or progress stoppage;
- casual play requires no cohort micromanagement;
- all existing mandatory regressions and the production build pass.

## 19. Phase boundary

WE8 completes the production hardening of the shared streaming economy. WE9 remains the future cinema and box-office adapter and must consume the same canonical population rather than creating a second audience world.
