# Platform AI Phase 7 Weekly Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settle rival, ecosystem, and player streaming systems on one entered game week with exactly-once processing and canonical player-facing data.

**Architecture:** Add a thin streaming-industry coordinator between the master game loop and the existing domain processors. Move only rival streaming calls from the pre-increment general world turn to the existing post-increment player-streaming seam, then expose canonical summary fields without duplicating simulation logic.

**Tech Stack:** TypeScript, React, deterministic saved-state services, esbuild audit scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-08-30-platform-ai-phase7-weekly-integration-design.md`

## Global Constraints

- `processGameWeek` remains the only master week progression entry point.
- Do not shift theatrical, NPC studio, awards, relationship, or life-event timing.
- Saved decisions and weekly mutations must be deterministic.
- Player acquisition immediately removes AI planning, rescue, speed, and cost advantages.
- Reuse existing domain services; the coordinator contains no economic formulas.
- Do not stage or commit unless the user explicitly requests it.

---

### Task 1: Focused Phase 7 integration contract

**Files:**
- Create: `scripts/audit-platform-ai-phase7.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `processStreamingIndustryWorldWeek(player, world, absoluteWeek)`.
- Produces: `npm run audit:platform-ai-phase7` coverage for entered-week processing, replay, ownership, generated operators, and canonical summaries.

- [x] **Step 1: Write the failing audit**

Assert that the not-yet-created coordinator processes the five core platforms
and ecosystem at an explicit week, leaves player-controlled platform AI bytes
unchanged, checkpoints a generated operator, returns no new events on replay,
and exposes canonical cash/subscriber fields.

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:platform-ai-phase7`

Expected: FAIL because `processStreamingIndustryWorldWeek` and per-operator
checkpoints do not exist.

- [x] **Step 3: Keep the audit focused**

Use the existing `scripts/helpers/platformAiFixture.ts` fixture and direct
service assertions. Do not run the full asynchronous game loop inside the
focused audit.

### Task 2: Canonical streaming-industry coordinator

**Files:**
- Create: `services/platformAi/platformAiWeeklyIntegration.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `services/worldLogic.ts`
- Modify: `services/gameLoop.ts`

**Interfaces:**
- Consumes: `processPlatformAiWorldTurn`, `processStreamingPlatformEcosystemTurn`, `WorldState`, `Player`, explicit `absoluteWeek`.
- Produces: `processStreamingIndustryWorldWeek(player, world, absoluteWeek): StreamingIndustryWeeklyTurnResult`.

- [x] **Step 1: Implement the minimal coordinator**

Call the two existing processors in order and combine their news/logs without
calculating money or audience inside the coordinator. Canonical company
summaries project the resulting saved state at read time.

- [x] **Step 2: Move the integration seam**

Remove Platform AI and ecosystem calls from `processWorldTurn`. After
`currentWeek` advances and year rollover completes, call the coordinator before
`processOwnedStreamingPlatformWeek`, then generate player commission offers.

- [x] **Step 3: Verify GREEN**

Run: `npm run audit:platform-ai-phase7`

Expected: entered-week and replay assertions PASS.

### Task 3: Per-operator checkpoint and canonical observability

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingPlatformEcosystem.ts`
- Modify: `services/streamingPlatformEcosystemTurn.ts`
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `components/StreamingPlatformWars.tsx`

**Interfaces:**
- Consumes: canonical `PlatformState`, `PlatformAiRuntimeState`, and `StreamingEcosystemOperator`.
- Produces: enriched `StreamingCompanySummary` and inspectable `lastProcessedAbsoluteWeek`.

- [x] **Step 1: Extend the failing audit**

Assert one non-core operator advances once, records the target week, is stable
on replay, and its company summary reports the saved cash, subscribers,
countries, capabilities, status, and checkpoint.

- [x] **Step 2: Verify RED**

Run: `npm run audit:platform-ai-phase7`

Expected: FAIL because the operator and summary fields are missing.

- [x] **Step 3: Implement checkpoint normalization and summary projection**

Normalize old saves to `-1`, guard and stamp each eligible operator, and derive
core summary fields from `world.platforms` while deriving non-core fields from
the ecosystem operator.

- [x] **Step 4: Add minimal UI observability**

Keep existing card layouts. Add a compact status/country/checkpoint line and
canonical operational facts without creating a new dashboard or dense grid.

- [x] **Step 5: Verify GREEN**

Run: `npm run audit:platform-ai-phase7`

Expected: all Phase 7 assertions PASS.

### Task 4: Regression and persistence verification

**Files:**
- Modify only if a failing focused test identifies a Phase 7 regression.

**Interfaces:**
- Consumes: completed Phase 7 coordinator and existing audit commands.
- Produces: fresh completion evidence.

- [x] **Step 1: Run focused regressions**

Run the Phase 7, turn, economy, release, production, localization,
rights-lifecycle, Platform Wars, global ecosystem, deterministic awards,
save-migration, and save-transfer audits.

- [x] **Step 2: Verify calendar and ownership edge cases**

Confirm same-week replay, Week 52 rollover, acquisition handoff, and generated
operator persistence through the focused audit.

- [x] **Step 3: Build production assets**

Run: `npm run build`

Expected: exit code 0. Existing chunk-size warnings may remain documented.

- [x] **Step 4: Check patch integrity**

Run: `git diff --check`

Expected: exit code 0.
