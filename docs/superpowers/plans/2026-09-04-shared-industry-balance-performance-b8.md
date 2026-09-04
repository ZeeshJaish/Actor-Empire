# Project B Phase B8 Shared Industry Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Certify and tune the combined Project A and Project B industry simulation across five deterministic 400-year regimes while preserving gameplay depth, mobile-oriented Process Week responsiveness, save longevity, ownership parity, and public-world coherence.

**Architecture:** Add audit-only B8 scenario, metric, and runner helpers under `scripts/helpers` so certification code never enters the production bundle. Drive every endurance week through the canonical B7 `processIndustryWorldWeek` seam, use real save migration/compaction for checkpoint parity, and reuse the real `processGameWeek` pipeline for mature-player timing. Production logic changes are permitted only after a focused RED measurement identifies an actual balance, correctness, or performance failure.

**Tech Stack:** TypeScript, esbuild executable audits, Node.js `performance`, Vite/React production build, canonical Actor Empire `Player`/`WorldState`, deterministic RNG, save migration/compaction, local browser verification.

**Spec:** `docs/superpowers/specs/2026-09-04-shared-industry-balance-performance-b8-design.md`

## Global Constraints

- Execute inline in the existing `codex/rights-market-phase1` checkout because the uncommitted B1–B7 prerequisites are present there; do not create a clean worktree that would omit them.
- Preserve all unrelated dirty work.
- Do not stage, commit, or push without explicit user authorization.
- Every production behavior change follows a witnessed RED → GREEN cycle.
- Certification telemetry remains audit-only and is never persisted into player saves.
- Every 400-year scenario processes all 20,800 weeks through `processIndustryWorldWeek`; no shorter horizon may be reported as complete.
- No optimization may skip a due decision, suppress a canonical project, remove permanent public history, or weaken financial, rights, production, or ownership obligations.
- AI-only cost/time advantages end immediately upon player acquisition.
- A four-times desktop timing result is labelled a proxy, never physical-device evidence.
- No new player-facing management screen is added.

---

### Task 1: B8 Certification Contracts and Invariant Evaluator

**Files:**
- Create: `scripts/helpers/sharedIndustryB8Types.ts`
- Create: `scripts/helpers/sharedIndustryB8Metrics.ts`
- Create: `scripts/audit-shared-industry-foundation-b8.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `SharedIndustryB8Regime`, `SHARED_INDUSTRY_B8_CHECKPOINTS`, `SharedIndustryB8Snapshot`, `SharedIndustryB8Report`, `SharedIndustryB8Violation`, `observeSharedIndustryB8Week(previous, player, absoluteWeek)`, `finalizeSharedIndustryB8Report(input)`, and `assertSharedIndustryB8Integrity(report)`.
- Consumes: canonical `Player`, `WorldState`, `IndustryProject`, `IndustryProductionCommitment`, event-ledger facts, Platform AI state, Studio AI state, streaming ecosystem state, rights contracts, and finance ledgers.
- Later tasks rely on the evaluator returning violations as structured values before the executable audit throws.

- [x] **Step 1: Write the failing foundation audit**

Create an audit that imports the wished-for contracts and verifies independently derived behavior:

```ts
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    SHARED_INDUSTRY_B8_CHECKPOINTS,
    assertSharedIndustryB8Integrity,
    finalizeSharedIndustryB8Report,
    observeSharedIndustryB8Week,
} from './helpers/sharedIndustryB8Metrics';

assert.deepEqual(SHARED_INDUSTRY_B8_CHECKPOINTS, [520, 1_300, 2_600, 5_200, 20_800]);
const observed = observeSharedIndustryB8Week(undefined, structuredClone(INITIAL_PLAYER), 1);
const report = finalizeSharedIndustryB8Report({ regime: 'BASELINE', seed: 'b8-foundation', snapshots: [observed] });
assert.equal(report.horizonWeeks, 1);
assert.equal(report.integrity.nonFiniteValues, 0);
assert.equal(report.integrity.duplicateProjectIds, 0);
assert.deepEqual(assertSharedIndustryB8Integrity(report), []);

const broken = structuredClone(INITIAL_PLAYER);
const duplicateProject = {
    id: 'duplicate', title: 'Duplicate', genre: 'DRAMA', originalLanguageId: 'english', mediaType: 'MOVIE',
    targetAudience: 'PG-13', studioId: 'TEST_STUDIO', budgetTier: 'MID', quality: 60, rating: 6,
    boxOffice: 20_000_000, year: 18, weekReleased: 1, leadActorId: 'actor', leadActorName: 'Actor',
    directorId: 'director', directorName: 'Director', reviews: '', releaseStrategy: 'THEATRICAL', streamingWindows: [],
} as const;
broken.world.projects = [duplicateProject, { ...duplicateProject }] as never;
const brokenReport = finalizeSharedIndustryB8Report({ regime: 'ADVERSE', seed: 'broken', snapshots: [observeSharedIndustryB8Week(undefined, broken, 2)] });
assert.ok(assertSharedIndustryB8Integrity(brokenReport).some(item => item.code === 'DUPLICATE_PROJECT_ID'));
```

The production change caught by this audit is an evaluator that misses duplicate canonical records or non-finite state.

- [x] **Step 2: Run the audit and verify RED**

Run:

```bash
npx esbuild scripts/audit-shared-industry-foundation-b8.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-shared-industry-foundation-b8.mjs
node /tmp/audit-shared-industry-foundation-b8.mjs
```

Expected: bundling fails because `scripts/helpers/sharedIndustryB8Metrics.ts` does not exist.

- [x] **Step 3: Implement the typed metric contracts**

Define literal regimes and checkpoint types:

```ts
export type SharedIndustryB8Regime = 'BASELINE' | 'LEAN' | 'BOOM' | 'CROWDED' | 'ADVERSE';
export const SHARED_INDUSTRY_B8_CHECKPOINTS = [520, 1_300, 2_600, 5_200, 20_800] as const;

export interface SharedIndustryB8Violation {
    code: 'NON_FINITE_VALUE' | 'DUPLICATE_PROJECT_ID' | 'DUPLICATE_PRODUCTION_ID'
        | 'DUPLICATE_EVENT_ID' | 'DANGLING_PROJECT_REFERENCE' | 'INVALID_STREAMING_THEATRICAL_RELEASE'
        | 'UNEXPLAINED_NEGATIVE_CASH' | 'UNBOUNDED_HISTORY' | 'CHECKPOINT_MISSING';
    detail: string;
    absoluteWeek: number;
}
```

The snapshot records bounded counters and distributions—not cloned worlds. Include company lifecycle, finance, project pipeline, outcome, content, universe, rights, public-event, save-byte, registry-count, and integrity fields required by the specification.

- [x] **Step 4: Implement real observation and integrity evaluation**

`observeSharedIndustryB8Week` must inspect canonical current state and compare with the prior snapshot to count new transitions without double-counting. Use sets local to the report accumulator for observed stable IDs; do not write audit keys into `Player`.

`assertSharedIndustryB8Integrity` must return structured violations for:

- non-finite numeric values in material company/project/contract/production fields;
- duplicate stable IDs;
- dangling production/project, rights/project, commitment/production, and public-event references;
- streaming-only titles appearing as theatrical releases;
- impossible negative material balances; and
- missing requested checkpoints.

- [x] **Step 5: Run foundation audit GREEN**

Add package command `audit:shared-industry-foundation-b8`, run it, and require exit code 0.

- [x] **Step 6: Run adjacent B7 and save checks**

Run:

```bash
npm run audit:industry-player-world-b7
npm run audit:save-integrity
```

Expected: both pass unchanged.

---

### Task 2: Deterministic Scenario Factory

**Files:**
- Create: `scripts/helpers/sharedIndustryB8Scenarios.ts`
- Create: `scripts/audit-shared-industry-scenarios-b8.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `INITIAL_PLAYER`, `migratePlayerSave`, `normalizeStudioAiState`, canonical streaming ecosystem/platform initializers, deterministic RNG helpers, and `SharedIndustryB8Regime`.
- Produces: `buildSharedIndustryB8Scenario(regime, seed): Player`, `describeSharedIndustryB8Scenario(player): SharedIndustryB8ScenarioDescription`, and `SHARED_INDUSTRY_B8_SCENARIO_SEEDS`.
- The factory creates realistic initial worlds but never contains weekly simulation behavior.

- [x] **Step 1: Write the failing scenario audit**

Use hand-checked assertions:

```ts
const baselineA = buildSharedIndustryB8Scenario('BASELINE', 'b8-baseline-01');
const baselineB = buildSharedIndustryB8Scenario('BASELINE', 'b8-baseline-01');
assert.deepEqual(baselineB, baselineA);
assert.ok(Object.keys(baselineA.world.studios || {}).length >= 4);
assert.ok(Object.keys(baselineA.world.platforms || {}).length >= 5);

const lean = describeSharedIndustryB8Scenario(buildSharedIndustryB8Scenario('LEAN', 'b8-lean-01'));
const boom = describeSharedIndustryB8Scenario(buildSharedIndustryB8Scenario('BOOM', 'b8-boom-01'));
assert.ok(lean.aggregateCompanyCashMillions < boom.aggregateCompanyCashMillions);
assert.ok(boom.activeCompanyCount >= lean.activeCompanyCount);

const crowded = describeSharedIndustryB8Scenario(buildSharedIndustryB8Scenario('CROWDED', 'b8-crowded-01'));
assert.ok(crowded.activeCompanyCount > describeSharedIndustryB8Scenario(baselineA).activeCompanyCount);
```

The production change caught is a regime factory that silently produces identical economic worlds or unstable fixtures.

- [x] **Step 2: Run and verify RED**

Expected: missing `sharedIndustryB8Scenarios` import.

- [x] **Step 3: Implement the factory using canonical initializers**

Create companies by normalizing the same `NPCStudioState`, Platform AI, and streaming ecosystem shapes used by production. Apply regime modifiers only to persisted starting conditions:

```ts
const REGIME_PROFILE = {
    BASELINE: { cash: 1, demand: 1, entrantSlots: 0, distress: 0 },
    LEAN: { cash: 0.68, demand: 0.76, entrantSlots: 0, distress: 18 },
    BOOM: { cash: 1.42, demand: 1.28, entrantSlots: 2, distress: 0 },
    CROWDED: { cash: 1.05, demand: 1.02, entrantSlots: 6, distress: 4 },
    ADVERSE: { cash: 0.52, demand: 0.64, entrantSlots: 1, distress: 32 },
} as const;
```

Store the regime in audit metadata returned separately; do not add it to the save schema. Generated company potential must come from stable seed-derived competence, reputation, capital, and specialization values.

- [x] **Step 4: Verify every scenario is canonical and distinct**

Assert all companies have normalized AI state, valid controllers, finite finance, IDs unique within their canonical studio/platform namespaces, at least one viable bidder identity, and no player-owned AI advantage. Verify two different seeds produce different worlds while each seed replays exactly.

- [x] **Step 5: Run GREEN and adjacent foundation audit**

Add `audit:shared-industry-scenarios-b8`; run it followed by `audit:shared-industry-foundation-b8`.

---

### Task 3: Canonical Endurance Runner and Midpoint Resume

**Files:**
- Create: `scripts/helpers/sharedIndustryB8Runner.ts`
- Create: `scripts/audit-shared-industry-runner-b8.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildSharedIndustryB8Scenario`, `processIndustryWorldWeek`, `compactPlayerForPersistence`, `migratePlayerSave`, and Task 1 metric functions.
- Produces: `runSharedIndustryB8Scenario(options): Promise<SharedIndustryB8RunResult>` with `player`, `report`, `checkpointDigests`, `runtime`, and `resumeDigest`.
- Options: `{ regime, seed, horizonWeeks, checkpointWeeks, resumeAtWeek?, progressEveryWeeks?, onProgress? }`.

- [x] **Step 1: Write the failing runner audit**

The audit runs 104 weeks twice and checks:

```ts
const first = await runSharedIndustryB8Scenario({ regime: 'BASELINE', seed: 'runner-01', horizonWeeks: 104, checkpointWeeks: [52, 104], resumeAtWeek: 52 });
const replay = await runSharedIndustryB8Scenario({ regime: 'BASELINE', seed: 'runner-01', horizonWeeks: 104, checkpointWeeks: [52, 104], resumeAtWeek: 52 });
assert.deepEqual(replay.checkpointDigests, first.checkpointDigests);
assert.equal(first.report.horizonWeeks, 104);
assert.deepEqual(first.report.checkpoints.map(item => item.absoluteWeek), [52, 104]);
assert.equal(first.resumeDigest, first.uninterruptedDigest);
assert.equal(first.report.integrity.doubleProcessedWeeks, 0);
```

The production changes caught are skipping canonical weeks, nondeterministic digests, and resume divergence.

- [x] **Step 2: Run and verify RED**

Expected: missing runner module.

- [x] **Step 3: Implement the ordered weekly loop**

For each entered absolute week:

```ts
const result = processIndustryWorldWeek(player, player.world, absoluteWeek);
if (!result.processed) throw new Error(`B8 scenario failed to process week ${absoluteWeek}`);
player = result.player;
accumulator = observeSharedIndustryB8Week(accumulator, player, absoluteWeek);
```

At checkpoint weeks, compact and digest the canonical save. At `resumeAtWeek`, branch through `JSON.stringify` → `JSON.parse` → `migratePlayerSave`; continue both branches and compare final canonical digests.

- [x] **Step 4: Make progress and timing bounded**

Call `onProgress` only at `progressEveryWeeks`; record weekly-window p50/p95/max without retaining 20,800 raw samples. Use a fixed-size streaming percentile reservoir or bounded histogram.

- [x] **Step 5: Run GREEN and deterministic mutation check**

Run the 104-week audit. Temporarily alter the runner to skip one week and confirm the audit fails, then restore the implementation and rerun GREEN.

---

### Task 4: Gameplay Experience and Balance Baseline Gate

**Files:**
- Create: `scripts/helpers/sharedIndustryB8Experience.ts`
- Create: `scripts/audit-shared-industry-experience-b8.ts`
- Create: `docs/superpowers/reports/2026-09-04-shared-industry-b8-baseline.md`
- Modify: `package.json`
- Modify only after witnessed RED: the exact production coefficient/service file demonstrated by the failing metric

**Interfaces:**
- Consumes: B8 reports from the baseline, boom, crowded, lean, and adverse scenarios.
- Produces: `evaluateSharedIndustryB8Experience(matrix): SharedIndustryB8ExperienceEvaluation` containing per-principle measurements and violations.
- Produces an evidence report containing raw measurements before any tuning.

- [x] **Step 1: Write failing experience rules against controlled reports**

Create literal controlled reports proving the evaluator rejects:

- a company winning 70 of 100 commercial years;
- a world where no major company fails;
- a world where no small/regional company breaks out;
- a regime with unexplained rescue cash;
- exact non-lineage fingerprint repetition;
- permanent public silence; and
- event spam consisting only of routine accounting.

Example:

```ts
const dominant = controlledMatrix({ commercialYearWins: { NETFLIX: 70, OTHERS: 30 }, measuredYears: 100 });
assert.ok(evaluateSharedIndustryB8Experience(dominant).violations.some(item => item.code === 'EXCESSIVE_DOMINANCE'));
```

The production change caught is an evaluator that labels an obviously monotonous or unfair world healthy.

- [x] **Step 2: Run and verify RED**

Expected: missing experience evaluator.

- [x] **Step 3: Implement principle-based evaluation**

Freeze the specification's hard bands directly. For near-repeat, genre concentration, franchise load, talent load, and annual material-event cadence, derive baseline percentiles from the first real matrix, document the measured ranges, then freeze limits that allow ordinary variance while rejecting pathological concentration.

- [x] **Step 4: Run an initial 10-year five-regime matrix**

Run all regimes for 520 weeks. Write exact metrics to the baseline report before changing gameplay coefficients. This is the mandatory evidence checkpoint.

- [x] **Step 5: Convert each real failure into a focused RED audit**

For every failed principle, append a narrowly named audit case to `audit-shared-industry-experience-b8.ts` using the observed seed and metric. Record:

- failed regime and seed;
- observed value and approved band;
- responsible canonical service;
- proposed minimal coefficient/branch correction; and
- adjacent audits that protect the system.

If the initial matrix has no real experience failure, make no production balance change.

- [x] **Step 6: Apply minimal GREEN corrections one at a time**

Only edit a production service after its focused case is RED. After each correction run the focused B8 audit plus the owning phase aggregate (`audit:industry-intelligence-b2`, `audit:industry-content-b3`, `audit:platform-intelligence-b4`, `audit:studio-ai-slate-b5`, `audit:studio-ai-production-b6`, or `audit:industry-player-world-b7`).

- [x] **Step 7: Rerun the five-regime 10-year matrix**

Require all frozen hard bands to pass and update the baseline report with before/after values. Do not erase the original failure evidence.

---

### Task 5: Save, Dynasty, Rights, and Ownership Parity Matrix

**Files:**
- Create: `scripts/audit-shared-industry-parity-b8.ts`
- Modify: `package.json`
- Modify only after witnessed RED: owning save/ownership service and its focused audit

**Interfaces:**
- Consumes: B8 scenario runner, `migratePlayerSave`, `compactPlayerForPersistence`, save generation/recovery helpers, `materializeStudioOwnership`, `dematerializeStudioOwnership`, subsidiary operations, dynasty career, and Project A registries.
- Produces no production state; verifies canonical digest and obligation parity.

- [x] **Step 1: Write the failing combined parity audit**

Cover these real transitions:

1. baseline scenario → 1,300 weeks → JSON save/migrate → 104 more weeks versus uninterrupted branch;
2. active studio acquisition with an unfinished B6 production;
3. player progression of inherited work under player-standard timing/cost;
4. reverse sale and following-week AI continuation;
5. active streaming platform acquisition with rights and research state;
6. manual, board-review, and automatic subsidiary modes;
7. dynasty control transferred to a child while an older family member's project remains active; and
8. save generation/recovery retaining canonical public project and rights history.

Use explicit assertions for canonical IDs, elapsed production weeks, cash, paid milestones, rights owners, universe IDs, and exactly-once checkpoints.

- [x] **Step 2: Run and verify the current RED or GREEN state honestly**

The first run may fail on a newly exposed cross-system defect or pass because B7/A8S already implement the behavior. A passing characterization is acceptable here because Task 5 integrates existing production contracts; any newly written helper still requires its own RED.

- [x] **Step 3: Repair only reproduced defects with focused RED tests**

For each defect, first add the smallest reproducer to the owning audit. Then implement the minimal fix and rerun both owning and combined parity audits.

- [x] **Step 4: Run the full adjacent parity suite**

Run save integrity/generations, dynasty, studio acquisition/sale, subsidiary operations, B7 ownership handoff, Project A rights marketplace, Rights Office, and save migration checks.

---

### Task 6: Mature Process Week and Save-Growth Certification

**Files:**
- Modify: `scripts/fixtures/lateGameWeekPerformanceFixture.ts`
- Modify: `scripts/audit-late-game-week-performance.ts`
- Create: `scripts/audit-shared-industry-performance-b8.ts`
- Modify: `package.json`
- Modify only after witnessed RED: measured hot-path production files

**Interfaces:**
- Consumes: actual `processGameWeek`, `compactPlayerForPersistence`, structured clone, `prepareProcessedWeekForUi`, current B1–B7 mature world, and B8 100-/400-year checkpoint saves.
- Produces: desktop p50/p95/max, annual-heavy p95, four-times proxy, stage maxima, compacted bytes, registry counts, checkpoint byte slope, and outcome-parity digest.

- [x] **Step 1: Write the failing B8 performance fixture assertions**

Update the existing fixture expectation so it includes normalized Studio AI companies, B2/B3 intelligence state, B5 slates, B6 active/terminal productions, B7 event ledger/public history, Project A rights, one player Production House, one player Streaming House, and dynasty history.

Add assertions requiring those systems to be present. Run the audit before changing the fixture; expected RED is the first missing B1–B7 representative state.

- [x] **Step 2: Extend the fixture with canonical constructors**

Reuse scenario/phase fixture builders and migration. Do not manually invent partial production shapes when a canonical constructor or normalizer exists.

- [x] **Step 3: Refresh the measured baseline**

Run one warm-up plus 20 real weeks and record:

```ts
assert.ok(report.total.p95Ms <= 500);
assert.ok(report.annualHeavy.p95Ms <= 750);
assert.ok(report.total.p95Ms * 4 <= 2_000);
assert.ok(report.annualHeavy.p95Ms * 4 <= 3_000);
assert.equal(report.inputMutationCount, 0);
assert.equal(report.weekAdvanceCount, report.weeks);
```

Measure save bytes at 100- and 400-year B8 checkpoints and reject linear terminal-private-history growth while retaining public history and active obligations.

- [x] **Step 4: Profile only if a budget fails**

Use the existing `onStage` instrumentation to identify the largest measured stage. Add a focused RED performance or repeated-work assertion for that stage before editing it.

Permitted fixes are duplicate-pass removal, deterministic turn-local indexes, due-gate correction, bounded terminal-private-history compaction, or worker separation if all earlier options fail.

- [x] **Step 5: Prove outcome parity after optimization**

Under fixed random/time sources, compare the canonical compacted digest before and after the optimization. The optimized state must be byte-equivalent for money, projects, rights, productions, awards, relationships, publications, and ownership.

- [x] **Step 6: Rerun performance and week-safety checks**

Run `audit:late-game-week-performance`, `audit:week-processing-scheduler`, `audit:week-processing-save-safety`, `audit:save-mirror`, `audit:weekly-event-performance`, and the new `audit:shared-industry-performance-b8`.

---

### Task 7: Complete 400-Year Matrix and Project B Exit Report

**Files:**
- Create: `scripts/audit-shared-industry-long-run-b8.ts`
- Create: `docs/superpowers/reports/2026-09-04-shared-industry-intelligence-b8-final-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: all B8 helpers and focused audits.
- Produces: `audit:shared-industry-b8` aggregate command and `audit:shared-industry-long-run-b8` full five-regime 20,800-week command.
- The final report records actual metrics and limitations; it contains no projected or invented results.

- [x] **Step 1: Write the full-matrix executable audit**

Run each regime with its frozen seed through all checkpoints and assert:

- every scenario reaches exactly 20,800 processed weeks;
- all hard integrity and frozen experience bands pass;
- replay/resume digests match;
- 100- to 400-year save growth is bounded;
- runtime windows do not grow without bound; and
- the aggregate retains competition, successes, failures, entrants, distress, funding, closure/acquisition, and universe variety.

- [x] **Step 2: Run a 100-year matrix smoke before the expensive gate**

Set an explicit audit environment horizon of 5,200 weeks. Require every scenario to finish and inspect all checkpoint metrics. Do not call this the 400-year certification.

- [x] **Step 3: Run the complete five-scenario 400-year gate**

Run all 104,000 canonical scenario-weeks with progress output. Record exact wall time, per-regime time, peak heap observation, checkpoint save bytes, and every experience/economy metric.

- [x] **Step 4: Run regression aggregates**

Run:

```bash
npm run audit:industry-intelligence-b2
npm run audit:industry-content-b3
npm run audit:platform-intelligence-b4
npm run audit:studio-ai-slate-b5
npm run audit:studio-ai-production-b6
npm run audit:industry-player-world-b7
npm run audit:streaming-rights-marketplace-phase16
npm run audit:late-game-week-performance
npm run audit:save-integrity
npm run audit:save-generations
npm run audit:dynasty-career
npm run build
git diff --check
```

Any failed command is reported and repaired if B8-owned. Older unrelated fixture diagnostics remain separately identified and may not be described as passing.

- [x] **Step 5: Perform browser gameplay inspection**

Start and verify the Actor Empire dev server's repository cwd. Load a mature deterministic save and inspect Process Week feedback, re-entry protection, event spacing over several weeks, Forbes, IMDb, Box Office, News, X, Instagram, rights, commission/bidding eligibility, subsidiary controls, active acquisition handoff, and console errors.

- [x] **Step 6: Write the final evidence report**

Record actual scenario tables, balance changes, before/after performance, save growth, parity evidence, browser observations, exact commands, limitations, physical-device evidence status, and deferred Project C work.

- [x] **Step 7: Update roadmap and run final aggregate**

Only after every gate passes, mark B8 and Project B complete, advance the approval gate to Project C, add the report link and version changelog, then run `audit:shared-industry-b8`, `npm run build`, and `git diff --check` fresh.

- [x] **Step 8: Present the final report for user approval**

Do not begin Project C. Report completion evidence, any honest remaining baseline diagnostics, whether physical low-end Android evidence was available, and wait for the user's Project B exit approval.
