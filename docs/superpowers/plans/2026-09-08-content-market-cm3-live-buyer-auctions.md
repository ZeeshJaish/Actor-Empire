# Content Market CM3 Live Buyer Auctions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted live buyer auctions with flexible seller-bounded terms, deterministic rivals, binding commitments, and canonical title/package settlement.

**Architecture:** Keep the existing seller bidding engine unchanged. Add a focused player-buyer auction service and saved types under the owned streaming platform, reuse Content Market opportunities, canonical compatibility, cost commitments, rights signing, package allocation, and Messages, and render a dedicated mobile room from `StreamingContentMarket`.

**Tech Stack:** React, TypeScript, Vite, deterministic simulation services, existing Actor Empire persistence and audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-08-content-market-cm3-live-buyer-auctions-design.md`

## Global Constraints

- Work inline and preserve unrelated dirty files.
- Do not commit or push without explicit user authorization.
- CM1 direct purchase, CM2 private offers, and the Production House seller room must remain operational.
- Persist every timer, rival ceiling, bid version, commitment, and outcome; reloads cannot reroll.
- Only canonical eligible rights may enter or settle.
- CM4 upcoming listings and public media reactions remain out of scope.

---

### Task 1: Persisted buyer-auction domain

**Files:**
- Modify: `types.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Create: `services/streamingBuyerAuctions.ts`
- Test: `scripts/audit-content-market-cm3.ts`

**Interfaces:**
- Produces: `getStreamingBuyerAuctionLots`, `openStreamingBuyerAuction`, `placeStreamingBuyerAuctionBid`, `advanceStreamingBuyerAuction`, `withdrawStreamingBuyerAuctionBid`, and normalized saved sessions.
- Consumes: Content Market title/package opportunities, deterministic RNG, platform brand/economy state, and canonical rights scopes.

- [x] Write a failing audit proving an auction lot has immutable scope, persisted seller priorities, rival ceilings, a 15-second clock, and a 45-second hard cap.
- [x] Run `npm run audit:content-market-cm3` and observe the missing buyer-auction API failure.
- [x] Add bounded saved types, backward-compatible normalization, and deterministic lot/session creation.
- [x] Re-run the audit and make the domain checks pass.

### Task 2: Flexible bids and financial reservation

**Files:**
- Modify: `services/streamingBuyerAuctions.ts`
- Modify: `services/streamingContentMarket.ts`
- Test: `scripts/audit-content-market-cm3.ts`

**Interfaces:**
- Produces: bid validation/ranking, `OwnedStreamingCostCommitment` reservation replacement/release, and direct/private-method auction locks.
- Consumes: `getContentMarketFunds`, the canonical cost-commitment registry, and saved lot term limits.

- [x] Add failing cases for mixed cash/backend ranking, out-of-range terms, insufficient uncommitted treasury, one reservation per current bid, and direct-purchase rejection for auction lots.
- [x] Run the focused audit and confirm each behavior fails for the expected missing branch.
- [x] Implement seller-value ranking, player revisions, and idempotent reservation updates.
- [x] Re-run the audit until all financial and ranking cases pass.

### Task 3: Rival clock, close, and canonical settlement

**Files:**
- Modify: `services/streamingBuyerAuctions.ts`
- Modify: `services/streamingRightsMarketplace.ts`
- Modify: `services/streamingWeeklyLoop.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Test: `scripts/audit-content-market-cm3.ts`

**Interfaces:**
- Produces: deterministic second advancement, diminishing extensions, background reconciliation, win/loss/no-sale/invalidated results, one-time settlement, and outcome Messages.
- Consumes: rights compatibility/signing, AI platform cash, catalogue-package allocation, original commissioning history, and rights obligations.

- [x] Add failing cases for deterministic rival revisions, 45-second closure, background catch-up, reserve failure, player win, duplicate close, auction-method conflict, and package atomicity.
- [x] Run the focused audit and verify those branches fail before implementation.
- [x] Implement advancement and settlement, release reservations on every terminal path, add enforceable future-greenlight obligations, and process abandoned live rooms in the weekly loop.
- [x] Re-run CM3 plus existing rights, package, weekly-loop, CM1, and CM2 audits.

### Task 4: Buyer auction room and Content Market integration

**Files:**
- Create: `components/StreamingBuyerAuctionRoom.tsx`
- Create: `styles/streaming-buyer-auction-room.css`
- Modify: `components/StreamingContentMarket.tsx`
- Modify: `styles/streaming-content-market.css`
- Modify: `views/mobile/MessagesApp.tsx`
- Modify: `views/mobile/MobilePage.tsx`
- Modify: `App.tsx`
- Modify: `views/LifestylePage.tsx`
- Modify: `components/StreamingLockedScreen.tsx`
- Modify: `components/StreamingPlatformHQ.tsx`
- Modify: `scripts/fixtures/content-market-cm1.tsx`
- Modify: `scripts/audit-content-market-browser.cjs`

**Interfaces:**
- Produces: `Live auctions` Content Market route, 70/30 room, sticky bid console, restored active session, result view, and Message-to-exact-auction deep link.
- Consumes: Task 1-3 service APIs and the platform's existing dynamic brand tokens.

- [x] Extend the browser audit first for auction discovery, mixed-term submission, visible commitment, countdown, result, 320px fit, and exact Message deep link.
- [x] Build the dedicated room with a restrained auction-floor visual language and wire it through the existing Content Market and Message route.
- [x] Run the browser audit at 390px and 320px and inspect captured screenshots for hierarchy, clipping, and touch targets.

### Task 5: Final regression and report

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/plans/2026-09-08-unified-content-market-implementation.md`
- Create: `docs/superpowers/plans/2026-09-08-content-market-cm3-report.md`

**Interfaces:**
- Produces: repeatable CM3 command and player-facing completion evidence.
- Consumes: all prior tasks.

- [x] Add `audit:content-market-cm3` and the focused browser command to `package.json`.
- [x] Run CM1, CM2, CM3, seller bidding, catalogue packages, compatibility, transaction, weekly-loop, browser, and production-build checks.
- [x] Run `git diff --check`, record unrelated pre-existing diagnostics separately, and update the roadmap/report with actual evidence only.
