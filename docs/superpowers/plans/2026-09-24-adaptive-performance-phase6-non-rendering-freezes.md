# Adaptive Performance Phase 6 Implementation Plan

1. Extend the week-processing scheduler with an elapsed-time budget and deterministic dependency injection for tests.
2. Add adaptive checkpoints to Process Week at existing stage boundaries, with extra checkpoints between streaming subsystems.
3. Yield between simulation, verified-save preparation, and IndexedDB persistence while retaining atomic generation writes.
4. Build per-week entitlement/route lookup indexes in world streaming viewing and prove cached decisions match uncached decisions.
5. Lazy-load non-startup screens behind a lightweight Suspense fallback.
6. Run scheduler, determinism, save-safety, streaming, build, and late-game performance verification.

The initial benchmark is the red baseline. Changes are accepted only if they preserve outcomes and reduce the longest uninterrupted work slices; total CPU time is tracked separately from responsiveness.
