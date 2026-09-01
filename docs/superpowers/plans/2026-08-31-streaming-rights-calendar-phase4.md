# Streaming Rights Calendar Phase A4 Implementation Plan

> Execute inline in the current Actor Empire workspace. Preserve unrelated dirty work. Do not stage, commit, or push without explicit user authorization. Use strict sequential RED -> GREEN TDD for every behavior slice.

**Goal:** Add one deterministic, canonical expiry and renewal lifecycle shared by the Production House, owned streaming platform, and AI streaming platforms, with portfolio control modes and grouped player surfaces.

**Architecture:** `services/streamingRightsCalendar.ts` owns renewal-case normalization, valuation, weekly lifecycle processing, resolution, and calendar projections. It reads and writes canonical A1 contracts, calls the A3 resolver before replacement registration, and synchronizes existing owned/AI projections. Existing A2 bidding remains the market mechanism; A4 only prepares the exact next window and never auto-selects an interactive winner.

**Tech stack:** TypeScript, React, deterministic weekly simulation, esbuild audit scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-08-31-streaming-rights-calendar-phase4-design.md`

## Task 1: Canonical clock, schema, and migration

**Files:** `types.ts`, `services/streamingRightsCalendar.ts`, `services/saveMigration.ts`, `services/saveCompaction.ts`, `scripts/audit-streaming-rights-calendar-phase4.ts`, `package.json`

- [x] Write a failing audit proving inclusive expiry, following-week expiry/reversion, permanent-contract exclusion, one case per contract, repeat-week idempotence, and migration defaults.
- [x] Observe RED because the A4 service and schema do not exist.
- [x] Add the saved management policy, renewal-case registry, weekly digest types, normalizers, and deterministic calendar projections.
- [x] Process the universal contract clock once per absolute week and synchronize canonical/owned/AI status without payments or renewal signing yet.
- [x] Add bounded save compaction and run the focused audit GREEN.

## Task 2: Real valuation and control modes

**Files:** `services/streamingRightsCalendar.ts`, `scripts/audit-streaming-rights-calendar-phase4.ts`

- [x] Add failing fixtures for breakout, underperformer, cash-constrained incumbent, rival demand, relationship, Strategy, default Custom, Full, protected-title escalation, and manual takeover.
- [x] Observe meaningful RED on missing valuation/control behavior.
- [x] Calculate and persist offer/performance/demand snapshots from existing settlements, owned title attribution, AI release memory, projects, relationships, scope, and finances.
- [x] Resolve routine delegated decisions only within saved authority; record the exact policy and reason.
- [x] Run the focused audit GREEN and prove valuation is not the legacy fixed 8% increase.

## Task 3: Atomic renewal, reversion, and cross-system synchronization

**Files:** `services/streamingRightsCalendar.ts`, `services/streamingRightsMarketplace.ts`, `services/streamingContractSettlement.ts`, `services/platformAi/platformAiRightsLifecycle.ts`, `services/gameLoop.ts`, `scripts/audit-streaming-rights-calendar-phase4.ts`

- [x] Add failing assertions for exact-scope replacement at old expiry + 1, A3 conflict rejection, exact-once payment, exact territory reversion, catalogue/schedule removal, expiry-week royalty settlement, and no legacy AI duplicate.
- [x] Observe RED against current `>=` expiry drift and legacy renewal behavior.
- [x] Implement atomic accept/expire/return-to-market/takeover actions with stable keys and an A3 final recheck.
- [x] Run the universal lifecycle near the start of weekly progression and adapt legacy owned/AI paths to defer to A4 cases.
- [x] Run focused A1-A4, marketplace, and Platform AI audits GREEN.

## Task 4: Grouped Rights Calendar UI

**Files:** `components/StreamingRightsCalendar.tsx`, `components/StreamingRightsExchange.tsx`, `views/lifestyle/business/ProductionHouseGame.tsx`, `views/lifestyle/business/components/ProjectDashboardModal.tsx`, `styles/streaming-rights-calendar.css`, `scripts/audit-streaming-rights-calendar-phase4.ts`

- [x] Add a failing rendered-component audit for grouped counts, timing truth, control mode, factual detail, valid-window actions, and no per-title popup list.
- [x] Observe RED because the shared calendar surface is absent.
- [x] Add the Production House division and grouped calendar using the shared projection/action service.
- [x] Add the Rights Exchange Calendar tab and correct Vault timing/action state.
- [x] Add one restrained project-detail rights line and run the UI assertions GREEN.

## Task 5: Weekly digest, regression, and handoff

**Files:** `services/streamingRightsCalendar.ts`, `services/gameLoop.ts`, `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`, `docs/superpowers/reports/2026-08-31-streaming-rights-calendar-phase4-report.md`

- [x] Add failing assertions for one grouped weekly digest and one idempotent urgent protected inbox notice.
- [x] Implement grouped logs/inbox behavior without news or social spam and run GREEN.
- [x] Run A1-A4, marketplace, Platform AI lifecycle/economy/release, save migration, save transfer, and production build checks; fix every A4-local type error and record the pre-existing stale audit-fixture failures from the global typecheck.
- [x] Browser-test the shared calendar through Production House; verify owned-platform rendering plus renewal signing/payment through focused audits.
- [x] Record evidence, update the roadmap to A4 complete/A5 next only when every completion criterion is demonstrated, and report any unrelated baseline failures separately.
