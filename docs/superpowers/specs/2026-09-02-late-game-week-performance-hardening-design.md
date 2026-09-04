# Late-Game Week Performance Hardening Design

**Date:** 2026-09-02  
**Programme position:** Project A exit addendum A8P, before Project B  
**Status:** Approved goal; written design awaiting user review  

## Purpose

Keep `Process Week` responsive for an age-82 player who simultaneously owns a production house and streaming platform, including on constrained Android devices, without changing any game decision, probability, payment, right, release, or save result.

This is a performance and responsiveness addendum, not a new simulation phase. Project B remains blocked until A8P is measured and verified.

## Evidence and current risk

The A8 long-run audit proved correctness over 31,200 simulated weeks. A targeted week-2,548 checkpoint measured a mature Platform AI world with 913 projects, 1,264 plans, 3,890 rights contracts, 632 rights transactions, and an approximately 29 MB compacted save:

- Platform AI simulation: 136.13 ms.
- Annual compaction and serialization: 120.85 ms.
- Audit observation: 0.73 ms.

That is not a complete `Process Week` measurement. The live path also progresses the player career, production house, owned streaming platform, businesses, relationships, events, finance, awards, UI state, and IndexedDB write.

Static inspection found three full-state costs in the live path:

1. `processGameWeek` JSON-clones the full player at its transaction boundary.
2. It JSON-clones that full state again only to compare the actor career arc at the end of the week.
3. After persistence, `handleUpdatePlayer` sends the already-current processed state through complete save migration again.

The first clone protects the input from partial mutation if processing fails and remains in scope as a safety boundary. The second clone and routine post-week migration are redundant for a canonical live state.

## Performance budgets

The final benchmark uses at least 20 consecutive real `processGameWeek` runs after warm-up and reports median, p95, minimum, and maximum values. A single fast run is not completion evidence.

- Button-to-visible-processing feedback: under 100 ms in the browser lab.
- Desktop reference machine, full week plus persistence preparation: p95 at or below 1,000 ms.
- Four-times CPU-throttled mobile proxy: p95 at or below 3,000 ms.
- No single measured week may block visible feedback before processing begins.
- The optimized result must be materially faster than baseline; the target is at least a 35% reduction in p95 CPU time for the composite fixture.

If browser CPU throttling is unavailable, the report must label the low-end-device result unverified rather than infer a pass from desktop timing. A physical low-end Android run is stronger evidence when a device is available.

## Representative composite fixture

A test-only deterministic fixture will represent a deliberately heavy age-82 career:

- one player-controlled production house;
- one player-controlled streaming platform;
- 40 player studio titles;
- multiple active player productions and releases;
- approximately 1,500 world projects;
- approximately 2,000 Platform AI plans;
- approximately 6,000 canonical rights contracts;
- approximately 1,000 rights transactions;
- mature finance, relationship, social, News, inbox, awards, and business histories at their production bounds.

The fixture must use existing constructors, normalizers, A8 QA data, and canonical registries where available. It stays under `scripts/fixtures` or another audit-only path and production simulation must not import it.

## Recommended architecture

### 1. Establish the real baseline

Add one repeatable audit that runs the complete `processGameWeek` path, persistence compaction, and a structured-clone equivalent of the IndexedDB write. Record:

- initial transaction clone;
- weekly simulation;
- persistence preparation;
- storage structured clone;
- total CPU time;
- save bytes and major collection counts;
- heap before and after when the runtime exposes it.

The audit first fails its performance budget while retaining correctness assertions. Timing results are evidence only under the recorded machine/runtime conditions.

### 2. Preserve immediate player feedback

After the existing re-entry lock is acquired and `isProcessing` becomes true, yield one animation frame before beginning synchronous weekly computation. This lets React paint the processing state before heavy work starts. The lock remains active during the yield, so a second tap cannot enqueue another week.

This changes presentation timing only. It must not change the week seed, state snapshot, or game result.

### 3. Remove the actor-arc full-state clone

Capture the small derived actor-arc value before weekly mutation instead of cloning the complete player. At the end of the week, compare that saved arc with the arc derived from the result and build the same transition notification.

The existing initial transaction clone remains. Tests cover no transition, each changed transition tone, notification cooldown, and exact state parity.

### 4. Add a trusted canonical UI commit path

Ordinary external, imported, restored, or UI-authored player updates continue through `migratePlayerSave`.

Only the state returned by successful `processGameWeek` and `persistCurrentSlotSnapshot` may use a trusted commit path that:

- does not run full migration again;
- preserves the exact processed object returned by persistence preparation;
- performs only the cheap UI projections still required by React;
- cannot be selected by arbitrary callers accidentally.

The trusted path is a narrowly named helper rather than a general boolean escape hatch. A parity test compares its resulting UI state with the existing migrated path for the canonical composite fixture.

### 5. Re-profile before deeper changes

After removing the two redundant whole-state passes, rerun the same benchmark and inspect the remaining dominant stages.

Only measured hot paths may receive further optimization. Candidate work includes:

- retaining canonical registry/index markers across every mutation boundary;
- replacing repeated linear lookup with one turn-local index;
- skipping the optional localStorage mirror serialization when a save is already known to exceed its mirror budget;
- compacting terminal simulation detail into existing lightweight historical summaries while retaining canonical financial, ownership, rights, award, and lineage facts.

No history may be deleted merely to satisfy a timing number.

### 6. Defer worker and persistence redesign unless required

A Web Worker can keep the interface responsive but adds serialization cost and a second runtime boundary. Splitting the player save across multiple IndexedDB records changes atomicity and migration. Neither is the first implementation step.

Use a worker only if the optimized main-thread computation still fails the throttled responsiveness budget. Redesign persistence only if measured IndexedDB cloning remains the dominant blocker after redundant work is removed.

## Correctness and safety invariants

- The input player remains unchanged if `processGameWeek` throws.
- One tap advances exactly one week.
- Same-week or double-tap protection remains intact.
- Baseline and optimized runs consume the same deterministic random stream and produce byte-equivalent compacted state.
- Money, rights, contracts, settlements, projects, productions, awards, relationships, News, and inbox items do not duplicate or disappear.
- Save/reload parity remains exact.
- Player-controlled platforms and studios receive no AI-only mutation or advantage.
- Developer fixtures and timing instrumentation create no production simulation dependency.

## Verification matrix

1. Meaningful RED performance audit on the unoptimized composite fixture.
2. Focused RED/GREEN actor-arc snapshot parity test.
3. Focused RED/GREEN trusted-commit parity test.
4. Real `processGameWeek` result parity with a fixed random/time source.
5. Twenty-week warm benchmark before and after under identical conditions.
6. Save compaction, structured clone, reload, and duplicate-record checks.
7. Existing week-safety, A1-A8 rights, Platform AI, production-house, owned-streaming, subsidiary, and migration audits.
8. Production build and `git diff --check`.
9. Browser proof that processing feedback paints before computation, re-entry stays locked, and the UI recovers after success or failure.
10. Mobile viewport plus four-times CPU throttling when browser tooling supports it; otherwise record the missing evidence explicitly.

## Player-visible result

The player sees the same game outcomes and screens. The change is experiential:

- the processing state appears immediately after tapping;
- mature weeks finish sooner;
- annual/save-heavy weeks create a smaller pause;
- low-end devices are less likely to appear frozen;
- processing failure still leaves the current week safe and retryable.

No new management screen, setting, or player decision is added.

## Completion gate

A8P is complete only when:

- the composite age-82 benchmark exists and is reproducible;
- the optimized path meets the desktop budget and materially improves p95;
- deterministic state and save/reload parity pass;
- browser feedback and lock behavior pass;
- no relevant regression audit fails;
- any unavailable low-end hardware evidence is reported honestly; and
- the roadmap records whether Project B B1 may proceed.
