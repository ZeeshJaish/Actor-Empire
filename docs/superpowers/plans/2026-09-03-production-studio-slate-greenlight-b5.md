# Production Studio Slate and Greenlight B5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline without subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace independent instant AI-studio project decisions with deterministic, bounded development slates and greenlight commitments driven by B1–B3.

**Architecture:** Store one compact slate migration state inside `StudioAiRuntimeState`. Convert only newly due studio content proposals into development commitments, progress only due reviews, route exact money through B1 finance, and gate the legacy venture project generator behind a unique greenlight handoff until B6 replaces production and release.

**Tech Stack:** TypeScript, existing Studio AI runtime, B2/B3 industry intelligence, deterministic RNG/IDs, esbuild audit scripts, Vite

**Spec:** `docs/superpowers/specs/2026-09-03-production-studio-slate-greenlight-b5-design.md`

## Global constraints

- Stop at greenlight; do not implement B6 production, casting, release, or commercial resolution.
- Preserve Project A rights authority and all player Production House/commission workflows.
- Skip player-controlled, dormant, sold/merged, and closed studios.
- Process each proposal and review once using stable idempotency keys.
- Cap retained processed keys at 64 and terminal/recent slate records at 24 without evicting active work.
- Charge exact internal development money once; commission funding and producer fees remain separate.
- Do not stage, commit, or push without explicit authorization.

---

### Task 1: Slate contracts and normalization

**Files:**
- Modify: `types.ts`
- Modify: `services/studioAi/studioAiState.ts`
- Create: `services/studioAi/studioAiSlateState.ts`
- Create: `scripts/audit-studio-ai-slate-state-b5.ts`

**Interfaces:**
- Produces `StudioAiSlateCommitment`, `StudioAiSlateState`, `createInitialStudioAiSlateState`, and `normalizeStudioAiSlateState`.
- `StudioAiRuntimeState.slate` owns the B5 state.

- [x] Write an audit that imports the missing slate normalizer and asserts lifecycle normalization, active-work retention, terminal-history caps, processed-key caps, and capacity reconciliation.
- [x] Run `npm run audit:studio-ai-slate-state-b5` and observe the missing-module/API failure.
- [x] Add the B5 contracts and normalizer with deterministic legacy activation defaults.
- [x] Recompute committed development/production slots from active slate records in `normalizeStudioAiState`.
- [x] Rerun the audit to green.

### Task 2: Opportunity admission and development economics

**Files:**
- Create: `services/studioAi/studioAiSlateAdmission.ts`
- Modify: `services/studioAi/studioAiFinance.ts`
- Modify: `types.ts`
- Create: `scripts/audit-studio-ai-slate-admission-b5.ts`

**Interfaces:**
- Produces `admitStudioContentProposal({ studio, proposal, fingerprint, absoluteWeek })` returning an immutable admission result and optional commitment.
- Produces `applyStudioAiDevelopmentTransaction(studio, transaction)` for one exact ledger/cash/committed-spend mutation.

- [x] Write an audit for AI/controller/status eligibility, fingerprint ownership, duplicate rejection, capacity, runway, affordability, external-rights failure, development-cost bounds, and one-time money.
- [x] Run the audit and observe missing admission/transaction APIs.
- [x] Implement pure admission scoring and deterministic development envelope calculation.
- [x] Add `DEVELOPMENT` and `REWRITE` ledger categories and one-time transaction handling.
- [x] Rerun the audit to green.

### Task 3: Due review and greenlight decisions

**Files:**
- Create: `services/studioAi/studioAiGreenlight.ts`
- Create: `scripts/audit-studio-ai-greenlight-b5.ts`

**Interfaces:**
- Produces `reviewStudioSlateCommitment({ studio, commitment, fingerprint, proposal, absoluteWeek })`.
- Review result returns `GREENLIT`, `REWRITE`, `ON_HOLD`, `TURNAROUND`, or `ABANDONED`, saved score dimensions, budget, review week, and optional rewrite transaction.

- [x] Write an audit proving deterministic replay, no early review, competence/strategy/budget/capacity/runway effects, bounded rewrite count, fallible strong studios, and stable greenlight facts.
- [x] Run the audit and observe the missing review API.
- [x] Implement the deterministic multidimensional review and suitable-budget selection.
- [x] Rerun the audit to green.

### Task 4: Proposal execution and weekly studio integration

**Files:**
- Create: `services/studioAi/studioAiSlateExecution.ts`
- Modify: `services/studioAi/studioAiWeek.ts`
- Modify: `services/studioAi/index.ts`
- Create: `scripts/audit-studio-ai-slate-execution-b5.ts`
- Create: `scripts/audit-studio-ai-slate-live-b5.ts`

**Interfaces:**
- Produces `executeStudioAiSlateWeek({ player, world, studio, absoluteWeek })`.
- Consumes newly due B2 proposals, linked B3 fingerprints, admission, review, and B1 transactions.
- Returns updated studio and compact execution facts without directly creating releases.

- [x] Write execution audits for proposal-delta processing, due-only reviews, idempotency, fingerprint lifecycle, finance/capacity reconciliation, terminal/player skips, and no direct public project.
- [x] Run both audits and observe missing execution/live-cutover behavior.
- [x] Implement the execution router and call it from `processStudioAiWeek` after intelligence proposal generation and before finance settlement.
- [x] Replace studio shadow comparisons with authoritative B5 outcomes for content proposals while retaining shadow comparison for lanes B5 does not own.
- [x] Rerun execution, live, B1 weekly, and B2 integration audits to green.

### Task 5: Commission adoption and legacy venture gate

**Files:**
- Create: `services/studioAi/studioAiCommissionBridge.ts`
- Modify: `services/npcVentureLogic.ts`
- Create: `scripts/audit-studio-ai-commission-bridge-b5.ts`
- Create: `scripts/audit-studio-ai-legacy-gate-b5.ts`

**Interfaces:**
- Produces `adoptStudioIndustryCommissions({ world, studio, absoluteWeek })`.
- Produces `consumeStudioGreenlightForLegacyRelease(studio, absoluteWeek)` returning one eligible handoff or null and marking it consumed.

- [x] Write audits proving existing AI commissions reserve capacity without charging independent development, player commission paths remain unchanged, and the legacy generator cannot originate a project without a B5 greenlight.
- [x] Run both audits and observe missing bridge/gate behavior.
- [x] Implement commission adoption with canonical production/funding references.
- [x] Gate generated-venture public project creation behind a unique B5 greenlight handoff and preserve its lineage.
- [x] Rerun commission, legacy gate, Platform AI production, player commission, venture, and rights audits to green.

### Task 6: Save, endurance, and phase documentation

**Files:**
- Modify: `services/studioAi/studioAiSave.ts`
- Modify: `package.json`
- Create: `scripts/audit-studio-ai-slate-long-run-b5.ts`
- Create: `docs/superpowers/reports/2026-09-03-production-studio-slate-greenlight-b5-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`

**Interfaces:**
- Adds focused `audit:studio-ai-slate-*-b5` scripts and aggregate `audit:studio-ai-slate-b5`.

- [x] Write a deterministic 20,800-week audit for varied slates, greenlights, rewrites, holds, abandonment, capacity, bounded state/bytes, acquisition stop, and replay equivalence.
- [x] Run the long-run audit and observe its failure before completion wiring.
- [x] Finish save normalization/protection and make the aggregate B5 suite green.
- [x] Run B1–B4, Platform AI commission/production, Project A rights, venture, acquisition, save-integrity, production build, and scoped diff checks.
- [x] Write the B5 completion report with exact evidence and known unrelated repository noise.
- [x] Update the living roadmap to B5 complete and B6 next, then mark this plan complete.
