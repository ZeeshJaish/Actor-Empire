# Streaming Billing-Path Cohorts S4.1 Implementation Plan

> **For agentic workers:** Execute inline in the current user-owned worktree. Do not dispatch subagents, create a worktree, commit, or push; those generic skill defaults conflict with the user's current inline workflow and extensive dirty work.

**Goal:** Make monthly and annual buyers independently affordable and account for them consistently through launch forecasting and weekly saves.

**Architecture:** Derive two canonical path prices per offer. Partition each existing audience cohort into two billing populations before competition allocation, and aggregate both paths at public country/plan boundaries. Persist path identity at customer-cohort level and migrate version-1 customer counts without replaying a week.

**Tech Stack:** TypeScript, React, esbuild-based audit scripts, local save migration.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-billing-cohorts-design.md`

## Global constraints

- Keep 33% annual / 67% monthly, discount caps, utility coefficients, and monthly-equivalent annual accrual unchanged.
- Do not change historical treasury cash, old saved subscriber counts, or other dirty work.
- Use a failing behavioral audit before each production change and run it green afterward.
- Report balance before/after and all inherited audit failures.

---

### Task 1: Price paths and affordability allocation

**Files:** `services/streamingPricingEconomy.ts`, `services/worldEconomy/worldStreamingOffers.ts`, `services/worldEconomy/worldStreamingCompetition.ts`, `types.ts`, `scripts/audit-streaming-billing-cohorts.ts`.

**Interfaces:** Introduce `StreamingBillingPath = 'MONTHLY' | 'ANNUAL'`. Each `WorldStreamingPlanOffer` exposes `monthlyBillingPrice` and `annualBillingMonthlyPrice`. `allocateWorldStreamingCohort` still accepts `(countryId, cohort, participation, offers)` and returns path-tagged allocations. Public plan rows include path account counts.

- [x] Write an audit fixture with a $9 budget, $17.99 plan, 50% targeted monthly introduction, no annual discount. Assert monthly buyers join, annual buyers do not, counts partition exactly, and spend stays within budget.
- [x] Run the audit and observe failure because only blended affordability exists.
- [x] Add path-price derivation and partitioned allocation, preserving the current utility and budget algorithms inside each partition.
- [x] Run the audit green; run `npm run audit:streaming-pricing-world` and capture intentional changed expectations for Task 3.

### Task 2: Durable weekly customers and old saves

**Files:** `services/worldEconomy/worldStreamingCustomers.ts`, `types.ts`, `scripts/audit-streaming-billing-cohorts.ts`.

**Interfaces:** `WorldStreamingCustomerCohortState.billingPath` is required in schema version 2. Old version-1 input is migrated by `normalizeWorldStreamingCustomerState` without movement replay, preserving summed accounts and tenure. The function stays the sole save-migration entry point.

- [x] Add an audit that creates a real customer state, downgrades its serialized shape to version 1, then normalizes; assert exact accounts/tenure, both path identities, no new movements/snapshot, unchanged treasury, and idempotent second normalization.
- [x] Run the audit red; verify it fails on old-state replacement or missing billing paths.
- [x] Emit one desired/saved customer cohort per path, match previous rows by `(cohortId, billingPath)`, and migrate legacy cells deterministically. Keep movement accounting within each path.
- [x] Run the audit green and run the WE5/customer audits; record inherited source-text failures separately.

### Task 3: First-year forecast and player explanation

**Files:** `services/worldEconomy/worldStreamingPricingForecast.ts`, `components/studio-finance/components/launch/StepPricing.tsx`, `scripts/audit-streaming-pricing-world-integration.tsx`, `scripts/audit-streaming-billing-cohorts.ts`.

**Interfaces:** First-year revenue consumes monthly/annual counts on canonical plan allocations. Opening plan cards retain blended price but explain exact path affordability and counts.

- [x] Add a first-year fixture asserting annual accounts get twelve annual-equivalent months and monthly accounts get three intro plus nine list-price months; an untargeted plan has no intro reduction.
- [x] Run red against the current path-agnostic first-year calculation.
- [x] Implement path-specific first-year revenue and price-path explanation; update old S4 assertions that assumed every weekly cell had the blended price.
- [x] Run pricing, Build-demand, and marketing audits green.

### Task 4: Whole-change verification and report

**Files:** `docs/superpowers/reports/2026-09-23-streaming-billing-cohorts-s4-1.md`, relevant audit files only if they reveal a real new defect.

- [x] Run focused billing, pricing, customer, Build, save-migration/compaction, TypeScript (8 GB heap), production build, and `git diff --check` checks.
- [x] Compare before/after subscriber and revenue fixtures. Audit one old save's totals and same-week reload. Distinguish new failures from the inherited WE4–WE6 `const` source-text assertion.
- [x] Write the report with changed behavior, balance effect, commands/results, visual checks performed or not performed, and remaining failures. Do not commit or push.
