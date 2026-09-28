# C6 Career and Save Regression Implementation Plan

> **For agentic workers:** Execute inline in this task. This checkout contains uncommitted C1–C5 state, so do not create a clean worktree, delegate, commit, or push. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify launch-to-live commercial play, old-save migration, player/AI offer parity, and deterministic weekly settlement; classify and fix only reproducible regressions before a separate release decision.

**Architecture:** Reuse canonical launch, offer, rights, world, and save APIs. Extend existing phase audits when their fixtures encode superseded rules; add one C6 matrix audit for cross-phase invariants. Keep the player save and AI world as the only accounting sources.

**Tech Stack:** TypeScript, esbuild/Node audit scripts, React/Vite, local browser.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-commercial-offers-design.md`

## Global Constraints

- No population or C4 conversion/CPM retuning, no historical cash rewrite, no new sponsor/fan-funding income.
- Every opening country needs a title-country-offer route; drafts remain accessible.
- Monthly and annual subscriber cohorts, free viewers, passes, rentals, and purchases stay distinct.
- Player and AI settlement must use the same country-week mechanics and be replay-safe.
- Preserve all unrelated dirty work. Do not commit or push without a fresh request.

---

### Task 1: Baseline and inherited-audit classification

**Files:** Modify `scripts/audit-streaming-launch-phase8.ts` and `scripts/audit-streaming-pricing-world-integration.tsx` only if their failed assertions encode removed rules; record exact failures in the C6 report.

- [x] **Step 1: Run the focused baseline:** `audit:streaming-launch-phase8`, `audit:streaming-weekly-loop-phase10`, `audit:streaming-pricing-world`, `audit:streaming-billing-cohorts`, `audit:world-streaming-we5`, `audit:world-streaming-we6`, `audit:world-streaming-we7`.
- [x] **Step 2: Trace each failure** through fixture input, canonical API output, and current spec. For a launch fixture, inspect `getStreamingLaunchReadiness(fixture).items`; for pricing, compare `forecastPricing` with and without `WorldStreamingLaunchPricingForecast`.
- [x] **Step 3: Update an obsolete assertion or fixture only when the current rule is proven.** Phase 8's positive fixture must own or license its opening title in its opening country. The pricing audit must assert conditional C4 forecast response and zero invented cash without a world forecast.
- [x] **Step 4: Re-run both audits.** A new real defect gets a focused failing test before a service change.

### Task 2: C6 cross-phase matrix

**Files:** Create `scripts/audit-streaming-commercial-c6.ts`; modify `package.json` and add `tsconfig.streaming-commercial-c6.json` only for the audit/type boundary.

- [x] **Step 1: Build deterministic fixtures** for an active player platform with one granted title and country, then configure subscription, free-ad, store-only, and hybrid offers through `configureStreamingPricingOffer`.
- [x] **Step 2: Assert cohort and money separation** using `createWorldStreamingCustomerState`, `createWorldStreamingViewingState`, `createWorldStreamingPlatformEconomyState`, and `processOwnedStreamingPlatformWeek`: free/store paid subscriber counts are zero, paid monthly/annual counts reconcile, rights-denied viewing yields no transaction/ad cash, and country gross/cost/net reconcile to the platform outcome. The zero-capacity assertion is deliberately red: the current viewing system still pays for undelivered ad/store activity. Early-window denial passes.
- [x] **Step 3: Assert replay and saves** with `compactPlayerForPersistence`, JSON round-trip, `migratePlayerSave`, and same-week processing: offers, entitlement receipts, treasury, and processing keys are stable in short fixtures. The separate 400-year save-size gate is red.
- [x] **Step 4: Assert AI parity** by checking its published offer modes and title transaction totals against the same weekly market view. Keep balance snapshots diagnostic rather than tuning to a preferred number.
- [x] **Step 5: Resolve the red regression gates, then pass the C6 audit and focused typecheck.** C6 now includes zero/thin/incident capacity, dark/partial-country subscriber reach, lost-route billing, first-live-week, and signed-save assertions. Manual Build commissioning and real-device verification remain separate release gates.

### Task 3: UI, broad regression, and release gate

**Files:** Create `docs/superpowers/reports/2026-09-23-streaming-commercial-c6.md`; update the C6 status line in the spec only with observed evidence. UI harness changes are allowed only if needed for reproducible phone verification.

- [x] **Step 1: Check the pricing screen at phone width** in a save-isolated fixture, including six tiers, ad/store cards, country disclosure, native numeric input, and long content. A real-save touchscreen run remains separate.
- [x] **Step 2: Run C0–C6 and adjacent launch/rights/WE5–WE7 audits**, focused TypeScript, production build, and `git diff --check`. C6 and the 400-year save contract pass; see the report for the fresh rerun matrix.
- [x] **Step 3: Record exact outcomes** in the C6 report. An isolated signed career completed the in-game opening-night-to-first-live-week run and reload at 393×852. Its infrastructure and catalog were precommissioned; manual Build commissioning, real-device verification, and a separate release decision remain open.
