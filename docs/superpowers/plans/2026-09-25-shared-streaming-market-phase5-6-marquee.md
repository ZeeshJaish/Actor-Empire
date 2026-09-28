# Shared Streaming Market Phase 5–6 and Marquee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline in the existing `codex/rights-market-phase1` checkout because Phases 1–4 are uncommitted there; do not dispatch subagents, stage, or commit.

**Goal:** Make the shared historical library genuinely available through a rights-safe market, add a scarce premium title slate, and give new platforms temporary first-look before rivals contest it.

**Architecture:** Keep v1 historical generation immutable. Add a compact v2 marquee recipe and read-only adapter into the existing candidate/quote paths. Apply a shared availability decision at market discovery and exact settlement; persist a one-time grace anchor and deterministic rival claims in canonical rights state. The UI exposes a small rotating shelf plus full-library inspection/search without fabricating offers.

**Tech Stack:** TypeScript, React, Vite, esbuild/Node audits, existing save migration/integrity and streaming rights registry.

**Spec:** `docs/superpowers/specs/2026-09-25-shared-streaming-market-phase5-6-marquee-design.md`

## Global Constraints

- Preserve all saved title IDs, terms, payments, ownership, and award history; existing sold/held titles may not be relisted.
- Do not modify historical v1 generation or place 2,016 full records in `world.projects`.
- Marquee slate: 16 fictional titles, 12 movies/four series, quality 90–98, rating 8.6–9.5, 2× ordinary reference pricing, no free platform rights.
- Market discovery: 12 direct titles per three-week cycle, up to two marquee positions; full-library inspection is read-only.
- First-look: 12 deterministic compatible titles, up to two marquee; expires at 25 actually playable titles or 12 game weeks after saved anchor, whichever first.
- Rival opening claims: no more than 24, outside protected first-look, no invented prior financial settlement; post-grace claims use real canonical rights.
- No new audience/subscriber/revenue subsystem. No Phase 7 release/device activation.
- Preserve unrelated dirty work. No stage, commit, push, or release.

---

### Task 1: Marquee v2 batch and save contract

**Files:** `types.ts`, `services/historicalCatalogue.ts`, `services/saveMigration.ts`, `services/saveIntegrity.ts`, `scripts/audit-historical-market-phase5-6.ts`, `package.json`.

**Interfaces:** Extend the historical state with a one-time v2 activation marker and expose the marquee tier on resolved titles; preserve old v1 IDs and data.

- [ ] **Step 1: Write red audit cases** for 16 unique premium IDs (12 movies/four series), fictional names, rating/quality ranges, no future release or invented awards, saved-project precedence, unchanged v1 records, compact state, and identical reopen/second migration.
- [ ] **Step 2: Run** `npm run audit:historical-market-phase5-6`; verify the missing v2 behavior causes the failure.
- [ ] **Step 3: Implement v2 activation and pure generation** from the saved seed and frozen eligible producer roster; migrate once and protect the marker in save integrity. Do not alter v1 data or project arrays.
- [ ] **Step 4: Run** the focused audit and Phase 3–4/save migration/integrity/transfer audits.

### Task 2: Library market candidate and premium pricing

**Files:** `services/streamingCatalog.ts`, `services/streamingMarketSupply.ts`, `services/streamingRightsMarketplace.ts`, `services/streamingCataloguePackages.ts`, focused audit.

**Interfaces:** `getStreamingLicenseCandidatePool(player)` includes saved-first resolved history; `getStreamingLicenseQuote` and package reference allocation include marquee premium; discovery remains capped/diverse.

- [ ] **Step 1: Add red cases** for useful new/old-save supply, saved-first metadata, no player-owned fabricated inventory, 12-card rotation, marquee/value variety, and 2× comparable quote/collection value.
- [ ] **Step 2: Run focused audit red**, then implement candidate conversion and stable premium pricing without adding hot-save records.
- [ ] **Step 3: Re-run focused and existing market/package audits**; record the pre-existing package failure separately if unchanged.

### Task 3: Rights-valid discovery, search, and atomic settlement

**Files:** `services/streamingContentMarket.ts`, `services/streamingRightsMarketplace.ts`, `services/streamingBuyerAuctions.ts` if necessary, `components/StreamingContentMarket.tsx`, focused audit.

**Interfaces:** Shared inspection returns `AVAILABLE`, `HELD`, `OWNED`, `UNRESOLVED`, or `NOT_OFFERED` with explanation; only exact compatible offers can be signed. Search traverses the full library but never treats an unavailable hit as a listing.

- [ ] **Step 1: Add red tests** for legacy permanent/held exclusion, territory/window conflict, future release exclusion, full-library search state, stale direct/auction/package rejection with zero charge, and atomic package failure.
- [ ] **Step 2: Run focused audit red**, then wire common compatibility checks into listing, package, search, and settlement paths; keep exact signatures and final validation.
- [ ] **Step 3: Add mobile-friendly search/status presentation** using existing Content Market styles, 44px controls, accessible labels and non-purchasable held/owned/unresolved results.
- [ ] **Step 4: Run focused, legacy-rights, market/finalization, and UI build checks.**

### Task 4: First-look anchor, playable threshold, and rival claims

**Files:** `types.ts`, `services/saveMigration.ts`, `services/streamingMarketSupply.ts`, new `services/historicalMarketRivals.ts`, weekly streaming loop integration, focused audit.

**Interfaces:** Save one grace anchor and first-look IDs; count titles playable in at least one active entered market; initialize up to 24 non-protected AI claims with canonical rights and no payment; process deterministic post-grace rival wins without erasing player/legacy positions.

- [ ] **Step 1: Add red new/old/rich/poor fixtures** for initial anchor, migration/reopen idempotence, exactly 24/25 playable boundary, exactly 11/12 weeks, no free licence, no existing-right displacement, and rival claims outside/after grace.
- [ ] **Step 2: Run focused audit red**, then implement compact persistent grace state and deterministic first-look selection; use the existing title-route/market-access evaluator for playable count.
- [ ] **Step 3: Add actor-neutral canonical AI claim registration** with explicit zero-payment opening provenance, compatibility validation, and an idempotent weekly rival competition tick after grace.
- [ ] **Step 4: Re-run focused audit, rights-compatibility, save, and weekly-loop audits.**

### Task 5: Full regression and report

**Files:** `docs/superpowers/reports/2026-09-25-shared-streaming-market-phase5-6-marquee.md`, focused audit as needed.

- [ ] **Step 1: Run fresh** Phase 1–4 rights/catalogue audits, focused Phase 5–6 audit, marketplace/finalization/auction/package audits, save migration/integrity/transfer, weekly/determinism checks, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] **Step 2: Review the spec requirement by requirement**, inspect dirty diff for unrelated changes, and document exact passes, failures, local limitations, and Phase 7 boundary.
