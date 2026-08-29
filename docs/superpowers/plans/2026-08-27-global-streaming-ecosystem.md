# Global Streaming Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent regional and emergent streaming companies with local `Others` aggregation and global visibility, while making existing NPC production ventures deterministic and eligible for suitable Platform AI commissions.

**Architecture:** Keep the fixed five-company `PlatformId` deep simulation intact. Store all additional operators in a separate normalized `WorldState.streamingPlatformEcosystem`; expose combined country/global read models through pure selectors and run one bounded deterministic ecosystem turn per absolute week. Reuse the existing NPC production-house registry instead of creating a second studio system.

**Tech Stack:** TypeScript, React, Vite, Node assertion audit scripts, esbuild, existing deterministic RNG/ID helpers.

**Spec:** `docs/superpowers/specs/2026-08-27-global-streaming-ecosystem-design.md`

## Global Constraints

- Do not widen `PlatformId` or put regional/dynamic operators into `world.platforms`.
- Dynamic operator IDs must never be written into `PlatformId`-only bidding, rights, settlement, acquisition, or commissioning fields.
- Market shares plus `othersSharePercent` must equal exactly `100.00` after canonical rounding.
- Saved decisions use `createDeterministicRng` and `createDeterministicId`; UI reads never mutate state.
- The existing five Platform AI companies remain authoritative for their cash, subscribers, research, rights, and ownership.
- Preserve-first migration must be idempotent and must not overwrite valid saved progress.
- Preserve the existing NPC venture lifecycle and Forbes integration.
- Do not stage, commit, or overwrite unrelated dirty-worktree changes.
- Every production-code behavior begins with an observed focused RED and ends with fresh GREEN evidence.

---

## File structure

- Create `services/streamingPlatformEcosystemSeeds.ts`: immutable real-operator and market seed definitions.
- Create `services/streamingPlatformEcosystem.ts`: normalization, market repair, local/global selectors, and compact capability adapters.
- Create `services/streamingPlatformEcosystemTurn.ts`: deterministic launch and bounded weekly non-core company simulation.
- Create `scripts/audit-global-streaming-ecosystem.ts`: executable behavioral audit used for RED/GREEN cycles.
- Modify `types.ts`: ecosystem domain types and optional canonical world field.
- Modify `services/saveMigration.ts`: normalize the new world field.
- Modify `services/saveCompaction.ts`: bound and retain operator/event state.
- Modify `services/worldLogic.ts`: process the ecosystem once after the five core Platform AI turns.
- Modify `services/streamingDayOneMarkets.ts`: compatibility projection from ecosystem summaries where a Player is available.
- Modify `components/StreamingDefineLaunchWizard.tsx`: use live country rival summaries.
- Modify `components/StreamingMarketExpansionWizard.tsx`: use live country rival summaries.
- Modify `components/StreamingPlatformWars.tsx`: show qualified non-core global challengers without unsupported action buttons.
- Modify `services/npcVentureLogic.ts`: deterministic venture processing and exactly-once marker.
- Modify `services/platformAi/platformAiCommissioning.ts`: adapt eligible active NPC ventures into producer candidates.
- Modify `package.json`: add the focused audit command.

---

### Task 1: Canonical ecosystem types, seeds, and normalization

**Files:**
- Create: `scripts/audit-global-streaming-ecosystem.ts`
- Create: `services/streamingPlatformEcosystemSeeds.ts`
- Create: `services/streamingPlatformEcosystem.ts`
- Modify: `types.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizeStreamingPlatformEcosystem(value, absoluteWeek)`, `getStreamingEcosystemOperator(state, id)`, `STREAMING_ECOSYSTEM_SCHEMA_VERSION`.
- Produces immutable seed records for core mirrors, Prime Video, and the approved regional roster.

- [ ] **Step 1: Write the failing normalization audit**

Add assertions that call the wished-for API and require:

```ts
const normalized = normalizeStreamingPlatformEcosystem(undefined, 1400);
assert.equal(normalized.schemaVersion, STREAMING_ECOSYSTEM_SCHEMA_VERSION);
assert.equal(normalized.operators.JIOHOTSTAR.name, 'JioHotstar');
assert.equal(normalized.operators.JIOHOTSTAR.homeCountryId, 'IN');
assert.equal(normalized.operators.TVING.homeCountryId, 'KR');
assert.equal(normalized.operators.CRAVE.homeCountryId, 'CA');
assert.equal(normalized.operators.STAN.homeCountryId, 'AU');
for (const market of Object.values(normalized.markets)) {
  const total = market.shares.reduce((sum, item) => sum + item.sharePercent, 0) + market.othersSharePercent;
  assert.equal(Math.round(total * 100), 10_000);
}
assert.deepEqual(normalizeStreamingPlatformEcosystem(normalized, 1400), normalized);
```

- [ ] **Step 2: Run the audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-global-streaming-ecosystem.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-global-streaming-ecosystem.mjs && node /tmp/audit-global-streaming-ecosystem.mjs
```

Expected: compilation fails because the ecosystem module/types do not exist.

- [ ] **Step 3: Add canonical types and seed definitions**

Add the exact unions and interfaces from spec section 4 to `types.ts`, including:

```ts
streamingPlatformEcosystem?: StreamingPlatformEcosystemState;
```

Represent seeded operators with stable uppercase string IDs, explicit home countries, active countries, compact capabilities, and stable game-balance values. Seed all 24 markets and calculate residual `Others` without live network data.

- [ ] **Step 4: Implement preserve-first normalization and exact share repair**

Implement:

```ts
export const normalizeStreamingPlatformEcosystem = (
  value: unknown,
  absoluteWeek: number,
): StreamingPlatformEcosystemState;
```

Use two-decimal largest-remainder repair: clamp named shares, scale down when their sum exceeds 100, and assign the exact rounded residue to `othersSharePercent`. Sort IDs and country lists for byte-stable normalization.

- [ ] **Step 5: Run GREEN and add the package command**

Add:

```json
"audit:global-streaming-ecosystem": "esbuild scripts/audit-global-streaming-ecosystem.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-global-streaming-ecosystem.mjs && node /tmp/audit-global-streaming-ecosystem.mjs"
```

Run `npm run audit:global-streaming-ecosystem` and require a passing exit code.

---

### Task 2: Local visibility, `Others`, and global challenger selectors

**Files:**
- Modify: `scripts/audit-global-streaming-ecosystem.ts`
- Modify: `services/streamingPlatformEcosystem.ts`

**Interfaces:**
- Produces: `getVisibleStreamingCompaniesForMarket(player, countryId)`.
- Produces: `getVisibleGlobalStreamingCompanies(player)`.
- Produces: `getStreamingOthersShare(player, countryId)`.

- [ ] **Step 1: Add failing selector assertions**

Use literal fixtures proving:

```ts
const india = getVisibleStreamingCompaniesForMarket(player, 'IN');
assert(india.some(item => item.name === 'JioHotstar'));
assert(india.some(item => item.name === 'Others' && item.kind === 'OTHERS'));
assert(india.filter(item => item.kind === 'REGIONAL').length <= 3);
assert.equal(Math.round(india.reduce((sum, item) => sum + (item.sharePercent || 0), 0) * 100), 10_000);
```

Add a small operator below 1.5%, a promoted operator above 4% with four qualifying weeks, and a global candidate active in three countries with 12 million subscribers. Assert local cap, promotion, demotion hysteresis, and global qualification.

- [ ] **Step 2: Run and observe RED**

Expected: missing selector exports.

- [ ] **Step 3: Implement pure visibility selectors**

Build summaries from authoritative core `world.platforms`, ecosystem non-core operators, player market operations, and residual `Others`. Never modify `player` or ecosystem state. Use separate local and global relevance scoring helpers with stable ID tie-breaks.

- [ ] **Step 4: Run GREEN and mutation-check boundaries**

Temporarily reason through mutations for wrong promotion threshold, missing `Others`, and a fourth local operator; confirm at least one assertion catches each.

---

### Task 3: Deterministic emergent-company weekly simulation

**Files:**
- Create: `services/streamingPlatformEcosystemTurn.ts`
- Modify: `scripts/audit-global-streaming-ecosystem.ts`
- Modify: `services/worldLogic.ts`

**Interfaces:**
- Consumes: normalized ecosystem state and deterministic helpers.
- Produces: `processStreamingPlatformEcosystemTurn(player, world, absoluteWeek)` returning `{ world, news, logs, changed }`.

- [ ] **Step 1: Add failing weekly-turn assertions**

Assert that a controlled fixture:

- processes one week only once;
- creates the same operator ID/origin/name from two cloned saves;
- starts a conglomerate-backed fixture above a bootstrapped fixture in at least two of cash, technology, catalogue, or markets;
- keeps each market at 100.00;
- gives a closed operator no later positive share;
- produces byte-equivalent state after save/reload continuation.

- [ ] **Step 2: Run and observe RED**

Expected: missing weekly processor.

- [ ] **Step 3: Implement deterministic launch generation**

Use a seed shaped as:

```ts
`${player.id}:streaming-ecosystem:${schemaVersion}:${launchSequence}:${absoluteWeek}:${homeCountryId}`
```

Use one RNG instance per named action, stable IDs, a 26-week opportunity cooldown, the active/global bounds from the spec, region-aware names, and origin-dependent starting profiles.

- [ ] **Step 4: Implement bounded company actions and constrained share transfer**

Allow one action per non-core operator per processed week. Record only material events. Transfer share between the acting company, weaker named operators, and `Others`; repair totals after every market mutation.

- [ ] **Step 5: Integrate weekly order**

In `processWorldTurn`, call the ecosystem processor immediately after `processPlatformAiWorldTurn` and before downstream market presentation. Append returned news/logs once.

- [ ] **Step 6: Run GREEN**

Run the focused ecosystem audit twice to prove no dependence on ambient process order.

---

### Task 4: Save migration, compaction, and transfer preservation

**Files:**
- Modify: `scripts/audit-global-streaming-ecosystem.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `scripts/audit-save-migration.ts`
- Modify: `scripts/audit-save-transfer.ts`

**Interfaces:**
- Consumes: `normalizeStreamingPlatformEcosystem`.
- Produces canonical migrated and bounded saved state.

- [ ] **Step 1: Add failing persistence assertions**

Require a legacy save to gain the ecosystem without changing player money, `world.platforms`, rights, bids, or projects. Require compaction to preserve active operators, cap event history, retain a recent closed operator, and produce idempotent output.

- [ ] **Step 2: Run focused audits and observe RED**

Run ecosystem, save-migration, and save-transfer audits. Expected: new field is absent or unbounded.

- [ ] **Step 3: Normalize during migration**

After Platform AI world normalization, set:

```ts
streamingPlatformEcosystem: normalizeStreamingPlatformEcosystem(
  normalizedPlatformAiWorld.streamingPlatformEcosystem,
  platformAiAbsoluteWeek,
)
```

Do not mutate the five authoritative platform states.

- [ ] **Step 4: Compact ecosystem history**

Retain all active operators, recent closed operators inside the specified retention window, at most 120 material events, and canonical market state. Do not persist presentation summaries.

- [ ] **Step 5: Run GREEN**

Require ecosystem, save migration, and save transfer audits to pass freshly.

---

### Task 5: Live country and global rival UI adapters

**Files:**
- Modify: `services/streamingDayOneMarkets.ts`
- Modify: `components/StreamingDefineLaunchWizard.tsx`
- Modify: `components/StreamingMarketExpansionWizard.tsx`
- Modify: `components/StreamingPlatformWars.tsx`
- Modify: `styles/streaming-platform-wars-v2.css` only if existing classes cannot express the compact challenger row.
- Modify: `scripts/audit-global-streaming-ecosystem.ts`

**Interfaces:**
- Consumes the selectors from Task 2.
- Produces no new canonical state.

- [ ] **Step 1: Add failing presentation-model assertions**

Assert that India presentation contains JioHotstar and `Others`, Australia contains Stan, Canada contains Crave, and a qualifying fictional operator appears in global summaries with `kind: 'DYNAMIC'`. Assert that non-core summaries expose no `PlatformId` action target.

- [ ] **Step 2: Run and observe RED**

Expected: UI read paths still expose static `market.rivals` only.

- [ ] **Step 3: Replace market-card rival reads**

In both market wizards, derive:

```ts
const rivals = getVisibleStreamingCompaniesForMarket(player, market.id);
const topRival = rivals.find(item => item.kind !== 'OTHERS');
```

Render the same compact rows, using `sharePercent`; preserve current card density and add no new modal.

- [ ] **Step 4: Add a compact emerging-challengers block to Platform Wars**

Use `getVisibleGlobalStreamingCompanies(player)` and render only non-core qualified companies beneath the existing deep rival cards. Display home market, subscribers/reach, and momentum. Do not attach response, rights, acquisition, or bidding buttons.

- [ ] **Step 5: Run GREEN and build**

Run the focused audit and `npm run build`. Fix only errors caused by this slice.

---

### Task 6: Deterministic existing NPC production ventures

**Files:**
- Create: `scripts/audit-npc-venture-determinism.ts`
- Modify: `services/npcVentureLogic.ts`
- Modify: `types.ts`
- Modify: `package.json`

**Interfaces:**
- Produces deterministic `processNpcVentures` results and an exactly-once `lastProcessedAbsoluteWeek` marker in the existing venture world state or a bounded adjacent metadata field.

- [ ] **Step 1: Write the failing deterministic audit**

Clone one player/world twice, process the same absolute week, and assert identical venture IDs, company state, project IDs, outcomes, news IDs, and logs. Process the resulting world for the same week again and assert no duplicate launch or project.

- [ ] **Step 2: Run and observe RED**

Expected: states differ because production code uses `Math.random()` and `Date.now()`.

- [ ] **Step 3: Replace saved decisions with named deterministic streams**

Introduce a local helper:

```ts
const ventureRng = (playerId: string, absoluteWeek: number, scope: string) =>
  createDeterministicRng(`${playerId}:npc-venture:${absoluteWeek}:${scope}`);
```

Pass RNGs into name, founder, archetype, seed money, project, outcome, offer, and news-ID creation. Do not use a global mutable random stream whose draw order changes when unrelated branches change.

- [ ] **Step 4: Add exactly-once processing**

Persist the latest processed absolute week outside individual venture history. If the same week is requested again, return the synchronized world with no new event.

- [ ] **Step 5: Run GREEN and adjacent studio audits**

Run the new audit, living-studio-ecosystem audit with the CSV loader if required, and Forbes studio profile audit.

---

### Task 7: Qualified NPC ventures as Platform AI producers

**Files:**
- Modify: `scripts/audit-platform-ai-production.ts`
- Modify: `services/platformAi/platformAiCommissioning.ts`
- Modify: `services/platformAi/platformAiProduction.ts` only if producer settlement does not already credit the producer boundary.
- Modify: `services/npcVentureLogic.ts` only for a narrowly required settlement adapter.

**Interfaces:**
- Produces an internal `PlatformAiProducerCandidate` adapter for static and dynamic studios.
- Preserves `selectPlatformAiProducer(input): StudioId | null`.

- [ ] **Step 1: Add failing producer-selection assertions**

Create literal world fixtures for:

- a strong active genre-fitting NPC venture that should beat an unsuitable static studio;
- a closed venture;
- an insolvent venture;
- an overloaded venture with active canonical productions;
- a player-controlled venture/studio.

Assert only the first can be selected, and assert repeated selection is deterministic.

- [ ] **Step 2: Run and observe RED**

Expected: the strong dynamic venture is ignored because selection only reads `STUDIO_CATALOG`.

- [ ] **Step 3: Implement one candidate adapter**

Map static studios and active NPC ventures into:

```ts
interface PlatformAiProducerCandidate {
  studioId: StudioId;
  name: string;
  archetype: string;
  budgetComfort: Array<'LOW' | 'MID' | 'HIGH'>;
  scriptBias: number;
  hypeBias: number;
  distributionBias: number;
  payMultiplier: number;
  reputation: number;
  hits: number;
  flops: number;
  cashReserve: number;
  isNpcVenture: boolean;
}
```

Reuse the existing scoring categories and add explicit eligibility gates. Writer-department naming must read the candidate name rather than indexing `STUDIO_CATALOG[dynamicId]`.

- [ ] **Step 4: Preserve canonical production invariants**

Assert the selected dynamic producer creates exactly one `IndustryProductionCommitment`, talent bookings point to its ID, milestone payment remains exact, and its autonomous loop does not create a duplicate title for the commission.

- [ ] **Step 5: Run GREEN**

Run Platform AI production, talent bookings, player commission, and living-studio audits.

---

### Task 8: Final regression and browser verification

**Files:**
- Modify only files required by a newly reproduced failure.

**Interfaces:**
- Produces final evidence; no new features.

- [ ] **Step 1: Run focused audits**

```bash
npm run audit:global-streaming-ecosystem
npm run audit:npc-venture-determinism
npm run audit:platform-ai-phase4
npm run audit:platform-ai-production
npm run audit:industry-talent-bookings
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-contract-foundation-phase1
npm run audit:living-studio-ecosystem
npm run audit:forbes-studio-profile
```

- [ ] **Step 2: Run persistence and build checks**

```bash
npm run audit:save-migration
npm run audit:save-transfer
npm run build
git diff --check
```

Report unrelated baseline failures separately and do not change unrelated files to silence them.

- [ ] **Step 3: Verify the live browser flow**

Confirm the server belongs to this workspace, then verify:

- India displays JioHotstar, other meaningful locals, and `Others` without card overflow;
- Canada or Australia displays its local platform;
- a QA-seeded fictional challenger appears globally after qualification;
- non-core challengers expose no unsupported deep action;
- an eligible NPC production venture can be selected for a canonical Platform AI commission;
- reload preserves the same companies, shares, and commission.

- [ ] **Step 4: Final scope review**

Check `git status --short` and the focused diff. Confirm no staging/commit occurred and distinguish pre-existing dirty files from files changed by this plan.
