# World Economy WE5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn WE4 demand into persistent, deterministic weekly customer transitions with distinct paid accounts, shared access, and piracy.

**Architecture:** Add one sparse aggregate customer-state engine after WE4. The engine persists actual country/cohort/platform/plan membership, derives bounded transitions toward WE4 demand, and supplies canonical player movement to the existing streaming weekly economy and presentation adapters. Existing generic churn/acquisition remains only as an ineligible-player fallback.

**Tech Stack:** TypeScript, React, deterministic aggregate simulation, esbuild audit scripts, Vite production build.

**Spec:** `docs/superpowers/specs/2026-09-09-world-economy-we5-design.md`

## Global Constraints

- Do not create individual consumer records.
- WE1-WE4 remain canonical for population, cohorts, participation, budgets, and desired plan allocation.
- Subscription revenue comes only from actual paid accounts.
- External sharing and piracy must remain separate from paid accounts and revenue.
- Use stable IDs, absolute game weeks, deterministic calculations, bounded history, and safe migration.
- Preserve old-save cash and subscriber counts during migration.
- Do not duplicate existing finance, weekly-loop, analytics, leadership, research, localization, catalogue, rights, marketing, infrastructure, or crisis systems.
- Do not commit or push unless the user explicitly requests it.

---

### Task 1: Canonical sparse customer state and transition engine

**Files:**
- Modify: `types.ts`
- Create: `services/worldEconomy/worldStreamingCustomers.ts`
- Create: `scripts/audit-world-streaming-we5.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `getWorldStreamingOffers(player, absoluteWeek)`, `normalizeWorldStreamingCompetitionState(input, player, absoluteWeek)`, WE1-WE3 cohort state.
- Produces: `createWorldStreamingCustomerState(player, absoluteWeek)`, `normalizeWorldStreamingCustomerState(input, player, absoluteWeek)`, `advanceWorldStreamingCustomersToWeek(input, player, absoluteWeek)`, and `getWorldStreamingPlayerCustomerOutcome(state)`.

- [x] **Step 1: Write the failing state-contract audit**

Add real-engine assertions which require a WE5 state containing sparse country/cohort/platform/plan cells, exact player plan IDs, distinct actual paid accounts, player/global summaries, bounded movements, and a source fingerprint. Hand-check reconciliation literals for a small synthetic transition fixture.

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:world-streaming-we5`

Expected: compilation fails because `worldStreamingCustomers.ts` and the WE5 types do not exist.

- [x] **Step 3: Add the WE5 domain types and minimal engine**

Define:

```ts
export type WorldStreamingCustomerMovementKind =
  | 'JOIN' | 'CANCEL' | 'REACTIVATE' | 'UPGRADE' | 'DOWNGRADE'
  | 'SWITCH' | 'ADD_SECONDARY' | 'DROP_SECONDARY';

export type WorldStreamingCustomerReasonId =
  | 'PRICE' | 'PLAN_VALUE' | 'CATALOGUE' | 'RELEASE' | 'LOCALIZATION'
  | 'RELIABILITY' | 'MARKETING' | 'COMPETITOR' | 'PROMO_EXPIRY'
  | 'ROTATION' | 'ECONOMY' | 'SHARING_POLICY' | 'PIRACY_ACCESS' | 'OTHER';

export type StreamingSharingPosture = 'REACH_FIRST' | 'BALANCED' | 'HOUSEHOLD_ONLY';
export type StreamingEnforcementInvestment = 'LIGHT' | 'STANDARD' | 'AGGRESSIVE';
```

Add sparse plan cells, bounded lapsed cells, linked movements, cohort/country/platform/global summaries, policy, snapshot, and `WorldStreamingCustomerState`. Add `worldStreamingCustomers?: WorldStreamingCustomerState` to `WorldState`.

Implement deterministic integer distribution from WE4 target allocations. On first seed, preserve the player's existing subscriber total and distribute it across eligible WE4 country/plan weights. For AI platforms, seed from WE4 target allocations because WE7 has not yet made their finance authoritative.

- [x] **Step 4: Implement bounded weekly transitions**

For each sparse cohort cell, retain most accounts and move only a bounded share toward current WE4 demand. Reconcile joins, cancellations, reactivations, plan changes, and linked platform switches. Store primary reason codes rather than raw utility scores. Keep one plan per platform per cohort while allowing multiple platforms.

- [x] **Step 5: Run the audit and verify GREEN**

Run: `npm run audit:world-streaming-we5`

Expected: state shape, determinism, sparse allocation, transition, plan fidelity, and reconciliation assertions pass.

---

### Task 2: Sharing, piracy, policies, and accounting separation

**Files:**
- Modify: `services/worldEconomy/worldStreamingCustomers.ts`
- Modify: `scripts/audit-world-streaming-we5.ts`
- Modify: `types.ts`
- Modify: `services/ownedStreamingPlatform.ts`

**Interfaces:**
- Consumes: WE2 sharing/piracy tendencies, WE3 access/barriers, plan feature IDs, player leadership strategy, streaming research/capability state.
- Produces: distinct `externalSharedHouseholds`, `sharedActiveViewers`, `piracyReach`, `accessLoadAccounts`, and saved player access policy.

- [x] **Step 1: Add failing policy and accounting assertions**

Require that a high-sharing cohort creates external shared access without increasing paid accounts or subscription revenue; piracy creates reach but zero direct revenue; stricter enforcement reduces sharing but can increase cancellation pressure; and the same-week calculation is deterministic.

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:world-streaming-we5`

Expected: sharing, piracy, and policy fields or behavior are missing.

- [x] **Step 3: Implement aggregate access paths**

Calculate sharing from cohort tendency, price pressure, household structure, screens/features, and posture. Calculate piracy from tendency, affordability, payment/access barriers, territorial/localization gaps, and enforcement. Clamp both to canonical reachable cohort populations. Do not add either quantity to paid accounts or subscription revenue.

- [x] **Step 4: Persist and normalize the platform policy**

Add `audienceAccessPolicy` to the owned platform with automatic defaults derived from leadership strategy. Normalize malformed or legacy values to `BALANCED` and `STANDARD`. Provide an idempotent action that updates only this global policy.

- [x] **Step 5: Run the audit and verify GREEN**

Run: `npm run audit:world-streaming-we5`

Expected: sharing/piracy separation, enforcement trade-offs, policy normalization, and deterministic behavior pass.

---

### Task 3: Save migration and weekly ordering

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/gameLoop.ts`
- Modify: `scripts/audit-save-migration.ts`
- Modify: `scripts/audit-world-streaming-we5.ts`

**Interfaces:**
- Consumes: final migrated WE1-WE4 state and current owned-platform subscriber count.
- Produces: migrated WE5 state before owned streaming weekly economics.

- [x] **Step 1: Add failing migration and order assertions**

Require a legacy fixture to gain valid WE5 state without changing cash, treasury, or subscriber count. Require the real game loop to advance WE4, then WE5, then `processOwnedStreamingPlatformWeek`.

- [x] **Step 2: Run focused audits and verify RED**

Run: `npm run audit:world-streaming-we5 && npm run audit:save-migration`

Expected: migration or weekly ordering assertion fails because WE5 is not connected.

- [x] **Step 3: Connect migration and weekly progression**

Bump the save migration version. Normalize WE5 after WE4. In the game loop, advance WE5 immediately after WE4 and before owned-platform weekly processing. Emit bounded stage markers for diagnostics.

- [x] **Step 4: Run focused audits and verify GREEN**

Run: `npm run audit:world-streaming-we5 && npm run audit:save-migration`

Expected: legacy preservation, idempotence, deterministic repair, and stage ordering pass.

---

### Task 4: Replace generic player movement with canonical WE5 output

**Files:**
- Modify: `services/streamingWeeklyLoop.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Modify: `types.ts`
- Modify: `scripts/audit-streaming-weekly-loop-phase10.ts`
- Modify: `scripts/audit-world-streaming-we5.ts`

**Interfaces:**
- Consumes: `getWorldStreamingPlayerCustomerOutcome(player.world.worldStreamingCustomers)`.
- Produces: owned-platform subscribers, waterfall, actual plan mix, exact paid revenue input, access-load evidence, switching, sharing, piracy, and causal drivers.

- [x] **Step 1: Add a failing real weekly-loop audit**

Require `start + joins + reactivations - cancellations === end`, exact WE5 ending accounts, exact WE5 plan-weighted monthly revenue input, no sharing/piracy subscription revenue, and legacy fallback when no eligible player offer exists.

- [x] **Step 2: Run the weekly-loop audit and verify RED**

Run: `npm run audit:streaming-weekly-loop-phase10`

Expected: weekly operations do not yet expose or consume the WE5 canonical outcome.

- [x] **Step 3: Integrate WE5 into the existing weekly loop**

Use WE5 movements instead of the generic churn/acquisition path when an eligible player outcome exists. Preserve all current product, campaign, content, rights, localization, research, infrastructure, crisis, acquisition, governance, treasury, attribution, and counterfactual calculations. Keep legacy movement only when WE5 cannot produce a player outcome.

- [x] **Step 4: Persist bounded weekly evidence**

Add normalized optional fields for upgrades, downgrades, switch-ins, switch-outs, external shared households, piracy reach, access-load accounts, actual plan allocations, and dominant transition reasons. Keep existing snapshot limits.

- [x] **Step 5: Run weekly and WE5 audits and verify GREEN**

Run: `npm run audit:world-streaming-we5 && npm run audit:streaming-weekly-loop-phase10 && npm run audit:week-processing-save-safety`

Expected: all focused engine and real weekly integration checks pass.

---

### Task 5: Audience Market, Analytics, CEO report, and policy controls

**Files:**
- Modify: `services/streamingAudienceMarket.ts`
- Modify: `services/streamingAnalytics.ts`
- Modify: `components/streaming-transplant/StreamingAudienceExperience.tsx`
- Modify: `components/StreamingAnalyticsCenter.tsx`
- Modify: `components/StreamingWeeklyCeoLoop.tsx`
- Modify: `components/StreamingPlatformHQ.tsx`
- Create: `scripts/audit-world-streaming-we5-ui.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: canonical WE5 state and owned-platform weekly evidence.
- Produces: read-only customer/access projections plus two global policy controls wired through the existing owned-platform update path.

- [x] **Step 1: Add a failing rendered UI audit**

Render real Audience Market, Analytics, and weekly report models. Require paying accounts, paying households, shared households, piracy reach, plan movement, switching, and reasons to appear without raw utility scores or cohort micromanagement.

- [x] **Step 2: Run the UI audit and verify RED**

Run: `npm run audit:world-streaming-we5-ui`

Expected: canonical WE5 evidence and policy controls are absent.

- [x] **Step 3: Project WE5 through existing view models**

Replace derived switching and reconstructed retention when WE5 evidence exists. Preserve existing fallbacks for pre-launch and legacy state. Keep copy concise and distinguish paid accounts from reach.

- [x] **Step 4: Add compact global policy controls**

Expose sharing posture and enforcement investment in the existing Audience/operations context. Default to leadership-driven automatic values and avoid country or cohort controls. Use existing update-handler patterns; do not create a new management page.

- [x] **Step 5: Run UI and integration audits and verify GREEN**

Run: `npm run audit:world-streaming-we5-ui && npm run audit:world-streaming-we5 && npm run audit:streaming-weekly-loop-phase10`

Expected: canonical evidence renders, policies update, no hidden utility score appears, and existing weekly behavior remains reconciled.

---

### Task 6: Long-run safety, regression gate, and handoff

**Files:**
- Modify: `scripts/audit-world-streaming-we5.ts`
- Modify: `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`
- Create: `docs/superpowers/reports/2026-09-09-world-economy-we5-report.md`

**Interfaces:**
- Consumes: completed WE5 engine, migration, weekly, finance, and presentation integration.
- Produces: deterministic long-run evidence and a precise WE6 handoff.

- [x] **Step 1: Add 400-year and corruption tests**

Run a deterministic 20,800-week projection with repeated normalization/reload checkpoints. Assert bounded snapshots and movements, finite non-negative quantities, revenue separation, reconciliation, deterministic reload, and an explicit serialized-size ceiling.

- [x] **Step 2: Run the full focused regression gate**

Run: `npm run audit:world-population-we1 && npm run audit:world-audience-we2 && npm run audit:world-audience-we3 && npm run audit:world-streaming-we4 && npm run audit:world-streaming-we5 && npm run audit:world-streaming-we5-ui && npm run audit:streaming-weekly-loop-phase10 && npm run audit:save-migration && npm run audit:week-processing-save-safety`

Expected: every focused audit passes.

- [x] **Step 3: Run repository verification**

Run: `npm run lint`

Expected: no WE5 TypeScript errors; separately record unrelated existing worktree blockers if the repository-wide command remains non-zero.

Run: `npm run build`

Expected: production build exits zero.

Run: `git diff --check`

Expected: exits zero.

- [x] **Step 4: Update roadmap and completion report**

Mark WE5 delivered, set WE6 as the next phase, record measured counts/performance/save size, list exact verification results, and state any unrelated repository diagnostics without claiming they were fixed.
