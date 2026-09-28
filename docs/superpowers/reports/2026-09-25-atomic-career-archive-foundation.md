# Atomic career archive — implementation status

Date: 2026-09-25

The storage foundation exists, but the player-history hot/archive split is **not activated**. No existing player history is removed by this change. Existing v1 saves continue loading and saving through the same path.

Implemented:

- Immutable, content-addressed, SHA-256-checked career-history chunks bounded to 64 records and 256 KiB each. Roots are bounded to 512 KiB and preserve a per-domain sequence.
- IndexedDB chunk staging with read-back verification and no overwrite on collision or corruption; failure leaves the current save key unchanged.
- Bounded page reads that throw on missing/corrupt chunks instead of returning an apparently empty history.
- Optional root companion in the same IndexedDB transaction as hot player and integrity-manifest promotion/recovery. The hot player carries a root digest marker protected by save integrity, so a missing root pointer is not accepted as a complete generation.
- Previous-generation recovery checks its referenced chunks before offering it.
- Existing transfer paths fail closed on archive-backed careers, so they cannot silently omit history. This is a safety gate, **not** complete transfer support.

Verification passed: `npm run audit:career-archive-foundation`, `npm run typecheck:career-archive`, `npm run audit:save-integrity`, `npm run audit:save-migration`, `npm run audit:save-transfer`, `npm run audit:week-processing-save-safety`, and `npm run build`. Repository-wide `npx tsc --noEmit` exceeded Node's 4 GiB heap; focused type checking passed. Production build emitted existing large-chunk and Browserslist-age warnings.

Not yet implemented / not safe to activate:

1. Archive-aware signed export/import, including bounded iOS transport and Android V2 archive records.
2. Browser IndexedDB abort/reopen and device-kill tests for the coupled hot/root transaction.
3. Domain eligibility, UI query adapters, and migration for filmography, IMDb-style credits, X/Instagram/YouTube history, projects, and other player-visible details.
4. A 20-year save/transfer/offline-history parity run and physical-device memory validation.

Do not strip history from `Player`, enable a migration marker, or claim the long-session memory reduction is achieved until those gates pass. Details already truncated by older saves cannot be reconstructed from this foundation.
