# Network Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Preview and apply a budget-limited network suggestion for selected opening markets.

**Architecture:** Isolate a bounded asynchronous planner from the existing manual RegionBoard. Candidate placements use the current placer and canonical quote/service models. Keep suggestions ephemeral; apply one validated facility patch into the existing Build draft and retain normal commissioning.

**Tech Stack:** React, TypeScript, Vite, Node/esbuild audits, real browser QA.

**Spec:** docs/superpowers/specs/2026-10-21-network-suggestions-approved.md

## Global Constraints

- The approved spec binds all implementation and review. Current branch is codex/streaming-tap-lag, base da8d83b; preserve the pre-existing two-line network.css server-alignment change (it is authorized and may be included if that stylesheet is touched).
- Only selected opening markets drive demand and geographic planning. Existing rooms remain unchanged by Fill gaps; explicit replacement preserves built/data.existing rooms. Preview and actual canonical metrics must agree.
- Exact user upfront and weekly caps, available treasury and deferred launch commitments remain enforced; apply changes only the current draft with rehearsal null. No charge, commission, rights change or persistence shortcut.
- Generate only on explicit action, bounded/cancellable work, stale result refusal, no heavy render or per-key calculation. Keep ordinary taps fast and measure generation rather than promising instant optimization.
- Use disposable fixtures; do not apply a suggestion to Anshu's career. Local server 5174 remains the current checkout. No pushes/merges, dependency upgrades, unrelated font redesign or warning suppression.

### Task 1: Selected-market suggestion planner and review/apply sheet

**Files:**
- Create components/studio-finance/finance/networkSuggestions.ts (planner, canonical proposal, apply validation).
- Create components/studio-finance/components/build/NetworkSuggestionSheet.tsx (local editor, progress/cancel, proposal and apply).
- Modify components/studio-finance/components/build/RegionBoard.tsx (compact entry, one draft patch).
- Modify components/studio-finance/styles/network.css (scoped sheet/entry styles, retain existing alignment).
- Modify components/studio-finance/finance/placer.ts only for a narrow reusable placement scope/addition path if required to preserve existing rooms or avoid unopened-country footprint purchases. Preserve default manual semantics.
- Create scripts/audit-streaming-network-suggestions.tsx with real planner/service/component tests. Add a focused fixture under scripts/fixtures only when needed for actual UI QA; keep it memory-only. Small focused helper split is allowed when it keeps a single responsibility clear; report it.

**Interfaces:** Export typed NetworkSuggestionMode (BUDGET/BALANCED/PREMIUM), request limits/mode/replaceUnbuilt, result/proposal with exact draft/quote/coverage/warnings and current-input identity, asynchronous createNetworkSuggestion(data,draft,request,control?) and a current-input apply validation function. UI consumes these same APIs, not a stand-in submit handler. Exact result field names can be chosen together in this single implementation unit; document the final API in the report.

- [x] Write a behavioral audit before production code. The absence of the public planner is the expected initial RED. Add real US+IN/no-CN placement/demand coverage; limits; invalid finite/fractional/negative/unsafe inputs; no explicit markets; impossible residency/provider/facility cases; tiny-budget partial; existing room preservation and explicit replacement; stale draft/markets/funds/preset/budget refusal; cancellation; deterministic outputs; actual save adapter round trip. Inputs must remain unchanged.

```ts
const data = createLabBuildData(['US', 'IN']);
const input = createLabDraft(data);
const result = await createNetworkSuggestion(data, input, {
  mode: 'BALANCED', upfrontLimit: 500_000_000, weeklyLimit: 10_000_000,
  replaceUnbuilt: false,
});
// Derive expectations independently: selected country codes are exactly US/IN;
// every newly placed room is in the selected footprint; cost caps hold;
// reported per-country readings match a fresh canonical forecast of the result.
```

- [x] Capture RED, then implement the bounded planner. Read current placeRegion, buildTotals, moneyPlan, serviceForecast and the adapter before selecting the algorithm. Prepare selected-country targeting without changing manual full-region maximum. Rank practical cost/coverage/capacity candidates; use current canonical final evidence. Budget/weekly caps and original rooms are hard constraints. Do not promise global optimality or pretend physical impossibility is full coverage.
- [x] Add the real sheet and RegionBoard entry between map and note. Default Balanced and Fill remaining gaps. Preserve blank/editing money text locally and validate before generation; show progress/cancel without repeated search on edits. Budget values must be supplied by the player, with readable USD summaries. Apply a current validated result in one patch, clearing rehearsal. On changed inputs disable stale proposals and require generation again. Inaccessible focus/Escape behavior must use existing AccessibleDialog semantics or a narrowly equivalent correct wrapper.
- [x] Run the focused audit GREEN, covering actual proposal->apply draft->adapter normalization/reopen and no money/rights changes. Run existing region placer, build-pricing interaction and focused infrastructure draft/save tests appropriate to any amended shared code. Report exact commands, outputs and any warnings; do not weaken existing assertions.
- [x] Measure limited and global cases. Use real US+IN, all197 and pinned 5,000-title Build inputs. Record generation and final validation/apply compute separately from browser tap-to-paint; validate ordinary open/input/cancel/manual controls do not run optimization. Controller owns real UI and career inspection; worker must not control the browser or user's active save.
- [x] Self-review current-source validation, no input mutation, built/existing room retention, no cap overrun, country/slot/cooling/residency authority, bounded work and stale/cancel semantics. Commit only task-owned files (the approved existing alignment hunk can travel with network.css). Write a full report to the SDD report path with final APIs, RED/GREEN, limits and timing; return only status/commit/test summary/concerns.

## Final integration

Controller independently verifies fresh TypeScript and production build, relevant planner/placement/save/rights checks, actual disposable UI preset/input/generate/cancel/preview/apply/reopen and small-budget/no-market/US+IN-no-CN cases. Inspect 320/393px layouts in one batched visual pass plus at most one visual correction/confirmation, and current local career without editing its setup. Package one task review and a final whole-change review, fix load-bearing findings through scoped correction, retain results in a public report and leave 5174 ready.
