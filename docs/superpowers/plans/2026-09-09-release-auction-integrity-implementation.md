# Release Auction Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Release Wizard streaming auctions use the live platform ecosystem and correctly support exclusive versus multi-buyer shared licensing without duplicate settlement or empty-room navigation.

**Architecture:** Keep `ReleaseWizard` as the coordinator, move ecosystem-to-bidder selection into a focused adapter, and extend the existing bidding service with explicit shared-acceptance and finish-licensing transitions. Persist accepted offer/contract collections in the existing draft while retaining the legacy single-platform fields for downstream compatibility.

**Tech Stack:** React, TypeScript, Vite, deterministic Actor Empire services, esbuild audits, Playwright browser audits.

**Spec:** `docs/superpowers/specs/2026-09-09-release-wizard-ui-transplant-design.md` plus the approved September 9 auction-integrity rules in this task.

## Global Constraints

- Supplied UI remains presentation only; game state, finance, rights, energy, and saves stay authoritative.
- Exclusive acceptance is terminal; non-exclusive acceptance permits at most three compatible shared contracts.
- Every financial settlement is idempotent by accepted offer id.
- Campaign Back must never render an accepted empty room or reopen settlement.
- Select five to eight eligible bidders from the live ecosystem; future active companies enter without Release Wizard constants.
- Preserve unrelated dirty work and do not stage or commit.

---

### Task 1: Shared-licensing bidding state machine

**Files:**
- Modify: `services/streamingBidding.ts`
- Modify: `services/streamingRightsCore.ts`
- Modify: `types.ts`
- Test: `scripts/audit-streaming-active-bidding-phase2.ts`

**Interfaces:**
- Produces: `acceptStreamingBiddingOffer` with exclusive-terminal and shared-continuing behavior.
- Produces: `finishStreamingBiddingSession(session)` to close a partially accepted shared room.
- Produces: accepted offers discoverable from persisted `offer.status === 'ACCEPTED'`.

- [x] **Step 1: Write failing service assertions**

Add literal assertions proving that one shared acceptance keeps compatible shared offers available, exclusive offers are withdrawn, three shared acceptances close the room, explicit finish closes a partially accepted room, and signed shared offers pass the canonical contract recheck.

- [x] **Step 2: Run the focused service audit and verify RED**

Run: `npm run audit:streaming-active-bidding-phase2`

Expected: FAIL because shared acceptance currently marks the whole room accepted and withdraws every other offer.

- [x] **Step 3: Implement the state transitions**

Keep accepted offers immutable, force later revisions to remain non-exclusive after the first shared signing, withdraw incompatible exclusive terms, and cap accepted shared offers at three.

- [x] **Step 4: Run the focused service audit and verify GREEN**

Run: `npm run audit:streaming-active-bidding-phase2`

Expected: PASS.

### Task 2: Ecosystem-derived bidder market and varied structures

**Files:**
- Create: `services/releaseStreamingAuction.ts`
- Modify: `services/streamingBidding.ts`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Test: `scripts/audit-release-streaming-auction.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildReleaseStreamingBidderMarket(player, context)` returning five to eight deterministic `StreamingBiddingPlatformInput` records.
- Consumes: `getForbesStreamingCompanies`, canonical cash/localization/spending state, project genre/quality, and relationship memory.

- [x] **Step 1: Write a failing market audit**

Assert that the returned market includes non-core ecosystem operators, excludes closed/acquired/player companies, stays between five and eight bidders, changes deterministically with project/week context, and supplies bounded cash, ceiling, quality, backend, shared-rights, localization, and strategic-market inputs.

- [x] **Step 2: Run the focused market audit and verify RED**

Run: `npm run audit:release-streaming-auction`

Expected: FAIL because the adapter does not exist.

- [x] **Step 3: Implement the bidder adapter and offer preferences**

Derive bidder appetite from current ecosystem summaries and deterministic project context. Replace fixed 80% backend and fixed 22% shared rolls with each bidder's bounded preferences.

- [x] **Step 4: Run the market and bidding audits and verify GREEN**

Run: `npm run audit:release-streaming-auction && npm run audit:streaming-active-bidding-phase2`

Expected: PASS.

### Task 3: Release Wizard settlement and navigation

**Files:**
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/StreamingWarRoomStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/FinalizeStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Modify: `types.ts`
- Test: `scripts/audit-release-wizard-controller-transplant.cjs`

**Interfaces:**
- Persists: `ReleasePlanningDraft.selectedStreamingPlatformIds` and `selectedStreamingContractIds` while maintaining `selectedPlatform` as the primary legacy buyer.
- Produces: an in-room accepted-deals summary and `FINISH LICENSING` action after the first shared deal.

- [x] **Step 1: Add failing real-controller journeys**

Assert that accepting a shared deal stays in the room, registers and pays exactly once, enables Finish Licensing, then reaches Campaign; Campaign Back returns to a signed-deal summary instead of an empty room. Assert that an exclusive deal still advances immediately.

- [x] **Step 2: Run the controller audit and verify RED**

Run: `npm run audit:release-wizard-controller-transplant`

Expected: FAIL on immediate Campaign navigation and empty-room restoration.

- [x] **Step 3: Implement settlement collections and guarded navigation**

Accumulate shared guarantees/contracts, update dynamic-operator cash, use offer display names, keep one idempotent ledger entry per offer, and render the accepted-deal summary when returning from Campaign.

- [x] **Step 4: Run the controller audit and verify GREEN**

Run: `npm run audit:release-wizard-controller-transplant`

Expected: PASS at all five target viewports.

### Task 4: Full verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes all prior tasks and produces final evidence.

- [x] **Step 1: Run focused audits**

Run: `npm run audit:release-streaming-auction && npm run audit:streaming-active-bidding-phase2 && npm run audit:streaming-rights-compatibility-phase3 && npm run audit:release-wizard-ui-model`

- [x] **Step 2: Run browser audits**

Run the Release Wizard controller and presentation Playwright audits against `127.0.0.1:5178`.

- [x] **Step 3: Run production build**

Run: `npm run build`

- [x] **Step 4: Verify the live local server**

Confirm process cwd and HTTP 200 at `http://127.0.0.1:5178/`.
