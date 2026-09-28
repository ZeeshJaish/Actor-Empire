# Phase 2 — Content Market responsiveness, initial diagnosis

Date: 2026-09-28

Status: **Measurement and CPU attribution started; no Market gameplay optimization or 50% exit gate claimed.** The player's personal career was not opened or changed.

## Local synthetic evidence

- Re-ran the Phase 0 isolated Chromium fixture at 390 × 844, normal CPU, local Vite dev server, one fresh and one long synthetic career. Add Content → gate measured 442 ms / 383 ms; detail → live room 598 ms / 573 ms; bid → feedback 419 ms / 412 ms. These are individual diagnostic runs, not three-run medians or real-device INP.
- A separate Chromium CPU profile on the synthetic fresh Market attributed the largest self-time to repeated `normalizeOwnedStreamingPlatformState` and `createInitialOwnedStreamingPlatformState` work across all three slow interactions. Examples: Add Content 69 ms + 54 ms; room entry 88 ms + 82 ms; bid 71 ms + 55 ms in those two functions. Other repeated helpers include text cleaning, deterministic hashing, market supply selection, and compatibility checks. CPU samples are diagnostic attribution, not additive end-to-end timing.
- Code inspection confirms `StreamingContentMarket` derives multiple related shelves from the same `player` and several selectors call normalization again through nested helpers. Room entry and bidding update `player`, invalidating those memos before the auction UI settles. The exact call count and mutation safety of any shared normalized snapshot still need tests before introducing one.

## Next scoped work

1. Characterize selector outputs and auction/save semantics on unchanged fixtures. Build a reusable current-player Market snapshot with explicit invalidation on real player/market changes, without caching mutable normalization results across unrelated callers.
2. Re-measure the same fresh/long fixture and 4× CPU profile after each optimization; keep price, lot identity, rival bids, countdown, settlement and resume behavior unchanged.
3. Add immediate first-frame action acknowledgement only where the measured computation cannot paint promptly, and clear it when the operation completes. No fixed-duration page overlay.

The Phase 2 roadmap target remains at least a 50% median reduction for Add Content, room entry, and bid feedback on the Phase 0 profiles, or a documented reason for any miss.
