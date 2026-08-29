# Competitive Streaming Platform AI Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven development and verification-before-completion. Execute inline; do not delegate, stage, or commit.

**Goal:** Complete rights-ready scheduling, canonical streaming outcomes, awards integration, and bounded evidence-based learning for every rival-platform content route.

**Architecture:** Extend the existing `platformAiRelease`, `platformAiEconomy`, `platformAiMemory`, and `platformAiTurn` pipeline. Add focused pure helpers for readiness and premiere choice, persist only evidence needed for replay and explanation, and keep canonical rights/projects/awards as the authorities.

**Tech Stack:** TypeScript, Vite/React game runtime, deterministic seeded helpers, Node `assert` audit scripts, esbuild audit bundles.

**Spec:** `docs/superpowers/specs/2026-08-30-platform-ai-phase6-release-learning-design.md`

## Global Constraints

- Preserve unrelated dirty work and do not stage or commit.
- Write and run a failing behavioral audit before every production behavior change.
- Reuse canonical `IndustryProject`, rights contracts, award history, and Phase 5 settlement queues.
- No raw `Math.random()` or `Date.now()` in saved decisions.
- No fake title-level subscription revenue or theatrical box office.
- AI advantages and automation stop prospectively on player acquisition.
- Phase 7 owns full weekly observability; Phase 8 owns 2,600-week certification.

## File map

- Create `services/platformAi/platformAiReleaseReadiness.ts` for readiness passports and strategic premiere selection.
- Modify `services/platformAi/platformAiRelease.ts` for passport integration, regional outcomes, and cumulative release evidence.
- Modify `services/platformAi/platformAiTurn.ts` to choose the best valid week rather than first valid week.
- Modify `services/platformAi/platformAiMemory.ts` for regional, localization, talent-pair, pattern, delay, and cancellation beliefs.
- Modify `services/platformAi/platformAiEconomy.ts` only where exact-once audience settlement needs richer evidence.
- Modify `services/platformAi/platformAiState.ts` and `types.ts` for schema 11 normalization.
- Modify `services/platformAi/index.ts` for focused public exports.
- Create `scripts/audit-platform-ai-phase6.ts`; extend existing release, turn, economy, awards, and save audits only where cross-system proof is required.
- Modify `package.json` to expose `audit:platform-ai-phase6` and include it in the focused Platform AI suite.

---

### Task 1: Readiness passport and strategic scheduling

**Interfaces:**

- Produce `evaluatePlatformAiReleaseReadiness(input): PlatformAiReleaseReadinessSnapshot`.
- Produce `choosePlatformAiPremiere(input): PlatformAiPremiereChoice | null`.
- Store the selected passport on `PlatformAiContentPlan.releaseReadiness`.

- [x] Add an audit proving a rights window that covers the premiere but not the final weekly episode is blocked.
- [x] Run `npm run audit:platform-ai-phase6`; expect a missing-export or failed assertion RED.
- [x] Implement the minimum readiness evaluator and make the audit GREEN.
- [x] Add a RED audit proving the deterministic selector avoids same-audience congestion and can select a later awards-friendly week.
- [x] Implement bounded scoring and integrate it into `platformAiTurn`.
- [x] Run Phase 6, release, rights-lifecycle, and turn audits.
- [x] Review the diff; do not stage or commit.

### Task 2: Regional release performance and exact-once effects

**Interfaces:**

- Extend `PlatformAiStreamingPerformance` with `regionalResults`, `acquiredSubscribersMillions`, `retainedSubscribersMillions`, `churnedSubscribersMillions`, and `catalogueStrengthDelta`.
- Keep `subscriberImpactMillions = acquired + retained - churned` as the Phase 5 settlement input.
- Persist one performance object per unique streaming window.

- [x] Add a RED audit proving strong dubbing outperforms subtitles in a mismatched-language market while preserving deterministic replay.
- [x] Add a RED audit proving hit/solid/flop can all occur and subscriber components reconcile exactly.
- [x] Implement country-level calculation and bounded aggregation.
- [x] Add a RED audit proving replay cannot duplicate windows, audience settlement, reputation, catalogue, or recent-hit effects.
- [x] Implement the minimum exact-once evidence and run release/economy audits GREEN.
- [x] Review the diff; do not stage or commit.

### Task 3: Canonical awards and multidimensional bounded learning

**Interfaces:**

- Extend `PlatformAiReleaseMemory` with country, localization, pattern, delay, and cancellation evidence.
- Extend runtime state with normalized `regionalMemory`, `localizationMemory`, `talentPairMemory`, `releasePatternMemory`, and `productionOutcomeMemory`.
- Keep the latest 12 release rows and clamp belief movement to 20 points.

- [x] Add a RED audit for country, localization, talent-pair, and release-pattern learning.
- [x] Add a RED audit proving a single surprise cannot move an existing belief by more than 20 points or competence by more than 0.05.
- [x] Implement normalized belief rebuilding and deterministic lower-skill recency weighting.
- [x] Add/retain canonical award assertions using stable `projectId` and award keys.
- [x] Run Phase 6, release, deterministic-awards, and sourcing audits GREEN.
- [x] Review the diff; do not stage or commit.

### Task 4: Schema 11, acquisition handoff, and final integration

**Interfaces:**

- Bump `PLATFORM_AI_RUNTIME_SCHEMA_VERSION` from 10 to 11.
- Normalize every new collection to a canonical empty object/array.
- Preserve immutable historical efficiency, release, award, and memory evidence on acquisition while blocking future AI mutations.

- [x] Add RED migration and transfer assertions for schema 11 and canonical empty collections.
- [x] Add RED acquisition assertions for scheduling, release, settlements, and learning.
- [x] Implement migration and handoff normalization.
- [x] Run save migration, save transfer, Phase 6, release, rights, economy, turn, and awards audits.
- [x] Run `npm run build` and `git diff --check`.
- [x] Compare the final diff against every Phase 6 completion invariant and report any gap honestly.
