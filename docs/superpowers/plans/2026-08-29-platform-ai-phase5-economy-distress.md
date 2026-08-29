# Competitive Streaming Platform AI Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the rival Platform AI operating economy with bounded AI COGS efficiency, durable outside recapitalization and bankruptcy administration, explainable valuation, and competition-preserving generated entrants.

**Architecture:** Extend the existing `PlatformAiRuntimeState`, weekly economy, and durable distress episode rather than replacing them. Keep pure quote/policy calculations in focused services, let the world-aware distress resolver perform cross-entity mutations, and let the existing compact streaming ecosystem consume only a deterministic competition-health signal for launch strength and cadence.

**Tech Stack:** TypeScript, React/Vite game runtime, deterministic seeded helpers, Node `assert` audit scripts, esbuild audit bundles.

**Spec:** `docs/superpowers/specs/2026-08-29-platform-ai-phase5-economy-distress-design.md`

## Global Constraints

- AI recurring eligible COGS multiplier is clamped to `0.88...0.95`, a 5–12% saving.
- AI efficiency never discounts producer fees, production budgets, bidding offers, rights prices, taxes/levies, debt, catalogue prices, or fixed third-party obligations.
- Player acquisition changes every future AI-only cost/decision advantage to player-standard rules without rewriting settled history or accepted immutable terms.
- Parent rescue and external recapitalization are unavailable to player-controlled platforms.
- Parent rescue and successful external recapitalization each require at least a 104-week cooldown.
- Distress progression is authoritative in `PlatformAiDistressEpisode`; presentation history is never the durable authority.
- External funding is debt/arrears-first and cannot fund immediate speculative bidding, greenlights, acquisitions, research, or expansion.
- Administration cannot cancel or transfer rights/projects without canonical authority.
- Competition health may affect a bounded launch probability/class but may not directly grant cash, subscribers, projects, or rights to an existing operator.
- No saved decision may use raw `Math.random()` or `Date.now()`.
- Preserve unrelated dirty work. Stage and commit only files named by the current task.
- The 2,600-week endurance certification remains Phase 8; Phase 5 requires focused audits plus shorter adverse multi-year replay parity.

---

## File map

**Core schema and normalization**

- Modify `types.ts` — add Phase 5 finance, funding, administration, efficiency, launch-class, and distress-stage fields.
- Modify `services/platformAi/platformAiState.ts` — migrate schema 9 to the new runtime schema, normalize new records, and remap distress stages by name.
- Modify `services/streamingPlatformEcosystem.ts` — normalize generated starting class and bounded competition-health persistence if stored.

**Focused policy/services**

- Modify `services/platformAi/platformAiOperatingProfiles.ts` — add recurring eligible-COGS multiplier to deep-platform profiles.
- Modify `services/platformAi/platformAiEfficiency.ts` — create auditable recurring COGS snapshots and player handoff behavior.
- Create `services/platformAi/platformAiFinancing.ts` — pure external-funding eligibility, terms, restrictions, cooldown, and administration-outcome calculations.
- Create `services/streamingPlatformCompetitionHealth.ts` — pure competition-density calculation and bounded launch-pressure/class selection.

**Orchestration and integration**

- Modify `services/platformAi/platformAiEconomy.ts` — apply eligible COGS savings, settle new finance fields, and include funding/dilution in valuation.
- Modify `services/platformAi/platformAiDistress.ts` — add recapitalization and administration stages to the world-aware durable ladder.
- Modify `services/platformAi/platformAiPlanning.ts` — honor saved post-funding/administration restrictions.
- Modify `services/platformAi/platformAiPlayerCommissions.ts` — prevent restricted platforms from issuing new player commissions while preserving accepted ones.
- Modify `services/streamingBidding.ts` — reduce or block new bidding capacity from saved distress/funding restrictions without changing signed offers.
- Modify `services/platformAi/platformAiState.ts` acquisition handoff — disable AI financing and efficiency prospectively.
- Modify `services/streamingPlatformEcosystemTurn.ts` — use competition health to choose launch pressure and starting class.
- Modify `services/platformAi/index.ts` — export new focused public interfaces.

**Verification**

- Modify `scripts/audit-platform-ai-economy.ts` — eligible/ineligible COGS, exact-once settlement, valuation, and acquisition handoff.
- Modify `scripts/audit-platform-ai-distress.ts` — ten-stage migration, funding success/failure, cooldown, debt-first disposition, administration, and replay.
- Modify `scripts/audit-global-streaming-ecosystem.ts` — health pressure, starting classes, bounded launch behavior, stable identity, and no invalid `PlatformId`.
- Modify `scripts/audit-platform-ai-turn.ts` — ordered weekly integration and resume parity.
- Modify `scripts/audit-save-migration.ts` and `scripts/audit-save-transfer.ts` — schema/empty-collection/handoff persistence.
- Modify `package.json` only if a new focused audit command is required; prefer extending existing audit commands.

---

### Task 1: Phase 5 schema and deterministic migration

**Files:**

- Modify: `types.ts:6421-6450,6695-6908,250-300`
- Modify: `services/platformAi/platformAiState.ts:90-180,800-920,1640-1735,2000-2320`
- Modify: `services/streamingPlatformEcosystem.ts:1-320`
- Test: `scripts/audit-platform-ai-distress.ts`
- Test: `scripts/audit-save-migration.ts`
- Test: `scripts/audit-save-transfer.ts`

**Interfaces:**

- Produces `PlatformAiRecurringEfficiencySnapshot`, `PlatformAiExternalRecapitalization`, `PlatformAiAdministrationState`, `PlatformAiSpendingRestrictions`, and `StreamingEcosystemStartingClass`.
- Extends `PlatformAiDistressAction` with `EXTERNAL_RECAPITALIZATION` and `BANKRUPTCY_ADMINISTRATION`.
- Bumps `PLATFORM_AI_RUNTIME_SCHEMA_VERSION` from `9` to `10`.
- Later tasks consume normalized empty arrays/nullable fields and the ten-stage canonical order.

- [ ] **Step 1: Add failing schema assertions**

Extend `scripts/audit-platform-ai-distress.ts` with:

```ts
assert.deepEqual(DISTRESS_STAGE_ORDER, [
    'FREEZE_GREENLIGHTS',
    'PAUSE_RESEARCH',
    'HOLD_COMMISSION',
    'LICENSE_CATALOGUE',
    'WITHDRAW_REGION',
    'RESTRUCTURE',
    'PARENT_RESCUE',
    'EXTERNAL_RECAPITALIZATION',
    'BANKRUPTCY_ADMINISTRATION',
    'DORMANT',
]);

const migrated = normalizePlatformAiState(schemaNinePlatform, fixture.id, START_WEEK);
assert.equal(migrated.ai!.schemaVersion, 10);
assert.deepEqual(
    migrated.ai!.distressEpisodes[0].stageResults.map(result => result.stage),
    schemaNinePlatform.ai!.distressEpisodes[0].stageResults.map(result => result.stage),
);
assert.equal(migrated.ai!.externalRecapitalizations.length, 0);
assert.equal(migrated.ai!.administration, null);
```

Add save migration/transfer assertions that the new empty collection remains `[]` rather than becoming `undefined` after normalize → compact → migrate.

- [ ] **Step 2: Run the failing audits**

Run:

```bash
npm run audit:platform-ai-distress
npm run audit:save-migration
npm run audit:save-transfer
```

Expected: FAIL because schema 10 and the new fields/stages do not exist.

- [ ] **Step 3: Add exact types**

Add these shapes to `types.ts`:

```ts
export type PlatformAiExternalRecapitalizationStatus =
    | 'OFFERED'
    | 'DECLINED'
    | 'SETTLED'
    | 'FAILED';

export interface PlatformAiSpendingRestrictions {
    source: 'NONE' | 'RESTRUCTURE' | 'PARENT_RESCUE' | 'EXTERNAL_RECAPITALIZATION' | 'ADMINISTRATION';
    blocksNewBids: boolean;
    blocksNewGreenlights: boolean;
    blocksNewResearch: boolean;
    blocksExpansion: boolean;
    expiresAtAbsoluteWeek: number | null;
}

export interface PlatformAiExternalRecapitalization {
    id: string;
    idempotencyKey: string;
    episodeId: string;
    platformId: PlatformId;
    status: PlatformAiExternalRecapitalizationStatus;
    investorArchetype: 'PRIVATE_EQUITY' | 'MEDIA_GROUP' | 'TECH_GROUP' | 'TELECOM_GROUP' | 'SOVEREIGN_FUND';
    offeredMillions: number;
    settledMillions: number;
    arrearsReductionMillions: number;
    debtReductionMillions: number;
    cashRemainderMillions: number;
    dilutionPercent: number;
    autonomyPenalty: number;
    valuationConfidenceMultiplier: number;
    offeredAtAbsoluteWeek: number;
    settledAtAbsoluteWeek: number | null;
    cooldownUntilAbsoluteWeek: number | null;
    reason: string;
}

export interface PlatformAiAdministrationState {
    enteredAtAbsoluteWeek: number;
    episodeId: string;
    outcome: 'PENDING' | 'ACQUISITION_AVAILABLE' | 'REGIONAL_DOWNSIZE' | 'DORMANT';
    resolvedAtAbsoluteWeek: number | null;
    referenceId: string | null;
}

export interface PlatformAiRecurringEfficiencySnapshot {
    controller: 'AI' | 'PLAYER';
    policyVersion: number;
    costMultiplier: number;
    standardEligibleCostMillions: number;
    appliedEligibleCostMillions: number;
    savingMillions: number;
}

export type StreamingEcosystemStartingClass =
    | 'LOCAL_STARTUP'
    | 'REGIONAL_CHALLENGER'
    | 'CORPORATE_ENTRANT'
    | 'GLOBAL_ENTRANT';
```

Extend finance/runtime/operator shapes with the exact new fields named in the interfaces. Add `externalInvestmentIncomeMillions`, `externalInvestmentDebtReductionMillions`, `externalInvestmentArrearsReductionMillions`, `administrationCostMillions`, and `recurringEfficiency` to `PlatformAiFinanceSnapshot`.

- [ ] **Step 4: Normalize by stage name, not old index**

In `platformAiState.ts`, use one canonical ten-stage constant. Rebuild an episode's contiguous position by looking up the saved `stageResults[].stage` names. Preserve valid old results; insert no fake result for new stages; clamp malformed numbers; retain the active episode plus latest eight completed episodes.

Initialize:

```ts
externalRecapitalizations: [],
administration: null,
spendingRestrictions: {
    source: 'NONE',
    blocksNewBids: false,
    blocksNewGreenlights: false,
    blocksNewResearch: false,
    blocksExpansion: false,
    expiresAtAbsoluteWeek: null,
},
```

Normalize every number to finite non-negative bounds and every cooldown/reference to a valid integer or `null`.

- [ ] **Step 5: Run focused schema and save audits**

Run the three commands from Step 2. Expected: PASS.

- [ ] **Step 6: Commit the schema slice**

```bash
git add types.ts services/platformAi/platformAiState.ts services/streamingPlatformEcosystem.ts scripts/audit-platform-ai-distress.ts scripts/audit-save-migration.ts scripts/audit-save-transfer.ts
git commit -m "feat: add platform AI phase 5 finance state"
```

---

### Task 2: Auditable recurring AI COGS efficiency

**Files:**

- Modify: `services/platformAi/platformAiOperatingProfiles.ts`
- Modify: `services/platformAi/platformAiEfficiency.ts`
- Modify: `services/platformAi/platformAiEconomy.ts`
- Modify: `services/platformAi/platformAiState.ts`
- Modify: `services/platformAi/index.ts`
- Test: `scripts/audit-platform-ai-economy.ts`
- Test: `scripts/audit-platform-ai-phase4-profiles.ts`

**Interfaces:**

- Produces `createPlatformAiRecurringEfficiencySnapshot(standardEligibleCostMillions, multiplier, controller)`.
- `calculatePlatformAiWeeklyEconomy` records standard/applied eligible COGS and uses only the applied amount in settlement.
- Acquisition handoff consumes controller `PLAYER` and receives multiplier `1`.

- [ ] **Step 1: Write failing eligible/ineligible cost assertions**

Create an economy fixture with known delivery, base operations, market, tax, contract, rights, research, and debt costs. Assert:

```ts
assert.ok(snapshot.recurringEfficiency.costMultiplier >= 0.88);
assert.ok(snapshot.recurringEfficiency.costMultiplier <= 0.95);
closeTo(
    snapshot.recurringEfficiency.appliedEligibleCostMillions,
    snapshot.recurringEfficiency.standardEligibleCostMillions
        * snapshot.recurringEfficiency.costMultiplier,
    'Eligible recurring COGS must use the saved AI multiplier',
);
closeTo(snapshot.marketPolicyCostMillions, expectedTaxAndLevy, 'Taxes cannot receive AI discount');
closeTo(snapshot.contractualCostAccruedMillions, expectedContractCost, 'Contract prices cannot receive AI discount');
closeTo(snapshot.financingCostAccruedMillions, expectedDebtCost, 'Debt cannot receive AI discount');
```

Acquire the same platform through the existing handoff and assert the next snapshot multiplier is `1` while the earlier snapshot remains byte-for-byte unchanged.

- [ ] **Step 2: Run the economy/profile audits and observe failure**

```bash
npm run audit:platform-ai-economy
npm run audit:platform-ai-phase4
```

Expected: FAIL because recurring COGS efficiency is not represented.

- [ ] **Step 3: Extend the operating policy**

Add `recurringOperationsCostMultiplier` to `PlatformAiOperatingEfficiencyPolicy`. Clamp it to `0.88...0.95`. Give each static profile an explicit value inside the band; use `0.90` as the migration/default value.

Do not alter saved Phase 4 commitment snapshots or their existing cost/lead-time multipliers.

- [ ] **Step 4: Implement the pure snapshot helper**

Add:

```ts
export const createPlatformAiRecurringEfficiencySnapshot = (
    standardEligibleCostMillions: number,
    configuredMultiplier: number,
    controller: 'AI' | 'PLAYER',
): PlatformAiRecurringEfficiencySnapshot;
```

Clamp/round inputs, force player multiplier to `1`, and return standard cost, applied cost, and saving without mutating input.

- [ ] **Step 5: Apply the multiplier at one economy boundary**

Define eligible recurring COGS as delivery plus base internal operations. Include market operations only when the cost is an internal recurring operation and exclude `marketPolicyCostMillions`. Keep research and localization recurring costs on their already saved Phase 4 terms so they are not discounted twice.

Record the snapshot and calculate `operatingCostMillions` from applied eligible COGS plus every ineligible cost. Do not mutate the profile or old finance history.

- [ ] **Step 6: Run audits**

```bash
npm run audit:platform-ai-economy
npm run audit:platform-ai-phase4
npm run audit:platform-ai-turn
```

Expected: PASS.

- [ ] **Step 7: Commit the COGS slice**

```bash
git add types.ts services/platformAi/platformAiOperatingProfiles.ts services/platformAi/platformAiEfficiency.ts services/platformAi/platformAiEconomy.ts services/platformAi/platformAiState.ts services/platformAi/index.ts scripts/audit-platform-ai-economy.ts scripts/audit-platform-ai-phase4-profiles.ts
git commit -m "feat: add bounded rival platform COGS efficiency"
```

---

### Task 3: Pure recapitalization and administration policy

**Files:**

- Create: `services/platformAi/platformAiFinancing.ts`
- Modify: `services/platformAi/index.ts`
- Test: `scripts/audit-platform-ai-distress.ts`

**Interfaces:**

- Consumes normalized platform/runtime state, trailing finance, operating profile, competitive pressure, episode, controller, and absolute week.
- Produces `quotePlatformAiExternalRecapitalization`, `createPlatformAiFundingRecord`, `getPlatformAiPostFundingRestrictions`, and `choosePlatformAiAdministrationOutcome`.
- The module is pure: it returns quotes/outcomes and never mutates `WorldState`.

- [ ] **Step 1: Add failing deterministic quote tests**

Assert the following cases:

```ts
assert.equal(quotePlatformAiExternalRecapitalization(playerOwnedInput).eligible, false);
assert.equal(quotePlatformAiExternalRecapitalization(noNeedInput).amountMillions, 0);
assert.equal(quotePlatformAiExternalRecapitalization(cooldownInput).eligible, false);
assert.deepEqual(
    quotePlatformAiExternalRecapitalization(viableInput),
    quotePlatformAiExternalRecapitalization(structuredClone(viableInput)),
);
assert.ok(quotePlatformAiExternalRecapitalization(viableInput).amountMillions <= viableInput.actualNeedMillions);
assert.ok(quotePlatformAiExternalRecapitalization(weakAssetInput).confidence < quotePlatformAiExternalRecapitalization(viableInput).confidence);
```

Assert that the same episode can create only one stable funding record and that administration selects only one of the disclosed outcomes.

- [ ] **Step 2: Run the distress audit and observe failure**

```bash
npm run audit:platform-ai-distress
```

Expected: FAIL because `platformAiFinancing.ts` does not exist.

- [ ] **Step 3: Define pure input/output contracts**

Use:

```ts
export interface PlatformAiExternalFundingQuoteInput {
    player: Player;
    platform: PlatformState;
    episode: PlatformAiDistressEpisode;
    absoluteWeek: number;
    competitivePressure: number;
}

export interface PlatformAiExternalFundingQuote {
    eligible: boolean;
    amountMillions: number;
    confidence: number;
    investorArchetype: PlatformAiExternalRecapitalization['investorArchetype'];
    dilutionPercent: number;
    autonomyPenalty: number;
    valuationConfidenceMultiplier: number;
    reason: string;
}
```

Calculate confidence from normalized trailing revenue/margin, subscribers, catalogue, technology, reputation, debt burden, prior rescues/funding, and competitive pressure. Use only deterministic IDs/RNG keyed by player, platform, episode, stage, and week.

- [ ] **Step 4: Cap funding and create restrictions**

Cap proceeds by the minimum of actual need, thirteen weeks of trailing revenue/mandatory cost scale, a bounded target-reserve share, and valuation-supported investment capacity. Use the quote to create dilution `5...35`, autonomy penalty `5...40`, and valuation confidence multiplier `0.65...0.95`.

Return post-funding restrictions that block bids, greenlights, research, and expansion for a saved monitoring window. The record carries `cooldownUntilAbsoluteWeek = settledAtAbsoluteWeek + 104`.

- [ ] **Step 5: Add administration outcome policy**

`choosePlatformAiAdministrationOutcome` evaluates viable acquisition value, home-market strength, catalogue value, debt, and compact-ecosystem compatibility. It returns `ACQUISITION_AVAILABLE`, `REGIONAL_DOWNSIZE`, or `DORMANT` with a stable reason/reference; it never transfers state itself.

- [ ] **Step 6: Run and pass the pure policy tests**

```bash
npm run audit:platform-ai-distress
```

Expected: PASS for the newly added pure-policy section while existing integration assertions remain unchanged.

- [ ] **Step 7: Commit the policy slice**

```bash
git add services/platformAi/platformAiFinancing.ts services/platformAi/index.ts scripts/audit-platform-ai-distress.ts
git commit -m "feat: add deterministic platform recapitalization policy"
```

---

### Task 4: Durable funding and bankruptcy administration integration

**Files:**

- Modify: `services/platformAi/platformAiDistress.ts`
- Modify: `services/platformAi/platformAiEconomy.ts`
- Modify: `services/platformAi/platformAiState.ts`
- Modify: `services/platformAi/platformAiTurn.ts`
- Test: `scripts/audit-platform-ai-distress.ts`
- Test: `scripts/audit-platform-ai-turn.ts`

**Interfaces:**

- Consumes Task 3 pure quotes/outcomes.
- Produces exact-once world mutations, finance snapshot reconciliation, saved restrictions, decision records, and presentation events.
- Leaves accepted contracts/projects canonical and intact.

- [ ] **Step 1: Add failing end-to-end distress episode tests**

Build one viable platform and one structurally failed platform at the new stages. Assert:

```ts
assert.equal(fundedEpisode.stageResults.at(-1)?.stage, 'EXTERNAL_RECAPITALIZATION');
assert.equal(funded.ai!.externalRecapitalizations.length, 1);
assert.equal(funded.ai!.externalRecapitalizations[0].status, 'SETTLED');
closeTo(
    funding.settledMillions,
    funding.arrearsReductionMillions + funding.debtReductionMillions + funding.cashRemainderMillions,
    'Every funding dollar must have one disposition',
);
assert.equal(replay.world, funded.world, 'Same-week replay must be an exact no-op');

assert.equal(adminPlatform.ai!.administration?.outcome, 'PENDING');
assert.equal(adminPlatform.ai!.spendingRestrictions.source, 'ADMINISTRATION');
assert.equal(adminPlatform.ai!.spendingRestrictions.blocksNewBids, true);
```

Also assert that accepted projects, rights contracts, and debt still exist after entering administration.

- [ ] **Step 2: Run distress/turn audits and observe failure**

```bash
npm run audit:platform-ai-distress
npm run audit:platform-ai-turn
```

Expected: FAIL because the new stages are not executed.

- [ ] **Step 3: Integrate `EXTERNAL_RECAPITALIZATION`**

In the world-aware resolver:

1. require failed restructuring and a resolved/unavailable parent-rescue stage;
2. quote once using the episode idempotency key;
3. persist a `FAILED`/`DECLINED` record and stage result when no offer settles;
4. on settlement, apply arrears, then debt, then bounded cash;
5. update the current finance snapshot's exceptional-finance fields;
6. persist restrictions and cooldown;
7. move the episode into a monitoring state without reopening earlier stages.

Do not count proceeds as operating revenue or operating margin.

- [ ] **Step 4: Integrate `BANKRUPTCY_ADMINISTRATION`**

Create the administration state and restrictions exactly once. Ordinary platform planning is blocked, but economy settlement continues so mandatory obligations and debt remain honest. Resolve the chosen outcome only through an existing compatible acquisition/dormancy/compact-operator adapter; otherwise keep `PENDING` or proceed to the next saved `DORMANT` stage without deleting rights.

- [ ] **Step 5: Add recovery rules**

A funded platform remains `RESTRUCTURING` during monitoring. Clear restrictions and return to `ACTIVE` only after the existing required healthy operating weeks with zero new mandatory shortfall and no debt. Failed monitoring continues to administration; it cannot request a second funding record in the same episode.

- [ ] **Step 6: Emit saved presentation data**

Add deterministic decision/presentation records for material funding and administration events. Store amounts and consequences in canonical state; do not generate the deferred X/Instagram reaction feed.

- [ ] **Step 7: Run audits**

```bash
npm run audit:platform-ai-distress
npm run audit:platform-ai-economy
npm run audit:platform-ai-turn
```

Expected: PASS.

- [ ] **Step 8: Commit the integration slice**

```bash
git add services/platformAi/platformAiDistress.ts services/platformAi/platformAiEconomy.ts services/platformAi/platformAiState.ts services/platformAi/platformAiTurn.ts scripts/audit-platform-ai-distress.ts scripts/audit-platform-ai-turn.ts
git commit -m "feat: add platform funding and bankruptcy administration"
```

---

### Task 5: Spending, bidding, commissioning, acquisition, and valuation consequences

**Files:**

- Modify: `services/platformAi/platformAiPlanning.ts`
- Modify: `services/platformAi/platformAiResearchPortfolio.ts`
- Modify: `services/platformAi/platformAiMarkets.ts`
- Modify: `services/platformAi/platformAiPlayerCommissions.ts`
- Modify: `services/streamingBidding.ts`
- Modify: `services/platformAi/platformAiEconomy.ts`
- Modify: `services/streamingAcquisitions.ts`
- Test: `scripts/audit-platform-ai-economy.ts`
- Test: `scripts/audit-streaming-active-bidding-phase2.ts`
- Test: `scripts/audit-platform-ai-player-commissions.ts`
- Test: `scripts/audit-streaming-acquisitions-phase21.ts`

**Interfaces:**

- Consumes normalized `PlatformAiSpendingRestrictions`, administration, debt, runway, and external funding consequences.
- Produces consistent planning gates, bid capacity, commission eligibility, and standalone/acquisition valuation.

- [ ] **Step 1: Add failing restriction tests**

Assert that a restricted platform:

- cannot start a new bidding session or revise with a new offer;
- cannot create a new player commission;
- cannot start new research or market expansion;
- does not cancel or alter an already signed bidding contract or accepted player commission;
- continues mandatory settlement and already-running production;
- returns to normal only after the saved restriction expires and recovery state is valid.

Use explicit assertions such as:

```ts
assert.equal(restrictedBid.skippedReason, 'PLATFORM_FINANCIAL_RESTRICTION');
assert.equal(restrictedCommission.changed, false);
assert.equal(restrictedCommission.reason, 'PLATFORM_FINANCIAL_RESTRICTION');
assert.deepEqual(afterRestriction.signedContracts, beforeRestriction.signedContracts);
```

- [ ] **Step 2: Run the four focused audits and observe failure**

```bash
npm run audit:streaming-active-bidding-phase2
npm run audit:platform-ai-player-commissions
npm run audit:platform-ai-economy
npm run audit:streaming-acquisitions-phase21
```

Expected: FAIL at the new restriction/valuation assertions.

- [ ] **Step 3: Add one shared restriction selector**

Export:

```ts
export const getPlatformAiSpendingRestrictions = (
    platform: PlatformState,
    absoluteWeek: number,
): PlatformAiSpendingRestrictions;
```

All planning, research, market, bidding, and commission services call this selector instead of independently checking strings/status. Expired restrictions return the canonical `NONE` shape but are cleared only through a state mutation boundary.

- [ ] **Step 4: Apply gates at creation boundaries**

Block only new discretionary actions. Never mutate immutable offers, signed contracts, accepted commissions, settled obligations, or active production merely because a later restriction begins.

- [ ] **Step 5: Extend valuation**

Keep the 85/15 smoothing. Feed debt, administration, distress, dilution, autonomy penalty, and funding confidence into a bounded distress/confidence multiplier. Do not add funding proceeds to operating revenue. Ensure a large funding round cannot increase valuation more than the underlying operating/cash/debt improvement justifies.

- [ ] **Step 6: Preserve acquisition authority**

Expose administration/distress through existing acquisition valuation and eligibility selectors. On player acquisition, preserve funding history, dilution history, debt, projects, rights, and markets; disable restrictions sourced only from AI automation and prohibit future AI rescue/funding.

- [ ] **Step 7: Run focused audits**

Run the commands from Step 2. Expected: PASS.

- [ ] **Step 8: Commit the consequence slice**

```bash
git add services/platformAi/platformAiPlanning.ts services/platformAi/platformAiResearchPortfolio.ts services/platformAi/platformAiMarkets.ts services/platformAi/platformAiPlayerCommissions.ts services/streamingBidding.ts services/platformAi/platformAiEconomy.ts services/streamingAcquisitions.ts scripts/audit-platform-ai-economy.ts scripts/audit-streaming-active-bidding-phase2.ts scripts/audit-platform-ai-player-commissions.ts scripts/audit-streaming-acquisitions-phase21.ts
git commit -m "feat: enforce platform financial restrictions"
```

---

### Task 6: Competition health and credible generated entrants

**Files:**

- Create: `services/streamingPlatformCompetitionHealth.ts`
- Modify: `services/streamingPlatformEcosystemTurn.ts`
- Modify: `services/streamingPlatformEcosystem.ts`
- Modify: `types.ts`
- Test: `scripts/audit-global-streaming-ecosystem.ts`

**Interfaces:**

- Produces `calculateStreamingCompetitionHealth(player, state)` and `chooseStreamingEcosystemLaunchClass(input)`.
- `maybeLaunchOperator` consumes a health snapshot and starting class but retains the existing 26-week cooldown, operator caps, market room checks, deterministic identity, and stable brand generation.
- Non-core operators remain string IDs and never masquerade as `PlatformId`.

- [ ] **Step 1: Add failing health and launch-class tests**

Assert:

```ts
const healthy = calculateStreamingCompetitionHealth(player, healthyState);
const concentrated = calculateStreamingCompetitionHealth(player, concentratedState);
assert.ok(concentrated.launchPressure > healthy.launchPressure);
assert.equal(concentrated.reasons.includes('INSUFFICIENT_GLOBAL_GIANTS'), true);

const giant = createDynamicStreamingOperator({
    playerId: player.id,
    state,
    absoluteWeek,
    homeCountryId: 'US',
    origin: 'CONGLOMERATE_BACKED',
    startingClass: 'GLOBAL_ENTRANT',
});
assert.equal(giant.startingClass, 'GLOBAL_ENTRANT');
assert.ok(giant.activeCountryIds.length >= 3);
assert.ok(giant.cashMillions > regional.cashMillions);
assert.deepEqual(giant.brand, replayedGiant.brand);
assert.equal('platformId' in getStreamingCompanySummary(playerWithGiant, giant.id), false);
```

Also prove a healthy world cannot produce weekly giants, and pressure cannot bypass the existing active-operator/global-visible caps.

- [ ] **Step 2: Run the ecosystem audit and observe failure**

```bash
npm run audit:global-streaming-ecosystem
```

Expected: FAIL because competition health and starting classes do not exist.

- [ ] **Step 3: Implement the pure health selector**

Return:

```ts
export interface StreamingCompetitionHealth {
    launchPressure: number; // 0...1
    activeGlobalGiants: number;
    visibleInternationalChallengers: number;
    underservedCountryIds: string[];
    concentrationScore: number; // 0...1
    reasons: Array<'INSUFFICIENT_GLOBAL_GIANTS' | 'HIGH_CONCENTRATION' | 'UNDERSERVED_REGIONS' | 'HEALTHY'>;
}
```

Calculate from canonical active operators, visible summaries, market shares, subscribers, and lifecycle. The selector does not mutate state or call random functions.

- [ ] **Step 4: Map origins and starting classes**

Keep existing origin profiles as the base. Apply bounded class multipliers:

| Starting class | Cash/subscriber scale | Starting markets | Eligible origins |
| --- | ---: | ---: | --- |
| `LOCAL_STARTUP` | `0.8...1.0` | 1 | all |
| `REGIONAL_CHALLENGER` | `1.0...1.35` | 2–3 | venture, broadcaster, studio, telecom |
| `CORPORATE_ENTRANT` | `1.25...1.75` | 2–4 | telecom, broadcaster, tech, conglomerate |
| `GLOBAL_ENTRANT` | `1.75...2.5` | 3–6 | tech or conglomerate only |

Clamp all final values to finite configured bounds. Global entrants remain rare and cannot start with every capability or infinite runway.

- [ ] **Step 5: Feed pressure into bounded launch choice**

Keep the 26-week minimum launch gap. Use pressure only to adjust the existing deterministic launch threshold and class weights. Preserve fewer than 24 active non-core operators and fewer than four visible fictional globals. Include health, sequence, week, home country, origin, and starting class in the deterministic seed and persist the selected class immediately.

- [ ] **Step 6: Preserve visibility/deep-system boundaries**

Forbes and global selectors may show a qualified entrant using `StreamingCompanySummary.kind = 'DYNAMIC'`. It receives no deep rights, bidding, or commission actions until a later canonical materialization system exists.

- [ ] **Step 7: Run the ecosystem audit**

```bash
npm run audit:global-streaming-ecosystem
```

Expected: PASS, including reload-stable brand and launch output.

- [ ] **Step 8: Commit the ecosystem slice**

```bash
git add types.ts services/streamingPlatformCompetitionHealth.ts services/streamingPlatformEcosystemTurn.ts services/streamingPlatformEcosystem.ts scripts/audit-global-streaming-ecosystem.ts
git commit -m "feat: preserve streaming competition with credible entrants"
```

---

### Task 7: Full Phase 5 integration and bounded verification

**Files:**

- Modify: `scripts/audit-platform-ai-turn.ts`
- Modify: `scripts/audit-platform-ai-scalability.ts`
- Modify: `scripts/audit-save-migration.ts`
- Modify: `scripts/audit-save-transfer.ts`
- Modify: `package.json` only if the aggregate audit needs an existing command updated
- Review: every file changed in Tasks 1–6

**Interfaces:**

- Consumes the completed schema, economy, financing, distress, restrictions, valuation, and ecosystem boundaries.
- Produces final deterministic Phase 5 verification evidence and no new gameplay API.

- [ ] **Step 1: Add a 260-week adverse integration scenario**

Use fixed seeds and process the same fixture in two paths:

```ts
const uninterrupted = runWeeks(seedFixture, 260);
const resumed = runWeeks(
    migratePlayerSave(JSON.parse(JSON.stringify(runWeeks(seedFixture, 130)))),
    130,
);
assert.deepEqual(canonicalPhase5Projection(resumed), canonicalPhase5Projection(uninterrupted));
```

The projection includes platform cash/debt/valuation, finance history shape, restrictions, rescues, recapitalizations, administration, distress episodes, catalogue distress deals, ecosystem operators/brands/classes, market shares, and event IDs.

- [ ] **Step 2: Assert balance invariants**

Across the adverse scenario assert:

- all amounts and valuations are finite;
- no AI/player efficiency leakage occurs;
- no finance week or exceptional-financing ID duplicates;
- no project or rights contract clones appear;
- at least one adverse seed can reach distress;
- not every distressed platform receives rescue or funding;
- a funded platform does not immediately create blocked discretionary actions;
- a bankrupt platform preserves its canonical assets/obligations;
- generated launch count and history stay bounded;
- market shares remain normalized.

- [ ] **Step 3: Run the focused Phase 5 suite**

```bash
npm run audit:platform-ai-economy
npm run audit:platform-ai-distress
npm run audit:platform-ai-turn
npm run audit:platform-ai-scalability
npm run audit:global-streaming-ecosystem
npm run audit:streaming-active-bidding-phase2
npm run audit:platform-ai-player-commissions
npm run audit:streaming-acquisitions-phase21
npm run audit:save-migration
npm run audit:save-transfer
```

Expected: PASS.

- [ ] **Step 4: Run adjacent Platform AI and Phase 4 regressions**

```bash
npm run audit:platform-ai-domain
npm run audit:platform-ai-sourcing
npm run audit:platform-ai-production
npm run audit:platform-ai-research
npm run audit:platform-ai-localization
npm run audit:platform-ai-rights-lifecycle
npm run audit:platform-ai-release
npm run audit:platform-ai-phase4
```

Expected: PASS. If an unrelated baseline audit fails, record the exact pre-existing failure and do not misattribute it to Phase 5.

- [ ] **Step 5: Run build and diff hygiene**

```bash
npm run build
git diff --check
git status --short
```

Expected: build succeeds; Phase 5 changes contain no whitespace errors; unrelated dirty files remain untouched and unstaged.

- [ ] **Step 6: Review controller and money boundaries manually**

Use `rg` to confirm:

```bash
rg -n "EXTERNAL_RECAPITALIZATION|BANKRUPTCY_ADMINISTRATION|recurringOperationsCostMultiplier" types.ts services scripts
rg -n "Math\.random|Date\.now" services/platformAi services/streamingPlatformCompetitionHealth.ts services/streamingPlatformEcosystemTurn.ts
```

Expected: every new saved decision uses deterministic helpers and every player-control boundary returns no AI financing/efficiency.

- [ ] **Step 7: Commit final audit integration**

```bash
git add scripts/audit-platform-ai-turn.ts scripts/audit-platform-ai-scalability.ts scripts/audit-save-migration.ts scripts/audit-save-transfer.ts package.json
git commit -m "test: verify platform AI phase 5 economy"
```

- [ ] **Step 8: Report Phase 5 honestly**

Report implemented behavior, affected game surfaces, exact audit/build results, any baseline failures, and the fact that the full 2,600-week Phase 8 endurance certification remains outstanding.
