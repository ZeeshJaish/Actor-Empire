# Streaming Build Test, Autosave, and Launch Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist free Define Launch intent automatically and require a current, player-run load rehearsal before infrastructure commissioning or launch progression.

**Architecture:** Keep `Player` and canonical streaming services authoritative. Add a normalized launch-draft snapshot plus a service-level autosave/checkpoint boundary, project one shared rehearsal readiness rule into Build UI and launch-program gates, and remove the hidden rehearsal from commissioning.

**Tech Stack:** React, TypeScript, deterministic Actor Empire streaming services, esbuild audit scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-09-15-streaming-build-test-autosave-gates-design.md`

## Global Constraints

- Free planning intent autosaves; paid actions, market filings, purchases, leases, commissioning, and Opening Night remain explicit.
- Test is player-controlled in Assisted and Hands-On modes.
- Missing, stale, or `BROKE` rehearsal evidence blocks commissioning without an override.
- Rehearsal evidence is valid only for its exact launch/build signature.
- Legacy saves normalize without failure.
- Campaign choices remain player-controlled.
- Do not run the 400-week soak for this change.
- Do not commit or push unless the user explicitly requests it.

---

### Task 1: Persist the Define Launch working draft

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingCanonicalState.ts`
- Modify: `services/streamingLaunchProgram.ts`
- Test: `scripts/audit-streaming-build-test-autosave-gates.tsx`

**Interfaces:**
- Produces: `OwnedStreamingDefineLaunchDraftState`
- Produces: `saveStreamingDefineLaunchDraft(player, draft)`
- Produces: `checkpointStreamingLaunchBlueprint(player)`

- [ ] **Step 1: Write a failing normalization and persistence audit**

Create a focused audit that supplies a legacy launch program without `defineDraft`, saves a draft snapshot, normalizes it, and proves that malformed country IDs, strings, prices, and audio metadata are sanitized without spending treasury.

```ts
const beforeTreasury = player.ownedStreamingPlatform.treasuryCash;
const saved = saveStreamingDefineLaunchDraft(player, draft);
assert(saved.changed);
assert.deepEqual(saved.player.ownedStreamingPlatform.launchProgram.defineDraft?.selectedCountryIds, ['US']);
assert.equal(saved.player.ownedStreamingPlatform.treasuryCash, beforeTreasury);
```

- [ ] **Step 2: Run the audit and verify RED**

Run the new audit through esbuild. Expected: failure because the draft type and save function do not exist.

- [ ] **Step 3: Add the normalized persisted state**

Add an optional `defineDraft` to `OwnedStreamingLaunchProgramState` containing selected country IDs, ident intent, storefront intent, pricing intent, and `updatedAtAbsoluteWeek`. Normalize it in `streamingCanonicalState.ts` using the existing pricing and custom-audio limits. Old saves return `null`.

- [ ] **Step 4: Add idempotent service-level autosave**

Implement `saveStreamingDefineLaunchDraft`. Sanitize through canonical compaction, return `changed: false` when the normalized snapshot is identical, and never touch treasury, cost commitments, or energy.

- [ ] **Step 5: Add automatic blueprint checkpointing**

Refactor the existing blueprint signature write into `checkpointStreamingLaunchBlueprint`. It writes only when all required canonical milestones are complete and returns unchanged for incomplete or already-current definitions. Keep `saveStreamingLaunchBlueprint` as a compatibility alias during migration.

- [ ] **Step 6: Run the focused audit and verify GREEN**

Expected: draft survives normalization, autosave is idempotent, incomplete definitions do not checkpoint, and no paid state changes.

### Task 2: Wire immediate autosave into Define Launch

**Files:**
- Modify: `components/StreamingPlatformHQ.tsx`
- Modify: `components/StreamingDefineLaunchExperience.tsx`
- Modify: `components/studio-finance/components/launch/StepBlueprint.tsx`
- Modify: `components/studio-finance/components/launch/StepMarkets.tsx`
- Modify: `components/studio-finance/components/launch/StepPricing.tsx`
- Test: `scripts/audit-streaming-build-test-autosave-gates.tsx`

**Interfaces:**
- Consumes: `saveStreamingDefineLaunchDraft`
- Consumes: `checkpointStreamingLaunchBlueprint`

- [ ] **Step 1: Extend the audit with UI source and SSR assertions**

Assert that Blueprint renders `Autosaved` without a manual save button, and that market/pricing controls do not present redundant save CTAs.

- [ ] **Step 2: Run the audit and verify RED**

Expected: manual Save Blueprint, Save Pricing, or Save Opening Footprint controls remain.

- [ ] **Step 3: Replace the volatile ref with persisted initialization**

Map `platform.launchProgram.defineDraft` into `LaunchDraft` when opening the wizard. On each `onDraftChange`, persist the snapshot through the service and update the player.

- [ ] **Step 4: Persist free canonical selections automatically**

Apply free market-plan, storefront, and pricing changes as part of the autosave path only when their normalized values differ. Do not call paid market-clearance or ident-commissioning functions. Run the automatic blueprint checkpoint after canonical updates.

- [ ] **Step 5: Remove redundant manual save controls**

Replace Blueprint's button with a read-only `Autosaved · current` or `Autosaving requirements` status. Remove market-footprint and pricing save buttons while keeping paid/confirming actions explicit.

- [ ] **Step 6: Run the audit and verify GREEN**

Expected: remount restores the persisted draft, free selections survive, and no paid action is invoked.

### Task 3: Make Test player-owned and commissioning strictly evidence-gated

**Files:**
- Modify: `components/studio-finance/components/build/BuildWizard.tsx`
- Modify: `components/studio-finance/components/build/StageTest.tsx`
- Modify: `components/studio-finance/components/build/StageLaunch.tsx`
- Modify: `components/StreamingPlatformHQ.tsx`
- Modify: `components/studio-finance/finance/build.ts`
- Test: `scripts/audit-streaming-build-test-autosave-gates.tsx`

**Interfaces:**
- Consumes: existing `rehearsalStale(data, draft)` and `gates(data, draft)`
- Produces: player-facing rehearsal availability reason

- [ ] **Step 1: Add failing Assisted-mode and commission audits**

SSR-render an approved Assisted draft and assert `Test the load` is enabled. Call commissioning without current load evidence and assert no charge and a load-test-required result. Assert stale and `BROKE` evidence remain blocked.

- [ ] **Step 2: Run the audit and verify RED**

Expected: Assisted Test is disabled and the commissioning handler manufactures test evidence.

- [ ] **Step 3: Remove Test from the managed disabled wrapper**

Render `StageTest` directly in Assisted mode. Keep Sites/Plans team ownership unchanged and leave campaign choices player-controlled.

- [ ] **Step 4: Remove hidden testing and the rehearsal override**

Delete the commissioning call to `runStreamingInfrastructureLoadTest`. Pass the saved draft directly to `commitStreamingInfrastructureSetup`, which already validates its current signature. Remove `Build it anyway` from `StageLaunch`.

- [ ] **Step 5: Add actionable Test feedback**

When the rehearsal handler or capacity is missing, render an inline explanation tied to the button. Use `aria-describedby`; do not rely on disabled color alone.

- [ ] **Step 6: Run the audit and verify GREEN**

Expected: Assisted Test opens, current successful evidence unlocks commission, and missing/stale/failed evidence blocks without charging.

### Task 4: Align launch-program readiness and regression coverage

**Files:**
- Modify: `services/streamingLaunchProgram.ts`
- Modify: `components/studio-finance/components/build/StageLaunch.tsx`
- Modify: `components/studio-finance/styles/build.css`
- Modify: `components/studio-finance/styles/launch.css`
- Modify: `package.json`
- Test: `scripts/audit-streaming-build-test-autosave-gates.tsx`

**Interfaces:**
- Consumes: current infrastructure draft/load-test signature and launch definition signature
- Produces: consistent blocker copy and destination across Test, Build Launch, and launch-program view

- [ ] **Step 1: Add failing cross-surface assertions**

Assert that all three surfaces report a missing rehearsal, stale evidence after a pricing/marketing/network change, and readiness after a current non-`BROKE` result.

- [ ] **Step 2: Run the audit and verify RED**

Expected: launch-program ordering or blocker copy disagrees with Build.

- [ ] **Step 3: Align the launch-program rehearsal milestone**

Treat current player-run draft evidence as the Build rehearsal milestone. Keep Opening Night blocked until infrastructure is commissioned/ready and the current rehearsal is present. Route blockers to Test.

- [ ] **Step 4: Improve gate presentation**

Make the primary disabled action name its first unresolved blocker. Keep every red gate tappable. Add compact autosave and disabled-reason styles using the existing flat dark system.

- [ ] **Step 5: Register and run the focused audit**

Add `audit:streaming-build-test-autosave-gates` to `package.json` and run it to GREEN.

- [ ] **Step 6: Run proportional regression verification**

Run:

```text
npm run audit:streaming-build-test-autosave-gates
npm run audit:streaming-assisted-build-state-ui
npm run audit:streaming-infrastructure-phase5
npm run audit:streaming-launch-phase8
npm run audit:streaming-launch-marketing-build
npm run audit:streaming-linked-budget-sheets
npm run build
git diff --check
```

Verify the local mobile Build flow at 393×852: approved team plan, interactive Test, recorded result, Launch blocked before test, and Launch unlocked after a successful current test.
