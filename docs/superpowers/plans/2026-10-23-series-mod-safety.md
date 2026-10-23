# Series valuation and inherited mods implementation plan

> Execute inline against the existing approved checkout, with focused tests and preservation checks.

**Goal:** Remove series budget-driven sale inflation and preserve enabled mods across succession without adding UI.

**Architecture:** Keep existing bidding, signed contract and cash-settlement authorities. Derive series buyer expectations from existing market scale, creative package and observed season performance; route live/manual and automatic offers through that calculation. Carry only mod configuration/history into inherited flags and recover old affected heir settings from verified surviving pack data.

**Tech Stack:** TypeScript, React, existing esbuild audit scripts, verified save-generation coordinator.

**Spec:** Approved design in this chat; existing source analysis in output/analysis/budget-mod-reports/README.md.

## Global constraints

- No extra UI, review panels or wizard steps.
- Existing signed contracts, installments, balances, actor IDs/statistics and ownership remain authoritative.
- Legitimate changes in actor asking prices remain supported; cost alone creates no buyer value.
- Preserve all pre-existing dirty changes; no commit/push requested in this task.
- Never infer every pack or copy death/career-specific parent flags.

## Task 1: Series value and offer safety

Files: services/streamingBidding.ts; new services/seriesStreamingValue.ts; services/releaseStreamingAuction.ts where shared market inputs are needed; views/lifestyle/business/ReleaseWizard.tsx; services/gameLoop.ts; focused series audit.

Interfaces: existing CreateStreamingBiddingSessionInput gains optional observed series performance, not a saved-contract schema change. A series helper reads prior/current released performance and supplies bids/acceptance ceilings through existing bidder and rights-lot interfaces.

- [x] Write/run a failing live structured-auction regression: same package and rights, production/actor cost $10M/$1B/$1T, identical offers.
- [x] Make series expected value budget independent; keep quality/genre/rights/relationships/buyer constraints and bounded observed audience/rating signals.
- [x] Connect existing release room and automatic series bids; reject stale oversized unsigned offers at signing, preserve already signed contracts.
- [x] Verify successful/weak seasons, actor price changes, buyer affordability, rights scope, royalties and funding separation; save/reload and next-week settlement remain idempotent.

## Task 2: Mod settings survive inheritance

Files: services/legacyLogic.ts; services/saveMigration.ts; services/npcLogic.ts or focused shared pack helper; focused succession audit.

- [x] Write/run failing actual App callback tests for son/daughter with living/deceased parents, including reload.
- [x] Clone enabled pack IDs and mod history into inherited flags; keep character state resets.
- [x] Repair old affected heir selections only using valid surviving pack history/profiles; preserve existing actor stats and avoid duplicates/deceased resurrection.
- [x] Verify subsequent weeks, verified saves/reloads, fresh unrelated careers, invalid pack evidence and repeated migration.

## Task 3: Integrated validation

- [x] Run focused regressions, existing rights/bidding/funding/legacy/dynasty/save/actor-retention checks appropriate to touched paths.
- [x] Exercise a normal series production → licence → next season with higher actual actor demand → next weeks → verified save/reload journey.
- [x] Run focused TypeScript, production build and diff whitespace checks; record existing repository-wide typecheck limits separately.
- [x] Compare unrelated baseline hashes and document evidence/limits in docs/reports/2026-10-23-series-mod-safety/README.md.
