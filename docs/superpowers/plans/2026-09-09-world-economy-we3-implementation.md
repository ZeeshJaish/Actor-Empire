# World Economy WE3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every canonical WE2 cohort into a deterministic, budget-safe participation model for streaming, cinema, both industries, or neither without changing live commercial outcomes.

**Architecture:** Add a separate `WorldAudienceParticipationState` that references stable WE2 cohort IDs and derives neutral industry eligibility, interest, household partitions, budget envelopes, and barriers from WE1 access conditions plus WE2 behaviour and capacity. Persist it through existing migration and weekly progression, then project concise read-only summaries through Audience Market. Keep player/platform competition, subscriber allocation, revenue, title demand, and box office unchanged until later phases.

**Tech Stack:** TypeScript, React, deterministic aggregate simulation, existing WE1/WE2 engines, save migration, weekly loop, esbuild audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

## Global Constraints

- WE1 remains the only population and household source.
- WE2 remains the only cohort identity and entertainment-budget source.
- A participation overlay must reference a real WE2 cohort and must not clone demographic or persona data.
- Streaming eligibility, streaming interest, cinema eligibility, and cinema interest remain separate values.
- Streaming-only, cinema-only, dual, and neither household partitions must reconcile exactly.
- Reserved streaming, cinema, other-entertainment, and uncommitted budgets must never exceed the WE2 cohort budget.
- WE2 non-participant households remain explicit and cannot become automatic industry customers.
- WE3 is a neutral shadow layer; current subscribers, revenue, player money, platform allocation, title demand, rights, and box office remain unchanged.
- Results must be deterministic, repairable, directly projectable across 400 years, bounded in save size, and mobile-safe.
- Preserve unrelated working-tree changes and do not commit or push unless the user requests it.

---

### Task 1: Canonical participation and access engine

**Files:**
- Create: `services/worldEconomy/worldAudienceParticipation.ts`
- Modify: `types.ts`
- Create: `scripts/audit-world-audience-we3.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `WorldPopulationState`, `WorldAudienceEconomyState`, and stable WE2 cohort IDs.
- Produces: `createWorldAudienceParticipationState`, `normalizeWorldAudienceParticipationState`, `advanceWorldAudienceParticipationToWeek`, `getWorldAudienceParticipationCountry`, and `getWorldAudienceParticipationSummary`.

- [x] Write an audit that requires the WE3 engine and asserts cohort references, deterministic output, household reconciliation, budget conservation, and separate streaming/cinema eligibility.
- [x] Run `npm run audit:world-audience-we3` and observe the expected missing-engine failure.
- [x] Add compact barrier, cohort-overlay, country, global, snapshot, and state types.
- [x] Implement access, interest, participation partitions, budget envelopes, and barrier selection using only canonical WE1/WE2 inputs.
- [x] Repair malformed, stale, or source-mismatched state deterministically.
- [x] Run the WE3 engine audit until green.

### Task 2: Save migration and weekly progression

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/gameLoop.ts`
- Test: `scripts/audit-world-audience-we3.ts`

**Interfaces:**
- Consumes: the Task 1 normalization function after migrated or advanced WE1 and WE2 state.
- Produces: `Player.world.worldAudienceParticipation`, advanced after `world_audience_economy_done` and before downstream streaming systems.

- [x] Add failing old-save, repeated-migration, and year-wrap assertions.
- [x] Assert that migration preserves player money, subscribers, WE1 population, and WE2 cohorts.
- [x] Bump the save migration version and seed WE3 at the migrated absolute week.
- [x] Add observable `world_audience_participation_start` and `world_audience_participation_done` weekly stages.
- [x] Run WE1, WE2, WE3, save-migration, and week-safety audits until green.

### Task 3: Audience Market read-only projection

**Files:**
- Modify: `services/streamingAudienceMarket.ts`
- Modify: `components/streaming-transplant/StreamingAudienceExperience.tsx`
- Create: `scripts/audit-world-audience-we3-ui.tsx`
- Test: `scripts/audit-world-audience-we3.ts`

**Interfaces:**
- Consumes: canonical WE3 global and country participation summaries.
- Produces: an `industryParticipation` summary plus country participation fields and barrier explanations in the existing Audience Market view model.

- [x] Add failing adapter assertions for canonical global/country totals and immutable reads.
- [x] Add a failing rendered-UI audit for streaming reach, cinema reach, both, neither, and the shadow-mode explanation.
- [x] Project WE3 summaries through the existing Audience Market service without changing its live paying-home, subscriber, revenue, switching, or rival calculations.
- [x] Add concise global and country participation evidence using existing Audience Market visual primitives.
- [x] Run engine and UI audits until green.

### Task 4: Long-run, compatibility, and completion report

**Files:**
- Modify: `scripts/audit-world-audience-we3.ts`
- Create: `docs/superpowers/reports/2026-09-09-world-economy-we3-report.md`
- Modify: `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

**Interfaces:**
- Consumes: completed WE3 state, weekly integration, and presentation adapter.
- Produces: measured completion evidence and the WE4 handoff.

- [x] Assert direct 400-year projection, bounded snapshots and values, stable IDs, deterministic reload, source mismatch repair, strict save-size budget, and practical projection time.
- [x] Assert no live player money, subscriber, revenue, rights, or box-office mutation from migration or Audience Market reads.
- [x] Run WE1, WE2, WE3, WE3 UI, save-migration, week-safety, streaming-weekly-loop, TypeScript, production build, and diff checks.
- [x] Record exact results, authority boundaries, known repository-wide blockers, and the WE4 handoff.
