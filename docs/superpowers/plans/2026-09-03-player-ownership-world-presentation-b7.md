# Project B Phase B7 — Player Interaction, Ownership, and World Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the compact B1–B6 industry simulation to exact player ownership and one consistent, bounded public world without duplicating existing gameplay systems.

**Architecture:** Existing finance, intelligence, rights, production, acquisition, player Production House/Streaming House, and presentation apps remain authoritative. B7 adds a deterministic industry coordinator, a bounded canonical public-fact ledger, pure presentation adapters, and an idempotent ownership materializer that transfers exact saved state into existing player control surfaces.

**Tech Stack:** TypeScript, React, Vite, deterministic audit scripts bundled with esbuild, existing save migration/compaction infrastructure.

**Spec:** `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md` Phase B7.

## Global Constraints

- `processGameWeek` remains the only master week progression entry point.
- Project A remains the only streaming-rights compatibility, contract, settlement, expiry, and transfer authority.
- `world.industryProductions` remains the canonical AI physical-production registry and `world.projects` remains the canonical public project registry.
- Player-controlled companies receive player-standard costs, time, capacity, rights, approvals, and no AI-only advantage or rescue.
- Stable IDs, saved uncertainty, and idempotency checkpoints are required for every material mutation.
- Existing Production House, Streaming House, career, Studio Group, subsidiary Command Centre, News, Forbes, IMDb, Box Office, Awards, X, and Instagram screens must be reused.
- Preserve unrelated dirty-worktree changes. Do not stage, commit, or push without explicit user authorization.
- The richer fan-rumour-reply Media World remains deferred until after B8.

---

### Task 1: Canonical industry public-fact ledger

**Files:**
- Modify: `types.ts`
- Create: `services/industryWorld/industryEventLedger.ts`
- Create: `services/industryWorld/index.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Create: `scripts/audit-industry-world-events-b7.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `IndustryEventFact`, `IndustryEventLedgerState`, `normalizeIndustryEventLedger`, `appendIndustryEventFacts`, `createIndustryEventFact`.
- Consumes: canonical company/project/production/rights/transaction/award identifiers and absolute game week.

- [x] **Step 1: Write the failing audit**

```ts
const first = appendIndustryEventFacts(undefined, [fact, fact]);
assert.equal(first.events.length, 1);
assert.equal(first.events[0].id, fact.id);
assert.deepEqual(appendIndustryEventFacts(first, [fact]), first);
assert.ok(normalizeIndustryEventLedger({ events: many }).events.length <= INDUSTRY_EVENT_LIMIT);
```

- [x] **Step 2: Run RED**

Run: `npm run audit:industry-world-events-b7`

Expected: FAIL because the B7 ledger exports do not exist.

- [x] **Step 3: Implement minimal deterministic ledger**

```ts
export interface IndustryEventFact {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  absoluteWeek: number;
  type: IndustryEventType;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
  companyId?: string;
  companyName?: string;
  projectId?: string;
  productionId?: string;
  platformId?: string;
  rightsContractId?: string;
  transactionId?: string;
  awardEventId?: string;
  headline: string;
  detail: string;
  evidence: IndustryEventEvidence[];
}
```

Store bounded `events`, `publishedEventKeys`, and `lastProjectedAbsoluteWeek`. Deduplicate by `idempotencyKey`; use deterministic IDs only.

- [x] **Step 4: Add migration and compaction**

Old saves normalize to an empty ledger. Compaction preserves all permanent/high-importance facts and a bounded recent material history without changing IDs.

- [x] **Step 5: Run GREEN**

Run: `npm run audit:industry-world-events-b7`

Expected: PASS for normalization, dedupe, ordering, bounding, migration, and compaction.

### Task 2: Shared weekly industry coordinator

**Files:**
- Create: `services/industryWorld/industryWorldWeek.ts`
- Modify: `services/industryWorld/index.ts`
- Modify: `services/gameLoop.ts`
- Modify: `services/worldLogic.ts`
- Create: `scripts/audit-industry-world-coordinator-b7.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `processIndustryWorldWeek(player, world, absoluteWeek): IndustryWorldWeekResult`.
- Consumes: Platform AI, streaming ecosystem, Studio AI, and event-ledger adapters.

- [x] **Step 1: Write the failing audit**

```ts
const once = processIndustryWorldWeek(player, player.world, 601);
const twice = processIndustryWorldWeek(once.player, once.world, 601);
assert.equal(twice.processed, false);
assert.deepEqual(twice.world, once.world);
assert.equal(once.executionOrder.join('>'), 'PLATFORM_AI>STREAMING_ECOSYSTEM>STUDIO_AI>PRESENTATION');
```

- [x] **Step 2: Run RED**

Run: `npm run audit:industry-world-coordinator-b7`

Expected: FAIL because the shared coordinator is absent.

- [x] **Step 3: Implement the coordinator and checkpoint**

Move Studio AI progression out of the pre-increment `processWorldTurn` path. Invoke all industry processors once at the entered-week boundary already used by Project A and Platform AI. Preserve pre-existing player-life and career processing.

- [x] **Step 4: Add transition protection**

Normalize `lastProcessedAbsoluteWeek`; on migrated saves, process only work due after the saved subsystem checkpoints. Same-week calls are no-ops.

- [x] **Step 5: Run GREEN and regression audits**

Run: `npm run audit:industry-world-coordinator-b7`

Run: `npm run audit:studio-ai-production-live-b6`

Run: `npm run audit:platform-intelligence-live-b4`

Expected: all PASS with exactly-once progression.

### Task 3: Canonical fact collection and bounded channel projection

**Files:**
- Create: `services/industryWorld/industryEventCollectors.ts`
- Create: `services/industryWorld/industryPresentation.ts`
- Modify: `services/platformAi/platformAiTurn.ts`
- Modify: `services/streamingPlatformEcosystemTurn.ts`
- Modify: `services/studioAi/studioAiWeek.ts`
- Modify: `types.ts`
- Create: `scripts/audit-industry-world-presentation-b7.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `collectIndustryEventFacts(before, after, absoluteWeek)` and `projectIndustryEvents(player, ledger, absoluteWeek)`.
- Extends: `NewsItem`, `XPost`, and `InstaPost` with optional `industryEventId`, `companyId`, and `projectId` references.

- [x] **Step 1: Write the failing audit**

```ts
const projected = projectIndustryEvents(player, ledgerWithOneHighRelease, 701);
assert.equal(projected.news.filter(item => item.industryEventId === event.id).length, 1);
assert.equal(projected.xPosts.filter(post => post.industryEventId === event.id).length, 1);
assert.equal(projected.instaPosts.filter(post => post.industryEventId === event.id).length, 0);
assert.deepEqual(projectIndustryEvents(projected.player, projected.ledger, 701), projected);
```

- [x] **Step 2: Run RED**

Run: `npm run audit:industry-world-presentation-b7`

Expected: FAIL because collection/projection does not exist.

- [x] **Step 3: Implement source adapters**

Adapt existing Platform AI presentation events, streaming ecosystem events, Studio AI ownership/status/production transitions, material Project A transactions, acquisitions, and award results into canonical facts. The adapters reference existing authoritative IDs and never perform business mutation.

- [x] **Step 4: Implement deterministic channel policy**

High importance may publish one News item plus one X post. Medium importance publishes one suitable channel. Low importance remains ledger/Forbes evidence. Instagram is limited to visually meaningful launches, premieres, casting, and awards. Inbox remains action-only. Combine same-company same-week related facts and maintain per-event publication keys.

- [x] **Step 5: Run GREEN**

Run: `npm run audit:industry-world-presentation-b7`

Expected: PASS for shared IDs, cadence, cooldown, dedupe, reload parity, and bounded feeds.

### Task 4: Exact player-ownership materialization

**Files:**
- Create: `services/industryWorld/studioOwnershipMaterializer.ts`
- Modify: `services/studioAcquisition.ts`
- Modify: `services/studioAi/studioAiControl.ts`
- Modify: `services/studioSale.ts`
- Modify: `types.ts`
- Create: `scripts/audit-industry-ownership-handoff-b7.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `materializeStudioOwnership(player, studioId, absoluteWeek)` and `dematerializeStudioOwnership(player, studioId, absoluteWeek)`.
- Consumes: exact B1 `studio.ai`, B5 slate, B6 `industryProductions`, talent bookings, public projects, rights, relationships, and existing Business/StudioState records.

- [x] **Step 1: Write the failing acquisition audit**

```ts
const acquired = materializeStudioOwnership(player, studio.id, 820);
assert.equal(acquired.business.balance, studio.ai.finance.cashMillions * 1_000_000);
assert.equal(acquired.inheritedCommitments.length, 1);
assert.equal(acquired.inheritedCommitments[0].productionCalendar.currentWeek, 11);
assert.equal(acquired.inheritedCommitments[0].projectDetails?.productionBudget, frozenBudget);
assert.equal(acquired.world.industryProductions[production.id].handoff?.playerCommitmentId, inherited.id);
assert.deepEqual(materializeStudioOwnership(acquired.player, studio.id, 820), acquired);
```

- [x] **Step 2: Run RED**

Run: `npm run audit:industry-ownership-handoff-b7`

Expected: FAIL because acquisition currently reconstructs estimates and does not materialize active production.

- [x] **Step 3: Implement atomic exact-state transfer**

Upgrade the acquired Business from B1 facts rather than Forbes estimates when canonical Studio AI state exists. Convert each active B5/B6 item exactly once into the existing player commitment/project shapes, preserving IDs through explicit lineage, calendar progress, paid/remaining budget, talent, bookings, problems, planned release, and frozen quality inputs.

- [x] **Step 4: Stop rival mutation and AI advantages**

At the handoff boundary, reconcile the controller before AI progression. Mark each source production with a persisted handoff pointer; player workflow becomes live authority. Existing Production House, owned-production career activities, Studio Group, and Command Centre consume the resulting records.

- [x] **Step 5: Implement reverse sale handoff**

When a controlled subsidiary is sold, persist the current player-stage facts into the same canonical AI production identity and resume AI no earlier than the following due week. No commitment, payment, booking, or release duplicates.

- [x] **Step 6: Run GREEN**

Run: `npm run audit:industry-ownership-handoff-b7`

Expected: PASS for acquisition, idempotency, player-standard execution, reload, and reverse sale.

### Task 5: Reuse subsidiary control depth

**Files:**
- Modify: `services/subsidiaryOperations.ts`
- Modify: `views/lifestyle/business/OwnedStudioCommandCenter.tsx` only if inherited-state labeling requires it
- Create: `scripts/audit-industry-subsidiary-control-b7.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `StudioOperatingMandate.autoProduction` values `PAUSED`, `BOARD_REVIEW`, and `APPROVED`.
- Reuses: B2 decision scores and B3 content fingerprints through a compatibility adapter while continuing to create real player commitments through existing subsidiary operations.

- [x] **Step 1: Write the failing control audit**

```ts
assert.equal(runSubsidiaryWeek(manualPlayer).newCommitments.length, 0);
assert.equal(runSubsidiaryWeek(reviewPlayer).pendingProposals.length, 1);
assert.equal(runSubsidiaryWeek(autoPlayer).newCommitments.length, 1);
assert.equal(runSubsidiaryWeek(autoPlayer).usedAiCostBias, false);
```

- [x] **Step 2: Run RED**

Run: `npm run audit:industry-subsidiary-control-b7`

Expected: FAIL until shared scoring and explicit no-bias execution are connected.

- [x] **Step 3: Connect existing modes to shared scoring**

Do not add a second mandate screen. Manual prevents automatic starts, board review creates existing proposals, and approved mode starts only projects inside the saved mandate and normal player capacity.

- [x] **Step 4: Run GREEN**

Run: `npm run audit:industry-subsidiary-control-b7`

Expected: PASS for all three player control depths.

### Task 6: Cross-surface identity and evidence-based public presentation

**Files:**
- Create: `services/industryWorld/publicIndustryProjection.ts`
- Modify: `services/forbesStudioProfile.ts`
- Modify: `views/mobile/components/ForbesStudioProfile.tsx`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `views/mobile/BoxOfficeApp.tsx`
- Modify: `services/awardLogic.ts` only where canonical dedupe is missing
- Create: `scripts/audit-industry-public-parity-b7.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: canonical scheduled-rival and released-project selectors over `world.industryProductions` and `world.projects`.
- Consumes: stable B6 project/production IDs and B7 event facts.

- [x] **Step 1: Write the failing parity audit**

```ts
const surfaces = buildPublicIndustryProjection(player, project.id);
assert.equal(new Set([
  surfaces.imdb.projectId,
  surfaces.boxOffice.projectId,
  surfaces.awards.projectId,
  surfaces.news.projectId,
]).size, 1);
assert.equal(streamingOnly.boxOffice, null);
assert.equal(rivalForbes.publicStatusLabel, undefined);
assert.ok(rivalForbes.distressEvidence.length > 0);
```

- [x] **Step 2: Run RED**

Run: `npm run audit:industry-public-parity-b7`

Expected: FAIL while Release Wizard and public cards rely on legacy projections/raw state labels.

- [x] **Step 3: Implement shared selectors**

Use B6 `plannedReleaseAbsoluteWeek` for rival release pressure and `world.projects` for completed public records. Existing screens keep their UI but consume the canonical selectors. Streaming-only projects never enter theatrical charts.

- [x] **Step 4: Replace rival internal labels with evidence**

Keep acquisition eligibility functional, but public Forbes copy uses valuation movement, cash runway, release gaps, funding actions, ownership changes, and other evidence. Exact internal status remains available only in owned management surfaces.

- [x] **Step 5: Run GREEN**

Run: `npm run audit:industry-public-parity-b7`

Expected: PASS for identity, release strategy, awards dedupe, schedule parity, and private/public separation.

### Task 7: Legacy cutover, migration, and B7 certification

**Files:**
- Modify: `services/worldLogic.ts`
- Modify: `services/universeLogic.ts` only if it still fabricates unrelated public releases
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Create: `scripts/audit-industry-legacy-cutover-b7.ts`
- Create: `scripts/audit-industry-player-world-b7.ts`
- Create: `docs/superpowers/reports/2026-09-03-player-ownership-world-presentation-b7-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `package.json`

**Interfaces:**
- Retires: two-per-week instant rival generation, extra random finished rival release, and any unrelated universe release path that bypasses B3/B5/B6.
- Preserves: legacy save loading via derived compatibility projections until all consumers have moved.

- [x] **Step 1: Write the failing cutover audit**

```ts
const result = runWeeks(fixture, 104);
assert.equal(result.randomFinishedRivals, 0);
assert.equal(result.publicProjects.every(project => hasCanonicalLineage(project)), true);
assert.equal(result.duplicateProductionIds, 0);
assert.equal(result.duplicateReleaseIds, 0);
assert.equal(result.duplicatePresentationIds, 0);
```

- [x] **Step 2: Run RED**

Run: `npm run audit:industry-legacy-cutover-b7`

Expected: FAIL because generic instant rivals are still produced.

- [x] **Step 3: Cut over consumers, then disable generators**

Keep `upcomingRivals` only as a normalized derived legacy projection if old saves or untouched consumers require it. No live generator may create named public films without canonical B3/B5/B6 lineage.

- [x] **Step 4: Run aggregate B7 and regression verification**

Run: `npm run audit:industry-player-world-b7`

Run: `npm run audit:studio-ai-production-b6`

Run: `npm run audit:studio-ai-slate-b5`

Run: `npm run audit:platform-intelligence-b4`

Run: `npm run audit:streaming-rights-marketplace-phase16`

Run: `npm run build`

Run: `git diff --check`

Expected: all focused B7 checks and owned-system regressions PASS; any repository-wide pre-existing diagnostics are reported separately.

- [x] **Step 5: Browser/mobile verification**

Verify News, Forbes Studios/Streaming, IMDb, Box Office, Awards, X, Instagram, Release Wizard, Studio Group, Command Centre, Production House, and Streaming House at a mobile viewport. Confirm no contradictory title/status/result, no raw rival internal-state badge, no console error, and no duplicate card.

- [x] **Step 6: Update roadmap and completion report**

Mark B7 complete only with recorded RED/GREEN evidence, exact regressions run, migration result, browser result, remaining known diagnostics, and explicit B8/deferred Media World boundary.
