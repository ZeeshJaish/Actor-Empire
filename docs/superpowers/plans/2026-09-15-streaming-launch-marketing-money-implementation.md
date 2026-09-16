# Streaming Launch Marketing and Money Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Build Money stage's fixed campaign packages with a canonical, country-aware launch-marketing allocation that reserves and spends cash correctly, adjusts rehearsal and opening demand exactly once, and is shared by player and AI streaming platforms.

**Architecture:** A pure `streamingLaunchMarketing` kernel converts opening-market, offer, capability, competition, and campaign inputs into deterministic recommendations, allocations, and low/likely/high forecasts. Canonical player state stores an editable draft and a locked campaign plan; a lifecycle service owns reservation, weekly spend, awareness decay, and settlement, while Build adapters and AI adapters consume the same kernel. React remains a presentation layer and receives an already-derived view model.

**Tech Stack:** TypeScript, React, existing Actor Empire World Economy and owned-streaming services, esbuild audit scripts, Vite production build.

**Spec:** `docs/superpowers/specs/2026-09-15-streaming-launch-marketing-money-design.md`

## Global Constraints

- Define the Launch remains authoritative for Day-One countries, pricing, catalogue, revenue streams, and the saved blueprint.
- The Build owns facilities, capacity, commissioning, the launch-marketing ceiling, campaign plan, affordability, and load rehearsal.
- Campaign geography is always the canonical non-exited Day-One opening-country set; there is no regional or national geography selector.
- Marketing uses the World Economy forecast as an input and never replaces or mutates it.
- Response curves are deterministic, monotonic, and sublinear; zero spend adds zero paid lift.
- Editing a draft moves no cash; commissioning creates one idempotent reservation and weekly processing spends it once.
- A ceiling above available treasury remains visible as a shortfall and blocks commissioning; it is not silently clamped.
- The existing four-to-fifteen-week infrastructure clock remains authoritative.
- React components do not calculate economy results.
- Use flat Build surfaces, compact accordions, labeled controls, visible focus, and existing mobile touch targets.
- Do not import film-specific fit, awards, soundtrack, opening-weekend, or box-office logic from `services/marketingStrategy.ts`.
- Preserve unrelated dirty-worktree changes and do not commit or push without explicit user authorization.

## File Structure

- `types.ts` — canonical marketing draft, plan, forecast snapshot, awareness, and commitment category types.
- `services/ownedStreamingPlatform.ts` — normalization, legacy migration, safe defaults, and schema upgrade.
- `services/streamingLaunchMarketing.ts` — pure channel catalogue, recommendations, country allocation, forecast, signature, and AI-neutral input/output types.
- `services/streamingLaunchMarketingLifecycle.ts` — player draft persistence, commissioning reservation, weekly spend, awareness decay, and opening settlement.
- `services/streamingLaunchProgram.ts` — corrected linked-budget totals that count partially paid commitments.
- `services/streamingInfrastructure.ts` — atomic infrastructure plus campaign commissioning.
- `services/streamingWeeklyLoop.ts` — pre-launch weekly marketing lifecycle invocation.
- `services/streamingLaunch.ts` — opening-night consumption of the stored campaign snapshot exactly once.
- `components/studio-finance/finance/build.ts` — presentation-neutral Build draft and Money view interfaces; no static campaign multiplier.
- `components/streaming-transplant/StreamingBuildoutExperience.tsx` — remove legacy campaign packages and accept a derived marketing forecast.
- `components/streaming-transplant/StreamingBuildWizardExperience.tsx` — bridge canonical marketing state and handlers into Build.
- `components/studio-finance/components/build/StageMoney.tsx` — redesigned Money-stage interaction.
- `components/studio-finance/styles/build.css` — flat, compact, mobile-safe Money layout.
- `components/StreamingPlatformHQ.tsx` — persist draft changes and route `Edit pricing` without local shadow state.
- `services/platformAi/platformAiLaunchMarketing.ts` — AI strategy-to-kernel adapter.
- `services/platformAi/platformAiTurn.ts` — invoke AI launch marketing within the canonical weekly turn.
- `scripts/audit-streaming-launch-marketing-*.ts(x)` — deterministic domain, lifecycle, AI parity, and rendered UI verification.

---

### Task 1: Canonical Types, Defaults, and Legacy Migration

**Files:**
- Modify: `types.ts:3307-3331,5796-5820,6301-6368`
- Modify: `services/ownedStreamingPlatform.ts:3644-3820`
- Create: `scripts/audit-streaming-launch-marketing-types.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `OwnedStreamingPlatformState`, `OwnedStreamingCostCommitment`, and deterministic ID helpers.
- Produces: `StreamingLaunchMarketingChannelId`, `OwnedStreamingLaunchMarketingDraft`, `OwnedStreamingLaunchMarketingPlan`, `StreamingLaunchMarketingForecastSnapshot`, and nullable `launchMarketingDraft` / `launchMarketingPlan` state fields.

- [ ] **Step 1: Write the failing normalization audit**

Create an audit that asserts a fresh platform receives a balanced auto draft, malformed numeric fields are clamped to finite non-negative values, old saves without the fields normalize safely, and legacy `NONE`, `REGIONAL`, and `NATIONAL` values migrate to Organic, Balanced-auto, and Event-auto respectively without storing a multiplier.

```ts
assert.equal(fresh.launchMarketingDraft?.objective, 'PLATFORM_INTRODUCTION');
assert.equal(fresh.launchMarketingDraft?.timeline, 'BALANCED');
assert.equal(fresh.launchMarketingDraft?.budgetCeiling, 0);
assert.equal(fresh.launchMarketingPlan, null);
assert.equal(migratedRegional.launchMarketingDraft?.allocationMode, 'AUTO');
assert.equal(migratedRegional.launchMarketingDraft?.budgetCeiling, 1_800_000);
assert.equal('multiplier' in (migratedRegional.launchMarketingDraft as object), false);
```

- [ ] **Step 2: Run the audit and verify it fails**

Run: `npm run audit:streaming-launch-marketing-types`

Expected: FAIL because the canonical marketing types and state fields do not exist.

- [ ] **Step 3: Add canonical types and schema version 26**

Add the four objectives, three timelines, `AUTO | MANUAL`, six channel IDs, warning codes, per-country forecasts, aggregate snapshot, mutable draft, locked plan, and persisted awareness records. Add `MARKETING` to `StreamingCostCommitmentCategory`, add `marketingForecastSnapshotId` to `OwnedStreamingLaunchCommit`, and add the two nullable marketing fields to `OwnedStreamingPlatformState`.

```ts
export type StreamingLaunchMarketingChannelId =
  | 'SOCIAL_DIGITAL' | 'CREATORS' | 'TV_OUTDOOR'
  | 'DEVICE_STORES' | 'TELCO_BUNDLES' | 'PRESS_EVENTS';

export interface OwnedStreamingLaunchMarketingDraft {
  schemaVersion: 1;
  objective: StreamingLaunchMarketingObjective;
  timeline: StreamingLaunchMarketingTimeline;
  budgetCeiling: number;
  allocationMode: StreamingLaunchMarketingAllocationMode;
  countryWeights: Record<string, number>;
  channelAllocations: Partial<Record<StreamingLaunchMarketingChannelId, number>>;
  updatedAtAbsoluteWeek: number;
  revision: number;
}
```

- [ ] **Step 4: Normalize new state and migrate old campaign IDs**

Add focused normalizers that reject unknown country/channel keys, normalize weights to non-negative finite numbers, cap arrays to opening-market scale, and derive a legacy draft only when the new draft is absent. Preserve canonical migration through `compactOwnedStreamingPlatformForPersistence`.

- [ ] **Step 5: Run type audit, save-integrity audit, and TypeScript**

Run: `npm run audit:streaming-launch-marketing-types && npm run lint`

Expected: both PASS.

- [ ] **Step 6: Prepare an authorization-gated checkpoint**

If the user explicitly authorizes a commit, stage only the Task 1 paths and use `feat(streaming): add launch marketing state`.

---

### Task 2: Deterministic Country and Channel Forecast Kernel

**Files:**
- Create: `services/streamingLaunchMarketing.ts`
- Create: `scripts/audit-streaming-launch-marketing-forecast.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `forecastWorldStreamingPricing`, opening-country profiles, offer/pricing data, localization/catalogue coverage, competition pressure, treasury, build weeks, and the Task 1 draft.
- Produces: `getStreamingLaunchMarketingRecommendations(input)`, `forecastStreamingLaunchMarketing(input, draft)`, `getStreamingLaunchMarketingSignature(input, draft)`, and `getStreamingLaunchMarketingWeeklySchedule(plan)`.

- [ ] **Step 1: Write failing deterministic forecast cases**

Cover identical-input determinism, zero paid lift, exact country/channel currency conservation, market-sensitive recommendations, monotonic/sublinear awareness, unaffordable custom ceilings, locked channels, missing original weakness, and insufficient all-market coverage.

```ts
const low = forecastStreamingLaunchMarketing(input, { ...draft, budgetCeiling: 10_000_000 });
const high = forecastStreamingLaunchMarketing(input, { ...draft, budgetCeiling: 20_000_000 });
assert.ok(high.likelyAwarenessLift >= low.likelyAwarenessLift);
assert.ok(high.likelyAwarenessLift < low.likelyAwarenessLift * 2);
assert.equal(sum(high.countryForecasts.map(x => x.allocatedAmount)), high.effectiveBudget);
```

- [ ] **Step 2: Run the forecast audit and verify it fails**

Run: `npm run audit:streaming-launch-marketing-forecast`

Expected: FAIL because `services/streamingLaunchMarketing.ts` is absent.

- [ ] **Step 3: Implement stable recommendation inputs and channel definitions**

Define immutable channel metadata with availability reasons and objective-fit weights. Calculate Lean from minimum viable market presence, Balanced from addressable headroom and media cost, Heavy from the last efficient marginal band, and Event from the next saturation band. Round only display amounts; keep allocation arithmetic in integer currency units.

- [ ] **Step 4: Implement country allocation and largest-remainder currency balancing**

Allocate minimum presence first, distribute the remainder by normalized positive weights, then assign integer remainders by descending fractional remainder and country ID. In manual mode, preserve valid weights, remove exited countries, and emit `MANUAL_ALLOCATION_REVIEW` instead of silently inventing replacements.

- [ ] **Step 5: Implement diminishing-return awareness and account conversion**

Use a saturating exponential curve per country:

```ts
const saturationLift = maxPaidLift * (1 - Math.exp(-effectiveSpend / Math.max(1, halfSaturationCost)));
const awarenessLift = clamp(saturationLift * objectiveFit * channelFit * marketFit, 0, maxPaidLift);
const acquiredAccounts = Math.floor(addressableHeadroom * awarenessLift * conversionRate);
```

Derive low/likely/high concurrency from country account forecasts and existing behavior factors. Never mutate World Economy inputs.

- [ ] **Step 6: Implement relative weekly schedules and signatures**

Generate deterministic integer weekly amounts summing exactly to the ceiling for Front-loaded, Balanced, and Last-week push across the canonical build duration. Include objective, timeline, budget, valid country weights, channel weights, opening-country IDs, pricing revision, catalogue/localization revision, competition revision, and infrastructure ready week in the signature.

- [ ] **Step 7: Run the forecast audit and existing World Economy pricing audit**

Run: `npm run audit:streaming-launch-marketing-forecast && npm run audit:streaming-pricing-world`

Expected: both PASS.

- [ ] **Step 8: Prepare an authorization-gated checkpoint**

If explicitly authorized, commit Task 2 paths as `feat(streaming): model country aware launch marketing`.

---

### Task 3: Player Reservation, Weekly Spending, and Settlement

**Files:**
- Create: `services/streamingLaunchMarketingLifecycle.ts`
- Modify: `services/streamingLaunchProgram.ts:495-534`
- Modify: `services/streamingInfrastructure.ts:1055-1255`
- Modify: `services/streamingWeeklyLoop.ts:250-450`
- Modify: `services/streamingLaunch.ts:337-450`
- Create: `scripts/audit-streaming-launch-marketing-lifecycle.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 state and Task 2 forecast/schedule.
- Produces: `saveOwnedStreamingLaunchMarketingDraft(player, patch)`, `reserveOwnedStreamingLaunchMarketing(player, forecast, readyAtWeek)`, `processOwnedStreamingLaunchMarketingWeek(player)`, and `settleOwnedStreamingLaunchMarketingAtOpening(player)`.

- [ ] **Step 1: Write failing treasury-conservation and idempotency cases**

Assert editing moves no cash; commission creates one commitment; replay creates none; weekly processing charges once; paid plus remaining never exceeds original ceiling; insufficient treasury blocks commission; Opening Night releases the unused reservation without crediting treasury; Organic creates no commitment; delayed openings decay awareness without new spend.

- [ ] **Step 2: Run lifecycle audit and verify it fails**

Run: `npm run audit:streaming-launch-marketing-lifecycle`

Expected: FAIL because lifecycle mutations are absent.

- [ ] **Step 3: Implement draft persistence and immutable reservation**

Draft patches increment revision and clear stale manual-review acknowledgement. Commissioning calculates one forecast, stores it on the plan, creates `launch-marketing:<platform>:<infrastructure-signature>` commitment, and refuses the entire mutation when infrastructure plus the reservation exceeds available-to-commit treasury.

- [ ] **Step 4: Make infrastructure and marketing commission atomically**

Extend the existing infrastructure mutation so it saves the setup and campaign plan in one returned `Player`. Do not call two independent mutations whose second half could fail after the first has already charged cash.

- [ ] **Step 5: Process weekly spend and awareness once per absolute week**

Use `launch-marketing-spend:<plan-id>:<absolute-week>` as the processed key. Charge `min(scheduled, committedAmount, treasuryCash, channelSupplyCap)`, decrement remaining reservation, increment paid/spent totals, and persist country awareness. Invoke this lifecycle before the ACTIVE-only subscriber settlement so construction weeks are covered.

- [ ] **Step 6: Correct linked-budget accounting**

Count `paidAmount` for every non-cancelled commitment, including partially COMMITTED marketing. `availableToCommit` subtracts only remaining `committedAmount`; `remainingAfterPlan` subtracts both planned and remaining committed amounts and never subtracts historical paid cash twice.

- [ ] **Step 7: Consume marketing once on Opening Night**

Use the locked forecast snapshot's account/concurrency results in `commitOwnedStreamingLaunch`, store its snapshot ID on `OwnedStreamingLaunchCommit`, and remove any second campaign multiplier. Set remaining commitment to zero and record `returnedAmount` without increasing treasury.

- [ ] **Step 8: Run lifecycle, launch, weekly-loop, and linked-budget audits**

Run: `npm run audit:streaming-launch-marketing-lifecycle && npm run audit:streaming-linked-budget-sheets && npm run audit:streaming-launch-phase8 && npm run audit:streaming-weekly-loop-phase10`

Expected: all PASS.

- [ ] **Step 9: Prepare an authorization-gated checkpoint**

If explicitly authorized, commit Task 3 paths as `feat(streaming): settle launch marketing lifecycle`.

---

### Task 4: Build Adapters and Rehearsal Demand

**Files:**
- Modify: `components/studio-finance/finance/build.ts:255-261,332-407,731-765,913-990`
- Modify: `components/streaming-transplant/StreamingBuildoutExperience.tsx:87-120,361-378,526-760`
- Modify: `components/streaming-transplant/StreamingBuildWizardExperience.tsx:387-415,522-660`
- Modify: `components/StreamingPlatformHQ.tsx`
- Create: `scripts/audit-streaming-launch-marketing-build.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 2 forecast and Task 3 draft handlers.
- Produces: `BuildDraft.marketing`, `BuildData.marketing`, `MoneyPlan.reserved`, forecast-driven `openingDemandForecast`, and a rehearsal signature containing the marketing signature.

- [ ] **Step 1: Write failing adapter/rehearsal cases**

Assert the Build no longer exports `CAMPAIGNS`, campaign IDs are absent from new selection keys, changing budget/objective/timeline/channel/country weights invalidates rehearsal, likely and surge rehearsal use the forecast ranges, and opening demand is not multiplied again.

- [ ] **Step 2: Run the Build marketing audit and verify it fails**

Run: `npm run audit:streaming-launch-marketing-build`

Expected: FAIL while `CampId` and `CAMPAIGNS` still drive demand.

- [ ] **Step 3: Replace the legacy campaign model in Build contracts**

Remove `Campaign.multiplier`, `BuildDraft.campaignId`, `BuildSel.campaign`, `CampId`, `CAMPAIGNS`, and `campOf`. Add a serializable marketing draft plus already-derived recommendations/forecast to `BuildData`; add marketing save callbacks to `BuildHandlers`.

- [ ] **Step 4: Bridge canonical forecast into money, signature, and rehearsal**

`moneyFor` emits settled Define-the-Launch, due-now infrastructure, reserved marketing ceiling, and weekly operations separately. The canonical signature appends `marketing.signature`. Rehearsal receives forecast-adjusted low/likely/high demand and does no multiplication.

- [ ] **Step 5: Persist edits through HQ handlers**

Make `StreamingPlatformHQ` obtain marketing state from `ownedStreamingPlatform`, call the Task 3 save mutation, and feed the resulting canonical state back through `onChange`. No `useState` shadow campaign is allowed.

- [ ] **Step 6: Run Build, infrastructure, and rehearsal audits**

Run: `npm run audit:streaming-launch-marketing-build && npm run audit:streaming-build-world && npm run audit:streaming-infrastructure-phase5 && npm run audit:streaming-launch-phase8`

Expected: all PASS.

- [ ] **Step 7: Prepare an authorization-gated checkpoint**

If explicitly authorized, commit Task 4 paths as `refactor(streaming): connect build to launch marketing forecast`.

---

### Task 5: Money-Stage UI and Compact Commercial Recap

**Files:**
- Modify: `components/studio-finance/components/build/StageMoney.tsx`
- Modify: `components/studio-finance/styles/build.css`
- Create: `scripts/audit-streaming-launch-marketing-ui.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 4 `BuildData.marketing`, `BuildDraft.marketing`, `MoneyPlan`, and canonical save handlers.
- Produces: accessible ceiling controls, objective/timeline/channel controls, compact country forecast accordions, complete bill, and read-only commercial recap.

- [ ] **Step 1: Write a failing server-rendered UI audit**

Verify content order, `Organic launch`, dynamic Lean/Balanced/Heavy/Event values, direct custom input, shortfall copy, all objectives and timelines, advanced channel/country accordions, locked-channel reasons, exact forecast labels, `Edit pricing`, and absence of `<s>` elements.

- [ ] **Step 2: Run UI audit and verify it fails**

Run: `npm run audit:streaming-launch-marketing-ui`

Expected: FAIL because static campaign cards remain.

- [ ] **Step 3: Build Launch allocation and Marketing ceiling sections**

Render treasury, prior commitments, infrastructure due now, selected ceiling, and projected treasury in the first compact panel. Render four dynamic recommendation buttons plus one locale-aware numeric input with plus/minus conveniences; preserve an over-budget value and show its exact shortfall.

- [ ] **Step 4: Build campaign plan and advanced allocation controls**

Use labeled segmented controls for objective and timeline. Put six channel allocations and country `AUTO | MANUAL` weights inside closed-by-default accordions. Disabled channels retain their label and render the research/capability reason.

- [ ] **Step 5: Build country forecast and bill**

Keep aggregate low/likely/high awareness, acquisition, concurrency, CAC, and confidence visible. Collapse per-country rows to a summary with the first three markets plus `+N markets`; expand on demand. Separate `Settled`, `Due at commission`, `Reserved`, and `Weekly after opening` bill groups.

- [ ] **Step 6: Replace pricing cards with a compact read-only recap**

Show plan count, blended household price, cadence, and active revenue streams in one compact panel. Use `<span>`/`<small>` for units and route `Edit pricing` back to Define the Launch.

- [ ] **Step 7: Add flat responsive styling**

Use existing Build tokens, neutral panels, one purple selected state, and semantic warning/success accents. At `max-width: 430px`, maintain one-column controls, no horizontal scroll, 44px controls, and compact country rows.

- [ ] **Step 8: Run UI and existing Build scale audits**

Run: `npm run audit:streaming-launch-marketing-ui && npm run audit:streaming-build-plans-scale && npm run audit:streaming-design-system`

Expected: all PASS and no semantic strike-through tags in the Money UI.

- [ ] **Step 9: Prepare an authorization-gated checkpoint**

If explicitly authorized, commit Task 5 paths as `feat(streaming): redesign build money stage`.

---

### Task 6: AI Platform Parity and Competition Feedback

**Files:**
- Create: `services/platformAi/platformAiLaunchMarketing.ts`
- Modify: `services/platformAi/platformAiTurn.ts:450-570`
- Modify: `services/platformAi/platformAiState.ts`
- Modify: `types.ts:9004-9100`
- Create: `scripts/audit-platform-ai-launch-marketing.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 2 kernel, `PLATFORM_AI_PROFILES`, AI finance/runway, market operations, pricing, catalogue, localization, capabilities, and competitor state.
- Produces: `planPlatformAiLaunchMarketing(input)` and persisted AI awareness/spend outcomes using the same forecast snapshot shape as the player.

- [ ] **Step 1: Write failing player/AI parity and strategy cases**

Assert identical canonical inputs yield identical forecast outputs; growth-first profiles spend more within runway than margin-first profiles; AI never overspends treasury/runway caps; absent capabilities disable the same channels; competitor pressure affects both paths; weekly AI turns are idempotent.

- [ ] **Step 2: Run the AI audit and verify it fails**

Run: `npm run audit:platform-ai-launch-marketing`

Expected: FAIL because AI launch marketing does not exist.

- [ ] **Step 3: Implement the AI decision adapter**

Map profile strategy to objective/timeline/channel preferences, cap the recommendation by treasury minus twelve weeks of protected operating burn, then call `forecastStreamingLaunchMarketing`. Keep all response curves in the shared kernel.

- [ ] **Step 4: Persist AI marketing outcomes and competition pressure**

Store only strategy choice, ceiling, spend, awareness, snapshot version, and processed-week key in normalized AI state. Feed country awareness into the existing competition state through a single idempotent event; do not create a player-style React draft.

- [ ] **Step 5: Invoke the adapter in the canonical AI weekly turn**

Run marketing after economy settlement and before release scheduling so cash/runway are current and release demand sees current awareness. Replaying the same absolute week produces no second spend or awareness.

- [ ] **Step 6: Run AI parity, AI economy, and rival-world audits**

Run: `npm run audit:platform-ai-launch-marketing && npm run audit:streaming-commercial-economy && npm run audit:streaming-rivals-global-awards-phase20`

Expected: all PASS.

- [ ] **Step 7: Prepare an authorization-gated checkpoint**

If explicitly authorized, commit Task 6 paths as `feat(streaming): give rivals canonical launch marketing`.

---

### Task 7: Long-Run, Save, and Browser Verification

**Files:**
- Create: `scripts/audit-streaming-launch-marketing-long-run.ts`
- Create: `scripts/audit-streaming-launch-marketing-browser.mjs`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-09-15-streaming-launch-marketing-money-design.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: release-grade evidence for deterministic economy behavior, save/reload continuity, mobile UI, and documented pre-existing failures.

- [ ] **Step 1: Write the long-run audit**

Simulate Organic, Lean, Balanced, Heavy, Event, unaffordable custom, weak catalogue, extreme price, missing localization, strong rivals, delayed launch, and 2/12/40-country cases for player and AI platforms across at least 156 weeks. Assert finite values, treasury conservation, bounded awareness/accounts, no duplicate spend, and deterministic reruns.

- [ ] **Step 2: Run long-run audit and fix only regressions introduced by this plan**

Run: `npm run audit:streaming-launch-marketing-long-run`

Expected: PASS with the same checksum on consecutive runs.

- [ ] **Step 3: Write browser verification for both phone heights**

Automate `393x600` and `393x852`: open Build Money, choose Organic/recommendations/custom, enter an unaffordable value, change objective/timeline, expand country/channel allocation, confirm `Edit pricing`, confirm no horizontal overflow, commission a valid plan, advance construction, and verify locked/settled states.

- [ ] **Step 4: Run focused browser verification against the existing local server**

Run: `node scripts/audit-streaming-launch-marketing-browser.mjs http://127.0.0.1:3000`

Expected: PASS screenshots and assertions at both viewports.

- [ ] **Step 5: Run the regression gate**

Run: `npm run audit:streaming-launch-marketing-types && npm run audit:streaming-launch-marketing-forecast && npm run audit:streaming-launch-marketing-lifecycle && npm run audit:streaming-launch-marketing-build && npm run audit:streaming-launch-marketing-ui && npm run audit:platform-ai-launch-marketing && npm run audit:streaming-launch-marketing-long-run && npm run audit:streaming-pricing-world && npm run audit:streaming-build-world && npm run audit:streaming-linked-budget-sheets && npm run audit:streaming-launch-phase8 && npm run audit:streaming-weekly-loop-phase10 && npm run lint && npm run build`

Expected: every command PASS. Run `npm run audit:streaming-road-to-opening-phase3` separately and report its known storefront-research gate failure unless it has independently been resolved; do not mislabel that pre-existing failure as introduced here.

- [ ] **Step 6: Update design status and verification evidence**

Change the spec status to `Implemented and verified` only after Step 5 and browser verification pass. Append the exact commands, viewport sizes, and any separately documented pre-existing failure.

- [ ] **Step 7: Prepare the final authorization-gated checkpoint**

If explicitly authorized, stage only paths from this plan and commit as `feat(streaming): integrate launch marketing economy`.

