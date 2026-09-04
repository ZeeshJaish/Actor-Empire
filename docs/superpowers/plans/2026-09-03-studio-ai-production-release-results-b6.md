# Project B Phase B6 — Studio AI Production, Release, and Commercial Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every eligible B5 independent greenlight into one canonical, deterministic, fallible production and permanent rights-correct commercial result without duplicating the existing Platform AI or player production engines.

**Architecture:** Use `WorldState.industryProductions` as the single physical-production registry. Independent productions receive a focused Studio AI execution record and use B1 finance, B3 fingerprints, B5 lineage, shared calendars/bookings, Project A rights, and canonical project/outcome surfaces; commissioned productions retain their existing Platform AI execution and are observed rather than progressed twice.

**Tech Stack:** TypeScript, React game state, deterministic seeded simulation, esbuild audit scripts, Vite production build.

**Spec:** `docs/superpowers/specs/2026-09-03-studio-ai-production-release-results-b6-design.md`

## Global Constraints

- Work inline in the existing branch; do not use subagents.
- Preserve all unrelated dirty-worktree changes.
- Do not stage, commit, merge, or push without a new explicit user request.
- Every production behavior follows strict RED → GREEN TDD with a real audit.
- `WorldState.industryProductions` remains the sole physical-production registry.
- `WorldState.projects` receives one public record only at canonical release.
- Platform commissions remain owned by their existing Platform AI production and release services.
- Player-controlled and delegated projects never receive rival-AI progression.
- NPC talent overlap remains permitted and recorded; no firing, replacement, litigation, or lawsuit system is added.
- Streaming-only projects store zero theatrical box office.
- No second bidding, rights, streaming-economy, awards, or box-office authority is introduced.
- B7 owns full cross-surface presentation; B8 owns final mobile and balance certification.

---

### Task 1: Canonical Independent Production Contracts and Normalization

**Files:**
- Modify: `types.ts`
- Modify: `services/industryProductions.ts`
- Modify: `services/saveCompaction.ts`
- Create: `services/studioAi/studioAiProductionState.ts`
- Create: `scripts/audit-studio-ai-production-state-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `IndustryProductionCommitment`, `ProductionCalendar`, B5 commitment/fingerprint IDs.
- Produces: `StudioAiProductionRecord`, `normalizeStudioAiProductionRecord`, `isStudioAiIndependentProduction`, terminal/key/problem bounds.

- [x] **Step 1: Write the failing state audit**

```ts
import { normalizeStudioAiProductionRecord } from '../services/studioAi/studioAiProductionState';

const normalized = normalizeStudioAiProductionRecord(raw, 500);
assert.equal(normalized?.source, 'STUDIO_INDEPENDENT');
assert.equal(normalized?.processedKeys.length, 64);
assert.equal(normalized?.problems.length, 3);
assert.equal(normalized?.lastProgressedAbsoluteWeek, 500);
```

The audit also proves malformed independent metadata is rejected, platform `aiExecution` survives unchanged, active statuses survive compaction, and `RELEASED`/`CANCELLED` terminal records remain bounded by the existing 104-record global cap.

- [x] **Step 2: Run the audit and confirm RED**

Run: `npm run audit:studio-ai-production-state-b6`

Expected: module/API missing failure for `studioAiProductionState`.

- [x] **Step 3: Add the canonical contracts and normalizer**

```ts
export type IndustryProductionSource = 'PLATFORM_COMMISSION' | 'STUDIO_INDEPENDENT';
export type StudioAiProductionMilestone = 'PRE_PRODUCTION_START' | 'PRODUCTION_START' | 'POST_PRODUCTION_START' | 'DELIVERY';
export type StudioAiProblemType = 'DELAY' | 'OVERRUN' | 'QUALITY_LOSS' | 'TALENT_ISSUE' | 'FINANCING_HOLD' | 'POST_PRODUCTION_DIFFICULTY';

export interface StudioAiProductionRecord {
  schemaVersion: 1;
  source: 'STUDIO_INDEPENDENT';
  slateCommitmentId: string;
  fingerprintId: string;
  controllerAtLastProgression: StudioAiController;
  selectedReleaseMode: StudioAiReleaseMode | null;
  talentSelected: boolean;
  result: StudioAiCommercialResult | null;
  problems: StudioAiProductionProblem[];
  processedKeys: string[];
  lastProgressedAbsoluteWeek: number;
}
```

Extend `IndustryProductionCommitment` with explicit source, B5/B3 lineage, optional `studioAiExecution`, and independent lifecycle statuses `AWAITING_RELEASE`, `TURNAROUND`, and `RELEASED`. Preserve old-save defaults: `commissioningPlatformId` or `aiExecution` implies `PLATFORM_COMMISSION`; otherwise missing source cannot fabricate an independent record.

- [x] **Step 4: Make compaction source-aware and bounded**

```ts
const terminal = new Set(['DELIVERED', 'RELEASED', 'CANCELLED']);
const protectedProduction = !terminal.has(production.status)
  || referencedIds.has(production.id)
  || retainedAwardProjectIds.has(production.canonicalProjectId);
```

- [x] **Step 5: Run the state audit to GREEN**

Run: `npm run audit:studio-ai-production-state-b6`

Expected: state, migration, and bounds audit passes.

---

### Task 2: Exactly-Once B5 Greenlight Handoff

**Files:**
- Create: `services/studioAi/studioAiProductionHandoff.ts`
- Modify: `services/studioAi/studioAiSlateState.ts`
- Modify: `services/studioAi/studioAiWeek.ts`
- Modify: `services/studioAi/index.ts`
- Create: `scripts/audit-studio-ai-production-handoff-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: independent B5 `GREENLIT` commitments, B3 fingerprints, B1 controller/capacity/finance.
- Produces: `handoffStudioAiGreenlights(input): StudioAiProductionHandoffResult`.

- [x] **Step 1: Write the failing handoff audit**

```ts
const first = handoffStudioAiGreenlights({ player, world, studio, absoluteWeek: 300 });
assert.equal(first.createdCount, 1);
assert.equal(Object.keys(first.world.industryProductions!).length, 1);
assert.equal(first.studio.ai!.slate!.commitments[0].status, 'HANDED_OFF');
assert.ok(first.studio.ai!.slate!.commitments[0].industryProductionId);

const repeat = handoffStudioAiGreenlights({ player, world: first.world, studio: first.studio, absoluteWeek: 300 });
assert.equal(repeat.createdCount, 0);
assert.equal(Object.keys(repeat.world.industryProductions!).length, 1);
```

The audit also proves no handoff for player/terminal studios, missing fingerprints, non-greenlights, or exhausted capacity; no public `IndustryProject` appears at handoff.

- [x] **Step 2: Run the audit and confirm RED**

Run: `npm run audit:studio-ai-production-handoff-b6`

Expected: module/API missing failure.

- [x] **Step 3: Implement deterministic handoff**

```ts
const productionId = createDeterministicId('studio_ai_production', studio.id, commitment.id);
const canonicalProjectId = createDeterministicId('studio_ai_project', studio.id, commitment.id);
const handoffKey = `b6-handoff:${commitment.id}`;
```

Build the calendar from fingerprint format, frozen budget, and production competence using `createProductionCalendar`. Generate and save one stable title. Only mark the B5 commitment `HANDED_OFF` after the production upsert succeeds; retain its budget reservation.

- [x] **Step 4: Wire handoff after B5 review and before B1 finance**

```ts
const slateExecution = executeStudioAiSlateWeek({
  player,
  world: nextWorld,
  studio: controlled,
  absoluteWeek,
});
const handoff = handoffStudioAiGreenlights({ player, world: nextWorld, studio: slateExecution.studio, absoluteWeek });
nextWorld.industryProductions = handoff.world.industryProductions;
controlled = handoff.studio;
```

- [x] **Step 5: Run handoff and B5 regression audits to GREEN**

Run: `npm run audit:studio-ai-production-handoff-b6 && npm run audit:studio-ai-slate-b5`

Expected: handoff and all nine B5 audits pass.

---

### Task 3: Shared Canonical Talent Package

**Files:**
- Create: `services/industryTalentSelection.ts`
- Modify: `services/platformAi/platformAiTalent.ts`
- Create: `services/studioAi/studioAiProductionTalent.ts`
- Modify: `services/talentBookings.ts`
- Create: `scripts/audit-studio-ai-production-talent-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: canonical NPC pool, dynasty offer eligibility, genre, audience, company competence, budget, booking history.
- Produces: `selectIndustryTalentPackage`, preserved `selectPlatformAiTalent`, `packageStudioAiProductionTalent`.

- [x] **Step 1: Write the failing talent audit**

```ts
const first = packageStudioAiProductionTalent(input);
const replay = packageStudioAiProductionTalent(input);
assert.deepEqual(first.production.studioAiExecution?.talent, replay.production.studioAiExecution?.talent);
assert.equal(first.bookings.filter(row => row.projectId === production.canonicalProjectId).length, 2);
assert.equal(first.conflicts.length, 0);
```

The audit proves actor/director identities are canonical, selections persist, `allowOverlaps: true` records simultaneous work, in-house writer authority remains, cancellation/release updates booking status, player control skips packaging, and existing Platform AI talent fixtures remain identical.

- [x] **Step 2: Run the audit and confirm RED**

Run: `npm run audit:studio-ai-production-talent-b6`

Expected: shared selector or Studio AI packaging API missing.

- [x] **Step 3: Extract the shared selector without output drift**

```ts
export interface IndustryTalentSelectionInput {
  player: Player;
  companyId: string;
  canonicalProjectId: string;
  genre: Genre;
  productionCalendar: ProductionCalendar;
  bookings: readonly IndustryTalentBooking[] | undefined;
  companyTalentSkill: number;
  budgetMillions: number;
  allowOverlaps: boolean;
}
```

Move stable-pool discovery and deterministic ranking into the shared module. Keep `selectPlatformAiTalent` as a compatibility wrapper using the same platform seed and release-memory modifiers.

- [x] **Step 4: Persist the Studio AI package and bookings once**

```ts
const reservation = reserveProjectTalentBookings({
  bookings,
  projectId: production.canonicalProjectId,
  projectOwner: 'INDUSTRY_PRODUCTION',
  producerStudioId: production.producerStudioId,
  productionCalendar: production.productionCalendar,
  actorIds: [selection.leadActor.id],
  directorIds: [selection.director.id],
  allowOverlaps: true,
});
```

- [x] **Step 5: Run talent and Platform AI production audits to GREEN**

Run: `npm run audit:studio-ai-production-talent-b6 && npm run audit:platform-ai-production`

Expected: both pass with no Platform AI selection drift.

---

### Task 4: Independent Milestones and Exact Production Accounting

**Files:**
- Create: `services/studioAi/studioAiProductionEconomy.ts`
- Create: `services/studioAi/studioAiProductionProgress.ts`
- Modify: `services/studioAi/studioAiState.ts`
- Modify: `services/studioAi/studioAiFinance.ts`
- Create: `scripts/audit-studio-ai-production-economy-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: production calendar, frozen budget, B1 cash/ledger, B5 committed spend.
- Produces: `getStudioAiProductionMilestones`, `applyStudioAiProductionMilestone`, `progressStudioAiIndependentProduction`.

- [x] **Step 1: Write the failing economy audit**

```ts
const settled = milestones.reduce((state, milestone) => applyStudioAiProductionMilestone(state, milestone), initial);
assert.equal(settled.production.paidMillions, 101.03);
assert.equal(settled.studio.cashReserve, 398.97);
assert.equal(settled.studio.ai!.finance.committedSpendMillions, 0);
assert.equal(settled.studio.ai!.ledger.filter(row => row.category === 'PRODUCTION').length, 4);
```

Repeat each milestone and assert no money changes. Include insufficient-cash fixtures proving a saved `ON_HOLD` state and no hidden payment or income.

- [x] **Step 2: Run the audit and confirm RED**

Run: `npm run audit:studio-ai-production-economy-b6`

Expected: production economy API missing.

- [x] **Step 3: Implement exact milestone allocation**

```ts
const RATIOS = [0.15, 0.30, 0.30] as const;
const firstThree = RATIOS.map(value => roundMillions(budgetMillions * value));
const delivery = roundMillions(budgetMillions - firstThree.reduce((sum, value) => sum + value, 0));
```

Add `PRODUCTION`, `RELEASE_MARKETING`, `RIGHTS_INCOME`, and `TURNAROUND` B1 ledger categories. Use stable ledger and processed keys. Debit only available cash; otherwise persist `FINANCING_HOLD` without advancing the calendar.

- [x] **Step 4: Implement due-only phase progression**

```ts
if (absoluteWeek <= execution.lastProgressedAbsoluteWeek) return unchanged;
if (controller !== 'AI' || isTerminalStudio(studio)) return unchanged;
```

Advance at most one calendar week per absolute week, settle boundary milestones before phase entry, and release talent bookings on delivery/cancellation.

- [x] **Step 5: Run economy, B1 finance, and save audits to GREEN**

Run: `npm run audit:studio-ai-production-economy-b6 && npm run audit:studio-ai-finance-b1 && npm run audit:studio-ai-save-b1`

Expected: exact accounting and existing B1 finance remain green.

---

### Task 5: Problems, Recovery, Hold Review, and Turnaround

**Files:**
- Create: `services/studioAi/studioAiProductionProblems.ts`
- Create: `services/studioAi/studioAiProductionTurnaround.ts`
- Modify: `services/studioAi/studioAiProductionProgress.ts`
- Create: `scripts/audit-studio-ai-production-problems-b6.ts`
- Create: `scripts/audit-studio-ai-production-turnaround-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: due checkpoints, B1/B2/B3/B5 state, buyers in `WorldState.studios`.
- Produces: `evaluateStudioAiProductionProblem`, `applyStudioAiRecoveryDecision`, `settleStudioAiProductionTurnaround`.

- [x] **Step 1: Write failing problem and turnaround audits**

```ts
const problem = evaluateStudioAiProductionProblem(input);
assert.deepEqual(problem, evaluateStudioAiProductionProblem(input));
assert.equal(repeat.problems.length, first.problems.length);
assert.ok(first.problems.length <= 3);

const transfer = settleStudioAiProductionTurnaround(turnaroundInput);
assert.equal(transfer.production.id, production.id);
assert.equal(transfer.production.producerStudioId, buyer.id);
assert.equal(transfer.seller.cashReserve - seller.cashReserve, 24.5);
assert.equal(buyer.cashReserve - transfer.buyer.cashReserve, 24.5);
```

Also prove platform commissions cannot use this path, player/terminal buyers are rejected, progress/talent/problems persist, and repeated settlement is a no-op.

- [x] **Step 2: Run both audits and confirm RED**

Run: `npm run audit:studio-ai-production-problems-b6 && npm run audit:studio-ai-production-turnaround-b6`

Expected: problem/turnaround modules missing.

- [x] **Step 3: Implement deterministic checkpoint problems and recovery**

```ts
const checkpointKey = `b6-problem:${production.id}:${checkpoint}`;
const risk = executionRisk + congestion + budgetMismatch + cashPressure - productionSkill;
```

Check only production start, 35%, 70%, and post-production start. Persist the roll, severity, quality/cost/delay effect, response, and response key. Never select talent replacement.

- [x] **Step 4: Implement atomic turnaround**

```ts
const transferKey = `b6-turnaround:${production.id}:${buyer.id}`;
if (execution.processedKeys.includes(transferKey)) return unchanged;
```

Validate buyer controller, status, capacity, fit, cash, and runway. Apply matching ledger entries and transfer the remaining committed budget without changing identity or progress.

- [x] **Step 5: Run both audits to GREEN**

Run: `npm run audit:studio-ai-production-problems-b6 && npm run audit:studio-ai-production-turnaround-b6`

Expected: deterministic problems and atomic turnaround pass.

---

### Task 6: Final Quality and Rights-Valid Release Planning

**Files:**
- Create: `services/studioAi/studioAiProductionQuality.ts`
- Create: `services/studioAi/studioAiReleasePlanning.ts`
- Create: `scripts/audit-studio-ai-production-quality-b6.ts`
- Create: `scripts/audit-studio-ai-release-planning-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: fingerprint, B5 scores, production execution, talent, rights compatibility, market schedule.
- Produces: `finalizeStudioAiProductionQuality`, `planStudioAiProductionRelease`.

- [x] **Step 1: Write failing quality and release audits**

```ts
const strong = finalizeStudioAiProductionQuality(strongInput);
const weak = finalizeStudioAiProductionQuality(weakInput);
assert.ok(average(strongSeeds) > average(weakSeeds));
assert.ok(strongSeeds.some(row => row.creativeQuality < 60));
assert.deepEqual(strong, finalizeStudioAiProductionQuality(strongInput));

const streaming = planStudioAiProductionRelease(streamingInput);
assert.equal(streaming.mode, 'STREAMING_ONLY');
assert.equal(streaming.blockedReason, 'MISSING_STREAMING_RIGHTS');
```

Prove theatrical paths need no fabricated platform, streaming/hybrid windows require Project A compatibility, commissioned originals remain streaming-only, unavailable paths hold, and release plans never reroll.

- [x] **Step 2: Run both audits and confirm RED**

Run: `npm run audit:studio-ai-production-quality-b6 && npm run audit:studio-ai-release-planning-b6`

Expected: final-quality/release modules missing.

- [x] **Step 3: Implement persisted multidimensional quality**

```ts
export interface StudioAiFinalQuality {
  creativeQuality: number;
  executionQuality: number;
  commercialPotential: number;
  prestigePotential: number;
  downsideRisk: number;
}
```

Combine fingerprint, B5 score, suitable-budget fit, talent, competence, problems, recovery, universe fatigue, and one seeded variance. Freeze once at delivery.

- [x] **Step 4: Implement release planning through existing rights compatibility**

```ts
const rights = resolveStreamingRightsCompatibility({
  world,
  sourceProjectId: production.canonicalProjectId,
  buyerPlatformId,
  sellerPartyId: production.producerStudioId,
  ...window,
});
```

Store the private rich mode but translate public release to existing `THEATRICAL` or `STREAMING_ONLY`. Never create a rights contract in this module.

- [x] **Step 5: Run both audits to GREEN**

Run: `npm run audit:studio-ai-production-quality-b6 && npm run audit:studio-ai-release-planning-b6`

Expected: quality distribution and rights validity pass.

---

### Task 7: Canonical Public Project and Exact Commercial Settlement

**Files:**
- Create: `services/studioAi/studioAiCommercialResult.ts`
- Modify: `services/studioEcosystem.ts`
- Modify: `services/studioAi/studioAiProductionProgress.ts`
- Create: `scripts/audit-studio-ai-commercial-result-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: delivered production, frozen quality, release plan, talent, rights, existing box-office/streaming primitives.
- Produces: `releaseStudioAiProduction`, exact-settlement overload for `applyStudioProjectOutcome`.

- [x] **Step 1: Write the failing commercial-result audit**

```ts
const theatrical = releaseStudioAiProduction(theatricalInput);
assert.equal(theatrical.world.projects.filter(row => row.id === production.canonicalProjectId).length, 1);
assert.ok(theatrical.project!.boxOffice > 0);
assert.equal(theatrical.production.status, 'RELEASED');

const streaming = releaseStudioAiProduction(streamingInput);
assert.equal(streaming.project!.boxOffice, 0);
assert.ok(streaming.project!.streamingWindows?.length);
assert.equal(releaseStudioAiProduction(streaming.nextInput).changed, false);
```

Assert exact cash/ledger receipts, already-paid production cost is not deducted again, release marketing is charged once, outcome aggregates update once, stable IMDb/award fields exist, and a conflicting existing project ID fails closed.

- [x] **Step 2: Run the audit and confirm RED**

Run: `npm run audit:studio-ai-commercial-result-b6`

Expected: commercial result API missing.

- [x] **Step 3: Add exact-settlement support to studio outcomes**

```ts
export interface ExactStudioProjectSettlement {
  productionSpendMillions: number;
  marketingSpendMillions: number;
  studioReceiptsMillions: number;
  netResultMillions: number;
  cashAlreadySettled: boolean;
}
```

Preserve legacy callers when the optional settlement is absent. With `cashAlreadySettled: true`, update valuation, reputation, momentum, hit/flop and lifetime metrics without legacy estimated-budget cash mutation.

- [x] **Step 4: Materialize and settle exactly once**

```ts
const project: IndustryProject = {
  id: production.canonicalProjectId,
  title: production.title,
  genre: production.genre,
  mediaType: production.projectType,
  studioId: production.producerStudioId,
  physicalProducerStudioId: production.producerStudioId,
  budgetTier,
  quality: finalQuality.creativeQuality,
  rating,
  year: releaseYear,
  weekReleased: releaseWeek,
  leadActorId: execution.talent!.leadActorId,
  leadActorName: execution.talent!.leadActorName,
  directorId: execution.talent!.directorId,
  directorName: execution.talent!.directorName,
  reviews,
  awardProfile,
  releaseStrategy: releasePlan.publicStrategy,
  studioAiSlateCommitmentId: execution.slateCommitmentId,
  industryContentFingerprintId: execution.fingerprintId,
  boxOffice: releasePlan.publicStrategy === 'STREAMING_ONLY' ? 0 : theatricalGross,
};
```

Reuse existing rating, award-profile, box-office cap, studio outcome, rights window, and streaming performance boundaries. Add one project, one release key, and one settlement key.

- [x] **Step 5: Run commercial, rights, awards-facing, and save audits to GREEN**

Run: `npm run audit:studio-ai-commercial-result-b6 && npm run audit:streaming-rights-compatibility-phase3 && npm run audit:save-integrity`

Expected: canonical result and adjacent registries pass.

---

### Task 8: Weekly Coordinator, Commission Observation, Acquisition Stop, and Legacy Cutover

**Files:**
- Create: `services/studioAi/studioAiProductionExecution.ts`
- Modify: `services/studioAi/studioAiCommissionBridge.ts`
- Modify: `services/studioAi/studioAiWeek.ts`
- Modify: `services/npcVentureLogic.ts`
- Modify: `services/worldLogic.ts`
- Modify: `services/studioAi/index.ts`
- Create: `scripts/audit-studio-ai-production-live-b6.ts`
- Create: `scripts/audit-studio-ai-production-control-b6.ts`
- Create: `scripts/audit-studio-ai-production-commission-b6.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1–7 services and existing Platform AI production registry.
- Produces: `executeStudioAiProductionWeek`, authoritative B6 weekly cutover.

- [x] **Step 1: Write failing integration audits**

```ts
const first = processStudioAiWeek(player, world, absoluteWeek);
const repeat = processStudioAiWeek({ ...player, world: first.world }, first.world, absoluteWeek);
assert.deepEqual(repeat.world, first.world);

assert.equal(processedCommission.aiExecution, originalCommission.aiExecution);
assert.equal(playerControlled.production.studioAiExecution?.lastProgressedAbsoluteWeek, beforeWeek);
assert.equal(legacyVenture.projectsReleased, 0);
```

Prove only due productions progress, commissions are observed but not double-progressed, commission capacity releases once at delivery/cancellation, player acquisition freezes compact AI progression with every saved fact intact, and the venture bridge creates no instant project.

- [x] **Step 2: Run all three audits and confirm RED**

Run: `npm run audit:studio-ai-production-live-b6 && npm run audit:studio-ai-production-control-b6 && npm run audit:studio-ai-production-commission-b6`

Expected: execution coordinator/cutover behavior missing.

- [x] **Step 3: Implement one ordered B6 coordinator**

```ts
handoff greenlights
→ package due talent
→ settle due milestone
→ evaluate due problem/recovery
→ advance one calendar week
→ finalize delivered quality
→ review release plan
→ release and settle if eligible
→ reconcile B5 capacity and commission observation
```

Process stable production IDs and build shared indexes once per world week. Catch a company-local failure without interrupting other companies, while leaving the failed production unchanged.

- [x] **Step 4: Retire the temporary venture release bridge**

Remove `consumeStudioGreenlightForLegacyRelease` from the live venture path. Keep launch and legacy projection compatibility only; B6 owns B5 project creation and release. Do not retire unrelated generic/world/universe filler releases until B7 parity.

- [x] **Step 5: Run integration and adjacent regressions to GREEN**

Run: `npm run audit:studio-ai-production-live-b6 && npm run audit:studio-ai-production-control-b6 && npm run audit:studio-ai-production-commission-b6 && npm run audit:npc-venture-determinism && npm run audit:platform-ai-production && npm run audit:platform-ai-player-commissions`

Expected: B6 cutover and commission/player boundaries pass.

---

### Task 9: Long-Run Proof, Save Hardening, Documentation, and Roadmap

**Files:**
- Create: `scripts/audit-studio-ai-production-long-run-b6.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `package.json`
- Create: `docs/superpowers/reports/2026-09-03-studio-ai-production-release-results-b6-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/plans/2026-09-03-studio-ai-production-release-results-b6.md`

**Interfaces:**
- Consumes: complete B6 implementation.
- Produces: aggregate `audit:studio-ai-production-b6`, 400-year evidence, B6 completion report, roadmap B7 gate.

- [x] **Step 1: Write the failing 20,800-week audit**

```ts
const first = runScenario({ seed: 601, weeks: 20_800, profiles });
const replay = runScenario({ seed: 601, weeks: 20_800, profiles });
assert.deepEqual(replay.digest, first.digest);
assert.ok(first.releases > 0);
assert.ok(first.hits > 0 && first.flops > 0);
assert.ok(first.delays > 0 && first.cancellations > 0);
assert.equal(first.duplicateProjectIds.length, 0);
assert.equal(first.accountingMismatchMillions, 0);
assert.ok(first.retainedBytes < 1_500_000);
```

Include strong, lean, prestige, commercial, franchise, and distressed studios; midpoint save/reload; player acquisition; streaming-only zero-box-office; active-record protection; and timing measurement.

- [x] **Step 2: Run the long-run audit and confirm RED**

Run: `npm run audit:studio-ai-production-long-run-b6`

Expected: at least one completion assertion fails before final integration or migration wiring.

- [x] **Step 3: Finish migration and save protection**

Normalize old production sources at current week, retain all active records, cap terminal history through existing rules, retain referenced bookings/rights/awards, and prove midpoint reload equivalence.

```ts
world.industryProductions = normalizeIndustryProductions(world.industryProductions, currentAbsoluteWeek);
```

- [x] **Step 4: Add aggregate scripts and run the full verification matrix**

Run:

```bash
npm run audit:studio-ai-production-b6
npm run audit:studio-ai-slate-b5
npm run audit:platform-ai-production
npm run audit:platform-ai-player-commissions
npm run audit:streaming-rights-compatibility-phase3
npm run audit:npc-venture-determinism
npm run audit:studio-acquisition
npm run audit:save-integrity
npm run build
npm run lint
```

The completion report must distinguish focused green gates from pre-existing unrelated repository TypeScript fixture drift.

- [x] **Step 5: Run scoped diff checks and update documentation**

```bash
git diff --check -- types.ts package.json services/industryProductions.ts services/saveCompaction.ts services/saveMigration.ts services/studioEcosystem.ts services/talentBookings.ts services/platformAi/platformAiTalent.ts services/studioAi services/npcVentureLogic.ts services/worldLogic.ts scripts docs/superpowers
```

Write exact counts, runtime, retained bytes, accounting reconciliation, known warnings, and intentionally deferred B7/B8 work. Mark B6 complete and B7 next only after fresh verification evidence.
