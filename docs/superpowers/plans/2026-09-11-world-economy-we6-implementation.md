# World Economy WE6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert WE5 audience access into canonical title-level viewing, engagement, advertising, transaction, and attribution results.

**Architecture:** Add a deterministic sparse `worldStreamingViewing` engine between WE5 and the owned streaming weekly settlement. Reuse all canonical catalogue, rights, release, localization, pricing, growth, analytics, and finance systems; retain the old flat title allocator only as a legacy fallback.

**Tech Stack:** TypeScript, React, existing deterministic game services, esbuild audit scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-09-11-world-economy-we6-design.md`

## Global Constraints

- Work inline; do not dispatch subagents.
- Preserve unrelated dirty-worktree changes.
- Do not commit or push without a separate explicit request.
- Use test-first RED → GREEN for every production behavior.
- Do not create subscription revenue outside WE5.
- Do not simulate individual viewers or full AI-platform viewing in WE6.
- Same-week processing must be immutable and deterministic.

---

### Task 1: Canonical WE6 state and seed

**Files:**
- Create: `services/worldEconomy/worldStreamingViewing.ts`
- Modify: `types.ts`
- Test: `scripts/audit-world-streaming-we6.ts`

**Interfaces:**
- Consumes: `WorldStreamingCustomerState`, owned platform state, absolute week.
- Produces: `createWorldStreamingViewingState`, `normalizeWorldStreamingViewingState`, `advanceWorldStreamingViewingToWeek`, `getWorldStreamingPlayerViewingOutcome`.

- [x] **Step 1: Write the failing state-contract audit**

Assert a valid versioned state, exact absolute week, stable player platform ID, bounded snapshots, finite global totals, and same-week object identity.

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:world-streaming-we6`
Expected: compilation fails because WE6 types/module do not exist.

- [x] **Step 3: Add WE6 types and minimal deterministic state**

Define sparse country/title/platform summaries, discovery, access-path, revenue, snapshot, and state interfaces. Add optional `worldStreamingViewing` to `WorldState` and implement safe seed/normalization.

- [x] **Step 4: Run the audit and verify GREEN**

Run: `npm run audit:world-streaming-we6`
Expected: state contract and idempotency assertions pass.

### Task 2: Rights-safe cohort demand and engagement

**Files:**
- Modify: `services/worldEconomy/worldStreamingViewing.ts`
- Test: `scripts/audit-world-streaming-we6.ts`

**Interfaces:**
- Consumes: WE1–WE5 country/cohort/customer cells, `getStreamingContentAvailability`, slate/catalogue/project/release/localization signals.
- Produces: reconciled title starts, viewing accounts, viewers, hours, completion, repeats, paid/shared/pirated paths, country totals, and unmet demand.

- [x] **Step 1: Add failing availability and allocation cases**

Use hand-checked fixtures proving an unavailable country receives zero legitimate views, total title viewing does not exceed the access pool, shared and piracy paths remain distinct, and a culturally aligned local title can beat a weak imported title.

- [x] **Step 2: Run the audit and verify RED**

Expected: allocation/availability assertions fail against the minimal seed.

- [x] **Step 3: Implement eligibility, scoring, and integer allocation**

Filter by live status and covered countries. Score quality, genre, language/localization, franchise, marketing, freshness, release pattern, recommendations, reliability, and deterministic variance. Preserve an explicit no-watch/unmet-demand share.

- [x] **Step 4: Implement engagement and discovery outputs**

Calculate hours, completion, repeat, abandonment, and homepage/recommendation/search/direct/marketing/external discovery shares with exact integer/percentage reconciliation.

- [x] **Step 5: Run the audit and verify GREEN**

Run: `npm run audit:world-streaming-we6`

### Task 3: Canonical commercial activity and attribution

**Files:**
- Modify: `services/worldEconomy/worldStreamingViewing.ts`
- Test: `scripts/audit-world-streaming-we6.ts`

**Interfaces:**
- Consumes: WE5 paid plan cells/revenue and owned pricing streams/settings.
- Produces: subscription attribution, ad impressions/revenue, premium/rental/purchase transactions/revenue, sponsorship exposure/revenue, piracy/lost-transaction evidence.

- [x] **Step 1: Add failing revenue invariants**

Assert subscription attribution equals but never exceeds canonical WE5 subscription revenue; sharing/piracy create no subscription cash; disabled commercial streams produce zero; ad impressions require ad-eligible viewing; transaction counts respect access, price, and title eligibility; sponsorship revenue is capped.

- [x] **Step 2: Run the audit and verify RED**

Expected: commercial outputs are absent.

- [x] **Step 3: Implement revenue allocation**

Attribute WE5 revenue by engagement/retention value. Calculate ads from eligible hours, ad load, fill, and CPM. Calculate premium/rental/purchase transactions from eligible demand and affordability. Calculate earned sponsorship from delivered exposure.

- [x] **Step 4: Run the audit and verify GREEN**

Run: `npm run audit:world-streaming-we6`

### Task 4: Save migration and weekly settlement integration

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/gameLoop.ts`
- Modify: `services/streamingWeeklyLoop.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Modify: `types.ts`
- Test: `scripts/audit-world-streaming-we6.ts`
- Test: `scripts/audit-streaming-weekly-loop-phase10.ts`
- Test: `scripts/audit-save-migration.ts`
- Test: `scripts/audit-week-processing-save-safety.ts`

**Interfaces:**
- Consumes: committed WE6 player outcome for the current absolute week.
- Produces: canonical title performance and non-subscription revenue inside `OwnedStreamingWeeklyOperations`.

- [x] **Step 1: Add failing migration/order/finance tests**

Require migration to preserve cash/subscribers and seed WE6; require game-loop order WE5 → WE6 → owned settlement; require weekly operations to use exact WE6 title totals and commercial revenue without duplicating subscription revenue.

- [x] **Step 2: Run the focused audits and verify RED**

Run: `npm run audit:world-streaming-we6 && npm run audit:streaming-weekly-loop-phase10 && npm run audit:save-migration && npm run audit:week-processing-save-safety`

- [x] **Step 3: Integrate migration and progression**

Bump save/owned-streaming schema versions only where required. Normalize WE6 after WE5, advance it before owned settlement, add diagnostic stage markers, and preserve immutable same-week outcomes.

- [x] **Step 4: Replace the flat title allocator when WE6 exists**

Map canonical WE6 title records into the existing title-performance contract, add explicit commercial evidence, include commercial cash in weekly revenue exactly once, and retain the old allocator only for legacy/no-outcome cases.

- [x] **Step 5: Run the focused audits and verify GREEN**

Run the four commands from Step 2 and require exit code 0.

### Task 5: Player-facing projections

**Files:**
- Modify: `services/streamingTitleAnalytics.ts`
- Modify: `services/streamingAnalytics.ts`
- Modify: `components/StreamingAnalyticsCenter.tsx`
- Modify: `components/StreamingWeeklyCeoLoop.tsx`
- Modify: relevant existing Content Desk/title dossier presentation files only where canonical fields are displayed.
- Test: `scripts/audit-world-streaming-we6-ui.tsx`

**Interfaces:**
- Consumes: WE6 title and platform summaries plus existing weekly title history.
- Produces: consistent Content Desk, Title Dossier, Analytics Center, and CEO report facts.

- [x] **Step 1: Add a failing real-render audit**

Render canonical WE6 fixtures and assert player-readable watch hours, completion, repeat, top country, acquisition/retention value, advertising/transaction revenue, piracy, unmet demand, and no duplicate subscription-cash label.

- [x] **Step 2: Run the UI audit and verify RED**

Run: `npm run audit:world-streaming-we6-ui`

- [x] **Step 3: Extend existing selectors and surfaces**

Project one canonical record into every surface, keep copy concise, distinguish cash from attribution, and avoid cohort controls.

- [x] **Step 4: Run the UI audit and verify GREEN**

Run: `npm run audit:world-streaming-we6-ui`

### Task 6: Recovery, long-run validation, and roadmap handoff

**Files:**
- Modify: `scripts/audit-world-streaming-we6.ts`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`
- Create: `docs/superpowers/reports/2026-09-11-world-economy-we6-report.md`

**Interfaces:**
- Consumes: completed WE6 engine/integration.
- Produces: corruption recovery, 400-year evidence, final verification report, and WE7 handoff.

- [x] **Step 1: Add failing malformed/reload/long-run cases**

Require malformed numeric/cell recovery, deterministic JSON reloads, bounded snapshots, finite totals, exact reconciliation, and 400 annual checkpoints covering 20,800 game weeks.

- [x] **Step 2: Run and verify RED**

Run: `npm run audit:world-streaming-we6`

- [x] **Step 3: Implement bounded recovery/history behavior**

Normalize invalid cells, cap WE6 snapshots at 52, avoid duplicate title history, and preserve material existing title telemetry.

- [x] **Step 4: Run the complete verification gate**

Run:

```bash
npm run audit:world-streaming-we6
npm run audit:world-streaming-we6-ui
npm run audit:streaming-weekly-loop-phase10
npm run audit:save-migration
npm run audit:week-processing-save-safety
npm run lint
npm run build
git diff --check
```

- [x] **Step 5: Document measured results and WE7 boundary**

Mark WE6 delivered only after the full gate exits successfully. Record runtime/save size and state that WE7 expands the same allocator to all AI/generated platforms.
