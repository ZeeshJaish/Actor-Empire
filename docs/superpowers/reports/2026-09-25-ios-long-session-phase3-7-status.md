# iOS long-session phases 3–7 status

Date: 2026-09-25

The release gates in the original roadmap remain unchanged. No historical records have been removed from `Player`, and no archive migration has been activated.

| Phase | Code status | Missing release evidence |
| --- | --- | --- |
| 3 — hot state/archive | Sidecar archive, verified roots, atomic IndexedDB promotion, and signed transfer foundations exist. Ordinary archive-backed autosaves retain the verified root. | No certified history domain has been migrated. Filmography/social/production reader and writer adapters, full Android+iOS backup round trips, and offline screen parity are still required. |
| 4 — weekly clone | Canonical studio and streaming-ecosystem maps join the existing structurally shared domains; studio AI no longer mutates its input map. | `processGameWeek` still starts with `createWeekPlayerTransaction` and clones most state. Stage-by-stage ownership, deterministic gameplay parity, rollback tests, and physical peak-memory comparison remain. |
| 5 — memory-safe save | Preparation/promotion queue, coalesced optional autosaves, verified previous generation, iOS pressure cooldown, and tiny iOS local summary are implemented and audited. | Mature-device peak allocation and pressure-during-save behavior have not been measured on iPhone. |
| 6 — iOS adaptation | iOS Automatic mode responds to unhealthy windows and memory warnings; pressure suspends optional work/caches and preserves image quality. Healthy devices stay at full presentation. | Confirm on older/current iPhones that presentation restores after healthy windows and gameplay/visuals remain intact. |
| 7 — renderer recovery | Native termination report now retains the save slot. A native dark recovery surface covers the dead WebView, exposes Retry after failed/timed-out reload, and leaves only after the app reports a ready first screen. JavaScript auto-opens only the reported slot through the existing verified-save loader; unverified careers remain for manual recovery. | Simulated/physical WKWebView termination, 30/60/120-minute sessions, save/reopen observation, and black-screen count are not yet run. This is not a proven crash fix. |

## Verification this continuation

- Passed: `audit:ios-renderer-recovery-phase7` (TypeScript recovery decision plus native Swift state machine), `audit:ios-long-session-store`, `audit:ios-long-session-phase1-2`, `audit:ios-save-pressure-phase5-6`, `audit:save-integrity`, `audit:week-processing-save-safety`, `audit:career-archive-foundation`, `audit:career-archive-transfer`, `audit:ios-save-transfer-session`, `audit:ios-week-transaction-phase4`, and `audit:game-loop-clone-c8`.
- Unsigned native `xcodebuild` for `generic/platform=iOS` succeeded with the new recovery UI.
- `App.tsx` standalone syntax transform and `git diff --check` passed.
- An unrelated in-progress syntax error in `components/StreamingContentMarket.tsx` briefly blocked the web build. The file changed during this continuation without an edit from this crash task; a fresh `npm run build` then succeeded. Full `npx tsc --noEmit` reaches Node's default 4 GiB heap ceiling before diagnostics; the focused `typecheck:ios-renderer-recovery` passes. The full-project typecheck is not claimed green.
- No install or test overwrote the original Actor Empire app or any player save.

## Next safe gate

The smallest apparent history domain is not yet safe to move. `gameLoop.ts` still applies passive engagement to Instagram/X posts, then truncates both live arrays at 200; `saveCompaction.ts` also caps persisted posts and YouTube details. The X and Instagram screens read those arrays directly, while post promotion can revise an older post. Archiving only the overflowing items without a writer handoff and archive-aware feed would silently lose visible history or late updates. Older saves may already have lost capped records; the new archive cannot reconstruct them.

Do not claim Phases 3–4 complete or activate archival migration until one domain passes record-ID/count/digest parity across migration, save/reopen, offline history UI, and Android+iOS signed transfer, and the broad weekly clone has been replaced with verified per-stage ownership. Then run the physical-device recovery and long-session matrix before release.
