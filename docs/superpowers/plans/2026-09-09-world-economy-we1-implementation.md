# World Economy WE1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one deterministic, save-safe, country-level population registry and progression state that existing streaming reports and future industry adapters can read without changing current subscriber economics.

**Architecture:** Static country definitions provide stable IDs, names, regions, approximate population weights, development profiles, and language fallbacks. A focused world-population service normalizes and advances compact aggregate country state from absolute game weeks, reconciles country/region/global totals, and exposes read-only selectors. WE1 runs in shadow mode: it is stored in `WorldState`, migrated for old saves, advanced after the game clock is normalized, and used by the audience-market population projection without replacing live subscriber calculations.

**Tech Stack:** TypeScript, React game `WorldState`, deterministic service functions, esbuild audit scripts, Vite production build.

**Spec:** `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

## Global Constraints

- Population is the source of demand; industries may read it but may not independently mutate it.
- Do not create individual-person records.
- Streaming subscriptions and cinema attendance remain separate later adapter decisions.
- WE1 must not change existing player money, subscribers, rights, projects, or platform economics.
- Country, region, and global totals must reconcile after initialization, migration, progression, and reload.
- Old saves initialize directly at their current absolute week without replaying historical weeks.
- Results must be deterministic and safe for long-running mobile saves.
- Preserve unrelated working-tree changes and do not commit unless explicitly requested.

---

### Task 1: Define the canonical country registry and world-population types

**Files:**
- Create: `services/worldEconomy/worldCountryRegistry.ts`
- Modify: `types.ts`
- Create: `scripts/audit-world-population-we1.ts`

**Interfaces:**
- Produces: `WORLD_COUNTRY_DEFINITIONS`, `WORLD_COUNTRY_DEFINITIONS_BY_ID`, `WORLD_POPULATION_BASELINE`, `WorldPopulationState`, `WorldPopulationCountryState`, `WorldPopulationRegionSummary`, and `WorldPopulationGlobalSummary`.
- Consumes: existing `StreamingDayOneRegionId` semantics without importing streaming presentation state into the world domain.

- [ ] **Step 1: Write the failing registry audit**

Create assertions that the registry has unique stable country IDs, includes every existing streaming launch country, assigns every country to one of six regions, has positive population weights, and reconciles its normalized baseline to `8_120_000_000` people.

- [ ] **Step 2: Run the audit and verify RED**

Run: `npx esbuild scripts/audit-world-population-we1.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-world-population-we1.mjs && node /tmp/audit-world-population-we1.mjs`

Expected: FAIL because the registry module and world-population types do not exist.

- [ ] **Step 3: Add focused types and static definitions**

Add compact aggregate types with six age bands, six income bands, access percentages, macro indices, regional/global summaries, schema version, initialization week, last-processed week, and bounded snapshots. Add the optional `worldPopulation` field to `WorldState`.

Implement country definitions with stable two-letter IDs, names, regions, approximate population weights, development profiles, and language fallbacks. Keep detailed existing streaming markets authored; use stable regional/profile derivation for the rest.

- [ ] **Step 4: Run the registry audit and verify GREEN**

Run the Task 1 audit command and expect all registry/type assertions to pass.

---

### Task 2: Implement deterministic initialization, normalization, progression, and selectors

**Files:**
- Create: `services/worldEconomy/worldPopulation.ts`
- Modify: `scripts/audit-world-population-we1.ts`

**Interfaces:**
- Produces: `createWorldPopulationState(absoluteWeek)`, `normalizeWorldPopulationState(input, absoluteWeek)`, `advanceWorldPopulationToWeek(input, absoluteWeek)`, `getWorldPopulationCountry(state, countryId)`, and `getWorldPopulationSummary(state)`.
- Consumes: registry definitions and the aggregate types from Task 1.

- [ ] **Step 1: Extend the audit with failing engine cases**

Assert deterministic same-week initialization, country/region/global reconciliation, bounded age/income/access distributions, idempotent same-week advancement, direct long-range advancement, population peaks/declines, snapshot bounds, and normalization of malformed inputs.

- [ ] **Step 2: Run the audit and verify RED**

Expected: FAIL because the engine exports do not exist.

- [ ] **Step 3: Implement the minimum deterministic engine**

Use a fixed epoch aligned to a new player's first absolute week. Normalize the static country population weights to the 8.12-billion baseline. Derive households, age bands, income bands, urbanization, connectivity, devices, payment access, cinema access, inflation pressure, unemployment pressure, consumer confidence, and purchasing power from country development and region profiles.

Advance demographics in annual steps and macro/access state in bounded periodic steps, but jump directly across missing years. Use demographic transition curves that slow, peak, or decline rather than unbounded compound growth. Rebuild summaries from country state and bound snapshot history.

- [ ] **Step 4: Run the audit and verify GREEN**

Expected: initialization, reconciliation, malformed-input recovery, and long-run assertions pass.

---

### Task 3: Connect initialization, save migration, and weekly progression

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/gameLoop.ts`
- Modify: `scripts/audit-world-population-we1.ts`

**Interfaces:**
- Consumes: `normalizeWorldPopulationState` during migration and `advanceWorldPopulationToWeek` during weekly progression.
- Produces: a canonical `player.world.worldPopulation` on new, old, and malformed saves.

- [ ] **Step 1: Add failing migration and game-loop integration assertions**

Assert that an old save gains canonical population at its current absolute week without changing money or owned-streaming subscribers, repeated migration is identical, and one processed week advances `lastProcessedAbsoluteWeek` exactly once after week/year normalization.

- [ ] **Step 2: Run the audit and verify RED**

Expected: FAIL because migration and the game loop do not attach or advance the state.

- [ ] **Step 3: Integrate migration and weekly advancement**

Normalize population in the existing `migratePlayerSave` world reconstruction. Advance it in `processGameWeek` after `currentWeek` has wrapped from 53 to 1 and `age` has advanced, but before streaming rights/platform systems consume country state. Emit a diagnostic stage without adding player-facing weekly spam.

- [ ] **Step 4: Run the audit and verify GREEN**

Expected: old-save invariance, idempotency, year-wrap, and one-week progression assertions pass.

---

### Task 4: Project canonical population into the existing audience report

**Files:**
- Modify: `services/streamingAudienceMarket.ts`
- Modify: `scripts/audit-world-population-we1.ts`

**Interfaces:**
- Consumes: `getWorldPopulationCountry` and `getWorldPopulationSummary`.
- Preserves: the existing `StreamingAudienceMarketView` API and current subscriber/adoption presentation calculations where WE1 does not yet own behaviour.

- [ ] **Step 1: Add failing projection assertions**

Assert that the Audience Market global population equals canonical world population, listed country estimates come from matching canonical country records, and opening the report does not mutate saved state.

- [ ] **Step 2: Run the audit and verify RED**

Expected: FAIL because the report still creates an independent global population curve.

- [ ] **Step 3: Replace independent population estimates with read-only selectors**

Read the canonical global and country population values when present. Retain a deterministic normalized fallback only for unmigrated callers and tests. Do not move subscriber, plan, churn, sharing, piracy, or viewing authority in WE1.

- [ ] **Step 4: Run the audit and verify GREEN**

Expected: the canonical projection and read-only assertions pass.

---

### Task 5: Register audits, verify regressions, and record completion

**Files:**
- Modify: `package.json`
- Create: `docs/superpowers/reports/2026-09-09-world-economy-we1-report.md`

**Interfaces:**
- Produces: `npm run audit:world-population-we1` and a WE1 evidence report.
- Consumes: all WE1 modules and existing save/week/streaming audits.

- [ ] **Step 1: Add the package audit command**

Register the esbuild-and-node command used throughout the plan as `audit:world-population-we1`.

- [ ] **Step 2: Run focused and regression verification**

Run:

```bash
npm run audit:world-population-we1
npm run audit:save-migration
npm run audit:week-processing-save-safety
npm run audit:streaming-weekly-loop-phase10
npm run build
git diff --check
```

Expected: all commands pass. If an unrelated pre-existing failure appears, record exact evidence and keep WE1 verification independently green.

- [ ] **Step 3: Inspect save-size and performance evidence**

The WE1 audit must report serialized population-state size, initialization time, direct 400-year advancement time, country count, and final reconciliation. Reject individual histories or unbounded snapshots.

- [ ] **Step 4: Write the completion report**

Record files changed, architecture delivered, fresh commands and results, shadow-mode limitations, compatibility with existing subscriber economics, and the WE2 handoff.
