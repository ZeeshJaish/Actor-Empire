# World Economy WE4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the owned streaming platform's blended subscriber demand and ARPU assumptions with deterministic country, cohort, platform, and exact-plan competition over WE3's finite streaming audience.

**Architecture:** Add a canonical streaming-offer adapter and compact competition state under `services/worldEconomy/`. Player offers come from the saved launch pricing configuration; AI offers are deterministic strategy projections over the existing platform ecosystem and Platform AI statistics. The allocator evaluates every operator active in a country, assigns zero, one, or multiple subscriptions within each WE2/WE3 cohort's streaming budget, persists reconciled summaries, and feeds only the owned platform's live target demand and exact plan revenue into the existing weekly loop.

**Tech Stack:** TypeScript, deterministic aggregate simulation, existing WE1-WE3 engines, owned streaming weekly loop, Platform AI ecosystem, React Audience Market, save migration, esbuild audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

## Global Constraints

- WE1 is the only population and household source; WE2 is the only cohort and entertainment-budget source; WE3 is the only streaming-access and streaming-budget source.
- Evaluate every active, country-eligible ecosystem operator; do not use a four-platform or arbitrary top-N simulation cap.
- Player plans must use the exact saved pricing configuration, stable IDs, features, advertisements, annual discount, and introductory offer.
- AI offers must use existing ecosystem and Platform AI statistics, remain deterministic, and receive no hidden subscriber multiplier.
- Each aggregate cohort may select zero, one, or multiple platforms, but never two plans from the same platform and never more subscription spend than its streaming budget.
- Rights, catalogue, localization, reputation, technology, reliability, marketing, and momentum contribute only through canonical existing data or explicit bounded fallbacks.
- WE4 owns subscription demand, plan mix, effective subscription price, and owned-platform subscription revenue; WE5 retains future ownership of persistent churn, sharing, and piracy.
- Reuse the existing owned streaming weekly loop for progression, costs, treasury, history, decisions, and causal reporting.
- Results must be deterministic, idempotent, repairable, directly projectable across 400 years, bounded in save size, and mobile-safe.
- Preserve unrelated working-tree changes and do not commit or push unless the user requests it.

---

### Task 1: Canonical platform and exact-plan offer registry

**Files:**
- Create: `services/worldEconomy/worldStreamingOffers.ts`
- Modify: `types.ts`
- Create: `scripts/audit-world-streaming-we4.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `Player`, `OwnedStreamingServiceConfiguration`, `StreamingPlatformEcosystemState`, Platform AI capability state, market operations, and the owned platform catalogue.
- Produces: `getWorldStreamingOffers(player, absoluteWeek)` with stable player/AI offer IDs, exact plans, active countries, effective prices, and bounded competitive strengths.

- [x] Write an audit that requires the offer registry and asserts exact player-plan fidelity, stable AI offers, all eligible operators, inactive-country exclusion, and no input mutation.
- [x] Run `npm run audit:world-streaming-we4` and observe the missing-registry failure.
- [x] Add compact offer, plan, allocation, country, global, snapshot, and state types.
- [x] Implement exact player offer adaptation from `serviceConfiguration.pricing` and active market operations.
- [x] Implement deterministic AI plan postures from canonical ecosystem and Platform AI statistics without a demand or subscriber bonus.
- [x] Run the offer audit until green.

### Task 2: Budget-safe country and cohort competition allocator

**Files:**
- Create: `services/worldEconomy/worldStreamingCompetition.ts`
- Test: `scripts/audit-world-streaming-we4.ts`

**Interfaces:**
- Consumes: canonical WE1, WE2, WE3 states and the Task 1 offer registry.
- Produces: `createWorldStreamingCompetitionState`, `normalizeWorldStreamingCompetitionState`, `advanceWorldStreamingCompetitionToWeek`, `getWorldStreamingPlayerOutcome`, and country/platform selectors.

- [x] Add failing assertions for zero/one/multiple subscriptions, one plan per platform, budget conservation, exact plan totals, all-operator competition, and expensive-plan viability.
- [x] Implement deterministic plan utility from affordability, plan features, ads tolerance, household fit, catalogue, localization, reputation, reliability, marketing, loyalty, and country momentum.
- [x] Allocate participant households and subscription slots using integer-safe distribution, enforcing cohort budget and platform uniqueness constraints.
- [x] Aggregate cohort decisions into country, platform, plan, and global summaries that reconcile exactly.
- [x] Repair malformed, stale, or source-fingerprint-mismatched competition state deterministically.
- [x] Run the allocator audit until green.

### Task 3: Save migration, weekly ordering, and live owned-platform cutover

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/gameLoop.ts`
- Modify: `services/streamingWeeklyLoop.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Test: `scripts/audit-world-streaming-we4.ts`

**Interfaces:**
- Consumes: Task 2 competition state after Platform AI/ecosystem progression and before the owned streaming weekly economy.
- Produces: `Player.world.worldStreamingCompetition`, owned-platform target households, exact plan distribution, effective ARPU, subscription revenue, and causal drivers.

- [x] Add failing old-save, repeated-migration, weekly-order, idempotence, and authority-cutover assertions.
- [x] Bump the save migration and normalize missing WE4 data without changing old-save cash or existing subscribers during migration; the owned-platform schema remains v23 because its stored shape only gains optional evidence fields.
- [x] Process WE4 after the industry/platform ecosystem turn and before `processOwnedStreamingPlatformWeek`.
- [x] Replace blended BASIC/PREMIUM/FAMILY demand and subscription revenue with gradual movement toward WE4 target households and exact-plan effective revenue.
- [x] Preserve current product, growth, infrastructure, crisis, rights, cost, treasury, history, and title-attribution paths.
- [x] Run WE1-WE4, save-migration, week-safety, and streaming-weekly-loop audits until green.

### Task 4: Forecast and Audience Market evidence

**Files:**
- Modify: `components/studio-finance/finance/launch.ts`
- Modify: `services/streamingAudienceMarket.ts`
- Modify: `components/streaming-transplant/StreamingAudienceExperience.tsx`
- Create: `scripts/audit-world-streaming-we4-ui.tsx`
- Test: `scripts/audit-world-streaming-we4.ts`

**Interfaces:**
- Consumes: exact player plans, canonical WE4 allocations, country outcomes, and owned-platform weekly results.
- Produces: cohort-backed pricing forecasts plus concise addressable, captured, plan-mix, effective-price, unclaimed-demand, and explanatory country evidence.

- [x] Add failing forecast assertions proving price/features alter cohort-backed demand instead of the legacy static reach formula.
- [x] Add a failing rendered-UI audit for captured households, unclaimed potential, exact plan mix, effective price, and concise causal explanations.
- [x] Project WE4 through the existing pricing and Audience Market view models without exposing internal utility scores or requiring cohort micromanagement.
- [x] Add weekly causal drivers for plan price, household fit, catalogue/localization strength, and major rival pressure.
- [x] Run engine and UI audits until green.

### Task 5: Long-run, compatibility, and completion report

**Files:**
- Modify: `scripts/audit-world-streaming-we4.ts`
- Create: `docs/superpowers/reports/2026-09-09-world-economy-we4-report.md`
- Modify: `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

**Interfaces:**
- Consumes: completed WE4 offer, competition, migration, live weekly, and presentation integrations.
- Produces: measured completion evidence and the WE5 handoff.

- [x] Assert 400-year direct projection, bounded history/save size, deterministic reload, source repair, all-operator inclusion, budget conservation, and practical runtime.
- [x] Assert exact plan revenue, no subscriber creation outside WE3, no rights/localization bypass, and no migration-time cash/subscriber mutation.
- [x] Run WE1-WE4, WE4 UI, save migration, week safety, streaming weekly loop, TypeScript, production build, and diff checks.
- [x] Record exact results, live authority boundaries, known repository-wide blockers, and the WE5 handoff.
