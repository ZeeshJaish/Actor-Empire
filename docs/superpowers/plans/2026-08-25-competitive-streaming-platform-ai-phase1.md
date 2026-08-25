# Competitive Streaming Platform AI Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace random rival-platform growth with persistent deterministic 7–10 competence AI that sources content through the same four Content Desk routes, commissions real producer studios, competes through existing release and awards systems, and can succeed or fail under a real cash economy.

**Architecture:** Extend `PlatformState` with optional normalized AI state, then process each unacquired platform through focused planning, sourcing, commissioning, research, economy, release, and learning modules. `worldLogic.ts` remains the weekly integration boundary; existing projects, rights records, streaming-original rules, acquisitions, and awards remain canonical instead of being cloned.

**Tech Stack:** TypeScript, React/Vite game runtime, deterministic RNG in `services/deterministicRandom.ts`, existing `Player`/`WorldState` save schema, esbuild-powered audit scripts, Node assertions.

**Spec:** `docs/superpowers/specs/2026-08-25-competitive-streaming-platform-ai-design.md`

## Global Constraints

- Platform competence dimensions and effective values stay within 7.0–10.0; performance drift is capped at plus or minus 0.5 from the static profile.
- A standard 20-week project takes 18 weeks at production skill 7 and 15 weeks at skill 10 only while the commissioning platform and producer relationship are AI-controlled.
- Acquired platforms receive no AI planning, speed, bailout, or automatic scheduling advantage.
- Content enters through exactly one route: `COMMISSIONED_ORIGINAL`, `LICENSED_RELEASED_TITLE`, `OWNED_STUDIO_TRANSFER`, or `CATALOGUE_ACQUISITION`.
- A streaming platform never creates a direct theatrical release. A theatrical result must belong to the physical producer/rightsholder and an explicit theatrical window.
- Existing funded-project timing remains 104 weeks with warnings at 26 and 8 weeks.
- New saved decisions use `createDeterministicRng`/`createDeterministicId`; no new `Date.now()` or raw `Math.random()` is allowed in Platform AI.
- Legacy saves preserve current platform cash, subscribers, valuation, reputation, churn, and `recentHits`.
- No hidden cash floor, silent balance reset, guaranteed quality, free rights, or unconditional weekly cash injection is allowed.
- Phase 1 does not redesign the bidding-room UI, implement advanced packages/renewals, or rebuild general Studio AI.

## File Structure

**Create**

- `services/platformAi/platformAiProfiles.ts` — static identities, competence, producer affinities, and strategy constants.
- `services/platformAi/platformAiState.ts` — normalization, controller resolution, ownership checks, and selectors.
- `services/platformAi/platformAiPlanning.ts` — catalogue-gap analysis, candidate scoring, and route selection.
- `services/platformAi/platformAiContentSourcing.ts` — route eligibility and canonical project/rights references.
- `services/platformAi/platformAiCommissioning.ts` — original briefs, producer selection, funding milestones, and canonical production links.
- `services/platformAi/platformAiTalent.ts` — deterministic talent selection and producer-owned booking references.
- `services/platformAi/platformAiProduction.ts` — commissioned-production progress, delays, overruns, delivery, and player-control handoff.
- `services/platformAi/platformAiResearch.ts` — research queue and capability progression.
- `services/platformAi/platformAiEconomy.ts` — income, costs, runway, distress, rescue, and valuation.
- `services/platformAi/platformAiRelease.ts` — streaming windows, canonical project reuse, performance, and no-theatrical enforcement.
- `services/platformAi/platformAiMemory.ts` — bounded learning, decision history, and presentation events.
- `services/platformAi/platformAiTurn.ts` — weekly orchestration only.
- `services/platformAi/index.ts` — public exports.
- `scripts/helpers/platformAiFixture.ts` — deterministic audit fixtures.
- `scripts/audit-platform-ai-domain.ts`
- `scripts/audit-platform-ai-sourcing.ts`
- `scripts/audit-platform-ai-production.ts`
- `scripts/audit-platform-ai-research.ts`
- `scripts/audit-platform-ai-economy.ts`
- `scripts/audit-platform-ai-release.ts`
- `scripts/audit-platform-ai-turn.ts`
- `scripts/audit-platform-ai-long-run.ts`

**Modify**

- `types.ts` — optional rival Platform AI state and optional platform-source metadata on `IndustryProject`.
- `services/worldLogic.ts` — call the Platform AI turn and remove random/free platform evolution.
- `services/streamingCompetitiveWorld.ts` — project rival cash, capabilities, catalogue power, prestige, and regions from canonical Platform AI state.
- `package.json` — focused and aggregate Platform AI audit commands.

**Do not modify in Phase 1**

- `services/streamingFundingLogic.ts` — 104/26/8 timing remains canonical.
- `views/lifestyle/business/ReleaseWizard.tsx` — bidding-room redesign belongs to Phase 2.
- Content Desk React screens — AI uses domain routes, not player UI automation.

---

### Task 1: Domain Types, Profiles, Migration, and Ownership Handoff

**Files:**
- Modify: `types.ts:5654-5690`
- Modify: `types.ts:5890-5901`
- Modify: `types.ts:6569-6575`
- Create: `services/platformAi/platformAiProfiles.ts`
- Create: `services/platformAi/platformAiState.ts`
- Create: `services/platformAi/index.ts`
- Create: `scripts/helpers/platformAiFixture.ts`
- Create: `scripts/audit-platform-ai-domain.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `PlatformId`, `StudioId`, `PlatformState`, `Player`, `WorldState`, `createDeterministicId`.
- Produces: `PLATFORM_AI_PROFILES`, `normalizePlatformAiState(platform, playerId, absoluteWeek)`, `normalizeWorldPlatformAi(player, world, absoluteWeek)`, `resolvePlatformController(player, platformId)`, `resolveStudioController(player, studioId)`, and `getPlatformAiProductionDuration(standardWeeks, productionSkill, controller)`.

- [ ] **Step 1: Add a failing domain audit**

Create `scripts/helpers/platformAiFixture.ts`:

```ts
import { INITIAL_PLAYER, type Player, type WorldState } from '../../types';

export const createPlatformAiFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    return {
        ...player,
        id: 'platform-ai-audit-player',
        age: 40,
        currentWeek: 12,
        world: structuredClone(INITIAL_PLAYER.world) as WorldState,
    };
};
```

Create `scripts/audit-platform-ai-domain.ts`:

```ts
import assert from 'node:assert/strict';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    PLATFORM_AI_PROFILES,
    getPlatformAiProductionDuration,
    normalizeWorldPlatformAi,
    resolvePlatformController,
} from '../services/platformAi';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const fixture = createPlatformAiFixture();
const absoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek);
const normalized = normalizeWorldPlatformAi(fixture, fixture.world, absoluteWeek);
const profiles = Object.values(PLATFORM_AI_PROFILES);

assert.equal(profiles.length, 5);
assert.ok(profiles.every(profile => Object.values(profile.competence).every(score => score >= 7 && score <= 10)));
assert.equal(getPlatformAiProductionDuration(20, 7, 'AI'), 18);
assert.equal(getPlatformAiProductionDuration(20, 10, 'AI'), 15);
assert.equal(getPlatformAiProductionDuration(20, 10, 'PLAYER'), 20);
assert.ok(Object.values(normalized.platforms || {}).every(platform => platform.ai?.lastProcessedAbsoluteWeek === absoluteWeek));
assert.deepEqual(normalizeWorldPlatformAi(fixture, normalized, absoluteWeek), normalized);

const acquired = structuredClone(fixture);
acquired.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
assert.equal(resolvePlatformController(acquired, 'NETFLIX'), 'PLAYER');
assert.equal(resolvePlatformController(acquired, 'HULU'), 'AI');

console.log('Platform AI domain audit passed.');
```

- [ ] **Step 2: Register and run the audit to verify failure**

Add to `package.json`:

```json
"audit:platform-ai-domain": "esbuild scripts/audit-platform-ai-domain.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-domain.mjs && node /tmp/audit-platform-ai-domain.mjs"
```

Run: `npm run audit:platform-ai-domain`

Expected: FAIL because `../services/platformAi` and the new types do not exist.

- [ ] **Step 3: Add exact Platform AI types**

Add to `types.ts` before `PlatformState`:

```ts
export type PlatformAiController = 'AI' | 'PLAYER';
export type PlatformAiCompanyStatus = 'ACTIVE' | 'DISTRESSED' | 'RESTRUCTURING' | 'DORMANT';
export type PlatformAiContentSource = 'COMMISSIONED_ORIGINAL' | 'LICENSED_RELEASED_TITLE' | 'OWNED_STUDIO_TRANSFER' | 'CATALOGUE_ACQUISITION';
export type PlatformAiPlanStatus = 'SCOUTED' | 'BRIEF' | 'PRODUCER_SELECTED' | 'GREENLIT' | 'IN_PRODUCTION' | 'NEGOTIATING' | 'CONTRACTED' | 'RIGHTS_READY' | 'DELIVERED' | 'LOCALIZED' | 'SCHEDULED' | 'RELEASED' | 'ON_HOLD' | 'CANCELLED' | 'SOLD';
export type PlatformAiStreamingWindow = 'ORIGINAL_STREAMING_PREMIERE' | 'POST_THEATRICAL_WINDOW' | 'CATALOGUE_WINDOW' | 'OWNED_STUDIO_STREAMING_WINDOW';
export type PlatformAiLocalizationLevel = 'NONE' | 'SUBTITLES' | 'DUBS_AND_SUBTITLES';
export type PlatformAiResearchBranch = 'PLAYBACK' | 'DELIVERY' | 'RECOMMENDATIONS' | 'SECURITY' | 'CONTENT_OPERATIONS' | 'LOCALIZATION';

export interface PlatformAiCompetence {
    strategy: number;
    creative: number;
    production: number;
    commercial: number;
    prestige: number;
    finance: number;
    technology: number;
    negotiation: number;
}

export interface PlatformAiCapabilities {
    activeRegionIds: string[];
    subtitleCoverageLevel: number;
    dubbingCoverageLevel: number;
    playbackLevel: number;
    deliveryLevel: number;
    recommendationLevel: number;
    contentOperationsLevel: number;
    localizationLevel: number;
    securityLevel: number;
    reliabilityLevel: number;
}

export interface PlatformAiResearchItem {
    id: string;
    branch: PlatformAiResearchBranch;
    targetLevel: number;
    cashCostMillions: number;
    startedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
}

export interface PlatformAiProductionRecord {
    id: string;
    canonicalProjectId: string;
    physicalProducerStudioId: StudioId;
    physicalProducerStudioName: string;
    standardDurationWeeks: number;
    effectiveDurationWeeks: number;
    elapsedWeeks: number;
    budgetMillions: number;
    paidMillions: number;
    qualityForecast: number;
    executionRoll: number;
    delayWeeks: number;
    overrunMillions: number;
    leadActorId: string | null;
    leadActorName: string | null;
    directorId: string | null;
    directorName: string | null;
    writerId: string | null;
    writerName: string | null;
    finalQuality: number | null;
    failureDecision: 'NONE' | 'ADD_CONTINGENCY' | 'DELAY_RELEASE' | 'REPLACE_TALENT' | 'REDUCE_MARKETING' | 'SELL_OR_COPRODUCE' | 'CANCEL';
}

export interface PlatformAiContentPlan {
    id: string;
    platformId: PlatformId;
    controllerAtCommitment: PlatformAiController;
    source: PlatformAiContentSource;
    status: PlatformAiPlanStatus;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    targetAudience: TargetAudience;
    sourceProjectIds: string[];
    rightsContractIds: string[];
    cataloguePackageId: string | null;
    commissionId: string | null;
    sourceStudioId: StudioId | null;
    streamingWindow: PlatformAiStreamingWindow;
    localizationLevel: PlatformAiLocalizationLevel;
    releaseRegionIds: string[];
    minimumGuaranteeMillions: number;
    rightsCostMillions: number;
    productionFundingMillions: number;
    paidSpendMillions: number;
    marketingReserveMillions: number;
    contingencyMillions: number;
    committedAtAbsoluteWeek: number | null;
    rightsReadyAtAbsoluteWeek: number | null;
    scheduledAtAbsoluteWeek: number | null;
    releasedAtAbsoluteWeek: number | null;
    production: PlatformAiProductionRecord | null;
    forecast: { strategic: number; creative: number; commercial: number; prestige: number; risk: number };
}

export interface PlatformAiReleaseMemory {
    projectId: string;
    releasedAtAbsoluteWeek: number;
    genre: Genre;
    targetAudience: TargetAudience;
    leadActorId: string | null;
    directorId: string | null;
    quality: number;
    commercialScore: number;
    prestigeScore: number;
    subscriberImpact: number;
}

export interface PlatformAiFinanceSnapshot {
    absoluteWeek: number;
    revenueMillions: number;
    operatingCostMillions: number;
    contentCostMillions: number;
    researchCostMillions: number;
    netCashFlowMillions: number;
    closingCashMillions: number;
    runwayWeeks: number;
}

export interface PlatformAiDecisionRecord {
    id: string;
    absoluteWeek: number;
    type: string;
    summary: string;
    reason: string;
    cashImpactMillions: number;
}

export interface PlatformAiRuntimeState {
    schemaVersion: 1;
    profileId: PlatformId;
    competence: PlatformAiCompetence;
    effectiveCompetenceDelta: number;
    lastProcessedAbsoluteWeek: number;
    nextPlanningAbsoluteWeek: number;
    strategyCycle: number;
    status: PlatformAiCompanyStatus;
    capabilities: PlatformAiCapabilities;
    researchQueue: PlatformAiResearchItem[];
    slate: PlatformAiContentPlan[];
    rightsContracts: OwnedStreamingCatalogLicense[];
    talentBookingRefs: string[];
    releaseMemory: PlatformAiReleaseMemory[];
    genreMemory: Partial<Record<Genre, { releases: number; averageQuality: number; averageCommercialScore: number }>>;
    audienceMemory: Partial<Record<TargetAudience, { releases: number; averageCommercialScore: number; averageSubscriberImpact: number }>>;
    financeHistory: PlatformAiFinanceSnapshot[];
    decisionHistory: PlatformAiDecisionRecord[];
    debtMillions: number;
    lastRescueAbsoluteWeek: number | null;
    rescueCount: number;
}
```

Add `ai?: PlatformAiRuntimeState` to `PlatformState`. Add these optional fields to `IndustryProject`:

```ts
streamingPlatformId?: PlatformId;
platformRelationship?: 'ORIGINAL_COMMISSIONER' | 'LICENSEE' | 'OWNED_STUDIO' | 'CATALOGUE_RIGHTSHOLDER';
physicalProducerStudioId?: StudioId;
platformContentSource?: PlatformAiContentSource;
platformContentPlanId?: string;
releaseStrategy?: ReleaseStrategy;
streamingPerformance?: { views: number; subscriberImpact: number; engagementImpact: number };
```

- [ ] **Step 4: Add profiles and deterministic normalization**

Define and export this profile contract from `platformAiProfiles.ts`:

```ts
export interface PlatformAiProfile {
    id: PlatformId;
    overallLevel: number;
    competence: PlatformAiCompetence;
    preferredGenres: Genre[];
    producerStudioPreferences: StudioId[];
    ownedStudioIds: StudioId[];
    riskTolerance: number;
    releaseVolume: number;
    maxConcurrentProductions: number;
    maxActiveRightsPlans: number;
    parentBacking: 'NONE' | 'LIMITED' | 'STRONG';
    monthlyArpu: number;
    adSupportedShare: number;
    weeklyAdRevenuePerSubscriber: number;
    weeklyDeliveryCostPerSubscriber: number;
    baseWeeklyOperationsMillions: number;
    regionWeeklyCostMillions: number;
    targetRunwayWeeks: number;
}
```

Implement `PLATFORM_AI_PROFILES: Record<PlatformId, PlatformAiProfile>` with the approved overall identities and per-dimension values. Revenue and per-subscriber cost fields are dollars per subscriber while `PlatformState.subscribers` is already stored in millions, so their products are millions of dollars. Each bounded fraction is in the 0–1 range, all costs are non-negative, and `targetRunwayWeeks` is at least 26.

Use this exact competence matrix, retaining the approved strengths and weaknesses:

| Platform | Overall | Strategy | Creative | Production | Commercial | Prestige | Finance | Technology | Negotiation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Netflix | 9.4 | 9.6 | 9.1 | 9.5 | 9.8 | 8.8 | 8.3 | 9.4 | 9.5 |
| Apple TV+ | 8.8 | 9.0 | 9.1 | 8.5 | 8.2 | 9.7 | 8.4 | 9.7 | 9.0 |
| Disney+ | 9.1 | 9.4 | 8.9 | 9.2 | 9.4 | 9.2 | 8.6 | 8.8 | 9.1 |
| Hulu | 7.4 | 7.8 | 7.7 | 7.5 | 8.0 | 7.2 | 8.2 | 7.4 | 7.9 |
| YouTube | 8.2 | 8.5 | 7.4 | 8.0 | 9.1 | 7.0 | 8.7 | 9.8 | 8.2 |

Implement these exact exports in `platformAiState.ts`:

```ts
export const resolvePlatformController = (player: Player, platformId: PlatformId): PlatformAiController => (
    player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds?.includes(platformId) ? 'PLAYER' : 'AI'
);

export const resolveStudioController = (player: Player, studioId: StudioId): PlatformAiController => {
    const owned = player.businesses.some(business => business.type === 'PRODUCTION_HOUSE' && (
        business.id === studioId
        || business.studioState?.acquisitionPortfolio?.sourceStudioId === studioId
    ));
    return owned ? 'PLAYER' : 'AI';
};

export const getPlatformAiProductionDuration = (
    standardWeeks: number,
    productionSkill: number,
    controller: PlatformAiController,
): number => {
    if (controller === 'PLAYER') return Math.max(1, Math.round(standardWeeks));
    const multiplier = Math.max(0.75, Math.min(0.90, 0.90 - (Math.max(7, Math.min(10, productionSkill)) - 7) * 0.05));
    return Math.max(1, Math.round(standardWeeks * multiplier));
};
```

The normalizer must preserve existing `PlatformState` values including `recentHits`, initialize empty slate/rights/release/genre/audience-memory collections and zero debt, derive starting capabilities from the existing platform profile plus reputation/subscriber scale, set `lastProcessedAbsoluteWeek` to the migration week, and return the same value when run twice. Do not invent historical genres for legacy `recentHits`.

- [ ] **Step 5: Run the domain audit**

Run: `npm run audit:platform-ai-domain`

Expected: `Platform AI domain audit passed.`

- [ ] **Step 6: Commit the domain foundation**

```bash
git add types.ts services/platformAi/platformAiProfiles.ts services/platformAi/platformAiState.ts services/platformAi/index.ts scripts/helpers/platformAiFixture.ts scripts/audit-platform-ai-domain.ts package.json
git commit -m "feat: add rival platform AI domain"
```

---

### Task 2: Canonical Content Sourcing and Route Selection

**Files:**
- Create: `services/platformAi/platformAiContentSourcing.ts`
- Create: `services/platformAi/platformAiPlanning.ts`
- Create: `scripts/audit-platform-ai-sourcing.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: normalized `PlatformAiRuntimeState`, `PLATFORM_AI_PROFILES`, `WorldState.projects`, `STUDIO_CATALOG`, deterministic RNG.
- Produces: `PlatformAiContentCandidate`, `buildPlatformContentCandidates(input)`, `choosePlatformContentCandidate(input)`, and `commitPlatformContentCandidate(input)`.

- [ ] **Step 1: Write the failing sourcing audit**

Create an audit that inserts three released `IndustryProject` records from one non-platform studio, normalizes Netflix, and asserts:

```ts
const candidatesA = buildPlatformContentCandidates({ player, world, platformId: 'NETFLIX', absoluteWeek });
const candidatesB = buildPlatformContentCandidates({ player, world, platformId: 'NETFLIX', absoluteWeek });

assert.deepEqual(candidatesA, candidatesB);
assert.ok(candidatesA.some(item => item.source === 'COMMISSIONED_ORIGINAL'));
assert.ok(candidatesA.some(item => item.source === 'LICENSED_RELEASED_TITLE'));
assert.ok(candidatesA.some(item => item.source === 'CATALOGUE_ACQUISITION'));
assert.ok(candidatesA.every(item => item.streamingWindow !== ('THEATRICAL' as never)));
assert.ok(candidatesA.filter(item => item.source === 'COMMISSIONED_ORIGINAL').every(item => (
    item.producerStudioId && STUDIO_CATALOG[item.producerStudioId].archetype !== 'PLATFORM'
)));
assert.ok(candidatesA.filter(item => item.source !== 'COMMISSIONED_ORIGINAL').every(item => item.sourceProjectIds.length > 0));
```

Also mark `PIXAR` as a static Disney-owned studio in the Disney profile and assert Disney receives an `OWNED_STUDIO_TRANSFER` candidate only for an eligible Pixar project.

- [ ] **Step 2: Register and verify the audit fails**

Add:

```json
"audit:platform-ai-sourcing": "esbuild scripts/audit-platform-ai-sourcing.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-sourcing.mjs && node /tmp/audit-platform-ai-sourcing.mjs"
```

Run: `npm run audit:platform-ai-sourcing`

Expected: FAIL because candidate functions do not exist.

- [ ] **Step 3: Implement route eligibility without creating content**

Define:

```ts
export interface PlatformAiContentCandidate {
    id: string;
    source: PlatformAiContentSource;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    targetAudience: TargetAudience;
    sourceProjectIds: string[];
    producerStudioId: StudioId | null;
    streamingWindow: PlatformAiStreamingWindow;
    rightsCostMillions: number;
    productionBudgetMillions: number;
    scores: { strategic: number; creative: number; commercial: number; prestige: number; risk: number; total: number };
}
```

Rules:

- Commission candidates generate briefs but do not create projects yet; their producer must exist and have `archetype !== 'PLATFORM'`.
- Licence candidates reference one existing released project and use `POST_THEATRICAL_WINDOW` when its `boxOffice > 0`, otherwise `CATALOGUE_WINDOW`; commitment creates one `OwnedStreamingCatalogLicense` in `platform.ai.rightsContracts` and stores its ID in `rightsContractIds`.
- Owned-studio candidates require `profile.ownedStudioIds.includes(project.studioId)`, use `OWNED_STUDIO_STREAMING_WINDOW`, and create explicit zero-guarantee internal rights records rather than silently claiming ownership.
- Catalogue candidates group at least three released projects from one studio, use `CATALOGUE_WINDOW`, create one stable `cataloguePackageId`, and create one canonical rights record per source project under that package.
- Existing source IDs are always reused; no route clones an `IndustryProject`.
- Candidates whose total commitment would break the profile's runway floor are excluded.
- Active original plans may not exceed `maxConcurrentProductions + floor(contentOperationsLevel / 3)` and active licence/transfer/catalogue plans may not exceed `maxActiveRightsPlans + contentOperationsLevel`; distress halves both limits, rounded down with a minimum of one.
- A released title already covered by an active exclusive AI rights contract is ineligible for another platform. Non-exclusive multi-platform and renewal expansion remain Phase 2, so Phase 1 never overwrites one title's active platform relationship.

- [ ] **Step 4: Implement deterministic scoring and selection**

`buildPlatformContentCandidates` must generate 3–6 candidates after eligibility filtering. `choosePlatformContentCandidate` must use a deterministic weighted choice among the top three, with forecast-error amplitude decreasing from 18% at strategy skill 7 to 4% at strategy skill 10.

`commitPlatformContentCandidate` adds exactly one `PlatformAiContentPlan`, records one decision, creates the route's canonical rights records when needed, and debits only the disclosed rights deposit or original development deposit. Repeating the same candidate ID returns the unchanged world.

- [ ] **Step 5: Run sourcing and domain audits**

Run: `npm run audit:platform-ai-sourcing`

Expected: `Platform AI sourcing audit passed.`

Run: `npm run audit:platform-ai-domain`

Expected: `Platform AI domain audit passed.`

- [ ] **Step 6: Commit content sourcing**

```bash
git add services/platformAi/platformAiContentSourcing.ts services/platformAi/platformAiPlanning.ts services/platformAi/index.ts scripts/audit-platform-ai-sourcing.ts package.json
git commit -m "feat: add platform content sourcing AI"
```

---

### Task 3: Original Commissioning, Producer Studio, Talent, and Production

**Files:**
- Create: `services/platformAi/platformAiCommissioning.ts`
- Create: `services/platformAi/platformAiTalent.ts`
- Create: `services/platformAi/platformAiProduction.ts`
- Create: `scripts/audit-platform-ai-production.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: committed `COMMISSIONED_ORIGINAL` plan, producer studio candidate, `NPC_DATABASE`, `isCastableActor`, `getEstimatedBudget`, duration resolver.
- Produces: `greenlightPlatformOriginal(input)`, `selectPlatformCommissionTalent(input)`, and `progressPlatformCommission(input)`.

- [ ] **Step 1: Write the failing production audit**

The audit must commit one Netflix original, then assert:

```ts
const greenlit = greenlightPlatformOriginal({ player, world, platformId: 'NETFLIX', planId, absoluteWeek });
const plan = greenlit.platform.ai!.slate.find(item => item.id === planId)!;

assert.equal(plan.status, 'IN_PRODUCTION');
assert.ok(plan.production?.canonicalProjectId);
assert.ok(plan.production?.physicalProducerStudioId);
assert.notEqual(STUDIO_CATALOG[plan.production!.physicalProducerStudioId].archetype, 'PLATFORM');
assert.ok(plan.production?.leadActorId && plan.production?.directorId);
assert.equal(plan.production?.effectiveDurationWeeks, getPlatformAiProductionDuration(
    plan.production!.standardDurationWeeks,
    greenlit.platform.ai!.competence.production,
    'AI',
));

const repeated = greenlightPlatformOriginal({ player, world: greenlit.world, platformId: 'NETFLIX', planId, absoluteWeek });
assert.deepEqual(repeated.world, greenlit.world);
```

Progress to delivery and assert the same `canonicalProjectId` survives, no second production record appears, and all execution/delay rolls remain identical after serializing and reloading the world.

Acquire Netflix midway, progress one week, and assert the remaining work uses player-standard duration without resetting elapsed weeks.

- [ ] **Step 2: Register and verify failure**

Add:

```json
"audit:platform-ai-production": "esbuild scripts/audit-platform-ai-production.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-production.mjs && node /tmp/audit-platform-ai-production.mjs"
```

Run: `npm run audit:platform-ai-production`

Expected: FAIL because commissioning/production exports do not exist.

- [ ] **Step 3: Implement producer and talent selection**

`greenlightPlatformOriginal` must:

1. reject non-original plans and duplicate greenlights;
2. choose from `producerStudioPreferences` first, then any non-platform AI-controlled studio;
3. reject a player-controlled producer for an automatic AI greenlight;
4. choose cast, director, and writer from available NPC pools using talent, fame, genre fit, cost, schedule availability, and deterministic noise;
5. reserve talent only after the disclosed development deposit is affordable;
6. create one stable `canonicalProjectId` and one `PlatformAiProductionRecord`;
7. debit the first production milestone and append one decision record.

The booking reference format is:

```ts
const bookingRef = `${canonicalProjectId}:${npcId}:${startAbsoluteWeek}:${endAbsoluteWeek}`;
```

Do not mutate global NPC records during candidate preview.

- [ ] **Step 4: Implement production progression and acquisition handoff**

`progressPlatformCommission` processes one absolute week only. Persist deterministic execution, delay, overrun, and failure-response rolls on greenlight. Milestone payments occur at 0%, 35%, 70%, and delivery. If cash cannot cover a milestone, choose the profile/finance-skill response from add contingency, delay, reduce marketing, replace talent when legal, sell/co-produce, or cancel; if no disclosed response is affordable, set `ON_HOLD` and do not silently pay.

Use:

```ts
const controller = resolvePlatformController(player, platformId);
const producerController = resolveStudioController(player, production.physicalProducerStudioId);
const effectiveController = controller === 'AI' && producerController === 'AI' ? 'AI' : 'PLAYER';
const effectiveDurationWeeks = getPlatformAiProductionDuration(
    production.standardDurationWeeks,
    platform.ai!.competence.production,
    effectiveController,
);
```

When control changes, preserve `elapsedWeeks` and recompute only the completion threshold. At delivery, calculate `finalQuality` from concept forecast, team fit, budget suitability, platform creative competence, execution, delay/overrun consequences, and one persisted bounded variance roll. Clamp quality to the existing project scale without any competence floor. Delivery sets `status: 'DELIVERED'`; it does not create a theatrical release.

- [ ] **Step 5: Run production, sourcing, and domain audits**

Run each separately:

```bash
npm run audit:platform-ai-production
npm run audit:platform-ai-sourcing
npm run audit:platform-ai-domain
```

Expected: all three pass.

- [ ] **Step 6: Commit commissioning and production**

```bash
git add services/platformAi/platformAiCommissioning.ts services/platformAi/platformAiTalent.ts services/platformAi/platformAiProduction.ts services/platformAi/index.ts scripts/audit-platform-ai-production.ts package.json
git commit -m "feat: simulate platform original commissions"
```

---

### Task 4: Platform Research, Markets, and Localization

**Files:**
- Create: `services/platformAi/platformAiResearch.ts`
- Create: `scripts/audit-platform-ai-research.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `PlatformAiCapabilities`, strategy profile, cash, content plans, active regions.
- Produces: `choosePlatformResearch(input)`, `commitPlatformResearch(input)`, `progressPlatformResearch(input)`, and `resolvePlatformLocalizationLevel(capabilities)`.

- [ ] **Step 1: Write the failing research audit**

Assert a capability gap produces one deterministic research recommendation, commitment debits its disclosed cost once, repeated commitment is idempotent, and the capability does not increase before `readyAtAbsoluteWeek`.

Use these localization assertions:

```ts
assert.equal(resolvePlatformLocalizationLevel({ ...capabilities, subtitleCoverageLevel: 0, dubbingCoverageLevel: 0 }), 'NONE');
assert.equal(resolvePlatformLocalizationLevel({ ...capabilities, subtitleCoverageLevel: 35, dubbingCoverageLevel: 0 }), 'SUBTITLES');
assert.equal(resolvePlatformLocalizationLevel({ ...capabilities, subtitleCoverageLevel: 35, dubbingCoverageLevel: 20 }), 'DUBS_AND_SUBTITLES');
```

Also assert a platform cannot promise more localization than the resolved level and active-region coverage.

- [ ] **Step 2: Register and verify failure**

Add:

```json
"audit:platform-ai-research": "esbuild scripts/audit-platform-ai-research.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-research.mjs && node /tmp/audit-platform-ai-research.mjs"
```

Run: `npm run audit:platform-ai-research`

Expected: FAIL because the research module is absent.

- [ ] **Step 3: Implement bounded research choices**

Research priority score is:

```ts
const priority = strategicNeed * 0.45
    + capabilityGap * 0.30
    + profileAffinity * 0.15
    + rivalPressure * 0.10
    - cashStrain;
```

One platform may have at most two active research items. Distressed platforms may finish existing work but may not start another item. Completing research increments only its target capability, records the cost already paid, and updates decision history.

- [ ] **Step 4: Run focused audits**

Run: `npm run audit:platform-ai-research`

Expected: `Platform AI research audit passed.`

Run: `npm run audit:platform-ai-production`

Expected: production audit remains passing.

- [ ] **Step 5: Commit research AI**

```bash
git add services/platformAi/platformAiResearch.ts services/platformAi/index.ts scripts/audit-platform-ai-research.ts package.json
git commit -m "feat: add rival platform research AI"
```

---

### Task 5: Real Platform Economy, Distress, and Limited Rescue

**Files:**
- Create: `services/platformAi/platformAiEconomy.ts`
- Create: `scripts/audit-platform-ai-economy.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: subscribers, price profile, capabilities, active regions, content/research commitments, finance competence, parent-backing tier.
- Produces: `calculatePlatformAiWeeklyEconomy(input)`, `settlePlatformAiEconomy(input)`, `getPlatformAiRunway(platform)`, and `resolvePlatformAiDistress(input)`.

- [ ] **Step 1: Write the failing economy audit**

Create profitable, weak, and insolvent fixtures. Assert:

```ts
const profitable = settlePlatformAiEconomy({ player, platform: netflix, absoluteWeek });
assert.equal(profitable.cashDeltaMillions, profitable.snapshot.netCashFlowMillions);
assert.equal(profitable.platform.cashReserve, netflix.cashReserve + profitable.cashDeltaMillions);
assert.ok(profitable.snapshot.revenueMillions > 0);
assert.ok(profitable.snapshot.operatingCostMillions > 0);

const repeated = settlePlatformAiEconomy({ player, platform: profitable.platform, absoluteWeek });
assert.deepEqual(repeated.platform, profitable.platform);

const weakResult = resolvePlatformAiDistress({ player, platform: weak, absoluteWeek });
assert.ok(['DISTRESSED', 'RESTRUCTURING'].includes(weakResult.platform.ai!.status));
assert.ok(weakResult.platform.ai!.decisionHistory.some(item => item.type === 'DISTRESS_RESPONSE'));
```

For rescue, assert eligibility, a maximum tied to trailing operating scale, a 104-week cooldown, a recorded decision, no second rescue during cooldown, and no rescue after player acquisition.

Simulate 520 profitable weeks and assert reserve does not grow without bound because cash above the target runway is visibly allocated out of reserve.

- [ ] **Step 2: Register and verify failure**

Add:

```json
"audit:platform-ai-economy": "esbuild scripts/audit-platform-ai-economy.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-economy.mjs && node /tmp/audit-platform-ai-economy.mjs"
```

Run: `npm run audit:platform-ai-economy`

Expected: FAIL because economy functions do not exist.

- [ ] **Step 3: Implement real weekly cash flow**

Use millions consistently:

```ts
const weeklySubscriptionRevenue = platform.subscribers * profile.monthlyArpu / 4.33;
const advertisingRevenue = platform.subscribers * profile.adSupportedShare * profile.weeklyAdRevenuePerSubscriber;
const deliveryCost = platform.subscribers * profile.weeklyDeliveryCostPerSubscriber;
const baseOperations = profile.baseWeeklyOperationsMillions + capabilities.activeRegionIds.length * profile.regionWeeklyCostMillions;
const netCashFlow = weeklySubscriptionRevenue + advertisingRevenue + contractIncome
    - deliveryCost - baseOperations - contentCost - researchCost - localizationCost - financingCost;
```

Persist at most 104 finance snapshots. Reprocessing the same absolute week returns unchanged state. Remove any generic minimum-balance behavior. If a compulsory settled cost exceeds cash, set cash to zero, add the exact uncovered amount to `debtMillions`, and enter distress; this is recorded financing, not a hidden balance floor.

- [ ] **Step 4: Implement reserve allocation, distress, and valuation**

Target reserve equals profile runway target multiplied by trailing weekly operating costs. Cash above 1.25 times target is removed through a recorded allocation decision; it may fund approved content/research first, then debt reduction or shareholder distribution.

Distress order is fixed: freeze greenlights, pause research, hold/cancel permitted commissions, license individual catalogue assets, withdraw weak regions, restructure, request eligible rescue, then become dormant.

Valuation is derived from annualized trailing revenue, operating margin, subscribers, catalogue score, technology, debt, and distress discount. Smooth with 85% prior valuation and 15% calculated valuation; do not apply a random percentage to last week's valuation.

- [ ] **Step 5: Run economy and prior audits**

Run:

```bash
npm run audit:platform-ai-economy
npm run audit:platform-ai-research
npm run audit:platform-ai-production
```

Expected: all pass.

- [ ] **Step 6: Commit the economy**

```bash
git add services/platformAi/platformAiEconomy.ts services/platformAi/index.ts scripts/audit-platform-ai-economy.ts package.json
git commit -m "feat: add sustainable rival platform economy"
```

---

### Task 6: Streaming Release, Canonical Project Reuse, Awards, and Learning

**Files:**
- Create: `services/platformAi/platformAiRelease.ts`
- Create: `services/platformAi/platformAiMemory.ts`
- Create: `scripts/audit-platform-ai-release.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: delivered commission or rights-ready plan, linked `IndustryProject`, platform capabilities, marketing reserve, competence.
- Produces: `schedulePlatformStreamingWindow(input)`, `releasePlatformContentPlan(input)`, `updatePlatformAiMemory(input)`, and `getPlatformAiPresentationEvents(platform)`.

- [ ] **Step 1: Write the failing release audit**

Test all four routes:

```ts
const originalRelease = releasePlatformContentPlan({ player, world, platformId: 'NETFLIX', planId: originalPlanId, absoluteWeek });
const original = originalRelease.world.projects.find(item => item.id === originalCanonicalProjectId)!;
assert.equal(original.releaseStrategy, 'STREAMING_ONLY');
assert.equal(original.streamingPlatformId, 'NETFLIX');
assert.equal(original.platformRelationship, 'ORIGINAL_COMMISSIONER');
assert.ok(original.physicalProducerStudioId);
assert.equal(original.boxOffice, 0);

const licensedRelease = releasePlatformContentPlan({ player, world: originalRelease.world, platformId: 'HULU', planId: licencePlanId, absoluteWeek });
assert.equal(licensedRelease.world.projects.filter(item => item.id === licensedProjectId).length, 1);
assert.equal(licensedRelease.world.projects.find(item => item.id === licensedProjectId)?.platformRelationship, 'LICENSEE');
assert.equal(licensedRelease.world.projects.find(item => item.id === licensedProjectId)?.boxOffice, originalLicensedBoxOffice);
```

Assert repeated release is idempotent, a platform cannot schedule before rights/localization are ready, and no route changes an existing theatrical result.

Assert release performance updates subscribers, reputation, `recentHits`, and a bounded genre-memory record without guaranteeing a hit.

- [ ] **Step 2: Register and verify failure**

Add:

```json
"audit:platform-ai-release": "esbuild scripts/audit-platform-ai-release.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-release.mjs && node /tmp/audit-platform-ai-release.mjs",
"audit:platform-funding-balance": "esbuild scripts/audit-platform-funding-balance.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-funding-balance.mjs && node /tmp/audit-platform-funding-balance.mjs"
```

Run: `npm run audit:platform-ai-release`

Expected: FAIL because release and memory exports do not exist.

- [ ] **Step 3: Implement streaming-only scheduling and release**

`schedulePlatformStreamingWindow` requires `DELIVERED` for originals or `RIGHTS_READY` for other routes, sufficient localization, and a future week. Movies use one premiere; series may choose full-season, weekly, or split-volume metadata without creating multiple canonical projects.

`releasePlatformContentPlan`:

- reuses an existing `IndustryProject` for licences, transfers, and catalogue rights;
- creates one canonical `IndustryProject` for an original only if its producer record has not already materialized it;
- sets original `boxOffice: 0` and `releaseStrategy: 'STREAMING_ONLY'`;
- preserves existing box office for post-theatrical titles;
- derives an original's existing `awardProfile` fields from its final quality, creative team, genre, prestige plan, and bounded campaign spend so the current awards system can evaluate it without a parallel awards engine;
- writes source metadata and one `streamingPerformance` result;
- never adds the same canonical project twice.

- [ ] **Step 4: Implement bounded learning and player-facing events**

Append one `PlatformAiReleaseMemory` entry per release and retain the newest 12. Rebuild bounded genre and audience beliefs from those 12 entries, and use their actor/director pairs for later talent scoring. Retain at most 40 decision records. Update effective competence by at most 0.05 per release and clamp total drift to plus or minus 0.5; one surprise hit or flop may not shift a genre belief by more than 20%.

Emit presentation events only for major greenlights, cast competition, cancellation, delivery, major release, hit/flop, awards push, region withdrawal, restructuring, or rescue. Each event contains `summary`, `reason`, `cashImpactMillions`, `timing`, and `playerConsequence`.

- [ ] **Step 5: Run release and regression audits**

Run:

```bash
npm run audit:platform-ai-release
npm run audit:platform-ai-economy
npm run audit:streaming-rivals-global-awards-phase20
npm run audit:platform-funding-balance
```

Expected: all pass and existing 104/26/8 funding behavior remains unchanged.

- [ ] **Step 6: Commit release and learning**

```bash
git add services/platformAi/platformAiRelease.ts services/platformAi/platformAiMemory.ts services/platformAi/index.ts scripts/audit-platform-ai-release.ts package.json
git commit -m "feat: release and evaluate platform AI content"
```

---

### Task 7: Weekly Orchestration and Existing World Integration

**Files:**
- Create: `services/platformAi/platformAiTurn.ts`
- Create: `scripts/audit-platform-ai-turn.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `services/worldLogic.ts:188-390`
- Modify: `services/streamingCompetitiveWorld.ts:216-250`
- Modify: `package.json`

**Interfaces:**
- Consumes: all prior Platform AI modules, `processWorldTurn`, current player acquisitions, existing competitive-world selectors.
- Produces: `processPlatformAiWorldTurn(player, world, absoluteWeek): { world; news; logs }` and canonical rival projections.

- [ ] **Step 1: Write the failing turn audit**

The audit must process one week twice and assert identical results. Then process 16 weeks and assert:

```ts
assert.ok(Object.values(world.platforms || {}).every(platform => platform.ai?.lastProcessedAbsoluteWeek === currentAbsoluteWeek));
assert.ok(Object.values(world.platforms || {}).some(platform => platform.ai!.slate.length > 0));
assert.ok(Object.values(world.platforms || {}).every(platform => platform.ai!.decisionHistory.length <= 40));
assert.ok(Object.values(world.platforms || {}).every(platform => platform.ai!.financeHistory.length <= 104));
```

Acquire Netflix, process another week, and assert its AI state, cash, research, and slate are unchanged except for externally settled contracts; another unacquired platform must continue processing.

Read `services/worldLogic.ts` as text and assert the old unconditional expression `platform.cashReserve += Math.floor(platform.subscribers * 0.1)` is absent after implementation.

- [ ] **Step 2: Register and verify failure**

Add:

```json
"audit:platform-ai-turn": "esbuild scripts/audit-platform-ai-turn.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-turn.mjs && node /tmp/audit-platform-ai-turn.mjs"
```

Run: `npm run audit:platform-ai-turn`

Expected: FAIL because the orchestrator does not exist and old evolution remains.

- [ ] **Step 3: Implement strict weekly order**

`processPlatformAiWorldTurn` performs exactly:

1. normalize;
2. resolve ownership;
3. settle economy;
4. resolve distress and commitment pressure;
5. progress research;
6. progress commission milestones;
7. schedule rights-ready content;
8. release due streaming windows;
9. update memory;
10. plan/commit at the four-week cadence;
11. record events and advance the processed week.

Skip the entire AI mutation path when `resolvePlatformController` returns `PLAYER`.

- [ ] **Step 4: Replace random platform evolution in `worldLogic.ts`**

Call the orchestrator once near the start of `processWorldTurn`, before generic rival scheduling uses the world calendar:

```ts
const platformAiResult = processPlatformAiWorldTurn(player, newWorld, currentAbsoluteWeek);
newWorld = platformAiResult.world;
news.push(...platformAiResult.news);
logs.push(...platformAiResult.logs);
```

Delete the existing random subscriber/valuation/free-cash/recent-hit block under `EVOLVE PLATFORMS & STUDIOS`. Keep studio ecosystem and venture processing intact.

Update `buildRivals` in `streamingCompetitiveWorld.ts` so capabilities, active regions, catalogue power, prestige, subscribers, and cash prefer normalized `worldPlatform.ai` state and fall back to existing templates for legacy state.

- [ ] **Step 5: Run focused integration audits**

Run:

```bash
npm run audit:platform-ai-turn
npm run audit:platform-ai-release
npm run audit:streaming-rivals-global-awards-phase20
npm run audit:streaming-weekly-loop-phase10
```

Expected: all pass.

- [ ] **Step 6: Commit weekly integration**

```bash
git add services/platformAi/platformAiTurn.ts services/platformAi/index.ts services/worldLogic.ts services/streamingCompetitiveWorld.ts scripts/audit-platform-ai-turn.ts package.json
git commit -m "feat: integrate competitive platform AI weekly loop"
```

---

### Task 8: Long-Run Balance Audit and Final Verification

**Files:**
- Create: `scripts/audit-platform-ai-long-run.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: completed Platform AI world-turn API and deterministic fixture.
- Produces: 10-, 25-, and 50-year seed reports plus an aggregate `audit:platform-ai` command.

- [ ] **Step 1: Write the long-run audit before tuning**

Simulate at least 12 deterministic seeds for 520, 1,300, and 2,600 weeks. Collect per platform:

```ts
interface PlatformAiLongRunReport {
    platformId: PlatformId;
    finalCashMillions: number;
    finalValuationBillions: number;
    releases: number;
    hits: number;
    flops: number;
    rescues: number;
    distressWeeks: number;
    maxConcurrentProductions: number;
    duplicateCanonicalProjects: number;
    directTheatricalViolations: number;
}
```

Assert:

- every numeric value is finite;
- no cash balance is negative without recorded restructuring/debt state;
- no direct-theatrical or duplicate-project violation occurs;
- at least one adverse seed creates platform distress;
- not every distressed platform is rescued;
- each active platform produces hits and non-hits across the aggregate;
- aggregate hit rate is 35–55%;
- aggregate clear-flop rate is 10–25%;
- no platform wins every simulated awards/commercial year;
- stronger profiles outperform weaker profiles across the aggregate, not every seed;
- cash above target reserve has a recorded allocation rather than unexplained accumulation;
- acquisition stops AI processing on the following turn;
- serializing and resuming a midpoint save gives the same final report.

- [ ] **Step 2: Register aggregate audit commands**

Add:

```json
"audit:platform-ai-long-run": "esbuild scripts/audit-platform-ai-long-run.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-platform-ai-long-run.mjs && node /tmp/audit-platform-ai-long-run.mjs",
"audit:platform-ai": "npm run audit:platform-ai-domain && npm run audit:platform-ai-sourcing && npm run audit:platform-ai-production && npm run audit:platform-ai-research && npm run audit:platform-ai-economy && npm run audit:platform-ai-release && npm run audit:platform-ai-turn && npm run audit:platform-ai-long-run"
```

- [ ] **Step 3: Run the long-run audit and tune only disclosed constants**

Run: `npm run audit:platform-ai-long-run`

Expected: PASS with a printed summary table. If a balance band fails, tune profile competence, risk tolerance, output cadence, cost, reserve, forecast noise, or distress thresholds. Do not add cash floors, guaranteed hits, or hidden quality bonuses.

- [ ] **Step 4: Run the complete Platform AI suite**

Run: `npm run audit:platform-ai`

Expected: all eight Platform AI audits pass.

- [ ] **Step 5: Run existing streaming and game verification**

Run each separately:

```bash
npm run audit:streaming-rivals-global-awards-phase20
npm run audit:streaming-weekly-loop-phase10
npm run audit:streaming-originals-business-phase15
npm run audit:streaming-rights-marketplace-phase16
npm run audit:streaming-acquisitions-phase21
npm run audit:platform-funding-balance
npm run build
git diff --check
```

Expected: focused audits and production build pass. If repository-wide TypeScript still reports pre-existing failures, record the exact existing failures and confirm no touched Platform AI file appears in them.

- [ ] **Step 6: Review scope invariants**

Confirm by source search and audit output:

- no bidding-room UI file changed;
- `STREAMING_FUNDING_DEADLINE_WEEKS`, `STREAMING_FUNDING_FIRST_WARNING_WEEKS`, and `STREAMING_FUNDING_FINAL_WARNING_WEEKS` remain 104, 26, and 8;
- all new saved randomness uses deterministic helpers;
- acquired-platform AI advantages are disabled;
- Content Desk route names and release restrictions match the approved spec.

- [ ] **Step 7: Commit long-run verification**

```bash
git add scripts/audit-platform-ai-long-run.ts package.json
git commit -m "test: audit long-run platform AI balance"
```

- [ ] **Step 8: Final handoff evidence**

Report:

- commit list by task;
- focused audit results;
- long-run hit/flop/distress/rescue summary;
- production build result;
- any pre-existing unrelated failures;
- exact files changed;
- confirmation that Phase 2 bidding UI and general Studio AI were not implemented.
