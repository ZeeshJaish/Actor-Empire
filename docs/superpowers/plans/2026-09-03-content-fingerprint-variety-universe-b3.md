# Content Fingerprint, Variety, and Universe Blueprint B3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline without subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, bounded AI content fingerprints, novelty control, suitable-budget curves, private universe blueprints, and lazy materialization drafts without changing canonical gameplay outcomes.

**Architecture:** Extend each company's existing B2 intelligence state with one compact B3 content state. Generate exactly six ephemeral candidates only for due AI `DEVELOP_CONTENT` proposals, persist only the winner, and expose pure bridges to the existing rights/project/universe authorities. Keep all B3 execution shadow-only until B4-B7 activate canonical boundaries.

**Tech Stack:** TypeScript, existing deterministic-random helpers, B2 industry-intelligence services, esbuild audit scripts, Vite build

**Spec:** `docs/superpowers/specs/2026-09-03-content-fingerprint-variety-universe-b3-design.md`

## Global Constraints

- B3 is shadow-only and must not change cash, rights, talent, projects, productions, releases, news, social posts, or player-visible outcomes.
- `WorldState.universes` remains the sole canonical public universe registry.
- Project A remains the exact rights, contract, bidding, and settlement authority.
- Generate exactly six ephemeral candidates per due content decision; persist only the selected fingerprint.
- Retain at most 24 fingerprints, 6 blueprints, 48 novelty signatures, and 64 materialization keys per company.
- Use deterministic saved seeds and keys only; never use `Math.random`, `Date.now`, or UI state.
- Skip player-controlled and terminal companies.
- Preserve all existing player workflows and `Universe.studioId` compatibility.
- Follow strict RED, GREEN, REFACTOR cycles for every production behavior.
- Do not stage, commit, or push without explicit user authorization.

---

### Task 1: B3 Contracts, Normalization, and Bounded State

**Files:**
- Modify: `types.ts`
- Modify: `services/industryIntelligence/industryIntelligenceState.ts`
- Modify: `services/industryIntelligence/index.ts`
- Create: `scripts/audit-industry-content-state-b3.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `IndustryContentFingerprint`, `IndustryUniverseBlueprint`, `IndustryContentIntelligenceState`, `createInitialIndustryContentState()`, `normalizeIndustryContentState()`, and B3 footprint fields.
- Consumes: existing `IndustryCompanyKind`, `IndustryIntelligenceState`, deterministic company seed, and `Universe`.

- [ ] **Step 1: Write the failing state audit**

Create an audit that imports the wished-for state API, normalizes malformed arrays and numeric fields, and asserts literal caps of 24/6/48/64. It must also assert that absent legacy B3 state migrates to empty arrays and that optional `Universe.ownerCompanyId`, `ownerCompanyKind`, `blueprintId`, and `originFingerprintId` survive TypeScript bundling.

- [ ] **Step 2: Run the state audit and verify RED**

Run: `npx esbuild scripts/audit-industry-content-state-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-content-state-b3.mjs && node /tmp/audit-industry-content-state-b3.mjs`

Expected: FAIL because the B3 contracts/state exports do not exist.

- [ ] **Step 3: Implement minimal contracts and normalization**

Add explicit unions for format, source intent, relationship, lifecycle, release path, universe lifecycle, budget curve, fingerprint, blueprint, and content memory. Add optional `content` to `IndustryIntelligenceState`, optional owner/blueprint fields to `Universe`, default/migration normalization, cap constants, and B3 footprint counts. Preserve schema-version compatibility and every existing field.

- [ ] **Step 4: Run the state audit and verify GREEN**

Run the Step 2 command. Expected: PASS with bounded state and legacy migration assertions.

- [ ] **Step 5: Review checkpoint**

Run `git diff -- types.ts services/industryIntelligence/industryIntelligenceState.ts services/industryIntelligence/index.ts scripts/audit-industry-content-state-b3.ts package.json` and confirm no canonical world authority or UI was added.

### Task 2: Deterministic Candidate Vocabulary and Selection Pool

**Files:**
- Create: `services/industryIntelligence/industryContentVocabulary.ts`
- Create: `services/industryIntelligence/industryContentGenerator.ts`
- Modify: `services/industryIntelligence/index.ts`
- Create: `scripts/audit-industry-content-generation-b3.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `generateIndustryContentCandidates(input): IndustryContentFingerprint[]` and stable vocabulary selectors.
- Consumes: `IndustryIntelligenceContext`, content decision cycle, proposal ID, and recent selected fingerprints.

- [ ] **Step 1: Write the failing generation audit**

Assert that the same literal context produces six byte-identical candidates on replay, different company seeds produce a different pool, every candidate has a stable unique ID/signature, all dimensions are populated, values remain in their declared unions, and no candidate mutates input state.

- [ ] **Step 2: Run generation audit and verify RED**

Run: `npx esbuild scripts/audit-industry-content-generation-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-content-generation-b3.mjs && node /tmp/audit-industry-content-generation-b3.mjs`

Expected: FAIL because the generator does not exist.

- [ ] **Step 3: Implement deterministic vocabulary and six-candidate generator**

Use frozen combinatorial vocabularies and deterministic seed-derived indices. Derive format, genre pair, creative dimensions, audience/language/market, strategic sliders, release path, source intent, relationship, and identity from the company context. Return exactly six candidates without persisting rejected entries.

- [ ] **Step 4: Run generation audit and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Confirm neither new file contains `Math.random`, `Date.now`, project insertion, finance mutation, or rights mutation.

### Task 3: Novelty, Saturation, and Continuity Scoring

**Files:**
- Create: `services/industryIntelligence/industryContentNovelty.ts`
- Modify: `services/industryIntelligence/industryContentGenerator.ts`
- Modify: `services/industryIntelligence/index.ts`
- Create: `scripts/audit-industry-content-novelty-b3.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `scoreIndustryContentNovelty()`, `selectIndustryContentCandidate()`, and literal exact-duplicate rejection reasons.
- Consumes: six generated candidates, at most 24 company fingerprints, and bounded global recent fingerprints.

- [ ] **Step 1: Write the failing novelty audit**

Use hand-built fingerprints to prove: an exact signature is rejected; a recent near-duplicate scores lower than an independent candidate; an older match is penalized less; legitimate sequel continuity is eligible but receives cadence/fatigue pressure; and selection remains deterministic when input arrays arrive in different orders.

- [ ] **Step 2: Run novelty audit and verify RED**

Run: `npx esbuild scripts/audit-industry-content-novelty-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-content-novelty-b3.mjs && node /tmp/audit-industry-content-novelty-b3.mjs`

Expected: FAIL because novelty APIs do not exist.

- [ ] **Step 3: Implement novelty scoring and deterministic winner selection**

Score weighted dimension similarity with recency decay, company repetition, global saturation, relationship continuity, and franchise fatigue. Hard-block exact signatures in the recent window. Sort candidates by final score and ID for stable tie-breaking.

- [ ] **Step 4: Run novelty audit and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Verify expectations are literal and independent of production helpers, and selection does not persist rejected candidates.

### Task 4: Suitable-Budget Curves

**Files:**
- Create: `services/industryIntelligence/industryBudgetSuitability.ts`
- Modify: `services/industryIntelligence/industryContentGenerator.ts`
- Modify: `services/industryIntelligence/index.ts`
- Create: `scripts/audit-industry-budget-suitability-b3.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `createIndustryBudgetSuitability()` and `evaluateIndustryBudgetSuitability()`.
- Consumes: fingerprint format/genre/risk/star power/market intent and a nonnegative financial ceiling.

- [ ] **Step 1: Write the failing budget audit**

Assert ordered finite curves, positive minimums, series/large-star plans costing more than comparable small movies, a sharp underfunding penalty, efficient ideal-range execution, diminishing benefit above ideal high, and no quality guarantee above ambitious maximum.

- [ ] **Step 2: Run budget audit and verify RED**

Run: `npx esbuild scripts/audit-industry-budget-suitability-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-budget-suitability-b3.mjs && node /tmp/audit-industry-budget-suitability-b3.mjs`

Expected: FAIL because budget APIs do not exist.

- [ ] **Step 3: Implement ordered curves and suitability evaluation**

Use format, genre production load, star power, creative risk, commercial scale, and affordability ceiling. Clamp and round all amounts while preserving `minimum < idealLow <= idealHigh < ambitiousMaximum`. Return explicit execution-efficiency and downside-risk values without spending cash.

- [ ] **Step 4: Run budget audit and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Confirm wealth expands feasible scale but cannot produce a quality floor.

### Task 5: Rare, Fallible Universe Blueprints

**Files:**
- Create: `services/industryIntelligence/industryUniverseBlueprint.ts`
- Modify: `services/industryIntelligence/index.ts`
- Create: `scripts/audit-industry-universe-blueprint-b3.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `evaluateIndustryUniverseBlueprint()`, `createIndustryUniverseBlueprint()`, and `advanceIndustryUniverseBlueprint()`.
- Consumes: selected fingerprint, company identity/capabilities/condition, compatible recent fingerprints, existing blueprints, and deterministic seed.

- [ ] **Step 1: Write the failing blueprint audit**

Assert literal cases for insufficient runway/capability rejection, deterministic planned founding, compatible-success emergent founding, no event before established branches/familiarity, fatigue-driven pause, failed anchor survival as a failed blueprint, and a maximum of six retained blueprints.

- [ ] **Step 2: Run blueprint audit and verify RED**

Run: `npx esbuild scripts/audit-industry-universe-blueprint-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-universe-blueprint-b3.mjs && node /tmp/audit-industry-universe-blueprint-b3.mjs`

Expected: FAIL because blueprint APIs do not exist.

- [ ] **Step 3: Implement planned/emergent evaluation and lifecycle**

Gate founding on saved franchise appetite, creative/production capability, runway, capacity, novelty, and ownership basis. Use a deterministic low-frequency threshold; store creative pillars, formats, branch families, phase/saga, cadence, scale, confidence, momentum, fatigue, and lifecycle. Support pause, retire, fail, and later materialization states.

- [ ] **Step 4: Run blueprint audit and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Confirm no logic guarantees a universe or a hit, and no public `Universe` was inserted.

### Task 6: Rights-Safe Lazy Materialization Bridge

**Files:**
- Create: `services/industryIntelligence/industryContentMaterialization.ts`
- Modify: `services/industryIntelligence/index.ts`
- Create: `scripts/audit-industry-content-materialization-b3.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `evaluateIndustryContentMaterialization()`, `createIndustryContentMaterializationDraft()`, and `createCanonicalUniverseDraft()`.
- Consumes: selected fingerprint/blueprint, explicit materialization boundary, canonical source-right eligibility supplied by Project A, and optional prior IDs.

- [ ] **Step 1: Write the failing materialization audit**

Assert that private selection needs no canonical project; licensed/acquired material fails closed without eligible rights; the same eligible fingerprint produces byte-identical project and universe draft IDs; prior IDs never reroll; owner metadata and `studioId` compatibility are retained; and functions do not mutate a supplied `WorldState.universes` record.

- [ ] **Step 2: Run materialization audit and verify RED**

Run: `npx esbuild scripts/audit-industry-content-materialization-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-content-materialization-b3.mjs && node /tmp/audit-industry-content-materialization-b3.mjs`

Expected: FAIL because the bridge does not exist.

- [ ] **Step 3: Implement pure eligibility and deterministic drafts**

Require an explicit boundary and rights eligibility for external-source intents. Produce stable IDs, title/synopsis presentation seeds, immutable resolved facts, and a canonical-universe draft carrying owner/blueprint/origin metadata. Return drafts only; never insert or transact.

- [ ] **Step 4: Run materialization audit and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Confirm Project A and `WorldState.universes` remain external authorities.

### Task 7: B2 Shadow Integration, Idempotency, and Save Safety

**Files:**
- Create: `services/industryIntelligence/industryContentShadow.ts`
- Modify: `services/industryIntelligence/industryIntelligenceCoordinator.ts`
- Modify: `services/industryIntelligence/industryIntelligenceState.ts`
- Modify: `services/industryIntelligence/index.ts`
- Create: `scripts/audit-industry-content-shadow-b3.ts`
- Create: `scripts/audit-industry-content-save-b3.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `processIndustryContentShadowSelection()` and coordinator results whose `state.content` changes only for new due `DEVELOP_CONTENT` proposals.
- Consumes: B2 proposal, frozen context, bounded company/global fingerprint context, generator, novelty selection, budget curve, and blueprint evaluator.

- [ ] **Step 1: Write the failing shadow audit**

Prove no content for HOLD, non-content lanes, player controller, or terminal status; one selected fingerprint for one due AI development proposal; replay idempotency; different decision cycles can select new work; exactly one persisted winner; and canonical studio/platform projections remain byte-identical before and after shadow processing.

- [ ] **Step 2: Run shadow audit and verify RED**

Run: `npx esbuild scripts/audit-industry-content-shadow-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-content-shadow-b3.mjs && node /tmp/audit-industry-content-shadow-b3.mjs`

Expected: FAIL because shadow integration does not exist.

- [ ] **Step 3: Implement isolated content shadow processing**

Call B3 only after B2 creates a new due `CONTENT_STRATEGY` proposal. Build bounded global context from supplied recent fingerprints, persist one selected winner and optional private blueprint, record the processed materialization key, and cap state. Keep the whole path inside the existing shadow try/catch boundary.

- [ ] **Step 4: Run shadow audit and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Write and run the save audit RED→GREEN**

The audit must round-trip legacy, malformed, large, and valid B3 state through normalization and compaction; assert literal caps and deterministic serialization; and verify save integrity distinguishes B3 intelligence change while leaving legacy protected projections unchanged. Implement only the missing compaction/integrity support, then rerun to PASS.

- [ ] **Step 6: Review checkpoint**

Inspect both AI weekly entry points and confirm canonical processing order and results are unchanged outside `ai.intelligence.content`.

### Task 8: Aggregate Regression and 20,800-Week Certification

**Files:**
- Create: `scripts/audit-industry-content-long-run-b3.ts`
- Modify: `package.json`
- Create: `docs/superpowers/reports/2026-09-03-content-fingerprint-variety-universe-b3-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`

**Interfaces:**
- Produces: `npm run audit:industry-content-b3`, long-run metrics, B3 report, and roadmap transition to B4.
- Consumes: all B3 focused audits plus existing B2, universe, rights, save, and build boundaries.

- [ ] **Step 1: Write the failing long-run audit**

Simulate at least one production studio and one streaming platform for 20,800 weeks using deterministic due cycles. Assert replay equality, fixed caps, finite values, no exact duplicates inside the recent company window, multiple formats/genres/audiences over time, universe founding below a literal upper share and above zero across deterministic seeds, failed/paused blueprint outcomes, and no canonical universe/project/finance/rights mutation.

- [ ] **Step 2: Run long-run audit and verify RED**

Run: `npx esbuild scripts/audit-industry-content-long-run-b3.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-content-long-run-b3.mjs && node /tmp/audit-industry-content-long-run-b3.mjs`

Expected: FAIL until the aggregate endurance behavior and metrics are complete.

- [ ] **Step 3: Make the smallest balance/bounds corrections and verify GREEN**

Adjust only B3 constants or bounded algorithms required by the failing literal behaviors. Rerun the Step 2 command until PASS and record its emitted metrics.

- [ ] **Step 4: Add and run aggregate B3 audit**

Add package scripts for all nine B3 audits and `audit:industry-content-b3`. Run: `npm run audit:industry-content-b3`. Expected: PASS.

- [ ] **Step 5: Run regression boundaries**

Run: `npm run audit:industry-intelligence-b2`  
Run: `npm run audit:universe && npm run audit:real-universe-slate && npm run audit:universe-lifecycle && npm run audit:universe-character-selection`  
Run: `npm run audit:rights-market`  
Run: `npm run audit:save-integrity`  
Run: `npm run build`

Expected: all commands PASS. If repository-wide lint retains unrelated historical failures, report it separately and prove no B3-owned diagnostic remains.

- [ ] **Step 6: Write report and advance roadmap**

Document implemented contracts, authority boundaries, audit outputs, long-run metrics, player-visible non-impact, known unrelated diagnostics, and the B4 activation gate. Mark B3 complete and B4 next only after every required verification passes.

- [ ] **Step 7: Final diff and ownership review**

Run `git status --short`, `git diff --stat`, and focused diffs for B3 files. Confirm unrelated dirty work was preserved and no files were staged, committed, or pushed.
