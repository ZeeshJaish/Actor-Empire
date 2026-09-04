# Shared Statistical Intelligence Kernel B2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Actor Empire work is performed inline without subagents unless the user explicitly changes that preference. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, save-safe, scheduled statistical intelligence kernel shared by AI-only production studios and streaming platforms, with shadow-only integration that cannot alter canonical gameplay during B2.

**Execution status:** Complete on 2026-09-03. The checkboxes below preserve the original TDD execution sequence; verified results are recorded in `../reports/2026-09-03-shared-statistical-intelligence-kernel-b2-report.md` and the living roadmap is now advanced to B3.

**Architecture:** Add an optional versioned intelligence section to the existing `StudioAiRuntimeState` and `PlatformAiRuntimeState`; do not create another company registry. Pure adapters construct immutable normalized contexts, shared modules schedule and score decisions with deterministic uncertainty and bounded learning, and a shadow coordinator compares proposals to current AI decisions without executing them.

**Tech Stack:** TypeScript 5.8, React/Vite project runtime, existing deterministic RNG/ID helpers, esbuild-based audit scripts, existing save migration/compaction/integrity services.

**Spec:** `docs/superpowers/specs/2026-09-02-shared-statistical-intelligence-kernel-b2-design.md`

## Global Constraints

- `WorldState.studios` and `WorldState.platforms` remain the company authorities; no parallel registry is allowed.
- `WorldState.streamingRightsContracts`, bidding sessions, royalty settlements, industry productions, talent bookings, completed projects, and existing finance ledgers remain canonical.
- B2 is shadow-only: it may persist intelligence checkpoints and comparisons but may not execute projects, research, localization, rights, bidding, money, talent, releases, subscriber changes, or player-facing events.
- Resolve controller before adapter, scheduling, scoring, learning, or shadow work; player-controlled companies receive no rival-AI mutation.
- All persisted values are finite, normalized, versioned, bounded, deterministic, and same-week idempotent.
- Do not use raw `Math.random()` or `Date.now()` for a canonical or shadow decision.
- Preserve the current dirty worktree and unrelated changes.
- Do not stage or commit files unless the user separately authorizes it; commit steps are intentionally replaced by review checkpoints.
- Use strict RED then GREEN evidence for every implementation task.

---

### Task 1: Persisted Intelligence Contract and Normalization

**Files:**
- Modify: `types.ts`
- Create: `services/industryIntelligence/industryIntelligenceState.ts`
- Create: `services/industryIntelligence/index.ts`
- Modify: `services/studioAi/studioAiState.ts`
- Modify: `services/platformAi/platformAiState.ts`
- Test: `scripts/audit-industry-intelligence-state-b2.ts`

**Interfaces:**
- Produces: `IndustryCompanyKind`, `IndustryDecisionLane`, `IndustryCapabilityDimension`, `IndustryIntelligenceState`, `IndustryIntelligenceProposal`, `IndustryIntelligenceShadowComparison`.
- Produces: `createInitialIndustryIntelligenceState(companyId, companyKind, seed, absoluteWeek)`.
- Produces: `normalizeIndustryIntelligenceState(raw, fallback)`.
- Consumes: existing `createDeterministicId`, Studio AI and Platform AI runtime normalization.

- [ ] **Step 1: Write the failing state audit**

Create an audit which imports the missing state functions and asserts deterministic initialization, malformed-state recovery, bounds, history limits, and stable due weeks:

```ts
const first = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'seed_netflix', 1_390);
const second = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'seed_netflix', 1_390);
assert.deepEqual(first, second);
assert.equal(first.schemaVersion, INDUSTRY_INTELLIGENCE_SCHEMA_VERSION);
assert.ok(Object.values(first.nextDueAbsoluteWeek).every(value => value === null || Number.isInteger(value)));

const repaired = normalizeIndustryIntelligenceState({
    ...first,
    momentum: Number.NaN,
    learning: { samples: Array.from({ length: 500 }, (_, index) => ({ id: `${index}` })) },
} as never, first);
assert.ok(Number.isFinite(repaired.momentum));
assert.ok(repaired.learning.samples.length <= INDUSTRY_INTELLIGENCE_LEARNING_LIMIT);
```

- [ ] **Step 2: Run the audit and verify RED**

Run:

```bash
npx esbuild scripts/audit-industry-intelligence-state-b2.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-intelligence-state-b2.mjs && node /tmp/audit-industry-intelligence-state-b2.mjs
```

Expected: compilation fails because `services/industryIntelligence` and its exported contracts do not exist.

- [ ] **Step 3: Add the persisted shared types**

Add these contracts to `types.ts`, using explicit unions and optional intelligence fields on both existing runtimes:

```ts
export const INDUSTRY_INTELLIGENCE_SCHEMA_VERSION = 1 as const;
export type IndustryCompanyKind = 'PRODUCTION_STUDIO' | 'STREAMING_PLATFORM';
export type IndustryDecisionLane = 'CONTENT_STRATEGY' | 'PRODUCTION_REVIEW' | 'RELEASE_REVIEW' | 'FINANCE_REVIEW' | 'MARKET_EXPANSION' | 'CAPABILITY_GROWTH';
export type IndustryCapabilityDimension = 'DEVELOPMENT' | 'CREATIVE' | 'PRODUCTION' | 'FINANCE' | 'MARKETING_DISCOVERY' | 'DISTRIBUTION_MARKET' | 'NEGOTIATION' | 'TALENT_RELATIONSHIP' | 'TECHNOLOGY' | 'CATALOGUE' | 'LOCALIZATION';
export type IndustryIntelligenceProposalStatus = 'SHADOW' | 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED' | 'EXPIRED' | 'SUPERSEDED';

export interface IndustryIntelligenceState {
    schemaVersion: typeof INDUSTRY_INTELLIGENCE_SCHEMA_VERSION;
    companyId: string;
    companyKind: IndustryCompanyKind;
    seed: string;
    lastProcessedAbsoluteWeek: number;
    nextDueAbsoluteWeek: Record<IndustryDecisionLane, number | null>;
    decisionCycleByLane: Record<IndustryDecisionLane, number>;
    momentum: number;
    learning: IndustryIntelligenceLearningState;
    proposals: IndustryIntelligenceProposal[];
    shadowComparisons: IndustryIntelligenceShadowComparison[];
    processedKeys: string[];
}
```

Add `intelligence?: IndustryIntelligenceState` to both runtimes. Keep it optional at the raw-save boundary so older saves remain readable. Keep the parent Studio AI and Platform AI schema constants unchanged because the nested intelligence section carries its own version and a parent Platform AI bump would trigger unrelated canonical migrations.

- [ ] **Step 4: Implement deterministic initialization and normalization**

Create `industryIntelligenceState.ts` with explicit limits, numeric clamps, lane ordering, bounded deduplication, and deterministic lane offsets:

```ts
export const INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT = 36;
export const INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT = 36;
export const INDUSTRY_INTELLIGENCE_LEARNING_LIMIT = 48;
export const INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT = 104;

export const createInitialIndustryIntelligenceState = (
    companyId: string,
    companyKind: IndustryCompanyKind,
    seed: string,
    absoluteWeek: number,
): IndustryIntelligenceState => ({
    schemaVersion: INDUSTRY_INTELLIGENCE_SCHEMA_VERSION,
    companyId,
    companyKind,
    seed,
    lastProcessedAbsoluteWeek: Math.max(0, absoluteWeek - 1),
    nextDueAbsoluteWeek: createInitialLaneSchedule(companyId, companyKind, seed, absoluteWeek),
    decisionCycleByLane: emptyLaneCounters(),
    momentum: 50,
    learning: emptyLearningState(),
    proposals: [],
    shadowComparisons: [],
    processedKeys: [],
});
```

Attach normalized shared state inside `normalizeStudioAiState` and `normalizePlatformAiState`. Derive missing old-save state from stable company IDs, existing seeds, company kind, and entered week; loading alone must not charge money or advance a lane.

- [ ] **Step 5: Run state and B1 foundation audits for GREEN**

Run the new audit, then:

```bash
npm run audit:studio-ai-foundation-b1
npm run audit:platform-ai-domain
```

Expected: all pass; existing normalized company facts remain unchanged apart from the optional versioned intelligence state.

- [ ] **Step 6: Review checkpoint**

Inspect `git diff --check` and the focused diff. Confirm no second company registry, cash field, rights field, or project collection was introduced.

---

### Task 2: Immutable Studio and Streaming Context Adapters

**Files:**
- Create: `services/industryIntelligence/industryIntelligenceContext.ts`
- Create: `services/industryIntelligence/studioIntelligenceAdapter.ts`
- Create: `services/industryIntelligence/platformIntelligenceAdapter.ts`
- Modify: `services/industryIntelligence/index.ts`
- Test: `scripts/audit-industry-intelligence-adapters-b2.ts`

**Interfaces:**
- Consumes: `NPCStudioState`, `PlatformState`, `Player`, the normalized shared state from Task 1, existing controller resolvers.
- Produces: `IndustryIntelligenceContext` and immutable `adaptStudioIntelligenceContext(player, studio, absoluteWeek)` / `adaptPlatformIntelligenceContext(player, platform, absoluteWeek)`.

- [ ] **Step 1: Write the failing adapter audit**

Cover a mature studio, a regional studio, Netflix, a financially pressured platform, malformed values, and player-controlled companies:

```ts
const context = adaptStudioIntelligenceContext(player, majorStudio, absoluteWeek);
assert.equal(context.companyId, majorStudio.id);
assert.equal(context.companyKind, 'PRODUCTION_STUDIO');
assert.ok(context.capabilities.PRODUCTION > regionalContext.capabilities.PRODUCTION);
assert.ok(context.condition.capacityPressure >= 0 && context.condition.capacityPressure <= 100);

const platformContext = adaptPlatformIntelligenceContext(player, netflix, absoluteWeek);
assert.ok(platformContext.capabilities.LOCALIZATION >= 0);
assert.ok(Number.isFinite(platformContext.condition.catalogueNeed));
assert.equal(Object.isFrozen(platformContext), true);
```

Also assert that constructing a context does not mutate the source object.

- [ ] **Step 2: Run the adapter audit and verify RED**

Run the esbuild audit command using `/tmp/audit-industry-intelligence-adapters-b2.mjs`.

Expected: imports fail because the adapters do not exist.

- [ ] **Step 3: Implement the common context contract**

Define explicit normalized views:

```ts
export interface IndustryIntelligenceContext {
    companyId: string;
    companyKind: IndustryCompanyKind;
    absoluteWeek: number;
    seed: string;
    controller: 'AI' | 'PLAYER';
    status: string;
    identity: IndustryIntelligenceIdentity;
    capabilities: Partial<Record<IndustryCapabilityDimension, number>>;
    condition: IndustryIntelligenceCondition;
    learning: IndustryIntelligenceLearningState;
    nextDueAbsoluteWeek: Record<IndustryDecisionLane, number | null>;
    decisionCycleByLane: Record<IndustryDecisionLane, number>;
    activeCommitmentIds: string[];
}
```

Clamp normalized scores to `0..100`, preserve canonical monetary units in millions, and freeze the returned context and nested calculation views.

- [ ] **Step 4: Implement studio mapping**

Map B1 studio profile, competence, canonical cash, AI finance, capacity, public momentum/results, and bounded history. Use exact source facts; do not infer rights, talent, or projects that are absent.

Compute capacity pressure from committed versus available development/production slots and compute financial pressure from runway, debt, committed spend, and recent loss weeks.

- [ ] **Step 5: Implement streaming mapping**

Map existing Platform AI competence, subscribers, cash reserve, debt, audience health, catalogue/rights counts, market operations, language capabilities, research/localization workloads, spending restrictions, and recent release memory.

Map streaming-specific capability dimensions without changing the source platform or executing normalization side effects.

- [ ] **Step 6: Run GREEN and adjacent adapter-sensitive audits**

Run the new adapter audit, `npm run audit:studio-ai-foundation-b1`, and `npm run audit:platform-ai-phase4`.

Expected: all pass and input snapshots remain byte-equivalent before and after adaptation.

- [ ] **Step 7: Review checkpoint**

Confirm adapters only read source authority and that player control is represented explicitly in every context.

---

### Task 3: Due-Lane Scheduler and Controller Guard

**Files:**
- Create: `services/industryIntelligence/industryIntelligenceScheduler.ts`
- Create: `services/industryIntelligence/industryIntelligenceCoordinator.ts`
- Modify: `services/industryIntelligence/index.ts`
- Test: `scripts/audit-industry-intelligence-scheduler-b2.ts`

**Interfaces:**
- Consumes: `IndustryIntelligenceContext`, `IndustryIntelligenceState`, `IndustryDecisionLane`.
- Produces: `getDueIndustryDecisionLanes(context)`, `advanceIndustryDecisionLane(state, lane, absoluteWeek)`, `processIndustryIntelligenceShadowCompany(input)`.

- [ ] **Step 1: Write scheduler RED tests**

Assert due-only work, distinct lane cadence, stable replay, player skip, terminal-company skip, and deterministic next weeks:

```ts
assert.deepEqual(getDueIndustryDecisionLanes(notDueContext), []);
assert.deepEqual(getDueIndustryDecisionLanes(dueContext), ['FINANCE_REVIEW']);

const first = processIndustryIntelligenceShadowCompany(input);
const replay = processIndustryIntelligenceShadowCompany({ ...input, companyState: first.state });
assert.equal(replay.changed, false);
assert.deepEqual(replay.state, first.state);

const playerResult = processIndustryIntelligenceShadowCompany({ ...input, context: playerContext });
assert.equal(playerResult.changed, false);
```

- [ ] **Step 2: Run the scheduler audit and verify RED**

Run the esbuild audit command using `/tmp/audit-industry-intelligence-scheduler-b2.mjs`.

Expected: missing scheduler/coordinator exports.

- [ ] **Step 3: Implement lane applicability and cadence**

Use a stable lane order and explicit base cadence ranges. Production studios return `null` for inapplicable market-expansion work. Vary cadence deterministically within narrow bounds based on company kind, scale, pressure, and lane cycle; never recalculate an already-saved due week on reload.

```ts
const processedKey = `${context.companyKind}:${context.companyId}:${lane}:${absoluteWeek}`;
if (state.processedKeys.includes(processedKey)) return { state, changed: false, dueLanes: [] };
```

- [ ] **Step 4: Implement the hard controller guard**

The coordinator must return before due-lane evaluation when `context.controller !== 'AI'`. Terminal statuses also return without advancing schedules. Ambiguous or malformed controller input fails closed to no mutation.

- [ ] **Step 5: Run GREEN and controller regressions**

Run the new scheduler audit, `npm run audit:studio-ai-control-b1`, and `npm run audit:platform-ai-turn`.

Expected: all pass; player-controlled companies remain untouched.

- [ ] **Step 6: Review checkpoint**

Confirm non-due companies perform only adaptation/due checks and same-week keys remain bounded.

---

### Task 4: Eligibility, Scoring, Reasons, and Deterministic Forecasts

**Files:**
- Create: `services/industryIntelligence/industryIntelligenceOptions.ts`
- Create: `services/industryIntelligence/industryIntelligenceScoring.ts`
- Create: `services/industryIntelligence/industryIntelligenceForecast.ts`
- Modify: `services/industryIntelligence/industryIntelligenceCoordinator.ts`
- Modify: `services/industryIntelligence/index.ts`
- Test: `scripts/audit-industry-intelligence-decisions-b2.ts`

**Interfaces:**
- Produces: `IndustryDecisionOption`, `IndustryDecisionScore`, `evaluateIndustryDecisionOptions(context, lane, options)`, `createIndustryForecast(context, lane, optionId)`.
- Consumes: due lanes from Task 3 and deterministic RNG/ID helpers.

- [ ] **Step 1: Write decision RED tests**

Cover affordability, capacity, spending restrictions, missing capability, score ranking, deterministic ties, competence-shaped error, and no success floor:

```ts
const result = evaluateIndustryDecisionOptions(context, 'CAPABILITY_GROWTH', [unaffordable, affordable]);
assert.equal(result.selected?.optionId, affordable.optionId);
assert.ok(result.rejected.some(item => item.optionId === unaffordable.optionId && item.reasonCodes.includes('INSUFFICIENT_RUNWAY')));

const skilledErrors = sampleForecastErrors(highCompetenceContext, 400);
const weakErrors = sampleForecastErrors(lowCompetenceContext, 400);
assert.ok(standardDeviation(skilledErrors) < standardDeviation(weakErrors));
assert.ok(skilledErrors.some(value => value < 0));
```

- [ ] **Step 2: Run the decision audit and verify RED**

Run the esbuild audit command using `/tmp/audit-industry-intelligence-decisions-b2.mjs`.

Expected: missing option/scoring/forecast modules.

- [ ] **Step 3: Implement hard eligibility**

Represent important rejection reasons as an explicit union including `PLAYER_CONTROLLED`, `TERMINAL_COMPANY`, `INSUFFICIENT_RUNWAY`, `INSUFFICIENT_CAPACITY`, `SPENDING_RESTRICTED`, `MISSING_CAPABILITY`, `RIGHTS_CONFLICT`, and `DUPLICATE_COMMITMENT`.

Run eligibility before scoring. A rejected option retains its reason codes but can never be selected.

- [ ] **Step 4: Implement normalized score components**

Use explicit finite components:

```ts
total = need
    + strategyFit
    + expectedUpside
    + relationshipValue
    + competitiveValue
    - financialRisk
    - capacityPressure
    - fatigue
    - executionRisk;
```

Clamp component inputs, preserve the unrounded comparison total internally, and use deterministic company/lane/cycle/option tie-breaking.

- [ ] **Step 5: Implement competence-shaped forecasts**

Seed forecast samples with company seed, lane, cycle, option ID, and absolute week. Higher relevant competence reduces variance around the estimate; it must not clamp the resolved estimate to a positive result or directly alter a later canonical outcome.

- [ ] **Step 6: Create structured proposals and holds**

For each due lane, persist exactly one selected shadow proposal or an explained hold. Include score components, primary/secondary reason codes, confidence, expected exposure, affordability ceiling, uncertainty reference, and next review week.

- [ ] **Step 7: Run GREEN and Project A boundary regressions**

Run the new decision audit plus:

```bash
npm run audit:streaming-rights-compatibility-phase3
npm run audit:streaming-active-bidding-phase2
```

Expected: all pass; B2 scoring has not changed bidder eligibility or canonical contracts.

- [ ] **Step 8: Review checkpoint**

Confirm no decision function imports a UI component or directly mutates world cash, rights, projects, research, localization, or talent.

---

### Task 5: Bounded Learning, Momentum Cooling, Fatigue, and Overextension

**Files:**
- Create: `services/industryIntelligence/industryIntelligenceLearning.ts`
- Modify: `services/industryIntelligence/industryIntelligenceCoordinator.ts`
- Modify: `services/industryIntelligence/index.ts`
- Test: `scripts/audit-industry-intelligence-learning-b2.ts`

**Interfaces:**
- Produces: `recordIndustryLearningOutcome(state, outcome)`, `coolIndustryMomentum(state, context, absoluteWeek)`, `deriveIndustryFatigue(context)`.
- Consumes: resolved evidence summaries and shared state from Tasks 1–4.

- [ ] **Step 1: Write learning RED tests**

Assert resolved-evidence-only learning, exact-once outcome keys, diminishing gains, momentum cooling, bounded samples, repetition fatigue, franchise fatigue, and overextension:

```ts
const learnedOnce = recordIndustryLearningOutcome(state, hitOutcome);
const learnedReplay = recordIndustryLearningOutcome(learnedOnce, hitOutcome);
assert.deepEqual(learnedReplay, learnedOnce);
assert.ok(learnedOnce.momentum > state.momentum);

const cooled = coolIndustryMomentum({ ...state, momentum: 90 }, context, absoluteWeek + 12);
assert.ok(cooled.momentum < 90 && cooled.momentum >= context.identity.neutralMomentum);
assert.ok(repeatedContext.condition.repetitionFatigue > variedContext.condition.repetitionFatigue);
```

- [ ] **Step 2: Run the learning audit and verify RED**

Run the esbuild audit command using `/tmp/audit-industry-intelligence-learning-b2.mjs`.

Expected: missing learning functions.

- [ ] **Step 3: Implement exact-once bounded learning**

Accept only outcomes with a stable canonical evidence ID and resolved week. Store that ID in bounded processed evidence. Update rolling aggregates and recent samples without copying narrative/project payloads.

- [ ] **Step 4: Implement anti-snowball dynamics**

Apply diminishing capability progress near the upper bound, company-specific neutral momentum cooling, capacity-derived overextension, and bounded repetition/franchise fatigue. One failure may reduce current form but cannot erase core capability.

- [ ] **Step 5: Run GREEN and long-sequence invariants**

Run the audit over at least 20,800 pure-kernel weekly checkpoints and assert all values remain finite/bounded, memory stays within limits, and both positive and negative forecast outcomes occur.

- [ ] **Step 6: Review checkpoint**

Confirm learning cannot be triggered by an unexecuted shadow proposal and histories do not grow with game age.

---

### Task 6: Shadow Comparison Against Existing Company Decisions

**Files:**
- Create: `services/industryIntelligence/industryIntelligenceShadow.ts`
- Modify: `services/industryIntelligence/industryIntelligenceCoordinator.ts`
- Modify: `services/industryIntelligence/index.ts`
- Test: `scripts/audit-industry-intelligence-shadow-b2.ts`

**Interfaces:**
- Produces: `captureIndustryShadowBaseline(context)`, `compareIndustryShadowDecision(input)`, bounded divergence categories.
- Consumes: B2 proposal, pre-action company facts, and a summarized authoritative post-action observation.

- [ ] **Step 1: Write shadow-isolation RED tests**

Create fixtures for platform research, localization, content planning, studio hold, and finance review. Snapshot canonical world fields before and after shadow execution:

```ts
const before = canonicalGameplayProjection(world);
const result = runShadowFixture(player, world, absoluteWeek);
assert.deepEqual(canonicalGameplayProjection(result.world), before);
assert.equal(result.proposal.status, 'SHADOW');
assert.equal(result.comparison.divergence, 'ACTION_FAMILY_DIFFERENCE');
```

Assert comparisons remain bounded and never appear in News, X, inbox, or player logs.

- [ ] **Step 2: Run the shadow audit and verify RED**

Run the esbuild audit command using `/tmp/audit-industry-intelligence-shadow-b2.mjs`.

Expected: missing shadow comparison exports.

- [ ] **Step 3: Implement authoritative observation summaries**

Represent only action family, acted/held, exposure band, reason family, and timing. Do not copy full projects, contracts, or platform decision histories into B2 diagnostics.

- [ ] **Step 4: Implement bounded comparisons**

Use divergence values `MATCH`, `ACT_VS_HOLD`, `ACTION_FAMILY_DIFFERENCE`, `EXPOSURE_BAND_DIFFERENCE`, `TIMING_DIFFERENCE`, `ELIGIBILITY_DIFFERENCE`, and `NO_AUTHORITATIVE_OBSERVATION`.

Generate stable comparison IDs and deduplicate company/lane/week comparisons exactly once.

- [ ] **Step 5: Prove shadow non-authority**

The audit must compare cash, debt, subscribers, rights IDs, bidding-session IDs, research IDs, localization job IDs, industry-production IDs, talent-booking IDs, completed-project IDs, News IDs, and social-post IDs before and after shadow-only execution.

- [ ] **Step 6: Run GREEN and review checkpoint**

Run the shadow audit and `git diff --check`. Confirm there is no executor callback in the B2 shadow API.

---

### Task 7: Weekly Wiring, Save Protection, and Runtime Budgets

**Files:**
- Modify: `services/studioAi/studioAiWeek.ts`
- Modify: `services/platformAi/platformAiTurn.ts`
- Modify: `services/platformAi/platformAiSave.ts` if present, otherwise the existing Platform AI save-normalization owner identified during implementation
- Modify: `services/studioAi/studioAiSave.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `services/saveIntegrity.ts`
- Modify: `services/industryIntelligence/industryIntelligenceCoordinator.ts`
- Test: `scripts/audit-industry-intelligence-integration-b2.ts`
- Test: `scripts/audit-industry-intelligence-save-b2.ts`

**Interfaces:**
- Consumes: all prior B2 modules and existing weekly company boundaries.
- Produces: shadow checkpoints on existing company runtimes with no new player-facing output.

- [ ] **Step 1: Write weekly-integration RED tests**

Assert studio and platform shadow state advances only on due lanes, authoritative outcomes remain equal with shadow enabled/disabled, acquired companies are skipped, and replay is identical.

Use a projection that excludes only B2 diagnostic fields; every canonical gameplay field must remain deeply equal.

- [ ] **Step 2: Run the integration audit and verify RED**

Run the esbuild audit command using `/tmp/audit-industry-intelligence-integration-b2.mjs`.

Expected: no weekly B2 checkpoint is created.

- [ ] **Step 3: Wire the pre-action and post-action boundaries**

At each existing company turn:

1. resolve controller;
2. normalize the shared intelligence state;
3. capture the immutable pre-action context;
4. evaluate due lanes in shadow mode;
5. run the existing authoritative company behaviour unchanged;
6. summarize its action family where a comparison is available; and
7. persist bounded shadow state back onto that same company runtime.

Do not emit shadow News, social posts, logs, transactions, or player notifications.

- [ ] **Step 4: Write save RED tests**

Cover an old save without intelligence, malformed intelligence, compaction at every limit, save/reload, export/import, and a Week-38 platform acquisition checkpoint. Assert the acquisition handoff does not process the target as rival AI afterward.

- [ ] **Step 5: Extend migration, compaction, and integrity**

Normalize optional B2 state during existing save preparation. Preserve active due schedules, lane cycles, processed keys needed for idempotency, active shadow proposals, learning aggregates, and controller handoff evidence. Trim only bounded completed diagnostics.

Fingerprint schema version, company ID/kind, controller, due weeks, lane cycles, active proposal IDs, and processed checkpoint keys without duplicating canonical company data.

- [ ] **Step 6: Run save and ownership GREEN**

Run the new save audit plus:

```bash
npm run audit:save-integrity
npm run audit:save-transfer
npm run audit:studio-ai-control-b1
npm run audit:streaming-acquisitions-phase21
```

Expected: all pass; old saves gain deterministic optional B2 state and acquisitions stop rival processing.

- [ ] **Step 7: Measure runtime overhead**

Run the late-game weekly-performance fixture with shadow enabled and record B2 overhead. Non-due companies must perform only bounded adaptation/due checks; no historical project scan may be added.

- [ ] **Step 8: Review checkpoint**

Inspect the weekly-loop diff carefully. Confirm existing authoritative call ordering is unchanged and B2 failures fail closed without interrupting Process Week.

---

### Task 8: Consolidated Verification, Documentation, and Roadmap Handoff

**Files:**
- Modify: `package.json`
- Create: `scripts/audit-industry-intelligence-long-run-b2.ts`
- Create: `docs/superpowers/reports/2026-09-03-shared-statistical-intelligence-kernel-b2-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`

**Interfaces:**
- Consumes: all B2 audit scripts and implementation.
- Produces: named audit commands, completion evidence, and B3 as the next approval-gated phase only after every B2 gate passes.

- [ ] **Step 1: Register focused audit commands**

Add package scripts for state, adapters, scheduler, decisions, learning, shadow, integration, save, and long-run audits, plus one aggregate command:

```json
"audit:industry-intelligence-b2": "npm run audit:industry-intelligence-state-b2 && npm run audit:industry-intelligence-adapters-b2 && npm run audit:industry-intelligence-scheduler-b2 && npm run audit:industry-intelligence-decisions-b2 && npm run audit:industry-intelligence-learning-b2 && npm run audit:industry-intelligence-shadow-b2 && npm run audit:industry-intelligence-integration-b2 && npm run audit:industry-intelligence-save-b2 && npm run audit:industry-intelligence-long-run-b2"
```

- [ ] **Step 2: Write the long-run RED audit**

Run representative mature, regional, generated, distressed, and high-competence companies through 20,800 pure-kernel weekly checkpoints. Assert determinism, finite stats, bounded saves, due-only work, both wins and failures, capability diminishing returns, momentum cooling, and no canonical gameplay mutation.

- [ ] **Step 3: Run RED, complete only missing audit-support code, then GREEN**

Run `npm run audit:industry-intelligence-long-run-b2`. The initial failure must identify a concrete missing invariant or exported measurement. Add only the smallest production support required, then rerun to pass.

- [ ] **Step 4: Run the complete focused and adjacent matrix**

Run:

```bash
npm run audit:industry-intelligence-b2
npm run audit:studio-ai-foundation-b1
npm run audit:studio-ai-control-b1
npm run audit:studio-ai-save-b1
npm run audit:studio-ai-weekly-b1
npm run audit:platform-ai-turn
npm run audit:platform-ai-phase4
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-rights-compatibility-phase3
npm run audit:save-integrity
npm run audit:save-transfer
npm run audit:late-game-week-performance
npm run build
```

Run `npm run lint` separately. If it fails, distinguish B2-owned diagnostics from already documented unrelated fixture drift; fix every B2-owned diagnostic.

- [ ] **Step 5: Inspect code-quality and scope evidence**

Run:

```bash
rg -n "Math\.random\(|Date\.now\(" services/industryIntelligence
git diff --check
git status --short
```

Expected: no raw nondeterministic calls in the B2 kernel, no whitespace errors, and unrelated dirty files remain preserved.

- [ ] **Step 6: Write the B2 completion report**

Record implemented modules, ownership boundaries, RED/GREEN evidence, shadow non-authority proof, deterministic and long-run results, save/runtime measurements, known unrelated failures, and deferred B3–B8 work. Do not claim full 400-year game certification; B8 owns that gate.

- [ ] **Step 7: Update the living roadmap only after evidence passes**

Set B2 to `COMPLETE`, set B3 to `NEXT — design review before implementation`, add the B2 design/plan/report to supporting documents, update the date/version, and preserve all other phase statuses.

- [ ] **Step 8: Final review checkpoint**

Review the complete B2 diff without staging it. Report exact tests, performance, save evidence, remaining pre-existing failures, and the B3 approval gate. Do not begin B3.
