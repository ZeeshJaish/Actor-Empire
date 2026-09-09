# World Economy WE2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Divide every WE1 country into deterministic sparse household cohorts with finite entertainment budgets, while keeping live subscriber and revenue economics unchanged.

**Architecture:** Add a separate `WorldAudienceEconomyState` derived exclusively from canonical WE1 country state. Each country stores a small set of commercial cohorts plus explicit non-participant pools; country and global totals reconcile exactly. Save migration and the existing weekly loop persist the state, while Audience Market reads it through a presentation adapter in shadow mode.

**Tech Stack:** TypeScript, React, deterministic aggregate simulation, existing save migration and weekly-loop services, esbuild audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

## Global Constraints

- WE1 remains the only population and household source.
- No individual-person or individual-household records.
- Cohorts and non-participant pools must exactly reconcile to every country.
- Entertainment budgets are capacity only; WE2 does not allocate spending to streaming, cinema, piracy, rentals, or products.
- Existing player money, subscribers, pricing, revenue, rights, catalogue, and AI platform economics remain unchanged.
- Results must be deterministic, directly projectable across 400 years, bounded in save size, and mobile-safe.
- Preserve unrelated working-tree changes and do not commit or push unless the user requests it.

---

### Task 1: Canonical cohort and budget engine

**Files:**
- Create: `services/worldEconomy/worldAudienceCohorts.ts`
- Modify: `types.ts`
- Test: `scripts/audit-world-audience-we2.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `WorldPopulationState` and `WorldPopulationCountryState` from WE1.
- Produces: `createWorldAudienceEconomyState`, `normalizeWorldAudienceEconomyState`, `advanceWorldAudienceEconomyToWeek`, `getWorldAudienceCountry`, `getWorldAudienceSummary`, and `getWorldAudiencePersonaShares`.

- [x] Write an audit that requires the WE2 module and asserts deterministic country/global reconciliation.
- [x] Run `npm run audit:world-audience-we2` and observe failure because the WE2 module is absent.
- [x] Add compact cohort, country, global, snapshot, and state types without changing WE1 population ownership.
- [x] Implement sparse income-aware cohorts, non-participant pools, persona affinities, price sensitivity, legal/sharing tendencies, and finite monthly entertainment budgets.
- [x] Make malformed or stale state regenerate deterministically from the supplied WE1 state.
- [x] Run the WE2 audit and make the engine assertions pass.

### Task 2: Save migration and weekly progression

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/gameLoop.ts`
- Test: `scripts/audit-world-audience-we2.ts`

**Interfaces:**
- Consumes: the Task 1 normalization and advancement functions.
- Produces: `Player.world.worldAudienceEconomy` migrated at the current absolute week and advanced after WE1 population in the normal weekly loop.

- [x] Add failing migration assertions for old saves, repeat migration, and preservation of money and subscribers.
- [x] Add a failing year-wrap progression assertion proving WE2 follows the normalized game clock and WE1 totals.
- [x] Bump the save migration version and initialize `worldAudienceEconomy` from migrated WE1 population.
- [x] Advance WE2 immediately after `world_population_done`, with observable loop-stage markers.
- [x] Run the WE2, save-migration, and week-safety audits until green.

### Task 3: Audience Market presentation adapter

**Files:**
- Modify: `services/streamingAudienceMarket.ts`
- Modify: `components/streaming-transplant/StreamingAudienceExperience.tsx`
- Test: `scripts/audit-world-audience-we2.ts`

**Interfaces:**
- Consumes: WE2 persona shares, commercial households, non-participant households, and monthly budget values.
- Produces: country household-economy summaries and dynamic global persona cards without mutating the save or live platform economics.

- [x] Add failing assertions that fixed global persona shares are replaced by WE2-derived shares and that an Audience Market read is immutable.
- [x] Add failing assertions that opening Audience Market does not alter subscribers or player money.
- [x] Feed canonical WE2 country and persona summaries into the current Audience Market view model.
- [x] Add compact read-only budget and non-participant evidence to the existing People and country-detail surfaces.
- [x] Run the WE2 audit and browser-target TypeScript/build verification.

### Task 4: Long-run and compatibility audit

**Files:**
- Modify: `scripts/audit-world-audience-we2.ts`
- Create: `docs/superpowers/reports/2026-09-09-world-economy-we2-report.md`
- Modify: `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

**Interfaces:**
- Consumes: the completed WE2 state and adapters.
- Produces: measurable completion evidence and the WE3 handoff.

- [x] Assert 400-year direct projection, bounded snapshots, bounded values, stable IDs, and deterministic reload behavior.
- [x] Assert a strict incremental save-size budget and a practical long-range projection budget.
- [x] Run `npm run audit:world-population-we1`, `npm run audit:world-audience-we2`, `npm run audit:save-migration`, `npm run audit:week-processing-save-safety`, `npm run audit:streaming-weekly-loop-phase10`, `npm run lint`, `npm run build`, and `git diff --check`.
- [x] Record exact results, shadow-mode authority boundaries, and the WE3 handoff in the completion report.
