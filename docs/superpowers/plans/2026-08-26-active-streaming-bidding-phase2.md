# Active Streaming Bidding Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` for inline implementation. The user explicitly prohibited subagents, staging, and commits.

**Goal:** Build a saved deterministic multi-offer War Room and settle accepted backend contracts from attributable platform title revenue.

**Architecture:** Pure services own offer valuation, session transitions, revenue attribution, and exact-once settlement. `WorldState` persists normalized sessions and settlement rows; `ReleaseWizard` delegates the room to a focused React component and converts only an accepted immutable offer into the Phase 1 canonical contract. Existing owned-platform and AI economies feed one shared attribution boundary instead of separate catalogue-average and per-view royalty meanings.

**Tech Stack:** TypeScript, React 19, motion, deterministic RNG helpers, esbuild audit scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-08-26-active-streaming-bidding-phase2-design.md`

## Global Constraints

- Work inline; do not use subagents.
- Preserve unrelated dirty-worktree changes.
- Do not stage or commit.
- Use strict sequential RED to GREEN TDD.
- Never use `Math.random()` or `Date.now()` for bidding decisions, IDs, settlement, or persistence.
- One universal room clock; equal six-second platform cooldowns.
- No player counteroffers, highest-bid winner, auto-signing, hidden clauses, or advisory best-offer labels.
- Every normally opened room retains one real clearing offer through closing.
- Phase 1 `WorldState.streamingRightsContracts` remains the canonical signed-contract authority.

---

### Task 1: Deterministic offer and session engine

**Files:**
- Create: `services/streamingBidding.ts`
- Modify: `types.ts`
- Create: `scripts/audit-streaming-active-bidding-phase2.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `createStreamingBiddingSession`, `advanceStreamingBiddingSession`, `normalizeStreamingBiddingSession`, `getStreamingBiddingClosingOffers`, and immutable `StreamingOfferVersion` records.
- Consumes later: Release Wizard UI, save migration, acceptance bridge.

- [ ] Write a failing audit that creates a session from literal platform/project fixtures and asserts a cash-backed clearing offer, stable IDs, 15-second room time, and equal six-second cooldowns.
- [ ] Run `npm run audit:streaming-active-bidding-phase2` and confirm the missing API is the RED.
- [ ] Implement the minimal types, deterministic platform forecasts, structured offer creation, and opening session.
- [ ] Run the focused audit and confirm GREEN.
- [ ] Add failing cases for competitor-triggered upward revision, overbid-triggered downward/restructured revision, final/withdraw states, clock extension, 45-second cap, and closing without automatic acceptance.
- [ ] Implement one-second pure transitions and rerun until every new case is GREEN.

### Task 2: Session persistence and same-week restoration

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingBidding.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `scripts/audit-streaming-active-bidding-phase2.ts`
- Modify: `scripts/audit-save-migration.ts`
- Modify: `scripts/audit-save-transfer.ts`

**Interfaces:**
- Produces: `WorldState.streamingBiddingSessions`, `upsertStreamingBiddingSession`, `getRestorableStreamingBiddingSession`, and bounded compaction.
- Guarantees: same project/seller/week restores the same session; a later absolute week creates a fresh deterministic market.

- [ ] Add a failing save round-trip case asserting that time, offer versions, platform rounds, and closing state survive normalization and JSON transfer.
- [ ] Verify RED in the focused audit.
- [ ] Implement normalized registry persistence and stable same-week lookup.
- [ ] Verify GREEN, then add and pass malformed-entry and bounded-history cases.

### Task 3: Shared title revenue attribution and royalty rules

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingEconomyCore.ts`
- Create: `services/streamingContractSettlement.ts`
- Create: `scripts/audit-streaming-contract-economics-phase2.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `attributeStreamingTitleRevenue`, `calculateStreamingContractRoyalty`, `settleStreamingContractRoyalty`, `StreamingTitleRevenueAttribution`, and `StreamingRoyaltySettlement`.
- Consumes: realized title viewing, watch hours, acquisition, retention, ads/transactions, and a Phase 1 contract.

- [ ] Write a failing attribution audit with two hand-calculated title rows and assert allocations sum exactly to the literal revenue pools.
- [ ] Verify RED, implement normalized 45/25/20/10 attribution, and verify GREEN.
- [ ] Add failing literal cases for non-recoupable royalty, recoupable guarantee crossing, explicit cap, uncapped upside above forecast, zero revenue, and replay idempotence.
- [ ] Implement exact-once actor-neutral settlement and verify each case GREEN before adding the next.

### Task 4: Extend canonical contracts and relationships

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingRightsCore.ts`
- Modify: `services/streamingFundingLogic.ts`
- Modify: `scripts/audit-streaming-contract-foundation-phase1.ts`
- Modify: `scripts/audit-streaming-active-bidding-phase2.ts`

**Interfaces:**
- Adds contract terms: adjusted-gross basis, recoupment, backend cap, cumulative accrual/payment.
- Expands `PlatformFundingRelationship` with bounded completed-deal, loyalty, and partner-value fields.
- Produces: `registerProductionStreamingRightsContractFromOffer` and positive/negative relationship multiplier behavior.

- [ ] Add a failing canonical normalization case for recoupment/cap and a failing relationship case proving positive history can exceed 1 while remaining bounded.
- [ ] Verify RED, implement minimal normalization and bounded multipliers, and verify GREEN.
- [ ] Add a failing accepted-offer conversion case asserting every legal/economic term reaches the exact Phase 1 contract.
- [ ] Implement the adapter and verify GREEN with no duplicate contract or cash movement.

### Task 5: Integrate the live War Room

**Files:**
- Create: `views/lifestyle/business/components/StreamingBiddingRoom.tsx`
- Create: `styles/streaming-bidding-room.css`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `scripts/audit-streaming-active-bidding-phase2.ts`

**Interfaces:**
- Consumes: saved session service, exact offer acceptance callback, platform presentation data.
- Produces: one common countdown rail, multiple live offer slips, equal response rings, chronological tape, closing table, accept/leave controls, and mobile layout.

- [ ] Add a failing integration audit for the Release Wizard acceptance boundary and expected room model labels/actions.
- [ ] Verify RED before removing the old highest-bid state and random interval engine.
- [ ] Build the focused room component and wire session persistence/advance/accept/leave through Release Wizard.
- [ ] Verify GREEN, keyboard focus, reduced motion, and narrow-width layout; retain commissioned-premiere handling.

### Task 6: Weekly settlement and commercial feedback

**Files:**
- Modify: `services/gameLoop.ts`
- Modify: `services/platformAi/platformAiEconomy.ts`
- Modify: `services/platformAi/platformAiDistress.ts`
- Modify: `services/streamingWeeklyLoop.ts`
- Modify: `scripts/audit-streaming-contract-economics-phase2.ts`
- Modify: `scripts/audit-subsidiary-streaming.ts`

**Interfaces:**
- Replaces: Production House `$0.10 per view` shortcut for canonical Phase 2 contracts and AI catalogue-average share for attributed titles.
- Produces: buyer debit, seller credit, release totals, investor payout compatibility, settlement ledger, and relationship outcome inputs.

- [ ] Add one failing end-to-end weekly case proving the platform and studio receive opposite cash impacts from one settlement.
- [ ] Verify RED, integrate the shared settlement boundary, and verify GREEN.
- [ ] Add failing replay, legacy-contract fallback, breakout-upside, and relationship-update cases one at a time; implement and verify each sequentially.

### Task 7: Documentation and final verification

**Files:**
- Modify only if implementation changes boundaries: the supplied portable master plan or a new portable replacement under `docs/superpowers/specs/`.
- Review: all Phase 2 files and unrelated worktree changes.

**Interfaces:**
- Produces: current master-plan delta assessment and fresh verification evidence.

- [ ] Re-read the approved spec and map every requirement to code and an audit assertion.
- [ ] Run focused audits: active bidding, contract economics, Phase 1 contracts, Production House streaming, Platform AI economy/rights, save migration, and save transfer.
- [ ] Run `npm run build` and `git diff --check`.
- [ ] Inspect the real War Room at desktop and mobile widths if the local app is runnable.
- [ ] Update the master plan only when actual implementation changes a later phase boundary; otherwise report that no replacement is necessary.
