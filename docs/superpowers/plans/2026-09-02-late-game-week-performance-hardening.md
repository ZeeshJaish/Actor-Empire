# Late-Game Week Performance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the complete age-82 `Process Week` path responsive on mature saves without changing any weekly simulation or persisted result.

**Architecture:** Retain one full-state transaction clone and the authoritative IndexedDB write. Remove two redundant whole-state passes, paint the processing state before synchronous work, avoid futile large-save mirror serialization, and prove the result with one deterministic composite benchmark plus exact state parity.

**Tech Stack:** TypeScript, React 19, Vite, IndexedDB, existing esbuild audit scripts, deterministic Actor Empire simulation services.

**Spec:** `docs/superpowers/specs/2026-09-02-late-game-week-performance-hardening-design.md`

## Global Constraints

- Work inline without subagents.
- Do not stage, commit, or push unless the user explicitly asks.
- Preserve the first `processGameWeek` transaction clone and failure rollback.
- Production outcomes and compacted saves must remain byte-equivalent under the same deterministic random/time sequence.
- Test-only fixtures must not be imported by production simulation.
- Desktop p95 must be at or below 1,000 ms and improve by at least 35% on the same composite fixture.
- Button-to-processing feedback must paint before weekly computation starts.
- Report throttled/mobile evidence as unavailable if it cannot be measured.

---

### Task 1: Deterministic composite age-82 benchmark

**Files:**
- Create: `scripts/fixtures/lateGameWeekPerformanceFixture.ts`
- Create: `scripts/audit-late-game-week-performance.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildLateGameWeekPerformanceFixture(): Player`
- Produces: `measureLateGameWeekPipeline(player: Player, weeks: number): Promise<LateGameWeekPerformanceReport>`
- Consumes: `processGameWeek`, `compactPlayerForPersistence`, `migratePlayerSave`, A8 QA builders, canonical Platform AI/rights normalizers.

- [ ] **Step 1: Create the deterministic test fixture**

Build a canonical age-82 player with one production house, one live owned streaming platform, 40 player titles, active productions/releases, and mature bounded world registries. Reuse constructors and normalizers rather than writing malformed object literals.

```ts
export const buildLateGameWeekPerformanceFixture = (): Player => {
    const base = migratePlayerSave(structuredClone(INITIAL_PLAYER));
    const withStudio = installPerformanceProductionHouse(base);
    const withRights = buildStreamingRightsPhase8QaFixture(withStudio, PERFORMANCE_STUDIO_ID);
    return scaleCanonicalLateGameWorld(withRights, {
        age: 82,
        worldProjects: 1_500,
        platformPlans: 2_000,
        rightsContracts: 6_000,
        rightsTransactions: 1_000,
    });
};
```

- [ ] **Step 2: Add the baseline benchmark and correctness assertions**

Measure at least one warm-up plus 20 consecutive real weeks. Record process, compaction, structured-clone, total, bytes, collection counts, and heap. Use literal budgets and independently verify week advancement and input immutability.

```ts
assert.equal(report.weeks, 20);
assert.equal(report.inputMutationCount, 0);
assert.equal(report.weekAdvanceCount, 20);
assert.ok(report.saveBytes > 600_000);
assert.ok(report.total.p95Ms <= 1_000, `p95 ${report.total.p95Ms}ms exceeds 1000ms`);
```

- [ ] **Step 3: Register and run the audit to observe meaningful RED**

Run: `npm run audit:late-game-week-performance`

Expected: FAIL on the performance budget while all fixture/correctness assertions pass. If it already passes, tighten only the redundant-pass behavior gate; do not invent a lower timing threshold after observing the result.

---

### Task 2: Replace the actor-arc full-player snapshot

**Files:**
- Modify: `services/actorCareerArc.ts`
- Modify: `services/gameLoop.ts`
- Modify: `scripts/audit-actor-career-arcs.ts`

**Interfaces:**
- Produces: `getActorCareerArcTransitionFromPrevious(previous: ActorCareerArc, currentPlayer: Player): ActorCareerArcTransition | null`
- Retains: `getActorCareerArcTransition(previousPlayer, currentPlayer)` for existing callers.

- [ ] **Step 1: Write a failing behavioral parity test**

Name the break: deriving the previous actor arc from a small saved value must produce the same transition as the previous full player.

```ts
const previousArc = getActorCareerArc(previousPlayer);
assert.deepEqual(
    getActorCareerArcTransitionFromPrevious(previousArc, currentPlayer),
    getActorCareerArcTransition(previousPlayer, currentPlayer),
);
```

Cover both no-transition and a literal `FLOP_ERA` to `COMEBACK` transition.

- [ ] **Step 2: Run the focused audit to verify RED**

Run: `npm run audit:actor-career-arcs`

Expected: FAIL because `getActorCareerArcTransitionFromPrevious` is not exported.

- [ ] **Step 3: Implement the small-snapshot transition helper**

```ts
export const getActorCareerArcTransitionFromPrevious = (
    previous: ActorCareerArc,
    currentPlayer: Player,
): ActorCareerArcTransition | null => buildActorCareerArcTransition(previous, getActorCareerArc(currentPlayer));
```

Make the existing full-player helper delegate to the same private transition builder.

- [ ] **Step 4: Replace only the redundant weekly clone**

```ts
let nextPlayer = JSON.parse(JSON.stringify(player)) as Player;
const actorArcBeforeWeek = getActorCareerArc(nextPlayer);
// ...weekly simulation...
const actorArcTransition = getActorCareerArcTransitionFromPrevious(actorArcBeforeWeek, nextPlayer);
```

- [ ] **Step 5: Run focused and week-safety audits**

Run: `npm run audit:actor-career-arcs`

Run: `npm run audit:week-processing-save-safety`

Expected: PASS.

---

### Task 3: Trusted processed-week UI commit

**Files:**
- Create: `services/playerUiState.ts`
- Create: `scripts/audit-player-ui-state.ts`
- Modify: `App.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `prepareExternalPlayerUpdateForUi(player: Player): Player`
- Produces: `prepareProcessedWeekForUi(player: Player): Player`
- Consumes: `migratePlayerSave`, `normalizeUniverseMap`, and award dedupe helpers.

- [ ] **Step 1: Write the failing canonical parity audit**

Name the break: a canonical processed save must render identically without another complete migration, while external updates must still migrate.

```ts
const canonical = migratePlayerSave(buildLateGameWeekPerformanceFixture());
assert.deepEqual(
    prepareProcessedWeekForUi(canonical),
    prepareExternalPlayerUpdateForUi(canonical),
);
assert.notEqual(prepareExternalPlayerUpdateForUi(legacy).world.streamingRightsContracts, undefined);
```

- [ ] **Step 2: Run the audit to verify RED**

Run: `npm run audit:player-ui-state`

Expected: FAIL because the two explicit preparation functions do not exist.

- [ ] **Step 3: Implement explicit trusted and external paths**

```ts
export const prepareExternalPlayerUpdateForUi = (player: Player): Player => (
    finalizePlayerUiState(migratePlayerSave(player))
);

export const prepareProcessedWeekForUi = (player: Player): Player => (
    finalizePlayerUiState(player)
);
```

The shared finalizer performs only current UI projections. It must not deep-clone or call migration.

- [ ] **Step 4: Route the successful processed-week result only**

Keep `handleUpdatePlayer` on the external path. Add a narrowly named `commitProcessedWeekPlayer` using `prepareProcessedWeekForUi`, and call it only after `persistCurrentSlotSnapshot` succeeds.

- [ ] **Step 5: Run parity, save migration, and build checks**

Run: `npm run audit:player-ui-state`

Run: `npm run audit:save-migration`

Run: `npm run build`

Expected: PASS, with only existing build warnings.

---

### Task 4: Paint processing feedback before computation

**Files:**
- Create: `services/weekProcessingScheduler.ts`
- Create: `scripts/audit-week-processing-scheduler.ts`
- Modify: `App.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `yieldForWeekProcessingPaint(schedule?: FrameScheduler): Promise<void>`

- [ ] **Step 1: Write a failing scheduler-order test**

Name the break: computation must not start until the scheduled paint boundary resolves.

```ts
const events: string[] = [];
const pending = yieldForWeekProcessingPaint(callback => {
    events.push('frame-scheduled');
    callback(0);
});
events.push('caller-returned');
await pending;
events.push('processing-started');
assert.deepEqual(events, ['frame-scheduled', 'caller-returned', 'processing-started']);
```

- [ ] **Step 2: Run the audit to verify RED**

Run: `npm run audit:week-processing-scheduler`

Expected: FAIL because the scheduler helper does not exist.

- [ ] **Step 3: Implement one paint-boundary yield**

```ts
export const yieldForWeekProcessingPaint = (
    schedule: FrameScheduler = callback => requestAnimationFrame(callback),
): Promise<void> => new Promise(resolve => schedule(() => resolve()));
```

- [ ] **Step 4: Call it after locking and setting processing state**

The call belongs after `weekProcessingLockRef.current = true` and `setIsProcessing(true)`, but before trace timing and `processGameWeek`. Preserve the original player reference and double-tap guard during the yield.

- [ ] **Step 5: Run the focused audit and browser interaction check**

Run: `npm run audit:week-processing-scheduler`

Expected: PASS. In the browser, the processing state must become visible before the heavy work and repeated taps must still advance exactly one week.

---

### Task 5: Skip futile large-save local mirror serialization

**Files:**
- Create: `services/saveMirror.ts`
- Create: `scripts/audit-save-mirror.ts`
- Modify: `App.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `prepareLocalStorageMirror(player: Player, budgetBytes: number, serialize?: typeof JSON.stringify): LocalStorageMirrorPlan`

- [ ] **Step 1: Write failing behavior tests**

Name the break: a clearly oversized canonical save must choose metadata-only without invoking the expensive serializer; a small save must retain the existing full mirror.

```ts
let serializeCalls = 0;
const large = prepareLocalStorageMirror(largeFixture, 600_000, value => {
    serializeCalls += 1;
    return JSON.stringify(value);
});
assert.equal(large.kind, 'METADATA_ONLY');
assert.equal(serializeCalls, 0);

const small = prepareLocalStorageMirror(smallFixture, 600_000);
assert.equal(small.kind, 'FULL');
```

- [ ] **Step 2: Run the audit to verify RED**

Run: `npm run audit:save-mirror`

Expected: FAIL because the mirror planner does not exist.

- [ ] **Step 3: Implement a conservative quick oversize guard**

Use only collection counts whose minimum plausible serialized size already exceeds the 600,000-byte budget. Otherwise serialize once and retain the existing exact length check. IndexedDB remains authoritative in every branch.

- [ ] **Step 4: Route the existing idle mirror writer through the plan**

Write the full mirror only for `FULL`; otherwise remove the old full keys and write the existing metadata summary. Do not delay or weaken the awaited IndexedDB save.

- [ ] **Step 5: Run mirror and startup audits**

Run: `npm run audit:save-mirror`

Run: `npm run audit:large-save-startup`

Expected: PASS.

---

### Task 6: Final benchmark, parity, and regression gate

**Files:**
- Modify: `scripts/audit-late-game-week-performance.ts`
- Create: `docs/superpowers/reports/2026-09-02-late-game-week-performance-hardening-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`

**Interfaces:**
- Consumes all A8P helpers and the existing A1-A8/Platform AI audit entry points.

- [ ] **Step 1: Run the identical 20-week benchmark after implementation**

Run: `npm run audit:late-game-week-performance`

Expected: PASS with p50/p95/min/max, save bytes, heap, and collection counts printed. Compare with the preserved baseline under the same Node/runtime conditions.

- [ ] **Step 2: Prove deterministic before/after state parity**

Use fixed random/time sequences and assert byte-equivalent `compactPlayerForPersistence` output for the legacy and optimized orchestration paths. Reverting each optimization must make its focused regression fail.

- [ ] **Step 3: Run focused regressions**

Run the actor arc, week scheduler, player UI state, save mirror, week-processing save safety, save migration, A1-A8 rights, Platform AI turn/scalability, production-house, owned-streaming, and subsidiary streaming audits.

Expected: all relevant focused audits PASS. Record unrelated repository-wide fixture diagnostics separately.

- [ ] **Step 4: Run production and source-integrity checks**

Run: `npm run build`

Run: `git diff --check`

Expected: build exit 0 with only established bundle warnings; diff check exit 0.

- [ ] **Step 5: Verify browser and mobile-proxy behavior**

Measure at least three equivalent browser interactions. Record viewport, CPU throttle, cache/state, processing-paint order, total duration, and week advancement. If throttling or physical hardware is unavailable, state that limitation explicitly.

- [ ] **Step 6: Publish evidence and update sequencing**

Write the measured report, mark A8P complete only if its gate passes, and leave Project B B1 approval-gated. Do not commit or push.
