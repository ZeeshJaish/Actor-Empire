# Platform AI Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Subagent-driven development is prohibited by the Platform AI master plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic shared research, country-market, language-capability, and per-title localization system for AI streaming platforms, with mature starting assets, dynamic one-to-four research capacity, bounded AI efficiency, and clean player-acquisition handoff.

**Architecture:** Extend the existing canonical player research/technology, country-market, and title-language concepts instead of adding a second AI-only simulation. Declarative AI operating profiles seed mature historical assets and supply bounded efficiency policies; focused Platform AI services select and persist decisions while the ownership resolver prevents mutation after acquisition.

**Tech Stack:** TypeScript, React/Vite, deterministic Platform AI services, existing streaming research/technology/market cores, Node `assert` audit scripts bundled with esbuild.

**Spec:** `docs/superpowers/specs/2026-08-27-platform-ai-phase4-research-markets-localization-design.md`

## Global Constraints

- Do not use subagents.
- Do not stage or commit any files.
- Preserve unrelated work in the dirty workspace.
- Use `apply_patch` for hand edits.
- Use strict RED-to-GREEN slices: every task begins with a meaningful failing audit and ends with fresh passing evidence.
- Never use `Math.random()` or `Date.now()` in Platform AI decisions.
- Player-controlled platforms receive no automatic AI decision or AI efficiency.
- Existing installed technology, active countries, paid work, and completed progress survive acquisition.
- Do not redesign rival cards, Platform Wars, News, or X in Phase 4.
- Do not create streaming or theatrical releases in Phase 4.
- Use full currency only at shared player-domain boundaries; Platform AI persisted finance remains in millions.

---

## File responsibility map

### New focused files

- `services/platformAi/platformAiOperatingProfiles.ts` — declarative starting scale, countries, historical installed definitions, languages, and AI efficiency policy.
- `services/platformAi/platformAiResearchPortfolio.ts` — dynamic capacity, forward obligations, portfolio affordability, and deterministic multi-choice selection.
- `services/platformAi/platformAiLanguageCapabilities.ts` — language normalization, subtitle/dub tiers, package unlocks, and title-country comprehension.
- `services/streamingLocalizationCapabilities.ts` — shared player/AI localization foundation, subtitle/dub tier definitions, prerequisites, and exact language packages.
- `scripts/audit-platform-ai-phase4-profiles.ts` — mature/legacy/future-profile and acquisition invariants.
- `scripts/audit-platform-ai-phase4-language.ts` — language tiers, per-language jobs, promises, and comprehension invariants.

### Existing focused files

- `types.ts` — Phase 4 state and immutable efficiency-snapshot types.
- `services/platformAi/platformAiProfiles.ts` — existing strategic/economic profiles; references the new operating profile without duplicating it.
- `services/platformAi/platformAiState.ts` — schema normalization, mature historical seeding, legacy migration, and canonical validation.
- `services/platformAi/platformAiResearch.ts` — commit/progress one research item using portfolio decisions and efficiency quotes.
- `services/platformAi/platformAiMarkets.ts` — catalogue/slate/language-aware country selection and AI market quotes.
- `services/platformAi/platformAiLocalizationCore.ts` — per-language quote and stable IDs.
- `services/platformAi/platformAiLocalization.ts` — exact jobs and readiness.
- `services/platformAi/platformAiEconomy.ts` — exact-once settlement/start transition for localization obligations.
- `services/platformAi/platformAiTurn.ts` — canonical weekly ordering and portfolio planning.
- `services/platformAi/platformAiContentSourcing.ts` — capability-backed localization promises.
- `services/platformAi/platformAiRelease.ts` — readiness queries only; no Phase 6 redesign.
- `services/platformAi/index.ts` — exports.
- `services/streamingBidding.ts` and `services/streamingRightsCore.ts` — clamp offered localization to real capability without redesigning the room.
- `views/HomePage.tsx` — one QA-only Phase 4 fixture/snapshot action.
- `scripts/audit-platform-ai-research.ts` — research, market, migration, replay, and acquisition coverage.
- `scripts/audit-platform-ai-localization.ts` — exact payment and job lifecycle coverage.
- `package.json` — focused audit commands and aggregate audit inclusion.

---

### Task 1: Define Phase 4 domain types and operating profiles

**Files:**
- Create: `services/platformAi/platformAiOperatingProfiles.ts`
- Create: `scripts/audit-platform-ai-phase4-profiles.ts`
- Modify: `types.ts`
- Modify: `services/platformAi/platformAiProfiles.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `PlatformAiCompanyScale`, `PlatformAiOperatingEfficiencyPolicy`, `PlatformAiEfficiencySnapshot`, `PlatformAiLanguageCapability`, `PlatformAiOperatingProfile`.
- Produces: `PLATFORM_AI_OPERATING_PROFILES`, `getPlatformAiOperatingProfile(platformId)`, `clampPlatformAiEfficiencyPolicy(value)`.

- [ ] **Step 1: Write the failing profile audit**

Create fixtures asserting all five current platforms have valid scale, home countries, starting countries, historical installed research IDs, exact language capabilities, and efficiency values inside the approved bands.

```ts
for (const platformId of ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'] as PlatformId[]) {
    const profile = getPlatformAiOperatingProfile(platformId);
    assert.ok(profile.startingCountryIds.length >= profile.homeCountryIds.length);
    assert.ok(profile.startingLanguageCapabilities.every(item => item.subtitleLevel >= 0 && item.subtitleLevel <= 3));
    assert.ok(profile.efficiency.researchCostMultiplier >= 0.8 && profile.efficiency.researchCostMultiplier <= 0.95);
    assert.ok(profile.efficiency.leadTimeMultiplier >= 0.85 && profile.efficiency.leadTimeMultiplier <= 1);
}
assert.ok(getPlatformAiOperatingProfile('NETFLIX').startingCountryIds.includes('US'));
assert.ok(getPlatformAiOperatingProfile('NETFLIX').startingCountryIds.includes('IN'));
assert.ok(getPlatformAiOperatingProfile('NETFLIX').startingCountryIds.includes('JP'));
```

- [ ] **Step 2: Register and run the audit to confirm RED**

Add `audit:platform-ai-phase4-profiles` to `package.json` using the existing esbuild audit pattern.

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: FAIL because the profile module and types do not exist.

- [ ] **Step 3: Add the domain types**

Add exact persisted and quote types:

```ts
export type PlatformAiCompanyScale = 'REGIONAL' | 'GROWTH' | 'MATURE' | 'GLOBAL';
export type PlatformAiLocalizationMode = 'SUBTITLE' | 'DUB';

export interface PlatformAiOperatingEfficiencyPolicy {
    researchCostMultiplier: number;
    installationCostMultiplier: number;
    marketEntryCostMultiplier: number;
    localizationCostMultiplier: number;
    leadTimeMultiplier: number;
    localizationThroughputMultiplier: number;
    localPartnershipEligible: boolean;
}

export interface PlatformAiEfficiencySnapshot {
    controller: 'AI';
    policyVersion: number;
    costMultiplier: number;
    leadTimeMultiplier: number;
    standardCostMillions: number;
    appliedCostMillions: number;
    savingMillions: number;
}

export interface PlatformAiLanguageCapability {
    languageId: string;
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
    source: 'HISTORICAL_PROFILE' | 'LANGUAGE_PACKAGE' | 'PLAYER_HANDOFF';
    sourceReferenceId: string;
    activatedAtAbsoluteWeek: number;
}
```

- [ ] **Step 4: Implement declarative operating profiles**

Keep economic/creative competence in `platformAiProfiles.ts`; put only operating starting state and efficiency in the new module. Use canonical country IDs already present in `streamingDayOneMarkets.ts` and canonical research/technology IDs from the player catalogues.

```ts
export interface PlatformAiOperatingProfile {
    platformId: PlatformId;
    version: number;
    scale: PlatformAiCompanyScale;
    homeCountryIds: string[];
    startingCountryIds: string[];
    historicalResearchDefinitionIds: string[];
    startingLanguageCapabilities: PlatformAiLanguageCapability[];
    researchOrganizationLevel: number;
    expansionAmbition: number;
    localizationAmbition: number;
    efficiency: PlatformAiOperatingEfficiencyPolicy;
}
```

Validate every referenced definition and country at module construction. Throw a descriptive developer error for invalid static profile data rather than silently manufacturing an ID.

- [ ] **Step 5: Run GREEN and existing domain audit**

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: PASS.

Run: `npm run audit:platform-ai-domain`

Expected: PASS.

- [ ] **Step 6: Review checkpoint**

Run: `git diff --check -- types.ts services/platformAi/platformAiOperatingProfiles.ts services/platformAi/platformAiProfiles.ts services/platformAi/index.ts scripts/audit-platform-ai-phase4-profiles.ts package.json`

Do not stage or commit.

---

### Task 2: Seed mature historical assets and migrate legacy saves

**Files:**
- Modify: `services/platformAi/platformAiState.ts`
- Modify: `scripts/audit-platform-ai-phase4-profiles.ts`
- Modify: `scripts/audit-platform-ai-research.ts`

**Interfaces:**
- Consumes: `getPlatformAiOperatingProfile(platformId)`.
- Produces: normalized `operatingProfileVersion`, historical `OPERATING` research items, `languageCapabilities`, and active market operations.

- [ ] **Step 1: Extend the audit with mature and preserve-first cases**

```ts
const fresh = normalizePlatformAiState(fixture.world.platforms!.NETFLIX, fixture.id, absoluteWeek);
assert.ok(fresh.ai!.researchQueue.some(item => item.stage === 'OPERATING'));
assert.ok(fresh.ai!.languageCapabilities.some(item => item.languageId === 'english'));
assert.equal(fresh.cashReserve, fixture.world.platforms!.NETFLIX.cashReserve);

const legacy = structuredClone(fresh);
legacy.ai!.capabilities.activeCountryIds = ['US'];
legacy.ai!.marketOperations = legacy.ai!.marketOperations.filter(item => item.countryId === 'US');
const migrated = normalizePlatformAiState(legacy, fixture.id, absoluteWeek + 1);
assert.deepEqual(migrated.ai!.capabilities.activeCountryIds, ['US']);
assert.deepEqual(normalizePlatformAiState(migrated, fixture.id, absoluteWeek + 1), migrated);
```

Also replace `assert.equal(migratedOnce.ai!.schemaVersion, 6)` in the existing research audit with `PLATFORM_AI_RUNTIME_SCHEMA_VERSION`.

- [ ] **Step 2: Run RED**

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: FAIL because runtime state lacks profile provenance and language capabilities.

Run: `npm run audit:platform-ai-research`

Expected: advance beyond the stale schema assertion, then fail on the new migration expectations if not already covered.

- [ ] **Step 3: Bump and normalize runtime schema**

Increment `PLATFORM_AI_RUNTIME_SCHEMA_VERSION`. Add these fields to `PlatformAiRuntimeState`:

```ts
operatingProfileVersion: number;
languageCapabilities: PlatformAiLanguageCapability[];
```

Build deterministic historical research items from the profile's definition IDs using canonical previews. Mark them `OPERATING`, set zero retroactive cash impact, and use stable IDs such as:

```ts
createDeterministicId('platform_ai_historical_research', platformId, researchDefinition.id)
```

Only seed the complete mature profile when the raw save has no canonical Phase 4 state. For established legacy Phase 4 state, preserve saved market, research, technology, and language values and fill only missing fields.

- [ ] **Step 4: Strengthen canonical validation**

Reject duplicate language IDs, invalid tiers, missing source IDs, noncanonical country IDs, and capability levels that are not backed by an `OPERATING` historical or completed research item.

- [ ] **Step 5: Run GREEN and idempotency checks**

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: PASS.

Run: `npm run audit:platform-ai-research`

Expected: PASS through the complete script.

Run: `npm run audit:platform-ai-domain`

Expected: PASS.

- [ ] **Step 6: Review checkpoint**

Run: `git diff --check -- types.ts services/platformAi/platformAiState.ts scripts/audit-platform-ai-phase4-profiles.ts scripts/audit-platform-ai-research.ts`

Do not stage or commit.

---

### Task 3: Replace the two-item research limit with an affordable portfolio

**Files:**
- Create: `services/platformAi/platformAiResearchPortfolio.ts`
- Modify: `services/platformAi/platformAiResearch.ts`
- Modify: `services/platformAi/platformAiTurn.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `scripts/audit-platform-ai-research.ts`

**Interfaces:**
- Produces: `getPlatformAiResearchCapacity(input)`, `getPlatformAiForwardObligations(input)`, `choosePlatformResearchPortfolio(input)`.
- Changes: `choosePlatformResearch` remains as a backward-compatible single-choice helper over the first portfolio choice.

- [ ] **Step 1: Write failing capacity and double-spend assertions**

Cover regional one-slot, mature two-slot, global three-slot, healthy global four-slot, distressed zero-new-slot, and four candidates attempting to reuse one cash reserve.

```ts
assert.equal(getPlatformAiResearchCapacity(regionalInput).capacity, 1);
assert.equal(getPlatformAiResearchCapacity(globalInput).capacity, 3);
assert.equal(getPlatformAiResearchCapacity(surplusGlobalInput).capacity, 4);
assert.equal(getPlatformAiResearchCapacity(distressedInput).availableSlots, 0);

const portfolio = choosePlatformResearchPortfolio(cashTightInput);
assert.ok(portfolio.projectedCashAfter >= portfolio.requiredReserveMillions);
assert.ok(portfolio.choices.length < 4);
```

- [ ] **Step 2: Run RED**

Run: `npm run audit:platform-ai-research`

Expected: FAIL because capacity and portfolio functions do not exist and the old hard limit remains two.

- [ ] **Step 3: Implement capacity and forward obligations**

Return an explainable result:

```ts
export interface PlatformAiResearchCapacityResult {
    baseCapacity: number;
    bonusCapacity: number;
    capacity: number;
    activeCount: number;
    availableSlots: number;
    requiredReserveMillions: number;
    forwardObligationsMillions: number;
    blockedReason: 'DISTRESSED' | 'CAPACITY' | 'RUNWAY' | null;
}
```

Use company scale for base capacity and grant at most one bonus slot. Sum unpaid research IP/install stages, held one-time obligations, committed content funding, live market operations, and planned localization before approving another choice.

- [ ] **Step 4: Implement deterministic portfolio selection**

Build all eligible choices, rank by the existing strategic score enhanced with real slate/market/language blockers, then greedily accept only compatible choices whose incremental forecast preserves reserve and operational capacity. Deduct projected lifecycle cost from the local forecast after every accepted choice.

Do not mutate world state during selection.

- [ ] **Step 5: Commit the selected portfolio in the planning cycle**

Replace the single research commitment in `runPlanningCycle` with a stable loop over `choosePlatformResearchPortfolio(...).choices`. Re-read canonical world state before each commitment and stop if a prior commitment changes affordability.

- [ ] **Step 6: Run GREEN and replay assertions**

Run: `npm run audit:platform-ai-research`

Expected: PASS, including same-week replay and simultaneous progression.

Run: `npm run audit:platform-ai-turn`

Expected: PASS.

- [ ] **Step 7: Review checkpoint**

Run: `git diff --check -- services/platformAi/platformAiResearchPortfolio.ts services/platformAi/platformAiResearch.ts services/platformAi/platformAiTurn.ts services/platformAi/index.ts scripts/audit-platform-ai-research.ts`

Do not stage or commit.

---

### Task 4: Apply bounded AI efficiency to research and country expansion

**Files:**
- Modify: `types.ts`
- Modify: `services/platformAi/platformAiResearch.ts`
- Modify: `services/platformAi/platformAiMarkets.ts`
- Modify: `services/platformAi/platformAiState.ts`
- Modify: `scripts/audit-platform-ai-research.ts`
- Modify: `scripts/audit-platform-ai-phase4-profiles.ts`

**Interfaces:**
- Produces: `createPlatformAiEfficiencySnapshot(standardCost, standardWeeks, policy, kind)`.
- Persists: optional `efficiencySnapshot` on research items and AI-sourced market operations.

- [ ] **Step 1: Write failing efficiency and acquisition assertions**

```ts
assert.ok(aiResearch.item!.researchCostMillions < standardResearchCostMillions);
assert.equal(aiResearch.item!.efficiencySnapshot?.standardCostMillions, standardResearchCostMillions);
assert.equal(
    aiResearch.item!.efficiencySnapshot?.savingMillions,
    standardResearchCostMillions - aiResearch.item!.researchCostMillions,
);
assert.equal(playerControlledResearch.changed, false);
assert.deepEqual(playerControlledResearch.world, acquiredWorld);
```

Assert multipliers outside the approved bounds normalize into them, hard market requirements remain enforced, and an allowed local partnership writes cost/limitation metadata rather than silently passing.

- [ ] **Step 2: Run RED**

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: FAIL because committed research/market operations have no efficiency snapshots.

- [ ] **Step 3: Apply immutable research quotes**

Calculate canonical standard previews first, then apply profile multipliers once at commitment. Persist standard cost, applied cost, saving, and lead multiplier. Progress uses persisted durations and costs, never recalculating from the live profile during AI control.

- [ ] **Step 4: Apply immutable market-entry quotes**

Add an optional AI metadata field to `OwnedStreamingMarketOperation`:

```ts
platformAiEfficiencySnapshot?: PlatformAiEfficiencySnapshot | null;
platformAiPartnership?: {
    partnerId: string;
    weeklyPremium: number;
    performanceCeilingPercent: number;
} | null;
```

AI entry can reduce cost/administrative time inside profile bounds. A partnership may satisfy only explicitly soft requirements and must add a recurring cost or revenue share. Security, rights, language, and mandatory compliance remain hard.

- [ ] **Step 5: Normalize and preserve frozen quotes**

Clamp malformed snapshots, preserve valid paid amounts, and remove AI metadata from newly created player actions. Acquisition does not retroactively increase amounts already paid; unpaid research/IP/install stages use player-standard quotes when later committed.

- [ ] **Step 6: Run GREEN**

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: PASS.

Run: `npm run audit:platform-ai-research`

Expected: PASS.

Run: `npm run audit:platform-ai-economy`

Expected: PASS with partnership recurring cost included exactly once where applicable.

- [ ] **Step 7: Review checkpoint**

Run: `git diff --check -- types.ts services/platformAi/platformAiResearch.ts services/platformAi/platformAiMarkets.ts services/platformAi/platformAiState.ts scripts/audit-platform-ai-research.ts scripts/audit-platform-ai-phase4-profiles.ts`

Do not stage or commit.

---

### Task 5: Add shared language tiers and title-country comprehension

**Files:**
- Create: `services/streamingLocalizationCapabilities.ts`
- Create: `services/platformAi/platformAiLanguageCapabilities.ts`
- Create: `scripts/audit-platform-ai-phase4-language.ts`
- Modify: `services/streamingResearchLifecycle.ts`
- Modify: `services/streamingTechnologyCampus.ts`
- Modify: `services/streamingCanonicalState.ts`
- Modify: `services/streamingOpeningCatalogue.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `package.json`

**Interfaces:**
- Produces shared: `STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS`, `STREAMING_LANGUAGE_PACKAGES`, `resolveStreamingLocalizationTiers(installedCapabilityIds)`.
- Produces AI: `normalizePlatformAiLanguageId`, `getPlatformAiLanguageCapability`, `resolvePlatformAiLocalizationModeSupport`, `resolvePlatformAiTitleCountryComprehension`.

- [ ] **Step 1: Write failing language and ordering audit**

```ts
assert.equal(resolvePlatformAiLocalizationModeSupport(ai, 'hindi', 'SUBTITLE').supported, true);
assert.equal(resolvePlatformAiLocalizationModeSupport(ai, 'hindi', 'DUB').supported, false);

const native = resolvePlatformAiTitleCountryComprehension(nativeInput);
const dubbed = resolvePlatformAiTitleCountryComprehension(dubbedInput);
const subtitled = resolvePlatformAiTitleCountryComprehension(subtitledInput);
const none = resolvePlatformAiTitleCountryComprehension(unlocalizedInput);
assert.ok(native.reachMultiplier >= dubbed.reachMultiplier);
assert.ok(dubbed.reachMultiplier > subtitled.reachMultiplier);
assert.ok(subtitled.reachMultiplier > none.reachMultiplier);
```

Include a Korean-title-in-India fixture, family-versus-prestige subtitle affinity, and low-quality dub appreciation loss.

- [ ] **Step 2: Register and run RED**

Add `audit:platform-ai-phase4-language` to `package.json`.

Run: `npm run audit:platform-ai-phase4-language`

Expected: FAIL because the language-capability service does not exist.

- [ ] **Step 3: Implement canonical language normalization and packages**

Create shared localization capabilities rather than AI-only numeric shortcuts:

```ts
export type StreamingLocalizationCapabilityId =
    | 'LOCALIZATION_FOUNDATION'
    | 'SUBTITLE_OPERATIONS_L1' | 'SUBTITLE_OPERATIONS_L2' | 'SUBTITLE_OPERATIONS_L3'
    | 'DUBBING_OPERATIONS_L1' | 'DUBBING_OPERATIONS_L2' | 'DUBBING_OPERATIONS_L3'
    | 'SIMULTANEOUS_LOCALIZATION';

export interface StreamingLocalizationCapabilityDefinition {
    id: StreamingLocalizationCapabilityId;
    prerequisiteIds: StreamingLocalizationCapabilityId[];
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
    contentOperationsFloor: number;
}
```

Register matching research/install entries in the existing player Research and Technology Campus catalogues. Keep them in the canonical `CONTENT_OPERATIONS` family for infrastructure accounting, but determine subtitle and dubbing tiers from installed capability IDs so the two paths remain independent. Player and AI code must query `resolveStreamingLocalizationTiers`; neither may derive these tiers from one generic Content Operations number.

Normalize current country-profile language strings into stable lowercase IDs. Define regional packages as exact language ID lists, with prerequisite capability IDs and operational costs. Reject empty, duplicate, or unknown IDs.

- [ ] **Step 4: Implement comprehension output**

Return inputs for Phase 6 without settling performance:

```ts
export interface PlatformAiTitleCountryComprehension {
    state: 'NATIVE_OR_COMPATIBLE' | 'DUBBED' | 'SUBTITLED' | 'UNLOCALIZED';
    languageId: string;
    reachMultiplier: number;
    appreciationMultiplier: number;
    completionMultiplier: number;
    localizationQuality: number;
    reason: string;
}
```

Use deterministic pure rules based on original language, country language distribution, target audience, genre, available asset mode, and language tier. Do not read or modify subscribers.

- [ ] **Step 5: Run GREEN**

Run: `npm run audit:platform-ai-phase4-language`

Expected: PASS.

Run: `npm run audit:streaming-opening-catalogue-phase6`

Expected: PASS because player title-language assets remain canonical.

Run: `npm run audit:streaming-research-integration-phase7`

Expected: PASS with independent subtitle and dubbing capability paths.

Run: `npm run audit:streaming-technology-campus-phase17`

Expected: PASS with the added canonical research/install definitions.

- [ ] **Step 6: Review checkpoint**

Run: `git diff --check -- services/streamingLocalizationCapabilities.ts services/platformAi/platformAiLanguageCapabilities.ts services/streamingResearchLifecycle.ts services/streamingTechnologyCampus.ts services/streamingCanonicalState.ts services/streamingOpeningCatalogue.ts services/platformAi/index.ts scripts/audit-platform-ai-phase4-language.ts package.json`

Do not stage or commit.

---

### Task 6: Replace country-count localization with per-language jobs

**Files:**
- Modify: `types.ts`
- Modify: `services/platformAi/platformAiLocalizationCore.ts`
- Modify: `services/platformAi/platformAiLocalization.ts`
- Modify: `services/platformAi/platformAiState.ts`
- Modify: `services/platformAi/platformAiEconomy.ts`
- Modify: `scripts/audit-platform-ai-localization.ts`
- Modify: `scripts/audit-platform-ai-phase4-language.ts`

**Interfaces:**
- Changes: `quotePlatformAiLocalization(input)` receives project format, target language, mode, capability tier, standard/AI controller, and country scope.
- Changes: `planPlatformAiLocalization(input)` plans one exact language/mode job and remains idempotent.
- Produces: `getPlatformAiLocalizationRequirements(platform, plan, project)`.

- [ ] **Step 1: Write failing per-language job assertions**

```ts
const hindiSub = planPlatformAiLocalization({ ...base, languageId: 'hindi', mode: 'SUBTITLE' });
assert.equal(hindiSub.changed, true);
assert.equal(hindiSub.job?.languageId, 'hindi');
assert.equal(hindiSub.job?.mode, 'SUBTITLE');
assert.deepEqual(hindiSub.job?.countryIds, ['IN']);
assert.equal(hindiSub.job?.status, 'WAITING_FOR_FUNDS');

const duplicate = planPlatformAiLocalization({ ...base, languageId: 'hindi', mode: 'SUBTITLE' });
assert.equal(duplicate.reason, 'DUPLICATE');
assert.equal(duplicate.platform.ai!.localizationJobs.length, 1);
```

Cover unsupported dub, inactive country, wrong canonical project, insufficient funds, payment replay, completion, orphan repair, and migration of the old aggregate job.

- [ ] **Step 2: Run RED**

Run: `npm run audit:platform-ai-localization`

Expected: FAIL because aggregate jobs do not store language/mode/tier/quality or immutable efficiency data.

- [ ] **Step 3: Extend the job type and stable identity**

Add:

```ts
languageId: string;
mode: PlatformAiLocalizationMode;
capabilityTierAtPlanning: 1 | 2 | 3;
qualityForecast: number;
efficiencySnapshot: PlatformAiEfficiencySnapshot | null;
```

The stable ID includes platform, plan, canonical project, language, mode, sorted countries, capability tier, and controller quote version.

- [ ] **Step 4: Implement exact requirement and quote generation**

Read the title's original language and active country language distributions. Do not create work for a native-compatible language. Compute cost and lead time from project format, mode, tier, country reuse, and AI efficiency. Dubbing costs more than subtitles; higher tiers improve bounded quality/throughput.

- [ ] **Step 5: Preserve exact-once economy settlement**

Keep one `LOCALIZATION` obligation per job. The economy changes `HELD` to `SETTLED` once and starts exactly that job. A replay observes the settled obligation and cannot charge or restart it again.

- [ ] **Step 6: Migrate legacy aggregate jobs**

For valid old jobs, deterministically expand the aggregate level into exact language jobs derived from the saved plan countries. Preserve total paid cost by allocating it deterministically across children; do not charge again. Remove jobs whose project, plan, promise, or countries are invalid.

- [ ] **Step 7: Run GREEN**

Run: `npm run audit:platform-ai-localization`

Expected: PASS.

Run: `npm run audit:platform-ai-phase4-language`

Expected: PASS.

Run: `npm run audit:platform-ai-economy`

Expected: PASS.

- [ ] **Step 8: Review checkpoint**

Run: `git diff --check -- types.ts services/platformAi/platformAiLocalizationCore.ts services/platformAi/platformAiLocalization.ts services/platformAi/platformAiState.ts services/platformAi/platformAiEconomy.ts scripts/audit-platform-ai-localization.ts scripts/audit-platform-ai-phase4-language.ts`

Do not stage or commit.

---

### Task 7: Connect promises, delivery readiness, and country selection

**Files:**
- Modify: `services/platformAi/platformAiContentSourcing.ts`
- Modify: `services/platformAi/platformAiMarkets.ts`
- Modify: `services/platformAi/platformAiTurn.ts`
- Modify: `services/platformAi/platformAiRelease.ts`
- Modify: `services/streamingBidding.ts`
- Modify: `services/streamingRightsCore.ts`
- Modify: `scripts/audit-platform-ai-sourcing.ts`
- Modify: `scripts/audit-streaming-active-bidding-phase2.ts`
- Modify: `scripts/audit-platform-ai-turn.ts`
- Modify: `scripts/audit-platform-ai-phase4-language.ts`

**Interfaces:**
- Consumes: `getPlatformAiLocalizationRequirements`, `resolvePlatformAiTitleCountryComprehension`.
- Produces: capability-backed offer terms and a readiness result distinguishing mandatory blockers from optional consequences.

- [ ] **Step 1: Write failing promise and optional-release assertions**

```ts
assert.notEqual(unsupportedCandidate.localizationLevel, 'DUBS_AND_SUBTITLES');
assert.equal(mandatoryDubReadiness.ready, false);
assert.equal(mandatoryDubReadiness.blocker, 'MANDATORY_LOCALIZATION_MISSING');
assert.equal(optionalUnlocalizedReadiness.ready, true);
assert.equal(optionalUnlocalizedReadiness.comprehension.some(item => item.state === 'UNLOCALIZED'), true);
```

Assert a bidding offer cannot promise a localization tier or language scope the platform cannot currently operate.

- [ ] **Step 2: Run RED**

Run: `npm run audit:platform-ai-sourcing`

Expected: FAIL on unsupported localization promise or missing language scope.

Run: `npm run audit:streaming-active-bidding-phase2`

Expected: FAIL on the new capability-backed offer assertion.

- [ ] **Step 3: Clamp content candidates and offers**

Use currently `OPERATING` tiers and exact supported languages. Planned research does not count. Preserve the existing three-value public term while recording exact required languages in the canonical content/rights requirement metadata.

- [ ] **Step 4: Deepen market choice**

Add upcoming-slate country fit, language support, localization cost, content-operation load, and concurrent expansion load to country priority. AI efficiency can change the quote but not make an unsupported language disappear.

- [ ] **Step 5: Update weekly job creation and readiness**

After `RIGHTS_READY` or Phase 3 `DELIVERED`, create exact mandatory jobs only for canonical projects and active countries. Scheduling readiness requires every promised job to be `READY`. Optional missing localization returns comprehension penalties for Phase 6 rather than a fabricated ready job.

- [ ] **Step 6: Run GREEN**

Run: `npm run audit:platform-ai-sourcing`

Expected: PASS.

Run: `npm run audit:streaming-active-bidding-phase2`

Expected: PASS.

Run: `npm run audit:platform-ai-turn`

Expected: PASS.

Run: `npm run audit:platform-ai-release`

Expected: PASS without creating a release in Phase 4 tests.

- [ ] **Step 7: Review checkpoint**

Run: `git diff --check -- services/platformAi/platformAiContentSourcing.ts services/platformAi/platformAiMarkets.ts services/platformAi/platformAiTurn.ts services/platformAi/platformAiRelease.ts services/streamingBidding.ts services/streamingRightsCore.ts scripts/audit-platform-ai-sourcing.ts scripts/audit-streaming-active-bidding-phase2.ts scripts/audit-platform-ai-turn.ts scripts/audit-platform-ai-phase4-language.ts`

Do not stage or commit.

---

### Task 8: Complete acquisition handoff and QA observability

**Files:**
- Modify: `services/platformAi/platformAiResearch.ts`
- Modify: `services/platformAi/platformAiMarkets.ts`
- Modify: `services/platformAi/platformAiLocalization.ts`
- Modify: `services/platformAi/platformAiTurn.ts`
- Modify: `services/platformAi/platformAiPlayerCommissionQa.ts`
- Modify: `views/HomePage.tsx`
- Modify: `scripts/audit-platform-ai-phase4-profiles.ts`
- Modify: `scripts/audit-platform-ai-research.ts`
- Modify: `scripts/audit-platform-ai-localization.ts`

**Interfaces:**
- Produces: `buildPlatformAiPhase4QaFixture(player)` and `getPlatformAiPhase4QaSnapshot(player)`.

- [ ] **Step 1: Write failing mid-progress acquisition assertions**

```ts
assert.deepEqual(afterAcquisition.ai!.capabilities.activeCountryIds, beforeAcquisition.ai!.capabilities.activeCountryIds);
assert.deepEqual(afterAcquisition.ai!.languageCapabilities, beforeAcquisition.ai!.languageCapabilities);
assert.equal(aiResearchAfterAcquire.changed, false);
assert.equal(aiMarketAfterAcquire.changed, false);
assert.equal(aiLocalizationAfterAcquire.changed, false);
assert.ok(recalculatedResearch.stageReadyAtAbsoluteWeek >= previousReadyWeek);
```

Assert paid localization keeps its frozen contract while unpaid IP/install stages use standard player amounts.

- [ ] **Step 2: Run RED**

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: FAIL on remaining-duration/unpaid-stage handoff behavior.

- [ ] **Step 3: Implement acquisition normalization**

On the first player-controlled normalization after an AI-controlled commitment:

- Preserve completed stages and elapsed stage progress.
- Recalculate remaining research/install duration using multiplier `1`.
- Keep amounts already paid unchanged.
- Replace only unpaid future stage quotes with player-standard values.
- Preserve active markets, installed technology, supported languages, and ready title assets.
- Mark the handoff idempotently so another load does not recalculate again.

- [ ] **Step 4: Add one QA-only fixture and snapshot**

The cheat action seeds one mature global platform with:

- Three active research programmes and an affordable fourth candidate.
- One market expansion.
- One subtitle-only language.
- One dubbing-capable language.
- One waiting localization job and one ready job.
- One foreign-language title-country comprehension comparison.

Show a concise alert/log summary only. Do not redesign Platform Wars or add normal-player UI.

- [ ] **Step 5: Run GREEN**

Run: `npm run audit:platform-ai-phase4-profiles`

Expected: PASS.

Run: `npm run audit:platform-ai-research`

Expected: PASS.

Run: `npm run audit:platform-ai-localization`

Expected: PASS.

- [ ] **Step 6: Review checkpoint**

Run: `git diff --check -- services/platformAi/platformAiResearch.ts services/platformAi/platformAiMarkets.ts services/platformAi/platformAiLocalization.ts services/platformAi/platformAiTurn.ts services/platformAi/platformAiPlayerCommissionQa.ts views/HomePage.tsx scripts/audit-platform-ai-phase4-profiles.ts scripts/audit-platform-ai-research.ts scripts/audit-platform-ai-localization.ts`

Do not stage or commit.

---

### Task 9: Full Phase 4 verification and master-plan handoff

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-08-27-platform-ai-phase4-research-markets-localization-design.md` only if implementation discovers a necessary approved clarification.
- Create: `docs/superpowers/reports/2026-08-27-platform-ai-phase4-verification.md`

**Interfaces:**
- Produces: one verification report listing changed systems, fresh commands, exact results, pre-existing failures, and deferred work.

- [ ] **Step 1: Add aggregate Phase 4 audit command**

```json
"audit:platform-ai-phase4": "npm run audit:platform-ai-phase4-profiles && npm run audit:platform-ai-research && npm run audit:platform-ai-phase4-language && npm run audit:platform-ai-localization"
```

- [ ] **Step 2: Run focused Phase 4 audits**

Run: `npm run audit:platform-ai-phase4`

Expected: PASS.

- [ ] **Step 3: Run connected regressions**

Run each independently so one failure does not hide later evidence:

```bash
npm run audit:platform-ai-domain
npm run audit:platform-ai-sourcing
npm run audit:platform-ai-production
npm run audit:platform-ai-economy
npm run audit:platform-ai-release
npm run audit:platform-ai-turn
npm run audit:streaming-active-bidding-phase2
npm run audit:platform-ai-player-commissions
npm run audit:save-migration
npm run audit:save-transfer
```

Expected: PASS, or report exact unrelated pre-existing failure without claiming full green.

- [ ] **Step 4: Run build and integrity checks**

Run:

```bash
npm run build
git diff --check
rg -n "Math\.random\(|Date\.now\(" services/platformAi/platformAiOperatingProfiles.ts services/platformAi/platformAiResearchPortfolio.ts services/platformAi/platformAiLanguageCapabilities.ts services/platformAi/platformAiResearch.ts services/platformAi/platformAiMarkets.ts services/platformAi/platformAiLocalization.ts
```

Expected: build PASS, diff check PASS, and no forbidden randomness in Phase 4 decision files.

- [ ] **Step 5: Exercise the QA fixture in the running local app**

Open the cheat menu, run the Phase 4 fixture, and verify its snapshot reports research capacity, active programmes, active/expanding countries, language tiers, localization jobs, and comprehension ordering. Advance a week and confirm no duplicate charge or job appears.

- [ ] **Step 6: Write the verification report**

Record:

- Implemented behaviors.
- Files changed.
- Exact audit/build results.
- Any unrelated pre-existing failures.
- Acquisition behavior.
- Save/reload evidence.
- Deferred rival UI and News/X reaction system.
- Confirmation that nothing was staged or committed.

- [ ] **Step 7: Final workspace check**

Run: `git status --short`

Confirm only intended Phase 4 additions/edits plus pre-existing user work remain. Do not stage or commit.
