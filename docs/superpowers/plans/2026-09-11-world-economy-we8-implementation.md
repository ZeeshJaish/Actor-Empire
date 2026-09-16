# World Economy WE8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden WE1–WE7 so weekly progression is atomic, reconcilable, deterministic, bounded, recoverable, explainable, and verified across extreme saves and 400-year horizons.

**Architecture:** Add one focused runtime integrity module around the existing world-economy states, then connect it to the existing `processGameWeek → verified candidate save → generation promotion → UI commit` transaction. Extend current integrity, compaction, migration, diagnostics, and audit facilities; do not create a second save engine or change canonical business outcomes based on device speed.

**Tech Stack:** TypeScript, React, Vite, Node/esbuild audit scripts, IndexedDB generation storage, deterministic aggregate world simulation.

**Spec:** `docs/superpowers/specs/2026-09-11-world-economy-we8-design.md`

## Global Constraints

- Reuse the existing game loop, save preparation, save generations, integrity, compaction, migration, scheduler, and recovery paths.
- Runtime validation must be bounded and must not perform whole-save serialization.
- Only derived world-economy state may be repaired automatically; protected gameplay state must abort safely.
- A failed Process Week advances zero weeks and cannot change the authoritative save.
- Device speed, elapsed time, and frame rate must never alter canonical gameplay outcomes.
- Existing desktop gates remain 350 ms p95 for normal late-game weeks and 750 ms p95 for annual/save-heavy weeks.
- Mobile results must be reported independently from desktop Node results.
- Protected dynasty, project, ownership, rights, and financial identities cannot be deleted to meet size targets.
- No casual-player cohort controls and no streaming UI redesign.

---

### Task 1: Runtime WE1–WE7 integrity contract

**Files:**
- Create: `services/worldEconomy/worldEconomyIntegrity.ts`
- Create: `scripts/audit-world-economy-we8-integrity.ts`
- Modify: `types.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `Player`, current absolute week, and canonical WE1–WE7 state.
- Produces: `validateWorldEconomyCandidate(player, expectedAbsoluteWeek): WorldEconomyValidationResult` and `repairDerivedWorldEconomyState(player, absoluteWeek): Player`.

- [ ] **Step 1: Write the failing integrity audit**

Cover valid state, exact week, non-finite values, negative totals, WE4/WE5 and WE5/WE7 reconciliation, WE6 access bounds, duplicate player subscription revenue, acquired-platform AI assistance, malformed derived state, and bounded histories. Require stable violation codes rather than matching prose.

```ts
const valid = validateWorldEconomyCandidate(fixture, absoluteWeek);
assert.deepEqual(valid, { status: 'VALID', violations: [] });

const broken = structuredClone(fixture);
broken.world.worldStreamingPlatformEconomy!.global.endingPaidAccounts += 1;
assert.equal(validateWorldEconomyCandidate(broken, absoluteWeek).status, 'REBUILD_DERIVED');
assert.ok(validateWorldEconomyCandidate(broken, absoluteWeek).violations
  .some(item => item.code === 'WE7_PAID_ACCOUNTS_MISMATCH'));
```

- [ ] **Step 2: Run the audit and verify RED**

Run: `npm run audit:world-economy-we8-integrity`

Expected: FAIL because `worldEconomyIntegrity.ts` and the package command do not exist.

- [ ] **Step 3: Add the typed result and critical validator**

```ts
export type WorldEconomyIntegrityStatus = 'VALID' | 'REBUILD_DERIVED' | 'ABORT_PROTECTED';
export interface WorldEconomyIntegrityViolation {
  code: string;
  severity: 'DERIVED' | 'PROTECTED';
  system: 'WE1' | 'WE2' | 'WE3' | 'WE4' | 'WE5' | 'WE6' | 'WE7' | 'WEEK';
}
export interface WorldEconomyValidationResult {
  status: WorldEconomyIntegrityStatus;
  violations: WorldEconomyIntegrityViolation[];
}
export interface WorldEconomyHealthSummary {
  schemaVersion: 1;
  lastValidatedAbsoluteWeek: number;
  sourceFingerprints: Partial<Record<'WE1' | 'WE2' | 'WE3' | 'WE4' | 'WE5' | 'WE6' | 'WE7', string>>;
  workloadMode: 'NORMAL' | 'LARGE_SAVE' | 'LEGACY_RECOVERY';
  warningCodes: string[];
  stateSizeCounters: Record<string, number>;
  lastSuccessfulMigrationVersion: number;
}
```

Implement constant-time global comparisons plus bounded scans of current countries/platforms. Use explicit account tolerance `1` and currency tolerance `0.01`; never apply tolerance to identity or week checks.

- [ ] **Step 4: Add one-pass derived repair**

`repairDerivedWorldEconomyState` must rebuild WE1–WE7 in dependency order through existing normalizers/advance functions, preserve protected records, and return a new player object. It must not retry recursively.

- [ ] **Step 5: Run the focused audit and TypeScript**

Run: `npm run audit:world-economy-we8-integrity`

Expected: PASS for valid, repairable, and abort fixtures.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit checkpoint**

```bash
git add types.ts package.json services/worldEconomy/worldEconomyIntegrity.ts scripts/audit-world-economy-we8-integrity.ts
git commit -m "feat(world-economy): add WE8 integrity contract"
```

### Task 2: Candidate validation inside atomic week progression

**Files:**
- Modify: `services/gameLoop.ts`
- Modify: `services/weekProcessingRecovery.ts`
- Create: `scripts/audit-world-economy-we8-week-transaction.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 validator and repair function.
- Produces: `WorldEconomyIntegrityError`, a validated `processGameWeek` candidate, and stage codes `world_integrity_start`, `world_integrity_repair`, `world_integrity_done`.

- [ ] **Step 1: Write the failing transaction audit**

Inject a validator seam that returns each status. Assert valid candidates advance once, derived repair validates once and advances once, protected failure rejects, input remains byte-identical, and a retry starts from the unchanged week.

```ts
await assert.rejects(
  () => processGameWeek(player, { validateWorldEconomy: () => protectedFailure }),
  error => error instanceof WorldEconomyIntegrityError,
);
assert.equal(getAbsoluteWeek(player.age, player.currentWeek), beforeWeek);
```

- [ ] **Step 2: Run the audit and verify RED**

Run: `npm run audit:world-economy-we8-week-transaction`

Expected: FAIL because the validation seam and error class do not exist.

- [ ] **Step 3: Validate the final candidate in `processGameWeek`**

After all canonical weekly systems finish but before return:

1. validate the expected next absolute week;
2. rebuild derived WE state once when requested;
3. validate the repaired candidate;
4. throw `WorldEconomyIntegrityError` on any remaining violation;
5. emit bounded diagnostic context containing codes and counts only.

- [ ] **Step 4: Extend failure presentation**

Map an integrity abort to player copy equivalent to: “This week was not applied because its world data could not be verified. Your previous week is safe. Try again or restore the previous save.” Keep technical codes out of the toast.

- [ ] **Step 5: Run focused and existing week safety audits**

Run: `npm run audit:world-economy-we8-week-transaction`

Expected: PASS.

Run: `npm run audit:week-processing-save-safety`

Expected: PASS.

Run: `npm run audit:fresh-save-week-progression-c8`

Expected: PASS.

- [ ] **Step 6: Commit checkpoint**

```bash
git add package.json services/gameLoop.ts services/weekProcessingRecovery.ts scripts/audit-world-economy-we8-week-transaction.ts
git commit -m "fix(game-loop): validate atomic world economy weeks"
```

### Task 3: Deterministic retry and reload contract

**Files:**
- Create: `services/weekProcessingDeterminism.ts`
- Modify: `services/gameLoop.ts`
- Create: `scripts/audit-world-economy-we8-determinism.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `createWeekSimulationSeed(player, targetAbsoluteWeek): string` and `createWeekScopedRng(seed, scope): () => number`.
- Consumes: existing `createDeterministicRng` and subsystem fingerprints. `processGameWeek` receives one simulation seed and passes explicitly scoped RNGs to stochastic owners; WE8 never replaces global `Math.random` around an asynchronous operation.

- [ ] **Step 1: Write the failing deterministic audit**

Run identical normalized saves through Process Week with different `Date.now` values and environmental `Math.random` sequences. Compare canonical WE1–WE7, finances, rights, platform AI, studio AI, project, and event outcomes after removing save metadata timestamps. Repeat after JSON save/reload and after an injected pre-promotion failure.

- [ ] **Step 2: Run the audit and verify RED**

Run: `npm run audit:world-economy-we8-determinism`

Expected: FAIL and identify the first stochastic gameplay path that differs.

- [ ] **Step 3: Add the stable week seed boundary**

Seed from player ID, target absolute week, latest migration version, and a persisted gameplay RNG nonce. Do not include real time, device, performance measurements, or UI state.

- [ ] **Step 4: Remove nondeterministic gameplay inputs from the Process Week path**

Replace or inject scoped deterministic RNG for every differing weekly gameplay path found by the audit. Keep `Date.now` only for diagnostics, integrity manifest metadata, and analytics.

- [ ] **Step 5: Prove retry and reload equality**

Run: `npm run audit:world-economy-we8-determinism`

Expected: PASS for direct replay, JSON reload, and failed-then-retried week.

Run: `npm run audit:shared-industry-long-run-b8`

Expected: PASS.

- [ ] **Step 6: Commit checkpoint**

```bash
git add package.json services/weekProcessingDeterminism.ts services/gameLoop.ts scripts/audit-world-economy-we8-determinism.ts
git commit -m "fix(game-loop): make weekly simulation replay deterministic"
```

### Task 4: World-economy save integrity, compaction, and migration

**Files:**
- Modify: `services/saveIntegrity.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/savePreparation.ts`
- Create: `scripts/audit-world-economy-we8-save.ts`
- Modify: `package.json`

**Interfaces:**
- Extends `SaveProtectedState` with a compact canonical world-economy fingerprint.
- Produces bounded WE compaction and the next idempotent migration version.

- [ ] **Step 1: Write the failing save audit**

Assert that tampering with WE canonical week/fingerprint/global totals invalidates the manifest; compaction keeps protected identities and trims oversized operational histories; malformed derived states normalize; 24 MB, 50 MB, and 400 MB synthetic legacy classifications request a recovery checkpoint without requiring a complete duplicate JSON string.

- [ ] **Step 2: Run the audit and verify RED**

Run: `npm run audit:world-economy-we8-save`

Expected: FAIL because the save manifest does not yet fingerprint WE1–WE7.

- [ ] **Step 3: Add a compact WE fingerprint**

Hash schema versions, last processed weeks, source fingerprints, and canonical global totals for WE1–WE7. Do not hash presentation caches or every country row into the protected manifest.

- [ ] **Step 4: Add explicit WE state compaction**

Retain current country/platform summaries and documented recent windows; aggregate or trim only operational history. Preserve material references and acquisition history. Normalize signed zero and non-finite derived values before persistence.

- [ ] **Step 5: Bump and harden migration**

Increment `SAVE_MIGRATION_VERSION`, initialize the compact health summary, rebuild malformed derived WE state in dependency order, and prove `migratePlayerSave(migratePlayerSave(save))` is identical.

- [ ] **Step 6: Run save regressions**

Run: `npm run audit:world-economy-we8-save`

Run: `npm run audit:save-migration`

Run: `npm run audit:save-integrity`

Run: `npm run audit:save-generations`

Run: `npm run audit:large-save-integrity`

Run: `npm run audit:save-transfer`

Expected: all PASS.

- [ ] **Step 7: Commit checkpoint**

```bash
git add package.json services/saveIntegrity.ts services/saveCompaction.ts services/saveMigration.ts services/savePreparation.ts scripts/audit-world-economy-we8-save.ts
git commit -m "feat(save): protect and compact shared world economy"
```

### Task 5: Economy shock and lifecycle matrix

**Files:**
- Create: `scripts/fixtures/worldEconomyWe8Scenarios.ts`
- Create: `scripts/audit-world-economy-we8-shocks.ts`
- Modify: `package.json`
- Modify only if the audit exposes a defect: the owning WE1–WE7 or Platform AI service.

**Interfaces:**
- Produces deterministic scenario fixtures and invariant reports; it does not add runtime gameplay state.

- [ ] **Step 1: Encode the fixed-seed scenario matrix**

Include baseline, recession, inflation, boom, ageing, connectivity growth, regional affordability, premium fit, price war, subscription fatigue, sharing, piracy, content drought, local hit, franchise hit, weak catalogue marketing, localization advantage, distress, emergency funding, entrant, giant entrant, acquisition, AI-assistance removal, rights expiry, and territorial loss.

- [ ] **Step 2: Write outcome-shape assertions**

Each scenario must remain finite and reconciled while also demonstrating the intended direction. Example: recession lowers discretionary budgets without forcing universal churn; a fitted premium plan may retain fewer accounts while producing higher revenue; piracy increases unlicensed reach without creating subscription cash.

- [ ] **Step 3: Run and fix only demonstrated defects**

Run: `npm run audit:world-economy-we8-shocks`

Expected: RED for any uncovered economic defect, then PASS after the smallest correction in the owning service.

- [ ] **Step 4: Run Platform AI and ecosystem regressions**

Run: `npm run audit:platform-ai-economy`

Run: `npm run audit:platform-ai-distress`

Run: `npm run audit:global-streaming-ecosystem`

Run: `npm run audit:streaming-acquisitions-phase21`

Expected: all PASS.

- [ ] **Step 5: Commit checkpoint**

```bash
git add package.json scripts/fixtures/worldEconomyWe8Scenarios.ts scripts/audit-world-economy-we8-shocks.ts services/worldEconomy services/platformAi services/streamingPlatformEcosystemTurn.ts services/streamingAcquisitions.ts
git commit -m "test(world-economy): add WE8 shock matrix"
```

### Task 6: Long-run and stage performance gates

**Files:**
- Modify: `scripts/fixtures/lateGameWeekPerformanceFixture.ts`
- Modify: `scripts/audit-late-game-week-performance.ts`
- Create: `scripts/audit-world-economy-we8-soak.ts`
- Create: `scripts/audit-world-economy-we8-mobile-budget.ts`
- Modify: `package.json`
- Modify only when a measured regression identifies ownership: the relevant service.

**Interfaces:**
- Produces separate engine-horizon, full-game-loop, save-size, heap, stage, and mobile-proxy reports.

- [ ] **Step 1: Expand the mature fixture**

Include WE1–WE7, player streaming, production house, acquired platform, rights, catalogues, active and historical projects, dynasty archives, platform/studio AI, industry media, and annual-heavy boundaries.

- [ ] **Step 2: Add stage timing and state counters**

Report calculation, WE validation, compaction, clone, candidate write/read-back proxy, UI commit, save bytes, heap, active collections, and bounded-history counts. Keep desktop, browser-throttled, and physical-device evidence labeled separately.

- [ ] **Step 3: Add the 400-year engine soak**

Advance 20,800 WE weeks with fixed seeds, periodic JSON reload, shock schedule, acquisition, collapse/entry, and exact reconciliation checkpoints. Assert bounded state and monotonic absolute week.

- [ ] **Step 4: Add the dedicated full Process Week soak**

Support `WE8_SOAK_WEEKS`, defaulting to a short CI horizon and accepting `20800` for the release run. Persist/reload at quarterly, annual, decade, migration, and acquisition checkpoints. Any failed or duplicate week is fatal.

- [ ] **Step 5: Preserve desktop gates and add mobile proxy reporting**

Keep p95 <=350 ms normal and <=750 ms annual on the reference desktop fixture. Add a throttled-browser responsiveness audit that verifies the processing frame paints, duplicate input is blocked, and the UI remains responsive. Do not label the proxy as real-device evidence.

- [ ] **Step 6: Run the performance suite**

Run: `npm run audit:late-game-week-performance`

Run: `npm run audit:world-economy-we8-soak`

Run: `WE8_SOAK_WEEKS=520 npm run audit:world-economy-we8-soak`

Run: `npm run audit:world-economy-we8-mobile-budget`

Expected: all automated gates PASS; reports state exact environment and evidence class.

- [ ] **Step 7: Commit checkpoint**

```bash
git add package.json scripts/fixtures/lateGameWeekPerformanceFixture.ts scripts/audit-late-game-week-performance.ts scripts/audit-world-economy-we8-soak.ts scripts/audit-world-economy-we8-mobile-budget.ts services/gameLoop.ts services/saveCompaction.ts services/worldEconomy
git commit -m "perf(world-economy): enforce WE8 long-run budgets"
```

### Task 7: Material player explanations without micromanagement

**Files:**
- Create: `services/worldEconomy/worldEconomyExplanations.ts`
- Modify: `components/StreamingWeeklyCeoLoop.tsx`
- Modify: `components/StreamingAnalyticsCenter.tsx`
- Modify: `components/streaming-transplant/StreamingAudienceExperience.tsx`
- Create: `scripts/audit-world-economy-we8-explanations.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildWorldEconomyExplanations(player, absoluteWeek): WorldEconomyExplanation[]` with stable IDs, materiality rank, surface, title, and concise reason.
- Consumes only committed WE5–WE7 and existing market/rights/localization facts.

- [ ] **Step 1: Write the failing explanation audit**

Assert deterministic output, materiality filtering, no routine-week noise, no raw cohort controls, valid causal source IDs, and examples for price/churn, localization/retention, rival price pressure, sharing, piracy, and recovery.

- [ ] **Step 2: Run and verify RED**

Run: `npm run audit:world-economy-we8-explanations`

Expected: FAIL because the explanation adapter does not exist.

- [ ] **Step 3: Implement the pure explanation adapter**

Limit output to the top three material explanations per week. Derive copy from thresholds and committed facts; do not call random generators or persist duplicated stories.

- [ ] **Step 4: Reuse existing surfaces**

Place explanation rows in the CEO report and relevant analytics/audience detail only. Keep routine screens unchanged when no material explanation exists.

- [ ] **Step 5: Run audit and UI regressions**

Run: `npm run audit:world-economy-we8-explanations`

Run: `npm run audit:world-streaming-we5-ui`

Run: `npm run audit:world-streaming-we6-ui`

Expected: all PASS.

- [ ] **Step 6: Commit checkpoint**

```bash
git add package.json services/worldEconomy/worldEconomyExplanations.ts components/StreamingWeeklyCeoLoop.tsx components/StreamingAnalyticsCenter.tsx components/streaming-transplant/StreamingAudienceExperience.tsx scripts/audit-world-economy-we8-explanations.tsx
git commit -m "feat(streaming): explain material world economy changes"
```

### Task 8: Release gate, report, and roadmap closure

**Files:**
- Create: `scripts/audit-world-economy-we8-release.ts`
- Create: `docs/superpowers/reports/2026-09-11-world-economy-we8-report.md`
- Modify: `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`
- Modify: `package.json`

**Interfaces:**
- Produces one release command that runs focused WE8 gates and prints the evidence classes without hiding failures.

- [ ] **Step 1: Add the release-gate orchestrator**

The script must run or verify WE8 integrity, transaction, determinism, save, shocks, explanations, bounded soak, existing WE1–WE7 regressions, save/migration checks, TypeScript, and build. The 20,800 full-game soak remains an explicit manual release command because of duration, but its latest result must be recorded in the report.

- [ ] **Step 2: Run the complete focused gate**

Run: `npm run audit:world-economy-we8-release`

Expected: PASS with zero skipped mandatory focused checks.

- [ ] **Step 3: Run final verification**

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

Expected: all PASS; build may retain already documented bundle-size/mixed-import warnings.

- [ ] **Step 4: Write the evidence report**

Record exact scenario count, horizons, save sizes, p50/p95/max stage timings, heap, recovery cases, migration versions, physical-device evidence if available, known limitations, and whether the 20,800 full-game release soak was run. Do not convert a partial horizon into a 400-year claim.

- [ ] **Step 5: Close WE8 in the roadmap**

Mark WE8 complete only if every completion-gate statement is backed by fresh evidence. Otherwise mark the remaining item explicitly and keep WE8 active.

- [ ] **Step 6: Commit checkpoint**

```bash
git add package.json scripts/audit-world-economy-we8-release.ts docs/superpowers/reports/2026-09-11-world-economy-we8-report.md docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md
git commit -m "docs(world-economy): close WE8 hardening phase"
```
