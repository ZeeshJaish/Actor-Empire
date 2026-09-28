# Historical Streaming Library Phase 3–4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline with the user; do not dispatch subagents.

**Goal:** Create a deterministic, compact, shared 2,000-title historical library for each save, then allow only eligible new award seasons to draw contenders from it.

**Architecture:** Persist a versioned seed recipe, initial time horizon, seed count, and frozen NPC producer roster. Generate immutable fictional titles on demand outside `world.projects`; resolve saved releases and acquired-studio records before seed records by canonical ID. Award adapters convert only current/prior-year seeded titles to existing `IndustryProject` contenders for unresolved future ceremonies.

**Tech Stack:** TypeScript, Vite, esbuild/Node audits, existing save migration/compaction, deterministic RNG, award logic.

**Spec:** `docs/superpowers/specs/2026-09-25-shared-streaming-library-and-legacy-rights-design.md` (Phases 3 and 4 only)

## Global Constraints

- Preserve all surviving saved projects, rights, payments, ratings, awards, and producer ownership; merge by ID or proven lineage, never title text.
- Target at least 2,000 distinct released titles at initialization; if saved titles already exceed 2,000, generate zero base titles.
- Keep generated title objects out of `world.projects` and the hot save. Save only versioned recipe and bounded mutable overlays; no new weekly 2,000-item state.
- Generated dates may not exceed the initialization week. Keep the generator v1 immutable so later app updates cannot reshuffle an old save.
- Saved/acquired player studio titles are not gifted extra seeded assets. No real IMDb data or fabricated past nominations/wins.
- Only unresolved future award ballots may use seeded releases from the current or immediately preceding game-year window, after actual release week; keep film/Emmy season rules.
- Do not integrate seed titles into marketplace listings, rival acquisition, starter grace, or pricing yet; those are Phases 5–6.
- Preserve unrelated dirty work. Do not stage, commit, push, or release without a separate request.

---

### Task 1: Red audit and catalogue state contract

**Files:**
- Create: `scripts/audit-historical-catalogue-phase3-4.ts`
- Modify: `package.json`, `types.ts`

**Interfaces:**
- Produces: `HistoricalCatalogueState`, `HistoricalCatalogueTitle`, and `WorldState.historicalCatalogue?: HistoricalCatalogueState`.
- Exercises: `migratePlayerSave`, `initializeHistoricalCatalogue`, `getHistoricalCatalogueTitles`, `resolveHistoricalCatalogueTitle`, `getHistoricalCatalogueAwardProjects`.

- [ ] **Step 1: Write the focused fixture.** A fresh save at age 30/week 12 must resolve 2,000 unique released IDs, approximately 85% movies, all released no later than its current absolute week; the hot `world.projects` length stays unchanged. Add saved world/past/active/acquired records with duplicate IDs and same-name/different-ID cases; assert saved metadata wins and seed count fills only the distinct released-title deficit. Assert no money or award-history mutation.
- [ ] **Step 2: Run the audit red.** `npm run audit:historical-catalogue-phase3-4` must fail because the new module/API is absent, then re-run after the script entry exists to see the behavioral assertion fail rather than a typo.
- [ ] **Step 3: Add the minimal state/title interfaces and script entry.** State contains `schemaVersion: 1`, `generatorVersion: 1`, `seed`, `initializedAtAbsoluteWeek`, `seededCount`, `savedTitleCountAtInitialization`, frozen `producerRoster`, and `overlays`. Resolved title contains stable ID, title, type, genre, language/region, producer, release age/week, quality/rating, budget, reach/prestige, and provenance.

### Task 2: Immutable generator, saved-first resolver, and migration

**Files:**
- Create: `services/historicalCatalogue.ts`
- Modify: `services/saveMigration.ts`, `services/streamingCatalog.ts`
- Extend: `scripts/audit-historical-catalogue-phase3-4.ts`

**Interfaces:**
- Produces: `initializeHistoricalCatalogue(player: Player): Player`, `getHistoricalCatalogueTitles(player: Player): HistoricalCatalogueTitle[]`, `resolveHistoricalCatalogueTitle(player: Player, titleId: string): HistoricalCatalogueTitle | null`.
- Consumes: `Player.world.projects`, `pastProjects`, `activeReleases`, acquired-studio portfolio/legacy projects, deterministic RNG, `WorldState.historicalCatalogue`.

- [ ] **Step 1: Add red persistence/identity assertions.** Re-migration, JSON save/reopen, compaction, studio rename/acquisition, and later game-week advance must retain the same seed IDs, generated titles, producer names, release dates, and ratings. A title added after initialization must not reroll prior seed IDs. Invalid generator version must fail visibly rather than silently produce an empty library.
- [ ] **Step 2: Implement one-time state initialization.** Count distinct released canonical IDs, exclude unreleased commitments, choose `seededCount = max(0, 2000 - savedCount)`, freeze a weighted NPC/fictional regional producer roster (including each producer's earliest eligible in-game year), and persist a deterministic per-save seed and initialization week. Preserve an existing valid state byte-for-byte on replay unless existing saved titles were later trimmed; in that case append only the minimum additional v1 seed indices needed to retain 2,000 resolved titles.
- [ ] **Step 3: Implement generator v1.** Derive every title from `(seed, generatorVersion, index)` with stable names and IDs, 85/15 movie/series mix, fictional producer distribution, language/region, age/week, varied budget/quality/rating/reach/prestige, and deterministic award craft profile. Generated dates stay on/before `initializedAtAbsoluteWeek`.
- [ ] **Step 4: Implement saved-first title resolution.** Merge surviving released `world.projects`, past projects, active releases, inherited and acquired-studio catalogues by canonical ID. Saved values override inferred fields; a seed ID collision cannot replace a saved title. Apply only validated saved overlays to seed records. Expose one read-only resolver to downstream consumers; do not add seed rows to market candidates in this phase.
- [ ] **Step 5: Wire migration and existing title lookup.** Initialize after acquired-portfolio repair in both `migratePlayerSave` return branches; bump save-migration version once. `resolveStreamingCatalogTitle` may use the new resolver as a fallback only; `getStreamingLicenseCandidatePool` remains unchanged until Phase 5.
- [ ] **Step 6: Run** `npm run audit:historical-catalogue-phase3-4`, `npm run audit:save-migration`, `npm run audit:save-integrity`, and `npm run audit:save-transfer`.

### Task 3: Upcoming awards and reputation adapter

**Files:**
- Create: `services/historicalCatalogueAwards.ts`
- Modify: `services/awardLogic.ts`
- Extend: `scripts/audit-historical-catalogue-phase3-4.ts`

**Interfaces:**
- Produces: `getHistoricalCatalogueAwardProjects(player: Player, awardYear: number): IndustryProject[]`.
- Consumes: `getHistoricalCatalogueTitles`; caller still uses `isWorldProjectEligibleForAwardSeason` and existing category score/filter rules.

- [ ] **Step 1: Add red award assertions.** Prior resolved award history remains byte-identical; no seeded title from more than one year before the initialization year enters a ballot; no unreleased title enters; film and Emmy eligibility retain existing age-year/invite-week behavior. A valid seed movie/series can appear in a new unresolved ballot, and its deterministic score/name does not change after reopen.
- [ ] **Step 2: Convert only eligible seed titles to `IndustryProject`.** Include media type, genre, quality, rating, budget, producer, actor/director credits, and stable craft profile. Limit conversion to release year equal to the initialization year or its predecessor and to release absolute week no later than current week. Do not write awards into seed state.
- [ ] **Step 3: Add award candidates only for unresolved ceremonies.** Append adapter output to the existing `world.projects` candidate pool in `generateFullBallot` and `resolveCanonicalAwardSeason`; dedupe by canonical ID with saved projects first. The catalogue must have initialized no later than the invitation week, and the current week must not be after that invitation or have an already-scheduled ballot. Existing `awardHistory` for the same type/year disables seed participation and remains authoritative.
- [ ] **Step 4: Run** `npm run audit:historical-catalogue-phase3-4`, `npm run audit:award-season-timing`, `npm run audit:award-competition`, and `npm run audit:deterministic-awards`.

### Task 4: Size, integrity, and handoff gate

**Files:**
- Extend: `scripts/audit-historical-catalogue-phase3-4.ts`
- Modify if required: `services/saveIntegrity.ts`
- Create: `docs/superpowers/reports/2026-09-25-historical-streaming-library-phase3-4.md`

**Interfaces:**
- Consumes: complete catalogue state/resolver and award adapter.
- Produces: reproducible local QA report; no Phase 5–6 marketplace/rival behavior.

- [ ] **Step 1: Add size and replay assertions.** The persisted recipe remains small against 2,000 generated objects; compaction/JSON round trip preserves state and overlays; invalid version fails, and duplicate/lineage conflicts cannot erase saved data.
- [ ] **Step 2: Run** focused catalogue audit, save migration/integrity/transfer audits, award audits, `npm run lint`, `npm run build`, and `git diff --check`. Report unrelated baseline failures separately.
- [ ] **Step 3: Write exact QA receipts and limitations.** State clearly that Phase 3–4 makes the library and future awards available but marketplace/rival use waits for Phase 5–6. Do not stage or commit.
