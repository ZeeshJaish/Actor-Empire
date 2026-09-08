# X Discussions, Public Statements, and Player Responses C3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Turn selected C2-authored X coverage into bounded fact-safe discussions and optional player responses whose public impact resolves deterministically on the next entered week.

**Architecture:** Upgrade `WorldState.industryMedia` to schema version 3, create compact discussions from valid B7/C1/C2 lineage, submit a single official response per event through the existing X detail view, and resolve pending responses exactly once inside `processIndustryWorldWeek`. Canonical facts remain read-only; only bounded public-facing stats and media memory can change.

**Tech Stack:** TypeScript, React, Vite, deterministic RNG, Node executable audits, existing save migration/compaction services.

**Spec:** `docs/superpowers/specs/2026-09-05-x-discussions-player-responses-c3-design.md`

## Global constraints

- Work inline and preserve all existing C2 changes.
- Use RED-GREEN-REFACTOR for each behaviour slice.
- Do not stage, commit, merge, or push.
- Do not run a new 400-year/mobile performance audit; that remains C8.
- Do not change money, fame, projects, production, rights, ownership, awards, or contracts.
- Never use `Math.random()` or `Date.now()` in canonical C3 services.

### Task 1: Versioned discussion state and deterministic threads

**Files:**
- Modify: `types.ts`
- Create: `services/industryWorld/industryMediaDiscussions.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Modify: `services/industryWorld/industryPresentation.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-discussions-c3.ts`
- Modify: `package.json`

- [x] Write an executable audit whose missing discussion API is a meaningful RED.
- [x] Add schema-v3 discussion, turn, response, format, tone, status, and outcome types.
- [x] Normalize orphan-safe bounded discussion state and exactly-once keys.
- [x] Deterministically create discussions only from valid C2 X projection lineage.
- [x] Build at most eight fact-safe turns from recurring C2 identities.
- [x] Attach discussion IDs to newly emitted X items and keep replay an exact no-op.
- [x] Run the focused audit and C1/C2 projection regressions GREEN.

### Task 2: Response eligibility, submission, publicist advice, and saved drafts

**Files:**
- Create: `services/industryWorld/industryMediaResponses.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-responses-c3.ts`
- Modify: `package.json`

- [x] Write failing fixtures for valid, expired, duplicate, non-player, missing-lineage, and formal-statement cases.
- [x] Implement two-week opportunity eligibility and one official response per event.
- [x] Implement fact-safe deterministic response drafts for six tones and three formats.
- [x] Reuse `team.publicist` for optional recommendations without auto-publishing.
- [x] Submit the response into saved C3 state and existing X feed/posts without immediate gameplay effects.
- [x] Prove silence produces no mutation and invalid submissions are exact no-ops.
- [x] Run the focused response audit GREEN.

### Task 3: Exactly-once next-week resolution and presentation

**Files:**
- Modify: `services/industryWorld/industryMediaResponses.ts`
- Modify: `services/industryWorld/industryWorldWeek.ts`
- Create: `scripts/audit-industry-media-resolution-c3.ts`
- Modify: `package.json`

- [x] Write a failing weekly-resolution audit with literal bounded outcomes and replay checks.
- [x] Resolve pending responses only after their submitted absolute week.
- [x] Persist outcome and applied deltas before returning the updated Player/world.
- [x] Apply only bounded reputation, controversy, follower, media-stance, and heat effects.
- [x] Add a linked public-reaction turn and an optional linked News item for eligible formal statements.
- [x] Prove repeated same-week processing cannot reroll or reapply the result.
- [x] Run C3 resolution and B7 coordinator audits GREEN.

### Task 4: X discussion and response UI

**Files:**
- Modify: `views/mobile/XApp.tsx`
- Create: `scripts/audit-industry-media-ui-c3.tsx`
- Modify: `package.json`

- [x] Write a failing server-rendered audit for the discussion marker, canonical participants, optional controls, publicist guidance, and resolved state.
- [x] Render C3 turns in post detail using C2 identity adapters.
- [x] Show response controls only for valid open player-related opportunities.
- [x] Add minimal tone, format, and speaker selection with one-tap publish.
- [x] Keep generic legacy reply/quote behaviour for non-C3 posts.
- [x] Render pending/resolved response state without mandatory popups or dashboard chores.
- [x] Run the focused UI audit and production build GREEN.

### Task 5: Migration, compaction, bounds, and aggregate regression

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Create: `scripts/audit-industry-media-save-c3.ts`
- Create: `scripts/audit-industry-media-bounds-c3.ts`
- Modify: `package.json`

- [x] Write a failing version-35 migration audit and malformed schema-v3 fixtures.
- [x] Advance save migration to 36 without replaying old media items.
- [x] Preserve pending responses and recent/high-importance discussions during compaction.
- [x] Enforce 120-discussion, 8-turn, 120-response, and 240-key bounds.
- [x] Add `audit:industry-media-c3` and run all focused C3 checks.
- [x] Run relevant C2, C1, B7, lint, and build regressions.

### Task 6: Completion report and roadmap handoff

**Files:**
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/plans/2026-09-05-x-discussions-player-responses-c3.md`
- Create: `docs/superpowers/reports/2026-09-05-x-discussions-player-responses-c3-report.md`

- [x] Record only fresh verification evidence and exact focused counts.
- [x] Mark C3 complete and C4 next only after every completion gate passes.
- [x] Document player-visible behaviour, reused systems, migration, bounds, and deferrals.
- [x] Check the final diff for unrelated changes and leave the worktree uncommitted.
