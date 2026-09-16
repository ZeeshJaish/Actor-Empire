# Streaming Opening Programme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Streaming+ commissioning into one atomic, persistent transition from editable setup to a unified Opening Programme that tracks construction, clearance and marketing until Opening Night is genuinely ready.

**Architecture:** Existing infrastructure, market-operation, marketing, catalogue, service-configuration, rehearsal and launch records remain canonical. A small persisted commission marker freezes the exact approved evidence, while a new pure `streamingOpeningProgramme` service derives status, workstreams, controlling date and routing from those records; `StreamingPlatformHQ` orchestrates one all-or-nothing commission transaction and renders one post-commission screen for every former wizard entry.

**Tech Stack:** React 19, TypeScript, Vite, deterministic Actor Empire game-week services, server-rendered audit scripts, Playwright browser audits.

**Spec:** `docs/superpowers/specs/2026-09-16-streaming-opening-programme-design.md`

## Global Constraints

- Treat existing market, infrastructure, marketing and launch records as the source of truth; do not duplicate their changing progress in the commission marker.
- All timing uses Actor Empire absolute game weeks; do not add real-time timers.
- Commissioning is a hard configuration lock until Opening Night resolves.
- A government review may still be running at commission, but a missing document, required payment or revisable rejection blocks commission.
- The commission operation must be idempotent and all-or-nothing from the caller's perspective.
- The unified page uses flat status colours, no decorative gradients, no page counter and no wizard progress rail.
- The phone layouts at `393x600` and `393x852` must have no clipped text or horizontal overflow.
- Preserve unrelated worktree changes. Do not stage or commit files unless the user explicitly authorizes a commit.

---

## File map

- `types.ts` — persisted commission marker and shared opening-programme enums.
- `services/ownedStreamingPlatform.ts` — schema normalization, legacy migration and bounded persistence for the marker.
- `services/streamingLaunchProgram.ts` — pre-commission decision readiness; no longer treats a pending government clock as an unfinished decision.
- `services/streamingMarkets.ts` — pure/idempotent batch filing primitive used by commission.
- `services/streamingLaunchMarketingLifecycle.ts` — reserve a launch plan against the computed opening window without double reservation.
- `services/streamingOpeningProgramme.ts` — commission quote, atomic orchestration, derived programme view, controlling-date logic and entry routing.
- `services/streamingWeeklyLoop.ts` — programme transition events after existing market and marketing progression.
- `services/weekProcessingRecovery.ts` — translate a failed programme workstream into player-readable recovery details.
- `services/gameLoop.ts` — identify clearance and programme workstream boundaries while preserving the existing verified-save rollback.
- `components/streaming-transplant/StreamingOpeningProgramme.tsx` — unified responsive status interface.
- `components/StreamingPlatformHQ.tsx` — route all commissioned setup entries to the programme and persist only a successful transaction.
- `components/studio-finance/components/build/StageLaunch.tsx` — pre-commission readiness/confirmation only; after success, hand off to programme.
- `components/studio-finance/components/cine/CommissionCut.tsx` — accurate construction-start wording.
- `styles/streaming-hq.css` — shared programme layout and status styling.
- `scripts/audit-streaming-opening-programme.ts` — domain, transaction, migration and weekly-progression audit.
- `scripts/audit-streaming-opening-programme-ui.tsx` — routing, locking and rendered-copy audit.
- `scripts/audit-streaming-opening-programme-browser.mjs` — phone viewport and interaction audit.
- `scripts/fixtures/streaming-opening-programme.html` — isolated browser-audit shell.
- `scripts/fixtures/streaming-opening-programme.tsx` — deterministic executing/action-required/ready fixture states.
- `package.json` — focused audit commands.

---

### Task 1: Persist the immutable commission marker safely

**Files:**
- Modify: `types.ts:3009-3070`
- Modify: `types.ts:6402-6475`
- Modify: `types.ts:6470-6690`
- Modify: `services/ownedStreamingPlatform.ts:3850-4020`
- Create: `scripts/audit-streaming-opening-programme.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `StreamingOpeningProgrammeState`, `StreamingOpeningProgrammeFocus`, `OwnedStreamingOpeningProgrammeCommission` and `OwnedStreamingPlatformState.openingProgrammeCommission`.
- `OwnedStreamingOpeningProgrammeCommission` fields are immutable evidence: `id`, `idempotencyKey`, `committedAtAbsoluteWeek`, `launchDefinitionSignature`, `infrastructureConfigurationSignature`, `rehearsalSignature`, `openingCountryIds`, `marketingForecastSignature`, and `revision`.
- The marker does not store elapsed weeks, remaining weeks, clearance status or marketing status.

- [ ] **Step 1: Add a failing normalization audit**

Create the audit with a legacy save missing the field, a malformed marker and a valid marker:

```ts
const legacy = normalizeOwnedStreamingPlatformState({
  ...createInitialOwnedStreamingPlatformState('opening-programme'),
  openingProgrammeCommission: undefined,
}, 'opening-programme');
assert.equal(legacy.openingProgrammeCommission, null);

const valid = normalizeOwnedStreamingPlatformState({
  ...legacy,
  openingProgrammeCommission: {
    id: 'opening-programme:empire-plus:2100',
    idempotencyKey: 'opening-programme:empire-plus:definition-a:infra-a',
    committedAtAbsoluteWeek: 2100,
    launchDefinitionSignature: 'definition-a',
    infrastructureConfigurationSignature: 'infra-a',
    rehearsalSignature: 'infra-a',
    openingCountryIds: ['CA', 'US', 'US'],
    marketingForecastSignature: 'marketing-a',
    revision: 1,
  },
}, 'opening-programme');
assert.deepEqual(valid.openingProgrammeCommission?.openingCountryIds, ['CA', 'US']);
assert.equal(valid.openingProgrammeCommission?.committedAtAbsoluteWeek, 2100);
```

- [ ] **Step 2: Register and run the focused audit to confirm failure**

Add:

```json
"audit:streaming-opening-programme": "esbuild scripts/audit-streaming-opening-programme.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-streaming-opening-programme.mjs && node /tmp/audit-streaming-opening-programme.mjs"
```

Run: `npm run audit:streaming-opening-programme`

Expected: FAIL because `openingProgrammeCommission` and its types do not exist.

- [ ] **Step 3: Add the shared types and initial state**

Add:

```ts
export type StreamingOpeningProgrammeState =
    | 'DRAFT'
    | 'READY_TO_COMMISSION'
    | 'EXECUTING'
    | 'ACTION_REQUIRED'
    | 'READY_TO_OPEN'
    | 'LIVE';

export type StreamingOpeningProgrammeFocus =
    | 'OVERVIEW'
    | 'INFRASTRUCTURE'
    | 'CLEARANCES'
    | 'MARKETING'
    | 'LAUNCH_PLAN';

export interface OwnedStreamingOpeningProgrammeCommission {
    id: string;
    idempotencyKey: string;
    committedAtAbsoluteWeek: number;
    launchDefinitionSignature: string;
    infrastructureConfigurationSignature: string;
    rehearsalSignature: string;
    openingCountryIds: string[];
    marketingForecastSignature: string;
    revision: number;
}
```

Add `openingProgrammeCommission: OwnedStreamingOpeningProgrammeCommission | null` next to `launchProgram` and initialize it to `null` in `createInitialOwnedStreamingPlatformState`.

- [ ] **Step 4: Normalize and compact the marker**

Add a dedicated `normalizeOpeningProgrammeCommission(value)` helper that rejects blank signatures, clamps weeks/revision to non-negative integers, uppercases/deduplicates/sorts country IDs and returns `null` for an invalid object. Include its result in `normalizeOwnedStreamingPlatformState`; increment `OWNED_STREAMING_PLATFORM_SCHEMA_VERSION` from `26` to `27`.

- [ ] **Step 5: Run type and domain checks**

Run: `npm run audit:streaming-opening-programme && npm run lint`

Expected: the normalization assertions pass and TypeScript reports no new errors.

- [ ] **Step 6: Review checkpoint**

Run: `git diff --check -- types.ts services/ownedStreamingPlatform.ts scripts/audit-streaming-opening-programme.ts package.json`

Expected: no whitespace errors. Do not stage or commit.

---

### Task 2: Separate decision readiness from government review completion

**Files:**
- Modify: `services/streamingLaunchProgram.ts:606-790`
- Modify: `scripts/audit-streaming-road-to-opening-phase3.ts`
- Modify: `scripts/audit-streaming-build-test-autosave-gates.tsx`
- Modify: `scripts/audit-streaming-opening-programme.ts`

**Interfaces:**
- Produces: `getStreamingOpeningMarketDecisionState(player)` returning `{ selectedCountryIds, readyToCommission, reviewComplete, actionRequiredOperationIds, unfiledOperationIds }`.
- `getStreamingLaunchProgramView` consumes that result for the `MARKET_CLEARANCES`, `REHEARSAL` and `COMMISSIONING` milestones.

- [ ] **Step 1: Add failing readiness cases**

Cover four states in `audit-streaming-opening-programme.ts`:

```ts
assert.equal(getStreamingOpeningMarketDecisionState(plannedMarkets).readyToCommission, true);
assert.equal(getStreamingOpeningMarketDecisionState(inReviewMarkets).readyToCommission, true);
assert.equal(getStreamingOpeningMarketDecisionState(approvedMarkets).reviewComplete, true);
assert.equal(getStreamingOpeningMarketDecisionState(requirementMarkets).readyToCommission, false);
```

Also update the StageLaunch audit expectation so a selected, unfiled market can contribute a completed decision gate while an additional-requirement market remains open.

- [ ] **Step 2: Run the focused audits to confirm failure**

Run: `npm run audit:streaming-opening-programme && npm run audit:streaming-road-to-opening-phase3 && npm run audit:streaming-build-test-autosave-gates`

Expected: FAIL on the old `marketsCleared` requirement.

- [ ] **Step 3: Implement the decision-state selector**

Treat `PLANNED` and `AWAITING_FUNDING` as unfiled but decision-complete. Treat clearance outcomes `ADDITIONAL_REQUIREMENT` and `TEMPORARILY_REJECTED` as action-required. Treat `READY` and `ACTIVE` as review-complete. Return stable, sorted IDs so commission keys remain deterministic.

- [ ] **Step 4: Update launch milestone semantics and copy**

Change `MARKET_CLEARANCES.complete` to `readyToCommission`, keep `inProgress` true while filed reviews remain pending, and use the description `Prepare every opening-country application and resolve any government request.` Rehearsal and commissioning depend on `readyToCommission`, not `reviewComplete`.

- [ ] **Step 5: Run the focused audits**

Run: `npm run audit:streaming-opening-programme && npm run audit:streaming-road-to-opening-phase3 && npm run audit:streaming-build-test-autosave-gates`

Expected: all three pass; the seven-step Define flow remains `7/7`, never `8/7` or `8/8`.

- [ ] **Step 6: Review checkpoint**

Run: `git diff --check -- services/streamingLaunchProgram.ts scripts/audit-streaming-road-to-opening-phase3.ts scripts/audit-streaming-build-test-autosave-gates.tsx scripts/audit-streaming-opening-programme.ts`

Expected: no whitespace errors. Do not stage or commit.

---

### Task 3: Build one idempotent atomic commission transaction

**Files:**
- Modify: `services/streamingMarkets.ts:90-240`
- Modify: `services/streamingLaunchMarketingLifecycle.ts:20-125`
- Create: `services/streamingOpeningProgramme.ts`
- Modify: `scripts/audit-streaming-opening-programme.ts`

**Interfaces:**
- Produces: `getStreamingOpeningCommissionQuote(player, draft, marketingForecast): StreamingOpeningCommissionQuote`.
- Produces: `commissionStreamingOpeningProgramme(player, input): StreamingOpeningCommissionResult`.
- Produces: `fileUnfiledStreamingOpeningMarkets(player, countryIds, idempotencyKey)`; this reuses existing market-operation start logic and returns the original player on failure.
- `StreamingOpeningCommissionResult.reason` is one of `COMMISSIONED`, `ALREADY_COMMISSIONED`, `NOT_READY`, `STALE_EVIDENCE`, `INSUFFICIENT_TREASURY`, `INSUFFICIENT_ENERGY`, `INFRASTRUCTURE_REJECTED`, or `MARKETING_REJECTED`.

Use these exact public shapes:

```ts
export interface StreamingOpeningCommissionInput {
    infrastructureDraft: OwnedStreamingInfrastructureSetupDraft;
    marketingForecast: StreamingLaunchMarketingForecastSnapshot;
    openingCountryIds: string[];
    expectedLaunchDefinitionSignature: string;
}

export interface StreamingOpeningCommissionQuote {
    idempotencyKey: string;
    launchDefinitionSignature: string;
    infrastructureConfigurationSignature: string;
    rehearsalSignature: string | null;
    marketingForecastSignature: string;
    infrastructureDueNow: number;
    marketFilingDueNow: number;
    marketingReservation: number;
    filingEnergy: number;
    totalCashRequired: number;
    ready: boolean;
    blockers: string[];
}

export interface StreamingOpeningCommissionResult {
    player: Player;
    changed: boolean;
    reason: 'COMMISSIONED' | 'ALREADY_COMMISSIONED' | 'NOT_READY' | 'STALE_EVIDENCE'
        | 'INSUFFICIENT_TREASURY' | 'INSUFFICIENT_ENERGY'
        | 'INFRASTRUCTURE_REJECTED' | 'MARKETING_REJECTED';
    quote: StreamingOpeningCommissionQuote;
    message: string;
}
```

- [ ] **Step 1: Add transaction-failure tests before implementation**

Create fixtures for a fully ready player, an unfiled market, a market already in review and an insufficient-marketing-treasury case. Assert:

```ts
const failed = commissionStreamingOpeningProgramme(lowCash, input);
assert.equal(failed.changed, false);
assert.equal(failed.player.ownedStreamingPlatform.treasuryCash, lowCash.ownedStreamingPlatform.treasuryCash);
assert.equal(failed.player.ownedStreamingPlatform.infrastructureSetup, null);
assert.equal(failed.player.ownedStreamingPlatform.launchMarketingPlan, null);
assert.equal(failed.player.ownedStreamingPlatform.marketOperations[0]?.status, 'PLANNED');

const commissioned = commissionStreamingOpeningProgramme(ready, input);
assert.equal(commissioned.reason, 'COMMISSIONED');
assert.equal(commissioned.player.ownedStreamingPlatform.marketOperations[0]?.status, 'CLEARANCE');
assert.ok(commissioned.player.ownedStreamingPlatform.infrastructureSetup);
assert.ok(commissioned.player.ownedStreamingPlatform.launchMarketingPlan);
assert.ok(commissioned.player.ownedStreamingPlatform.openingProgrammeCommission);

const repeated = commissionStreamingOpeningProgramme(commissioned.player, input);
assert.equal(repeated.reason, 'ALREADY_COMMISSIONED');
assert.equal(repeated.player.ownedStreamingPlatform.treasuryCash, commissioned.player.ownedStreamingPlatform.treasuryCash);
```

- [ ] **Step 2: Run the audit to confirm failure**

Run: `npm run audit:streaming-opening-programme`

Expected: FAIL because the transaction service does not exist.

- [ ] **Step 3: Extract idempotent market filing**

Keep `beginStreamingMarketClearance` public behavior intact, but move its target selection, costs, commitments and deterministic start records into `fileUnfiledStreamingOpeningMarkets`. The supplied commission idempotency key must be part of its ledger key; already-filed, approved and active operations remain byte-for-byte unchanged.

- [ ] **Step 4: Make marketing reservation commission-key aware**

Extend `reserveOwnedStreamingLaunchMarketing` with optional `{ idempotencyKey?: string }`. When the same active plan key already exists, return `UNCHANGED`; when a different active plan exists after commission, return `LOCKED`. Preserve current callers by keeping the option optional.

- [ ] **Step 5: Implement quote and preflight**

`getStreamingOpeningCommissionQuote` must calculate infrastructure due-now, unfiled market fees, filing energy, marketing ceiling reservation, current evidence signatures and one deterministic key:

```ts
const idempotencyKey = [
  'opening-programme',
  platform.identity?.slug || player.id,
  launchDefinitionSignature,
  infrastructureForecast.configurationSignature,
  marketingForecast.signature,
].join(':');
```

Preflight validates the blueprint signature, rehearsal signature, exact infrastructure forecast, market action state, treasury, energy and current absence/presence of a matching commission marker before calling any mutation helper.

- [ ] **Step 6: Implement the atomic orchestration**

Apply market filing, infrastructure commit and marketing reservation only to a local `candidate: Player`. If any result rejects, return the original `player`, never `candidate`. On success write one `OwnedStreamingOpeningProgrammeCommission`, one `INFRASTRUCTURE_COMMITTED`-adjacent programme ledger entry keyed by the deterministic commission key, and clear mutable setup drafts only after the final candidate is valid.

- [ ] **Step 7: Prove idempotency and preservation**

Extend the audit to compare treasury, energy, cost-commitment keys, market filing weeks and ledger keys before/after a repeated call. Assert an in-review operation retains its original `approvalReadyAtAbsoluteWeek`, and an approved operation retains its clearance outcome.

- [ ] **Step 8: Run affected service audits**

Run: `npm run audit:streaming-opening-programme && npm run audit:streaming-living-markets-phase5 && npm run audit:streaming-infrastructure-phase5 && npm run audit:streaming-launch-marketing-lifecycle`

Expected: all pass.

- [ ] **Step 9: Review checkpoint**

Run: `git diff --check -- services/streamingMarkets.ts services/streamingLaunchMarketingLifecycle.ts services/streamingOpeningProgramme.ts scripts/audit-streaming-opening-programme.ts`

Expected: no whitespace errors. Do not stage or commit.

---

### Task 4: Derive programme state, workstreams and controlling date

**Files:**
- Modify: `services/streamingOpeningProgramme.ts`
- Modify: `services/streamingLaunch.ts`
- Modify: `scripts/audit-streaming-opening-programme.ts`

**Interfaces:**
- Produces: `StreamingOpeningWorkstreamId = 'INFRASTRUCTURE' | 'CLEARANCES' | 'MARKETING' | 'CATALOGUE' | 'SERVICE' | 'PRICING' | 'REHEARSAL'`.
- Produces: `StreamingOpeningWorkstreamView` with `status`, `detail`, `readyAtAbsoluteWeek`, `elapsedWeeks`, `remainingWeeks`, `controlsDate`, `actionLabel`, and `operationIds`.
- Produces: `getStreamingOpeningProgrammeView(player): StreamingOpeningProgrammeView`.
- Produces: `getStreamingOpeningProgrammeFocus(destination): StreamingOpeningProgrammeFocus`.

- [ ] **Step 1: Write failing derivation tests**

Add cases where infrastructure is slower than marketing, clearance is slower than infrastructure, a clearance needs action, every track is ready, and `launchCommit` exists:

```ts
assert.equal(buildControlled.controllingWorkstreamId, 'INFRASTRUCTURE');
assert.equal(buildControlled.earliestOpeningAbsoluteWeek, setup.readyAtAbsoluteWeek);
assert.equal(clearanceControlled.controllingWorkstreamId, 'CLEARANCES');
assert.equal(actionRequired.state, 'ACTION_REQUIRED');
assert.equal(allReady.state, 'READY_TO_OPEN');
assert.equal(live.state, 'LIVE');
```

- [ ] **Step 2: Run the audit to confirm failure**

Run: `npm run audit:streaming-opening-programme`

Expected: FAIL because no derived programme view exists.

- [ ] **Step 3: Implement pure workstream selectors**

Infrastructure uses `committedAtAbsoluteWeek` and `readyAtAbsoluteWeek`. Clearance uses selected opening-market operation states and `approvalReadyAtAbsoluteWeek`, returning `null` for an uncertain action-required date. Marketing uses plan start/end/status. Catalogue, service, pricing and rehearsal compare current canonical evidence with the immutable marker and report `LOCKED`, `PASSED` or `ACTION_REQUIRED` without inventing a timer.

For schema-26 saves with `infrastructureSetup` but no marker and no `launchCommit`, `getStreamingOpeningProgrammeView` must synthesize a read-only legacy marker from `launchProgram.lastBlueprintSignature || getStreamingLaunchDefinitionSignature(player)`, `infrastructureSetup.loadTest.configurationSignature`, the rehearsal signature, existing opening-country IDs and the active marketing forecast signature. Return `commissioned: true` from the derived view without charging, refiling or restarting anything.

- [ ] **Step 4: Implement controlling-date rules**

Choose the incomplete timed workstream with the greatest known `readyAtAbsoluteWeek`. If an incomplete required track has no reliable date, set `dateCertainty: 'ESTIMATE'` and surface that track as controlling. Once all government outcomes are approved/conditional, use `dateCertainty: 'CONFIRMED'`. Never show a date earlier than the current absolute week.

- [ ] **Step 5: Reuse the derived state in Opening Night readiness**

Update `getStreamingLaunchReadiness`/`commitOwnedStreamingLaunch` so `READY_TO_OPEN` is the prerequisite. Keep the existing network, market and rehearsal assertions as defense-in-depth; do not let the UI alone enforce readiness.

- [ ] **Step 6: Run launch and programme audits**

Run: `npm run audit:streaming-opening-programme && npm run audit:streaming-launch-phase8`

Expected: Opening Night fails during `EXECUTING`/`ACTION_REQUIRED`, succeeds at `READY_TO_OPEN`, and remains idempotent at `LIVE`.

- [ ] **Step 7: Review checkpoint**

Run: `git diff --check -- services/streamingOpeningProgramme.ts services/streamingLaunch.ts scripts/audit-streaming-opening-programme.ts`

Expected: no whitespace errors. Do not stage or commit.

---

### Task 5: Integrate weekly transitions and recovery evidence

**Files:**
- Modify: `services/gameLoop.ts:6588-6645`
- Modify: `services/streamingWeeklyLoop.ts:411-455`
- Modify: `services/streamingMarkets.ts:294-330`
- Modify: `services/streamingLaunchMarketingLifecycle.ts:124-175`
- Modify: `services/weekProcessingRecovery.ts`
- Modify: `scripts/audit-streaming-opening-programme.ts`
- Modify: `scripts/audit-streaming-weekly-loop-phase10.ts`
- Modify: `scripts/audit-week-processing-recovery-c8r.ts`

**Interfaces:**
- Produces: `appendStreamingOpeningProgrammeTransitions(before, after, absoluteWeek): Player`.
- Produces: `StreamingOpeningProgrammeWeekError`, carrying `workstreamId`, `operation`, and the original `cause`.
- Consumes consecutive derived programme views; emits ledger/news only when a workstream status changes or player action becomes required.

- [ ] **Step 1: Add failing multi-week and reload tests**

Commission a fixture, serialize/parse/normalize it, advance two game weeks, and assert the marker, original rehearsal signature and team approval evidence survive. Then advance to infrastructure-ready while clearance remains pending, and finally to all-ready.

```ts
const serialized = JSON.parse(JSON.stringify(commissioned.player)) as Player;
const reopened = {
  ...serialized,
  ownedStreamingPlatform: normalizeOwnedStreamingPlatformState(
    serialized.ownedStreamingPlatform,
    serialized.id,
  ),
};
assert.equal(reopened.ownedStreamingPlatform.openingProgrammeCommission?.id, commissionId);
assert.equal(getStreamingOpeningProgrammeView(reopened).state, 'EXECUTING');

let afterTwoWeeks = reopened;
for (let index = 0; index < 2; index += 1) {
  afterTwoWeeks = atAbsoluteWeek(afterTwoWeeks, getAbsoluteWeek(afterTwoWeeks.age, afterTwoWeeks.currentWeek) + 1);
  afterTwoWeeks = advanceStreamingMarketClearances(afterTwoWeeks).player;
  afterTwoWeeks = processOwnedStreamingPlatformWeek(afterTwoWeeks).player;
}
assert.equal(getStreamingOpeningProgrammeView(afterTwoWeeks).workstreams.find(item => item.id === 'INFRASTRUCTURE')?.elapsedWeeks, 2);
assert.equal(getStreamingOpeningProgrammeView(afterTwoWeeks).workstreams.find(item => item.id === 'REHEARSAL')?.status, 'PASSED');
```

- [ ] **Step 2: Run weekly audits to confirm failure**

Run: `npm run audit:streaming-opening-programme && npm run audit:streaming-weekly-loop-phase10`

Expected: FAIL because programme transitions are not recorded.

- [ ] **Step 3: Capture before/after programme views in the existing week flow**

In the game-week path, derive `before` immediately before market and marketing progression and `after` immediately after. Append deterministic `MILESTONE_REACHED` ledger entries only for changed workstream states. Do not add a second clock or independently mutate workstream status.

- [ ] **Step 4: Add actionable failure metadata**

When a clearance becomes `ADDITIONAL_REQUIREMENT` or `TEMPORARILY_REJECTED`, record the workstream ID, market-operation ID, country ID and required action in ledger metadata. Wrap thrown errors at the `advanceStreamingMarketClearances` boundary as `StreamingOpeningProgrammeWeekError('CLEARANCES', 'Advancing government clearances', cause)` and errors from the commissioned marketing/programme section as `StreamingOpeningProgrammeWeekError('MARKETING', 'Advancing launch marketing', cause)`. Extend `describeWeekProcessingFailure` to return `failedStage: 'Advancing the Opening Programme'`, failure code `STREAMING_OPENING_PROGRAMME_<WORKSTREAM>`, and one concrete failure entry naming the operation. The existing verified-save transaction still performs rollback.

- [ ] **Step 5: Prove no duplicate events**

Process the same absolute week twice and assert the second pass adds no programme ledger/news item. Verify a later state change emits exactly one new item.

- [ ] **Step 6: Run weekly and market regression audits**

Run: `npm run audit:streaming-opening-programme && npm run audit:streaming-weekly-loop-phase10 && npm run audit:streaming-living-markets-phase5 && npm run audit:week-processing-recovery-c8r`

Expected: all pass.

- [ ] **Step 7: Review checkpoint**

Run: `git diff --check -- services/gameLoop.ts services/streamingWeeklyLoop.ts services/streamingMarkets.ts services/streamingLaunchMarketingLifecycle.ts services/weekProcessingRecovery.ts scripts/audit-streaming-opening-programme.ts scripts/audit-streaming-weekly-loop-phase10.ts scripts/audit-week-processing-recovery-c8r.ts`

Expected: no whitespace errors. Do not stage or commit.

---

### Task 6: Build the unified Opening Programme screen

**Files:**
- Create: `components/streaming-transplant/StreamingOpeningProgramme.tsx`
- Modify: `styles/streaming-hq.css`
- Create: `scripts/audit-streaming-opening-programme-ui.tsx`
- Modify: `package.json`

**Interfaces:**
- `StreamingOpeningProgramme` consumes `brand`, `view`, `focus`, `onBack`, `onOpenCommissionedPlan`, `onResolveClearance(operationId)` and `onOpeningNight`.
- The component never mutates setup. Only an action-required clearance card exposes a resolution control.

- [ ] **Step 1: Add the server-rendered UI audit**

Render `EXECUTING`, `ACTION_REQUIRED` and `READY_TO_OPEN` states. Assert the hero, controlling workstream, flat status cards and button behavior:

```tsx
const executing = renderToStaticMarkup(
  <StreamingOpeningProgramme brand={brand} view={executingView} focus="INFRASTRUCTURE" {...handlers} />,
);
assert.match(executing, /THE OPENING PROGRAMME/i);
assert.match(executing, /Earliest opening/i);
assert.match(executing, /Infrastructure/i);
assert.match(executing, /Opening Night · 14 weeks remaining/i);
assert.doesNotMatch(executing, /Skip|\d+\/\d+|wizard progress/i);

const ready = renderToStaticMarkup(
  <StreamingOpeningProgramme brand={brand} view={readyView} focus="OVERVIEW" {...handlers} />,
);
assert.match(ready, /Begin Opening Night/);
```

- [ ] **Step 2: Register and run the UI audit to confirm failure**

Add:

```json
"audit:streaming-opening-programme-ui": "esbuild scripts/audit-streaming-opening-programme-ui.tsx --bundle --platform=node --format=cjs --loader:.css=text --loader:.csv=text --outfile=/tmp/audit-streaming-opening-programme-ui.cjs && node /tmp/audit-streaming-opening-programme-ui.cjs"
```

Run: `npm run audit:streaming-opening-programme-ui`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the hierarchy**

Render one header, launch facts, one `Controls the date` card, the remaining workstream list, a read-only commissioned-plan action and one primary Opening Night action. Use semantic buttons, `aria-live="polite"` for status, and `aria-disabled` plus native `disabled` while not ready.

- [ ] **Step 4: Add focused-section behavior**

When `focus !== 'OVERVIEW'`, scroll/focus the matching card on mount and give it a temporary `is-focused` outline. Do not filter away the other workstreams; the unified status remains understandable.

- [ ] **Step 5: Add restrained responsive styling**

Use existing Streaming+ spacing, type and border tokens. Status colours are limited to neutral, green-ready, amber-action and red-blocked. At phone width, facts and workstreams remain one column and text wraps normally; do not use ellipsis on status detail.

- [ ] **Step 6: Run UI and accessibility-adjacent audits**

Run: `npm run audit:streaming-opening-programme-ui && npm run audit:streaming-design-system && npm run lint`

Expected: all pass.

- [ ] **Step 7: Review checkpoint**

Run: `git diff --check -- components/streaming-transplant/StreamingOpeningProgramme.tsx styles/streaming-hq.css scripts/audit-streaming-opening-programme-ui.tsx package.json`

Expected: no whitespace errors. Do not stage or commit.

---

### Task 7: Route every commissioned entry to the programme and hand off cleanly

**Files:**
- Modify: `components/StreamingPlatformHQ.tsx:287-390`
- Modify: `components/StreamingPlatformHQ.tsx:1180-1285`
- Modify: `components/StreamingPlatformHQ.tsx:1740-1795`
- Modify: `components/StreamingPlatformHQ.tsx:1920-2050`
- Modify: `components/studio-finance/components/build/StageLaunch.tsx:18-280`
- Modify: `components/studio-finance/components/cine/CommissionCut.tsx:15-65`
- Modify: `scripts/audit-streaming-opening-programme-ui.tsx`
- Modify: `scripts/audit-streaming-build-test-autosave-gates.tsx`

**Interfaces:**
- `StreamingPlatformHQ` owns `openingProgrammeFocus` and `showOpeningProgramme` UI state.
- `openLaunchDestination` uses `getStreamingOpeningProgrammeFocus(destination)` whenever `getStreamingOpeningProgrammeView(player).commissioned` is true and no `launchCommit` exists, including migrated legacy saves.
- `commitCinematicBuild` calls only `commissionStreamingOpeningProgramme` and persists only its successful `player`.

- [ ] **Step 1: Add source/routing assertions that fail on current behavior**

Assert that a commissioned player opening Build, Define, Campaign or Launch receives `INFRASTRUCTURE`, `LAUNCH_PLAN`/`CLEARANCES`, `MARKETING` or `OVERVIEW`, and that `StreamingPlatformHQ` does not mount `StreamingBuildExperience` or `StreamingDefineLaunchWizard` for those requests.

- [ ] **Step 2: Run UI and Build audits to confirm failure**

Run: `npm run audit:streaming-opening-programme-ui && npm run audit:streaming-build-test-autosave-gates`

Expected: FAIL on the old wizard routing and post-commission receipt copy.

- [ ] **Step 3: Replace the HQ commit chain**

Remove the direct `commitStreamingInfrastructureSetup` then `reserveOwnedStreamingLaunchMarketing` chain from `commitCinematicBuild`. Pass the exact draft, marketing forecast and selected countries to `commissionStreamingOpeningProgramme`; set feedback from its structured result and persist only on `COMMISSIONED`/`ALREADY_COMMISSIONED`.

- [ ] **Step 4: Add the programme render branch**

Compute `openingProgrammeView` with `useMemo`. Before Define/Build/Pricing render branches, render `StreamingOpeningProgramme` when the commission marker exists, the platform is not live and `showOpeningProgramme` is true. Wire government resolution actions through existing `resolveStreamingMarketRequirement`/`resumeStreamingMarketClearance`, then persist and remain on the same page.

- [ ] **Step 5: Redirect all relevant entry points**

Route command-deck launch cards, Build, Define the Launch, campaign and direct launch destinations to the correct programme focus. Keep Finance and Content navigation unchanged. When `launchCommit` exists, preserve the current live HQ behavior.

- [ ] **Step 6: Simplify StageLaunch post-commission behavior**

After the cutscene calls a successful commission, close the Build wizard and open the programme instead of rendering the old receipt/revision screen. Remove `Plan a revision` during the hard lock. The commissioned plan remains accessible only through the programme's read-only sheet.

- [ ] **Step 7: Correct cinematic timing language**

Change the construction beat to title `Construction begins` and line `${totals.weeks} weeks to operational.` Keep the animation duration unchanged and do not imply the sequence advances game weeks. Change the finale close label to `Track the opening programme`.

- [ ] **Step 8: Run routing and regression audits**

Run: `npm run audit:streaming-opening-programme-ui && npm run audit:streaming-build-test-autosave-gates && npm run audit:streaming-commission-cutscene-browser`

Expected: all pass; reopening after two weeks routes to the programme without asking for team-plan approval or rehearsal.

- [ ] **Step 9: Review checkpoint**

Run: `git diff --check -- components/StreamingPlatformHQ.tsx components/studio-finance/components/build/StageLaunch.tsx components/studio-finance/components/cine/CommissionCut.tsx scripts/audit-streaming-opening-programme-ui.tsx scripts/audit-streaming-build-test-autosave-gates.tsx`

Expected: no whitespace errors. Do not stage or commit.

---

### Task 8: Verify phone layouts, end-to-end lifecycle and release safety

**Files:**
- Create: `scripts/fixtures/streaming-opening-programme.html`
- Create: `scripts/fixtures/streaming-opening-programme.tsx`
- Create: `scripts/audit-streaming-opening-programme-browser.mjs`
- Modify: `package.json`

**Interfaces:**
- The fixture accepts `?state=executing`, `?state=action`, and `?state=ready` and renders deterministic canonical programme views.
- The browser audit checks visibility, overflow, focus routing and action enablement at both required phone heights.

- [ ] **Step 1: Create deterministic browser fixtures**

Use the real `StreamingOpeningProgramme` component and representative data: 6 cities, 118 racks, 15 construction weeks, three reviews, one action-required clearance and a ready state. Do not duplicate component markup in the fixture.

- [ ] **Step 2: Add the browser audit command**

Add:

```json
"audit:streaming-opening-programme-browser": "node scripts/audit-streaming-opening-programme-browser.mjs http://127.0.0.1:3000"
```

- [ ] **Step 3: Implement the browser assertions**

At `393x600` and `393x852`, assert `document.documentElement.scrollWidth <= window.innerWidth`, all heading/detail text has non-zero bounding boxes, focused routing reaches the requested card, only action-required cards expose resolution, the executing Opening Night button is disabled and the ready button is enabled. Save screenshots under `/tmp/streaming-opening-programme-<state>-<height>.png` for visual inspection.

- [ ] **Step 4: Run the complete focused audit set**

Run:

```bash
npm run audit:streaming-opening-programme
npm run audit:streaming-opening-programme-ui
npm run audit:streaming-road-to-opening-phase3
npm run audit:streaming-build-test-autosave-gates
npm run audit:streaming-living-markets-phase5
npm run audit:streaming-infrastructure-phase5
npm run audit:streaming-launch-marketing-lifecycle
npm run audit:streaming-launch-phase8
npm run audit:streaming-weekly-loop-phase10
npm run audit:week-processing-recovery-c8r
```

Expected: every focused audit passes.

- [ ] **Step 5: Run the local browser audit**

Start or reuse the local Vite server with `npm run dev -- --host 127.0.0.1`, then run `npm run audit:streaming-opening-programme-browser`.

Expected: both phone sizes and all three lifecycle states pass without clipping or horizontal overflow.

- [ ] **Step 6: Inspect captured screenshots**

Open the six `/tmp/streaming-opening-programme-*.png` captures. Verify flat status colours, symmetric spacing, readable wrapped details, one obvious controlling card, and no page counter/progress rail.

- [ ] **Step 7: Run final static and production checks**

Run: `npm run lint && npm run build && git diff --check`

Expected: TypeScript and production build pass; existing chunk-size warnings may remain, but no new warning or error is introduced by this feature.

- [ ] **Step 8: Final acceptance walkthrough**

In the real game: configure markets/service/catalogue/pricing/build, pass rehearsal, commission once, confirm unfiled clearances and construction start together, close/reopen the game, advance two weeks, open Build/Define/Campaign and verify each lands on the same programme with the correct focus, resolve an injected clearance action, advance to the computed opening week, and confirm `Begin Opening Night` becomes available without reapproval or a second rehearsal.

- [ ] **Step 9: Review checkpoint**

Run: `git status --short` and report only files changed for this feature plus any pre-existing unrelated changes. Do not stage or commit.
