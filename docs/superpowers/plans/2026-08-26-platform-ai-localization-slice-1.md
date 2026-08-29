# Platform AI Localization Slice 1 Implementation Plan

> **For agentic workers:** Execute inline with strict red-green TDD. The user explicitly forbids commits and staging for this shared-workspace task.

**Goal:** Add a persisted, economy-backed Platform AI localization-job lifecycle without integrating release, scheduling, or weekly-turn orchestration.

**Architecture:** Persist immutable planning snapshots on `PlatformAiRuntimeState`, normalize them through the canonical state migration, and reconcile each live job with one deterministic namespaced `LOCALIZATION` obligation. The existing economy settlement is the only start boundary; a focused lifecycle module handles requesting and explicit progress to readiness.

**Tech Stack:** TypeScript, Node assert audit scripts, esbuild, Vite.

**Spec:** User request in the active Codex task.

## Global Constraints

- Work directly in `/Users/zeesh/Vibe code/Actor empire` and preserve unrelated dirty changes.
- Implement only localization slice 1.
- Use strict TDD and capture the RED audit failure before production edits.
- Do not integrate release, scheduling, or turn processing.
- Do not stage or commit.

---

### Task 1: Focused localization audit

**Files:**
- Create: `scripts/audit-platform-ai-localization.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing Platform AI fixture, normalization, research capability state, and economy settlement.
- Produces: `npm run audit:platform-ai-localization` covering capability gates, immutable snapshots, exact-once settlement, timing, replay, malformed saves, and history bounds.

- [ ] Write the complete behavior audit before production code.
- [ ] Run it and retain the expected missing-lifecycle RED evidence.

### Task 2: Persisted model and canonical normalization

**Files:**
- Modify: `types.ts`
- Modify: `services/platformAi/platformAiState.ts`
- Modify: `services/saveCompaction.ts`

**Interfaces:**
- Consumes: canonical `CONTENT_OPERATIONS` capability levels and pending one-time obligations.
- Produces: `PlatformAiLocalizationJob`, bounded normalization, obligation reconciliation, and schema migration.

- [ ] Add the model and runtime ledger.
- [ ] Normalize malformed/duplicate rows deterministically.
- [ ] Preserve all waiting/in-progress jobs and referenced ready jobs; cap only inactive history at 104.
- [ ] Reconcile one namespaced localization obligation per non-cancelled job.

### Task 3: Localization lifecycle and economy start boundary

**Files:**
- Create: `services/platformAi/platformAiLocalization.ts`
- Modify: `services/platformAi/platformAiEconomy.ts`
- Modify: `services/platformAi/index.ts`

**Interfaces:**
- Consumes: player/world/platform identity, canonical capabilities, and real economy settlement evidence.
- Produces: deterministic request, explicit progress, quote/capability helpers, and exact-once start behavior.

- [ ] Gate subtitles at canonical content-operations level 22 and dubs at level 40.
- [ ] Snapshot sorted scope, capability, disclosed cost, and disclosed lead.
- [ ] Queue one deterministic obligation and make replay a no-op.
- [ ] Start only jobs whose obligation actually settles in the economy.
- [ ] Keep waiting jobs stationary and mark in-progress jobs ready only at `startedWeek + disclosedLeadWeeks`.

### Task 4: Regression alignment and verification

**Files:**
- Modify: `scripts/audit-platform-ai-domain.ts`
- Modify: `scripts/audit-platform-ai-research.ts`
- Modify: `scripts/audit-platform-ai-rights-lifecycle.ts`

**Interfaces:**
- Consumes: the incremented Platform AI runtime schema.
- Produces: current schema assertions and required-array fast-path coverage.

- [ ] Run the focused localization audit.
- [ ] Run domain, economy, research, save-migration, save-transfer, build, and `git diff --check`.
- [ ] Inspect exact changed files without staging or committing.
