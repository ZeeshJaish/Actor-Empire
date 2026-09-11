# Streaming Release Commitments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add capacity-aware platform premiere terms, resumable commitment-safe Release Wizard navigation, and real per-contract shared streaming runs.

**Architecture:** Canonical rights contracts remain authoritative. Pure adapters derive platform calendars and runtime runs; the Release Wizard consumes their immutable terms while legacy single-platform fields mirror the primary contract for save compatibility.

**Tech Stack:** React, TypeScript, Vite, deterministic game services, esbuild audit scripts, Playwright browser audits.

**Spec:** `docs/superpowers/specs/2026-09-09-streaming-release-commitment-design.md`

## Global Constraints

- Preserve existing exclusive, theatrical, platform-original, campaign, festival, and legacy single-platform behavior.
- Do not stage or commit shared-workspace files.
- Never settle the same guarantee, energy charge, or weekly royalty twice.
- All shared buyers from one worldwide room use one premiere week.
- Use the canonical rights-contract registry as authority; compatibility fields are mirrors only.
- Follow strict RED then GREEN for every behavior change.

---

### Task 1: Platform launch calendar and immutable offer dates

**Files:**
- Create: `services/streamingReleaseCalendar.ts`
- Modify: `services/releaseStreamingAuction.ts`
- Modify: `services/streamingBidding.ts`
- Modify: `types.ts`
- Create: `scripts/audit-streaming-release-commitments.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildStreamingPlatformLaunchCalendar(player, absoluteWeek)` and `findStreamingPlatformPremiereWeek(calendar, platformId, fromWeek, searchWeeks)`.
- Adds: `proposedPremiereAbsoluteWeek` to `StreamingOfferVersion`, `availablePremiereAbsoluteWeek` to bidder input/state, and `lockedPremiereAbsoluteWeek` to the bidding session.

- [ ] **Step 1: Write failing calendar and offer-term assertions**

Add literal fixtures proving subscriber tiers yield capacities 4/3/2/1, occupied slots move a bidder to the next free week, twelve full weeks reject participation, and every created offer contains the bidder's proposed week.

```ts
assert.equal(calendar.platforms.BIG.weeklyCapacity, 4);
assert.equal(findStreamingPlatformPremiereWeek(calendar, 'FULL', 520, 12), null);
assert.equal(session.offers[0].proposedPremiereAbsoluteWeek, expectedWeek);
```

- [ ] **Step 2: Run the audit and verify RED**

Run: `npm run audit:streaming-release-commitments`

Expected: fail because the calendar service and offer fields do not exist.

- [ ] **Step 3: Implement the pure calendar adapter**

Derive occupancy from active contracts, scheduled industry windows, and platform release memory. Use subscriber thresholds from the spec and search exactly twelve weeks.

```ts
export interface StreamingPlatformCalendarEntry {
    platformId: string;
    weeklyCapacity: number;
    occupiedByWeek: Record<number, number>;
}
```

- [ ] **Step 4: Connect bidder eligibility and offer dates**

Use genre pressure, nearest free week, current finance restrictions, and company scale in bidder fit. Freeze the bidder premiere week into every revision. Once a shared offer is accepted, force remaining revisions to `NON_EXCLUSIVE` and the session's locked premiere week.

- [ ] **Step 5: Run focused audits and record GREEN**

Run `npm run audit:streaming-release-commitments`, `npm run audit:release-streaming-auction`, and `npm run audit:streaming-active-bidding-phase2` separately. All must exit zero.

---

### Task 2: Per-contract shared streaming runs

**Files:**
- Create: `services/streamingReleaseRuns.ts`
- Modify: `types.ts`
- Modify: `services/gameLoop.ts`
- Modify: `services/saveMigration.ts`
- Modify: `scripts/audit-streaming-release-commitments.ts`
- Modify: `scripts/audit-save-migration.ts`

**Interfaces:**
- Produces: `buildStreamingRunsFromContracts`, `normalizeStreamingRunRegistry`, `getActiveStreamingRuns`, and `aggregateStreamingRunPerformance`.
- Adds: `ActiveRelease.streamingRuns?: StreamingPlatformRunRegistry` while preserving `streaming` and `streamingContractId` as the primary compatibility mirror.

- [ ] **Step 1: Write failing run and aggregation assertions**

Create three accepted shared contracts for one project and assert three scheduled runs with the same start week, distinct contract IDs, and literal aggregate totals.

```ts
assert.equal(Object.keys(runs).length, 3);
assert.deepEqual(Object.values(runs).map(run => run.startsAtAbsoluteWeek), [522, 522, 522]);
assert.deepEqual(aggregateStreamingRunPerformance(runs), { weeklyViews: 6_000_000, totalViews: 18_000_000, royaltyRevenue: 9_000_000 });
```

- [ ] **Step 2: Run the run-model audit and verify RED**

Run: `npm run audit:streaming-release-commitments`

Expected: fail because the run registry is absent.

- [ ] **Step 3: Implement run construction and normalization**

Build one run per active canonical contract. Preserve stored platform name and date terms. A missing dynamic company must not delete its run.

- [ ] **Step 4: Replace project-keyed shared settlement with contract-keyed settlement**

Change Phase 2 attribution from `Map<projectId, row>` to contract-aware keys. Process each run independently and make ledger/settlement IDs include contract ID and absolute week.

```ts
const attributionKey = `${contract.id}:${settlementAbsoluteWeek}`;
```

Aggregate all run views and royalties back into existing project totals after individual settlements. End the release only after all runs end.

- [ ] **Step 5: Add idempotent save migration**

Seed run entries from `streamingContractId` and `hiddenStats.streamingContractIds`. Keep legacy behavior when no canonical contract exists. Repeated normalization must return the same economic state and never pay money.

- [ ] **Step 6: Run model, migration, rights, and game-loop audits**

Run the commitment audit, save migration audit, streaming rights compatibility audit, and existing game-loop-focused audits separately. Record each zero exit.

---

### Task 3: Commitment-safe Release Wizard controller

**Files:**
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/DistributionStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/CalendarStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategyShell.tsx`
- Modify: `types.ts`
- Modify: `scripts/audit-release-wizard-controller-transplant.cjs`
- Modify: `scripts/fixtures/release-wizard-transplant.tsx`

**Interfaces:**
- Extends: `ReleasePlanningDraft` with `commitmentState`, `lockedPremiereAbsoluteWeek`, and existing contract-ID collection.
- Produces: synchronous `SAVE & EXIT`, read-only committed phases, and platform-date Finalize state.

- [ ] **Step 1: Write failing controller journeys**

Assert unsigned theatrical exit/reopen preserves the last phase and remains editable. Assert a signed streaming launch reopens at Campaign, Distribution and Calendar are locked, signed terms survive backward navigation, and Campaign/Festival remain editable.

- [ ] **Step 2: Run the real-controller browser audit and verify RED**

Run: `PLAYWRIGHT_MODULE='/Users/zeesh/Vibe code/actor-empire-web-redesign/node_modules/playwright' node scripts/audit-release-wizard-controller-transplant.cjs`

Expected: fail on missing exit/reopen and platform-date lock behavior.

- [ ] **Step 3: Make offer dates authoritative in the controller**

Register accepted contracts with `proposedPremiereAbsoluteWeek`. Set the streaming draft and Calendar from the first accepted date. Subsequent shared contracts must match it. `handleComplete` must never overwrite the accepted contract start.

- [ ] **Step 4: Implement synchronous save-and-exit and committed back navigation**

Flush the draft before calling Project Details. Keep routing editable before signature. After signature, render read-only Distribution/War Room/Calendar states and allow edits only in Campaign and Festival phases.

- [ ] **Step 5: Run the controller audit and record GREEN**

Run the controller audit across its five target viewports and confirm all state, accounting, and navigation assertions pass.

---

### Task 4: War Room contract clarity

**Files:**
- Modify: `views/lifestyle/business/release-strategy-transplant/StreamingWarRoomStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Modify: `services/streamingBidding.ts`
- Modify: `scripts/audit-streaming-active-bidding-phase2.ts`
- Modify: `scripts/audit-release-wizard-controller-transplant.cjs`

**Interfaces:**
- Displays: collapsed exclusivity consequences, shared slot count, locked premiere week, and accepted-deal totals.
- Enforces: no exclusive acceptance after a shared signature, including restored stale sessions.

- [ ] **Step 1: Write failing service and browser assertions**

Assert the header shows `SHARED LICENSING · 1/3 SIGNED`, collapsed rows show `EXCLUSIVE · CLOSES ROOM` or `SHARED · UP TO 3`, actions expose contract type, and a stale exclusive offer cannot be accepted after a shared deal.

- [ ] **Step 2: Verify RED in bidding and browser audits**

Run the bidding audit and controller audit. Confirm failures name the missing labels/header and stale exclusivity guard.

- [ ] **Step 3: Implement labels, progress, and guard**

Render the consequence chip in every collapsed row, update TAKE labels, show shared progress in the room header, and normalize/withdraw incompatible exclusives as soon as the first shared offer is accepted or restored.

- [ ] **Step 4: Verify GREEN and visually inspect screenshots**

Run both audits, capture 393x852 shared/exclusive states, and inspect for clipping, hierarchy, and tap-target clarity.

---

### Task 5: Project Details continuation UX

**Files:**
- Modify: `views/lifestyle/business/ProductionHouseGame.tsx`
- Modify: project dashboard component resolved from its current import
- Modify: `scripts/audit-release-wizard-controller-transplant.cjs` or add a focused real-controller dashboard audit

**Interfaces:**
- Produces: `PLAN RELEASE`, `CONTINUE RELEASE STRATEGY`, or `CONTINUE STREAMING LAUNCH` from canonical project state.

- [ ] **Step 1: Locate the real Project Dashboard CTA component and write failing journeys**

Assert CTA label, saved phase, and `RIGHTS SIGNED` badge for no-draft, unsigned-draft, and signed-incomplete states. Clicking must open the same project in the real Release Wizard.

- [ ] **Step 2: Run the focused browser audit and verify RED**

Expected: fail on missing continuation copy and badge.

- [ ] **Step 3: Implement a pure CTA-state adapter and wire the dashboard**

Derive presentation solely from project draft and canonical contract IDs. Do not store duplicate UI-only truth.

- [ ] **Step 4: Run the dashboard and controller audits and record GREEN**

Verify real navigation, not a label-only fixture.

---

### Task 6: Full regression verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused model and migration audits**

Run all streaming commitment, bidding, market, rights compatibility, save migration, and Release Wizard UI model audits.

- [ ] **Step 2: Run real browser matrices**

Run controller and presentation audits at 320x740, 360x800, 393x852, 412x915, and 430x932.

- [ ] **Step 3: Run production build and diff validation**

Run `npm run build` and `git diff --check` for touched files.

- [ ] **Step 4: Verify local handoff**

Confirm port 5178 responds with HTTP 200 and its process cwd is `/Users/zeesh/Vibe code/Actor empire`. Leave the server running for player testing.
