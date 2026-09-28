# Phase 7 — paid market scouting

Date: 2026-09-27. Local implementation only; no commit or release made.

## Delivered

- Both production-studio script scouting and owned-platform content scouting use $450,000 × next successful paid-scout ordinal within the current absolute three-week market cycle. Counters belong to each business; old saves default to zero. The 100th scout costs $45 million if funded.
- The studio action replaces six unsold script offers, refreshes ten stable-ID fictional writer candidates, and leaves acquired scripts, development projects, and the scheduled free-refresh timestamps alone. Opening Development Lab no longer generates a free shelf outside the weekly simulation.
- Streaming scouting saves 20 complete, player-first individual offers plus up to five distinct rights-valid existing-title collections. It does not replace the public shelf or put unsold offers into projects, news, NPC careers, or awards. Standard purchase/premiere flows handle any later acquisition. A new paid action replaces only the previous unsigned private shelf; the scheduled free cycle expires it.
- Both screens show the next price, treasury source, cycle count, confirmation, and insufficient-funds state, with K/M price notation. A rapid repeat tap is guarded in the UI. No fake loading delay is added to the currently synchronous sub-second operation.
- No funds or counter are changed when a distinct shelf cannot be built. Streaming charge, shelf, and count are returned as one saved player state transition.

## Verification

- `scripts/audit-paid-market-scouting-phase7.ts`: pass. Covers $450K/$900K/$1.35M/$45M pricing; multiple paid scouts; per-cycle reset; no payment on insufficient funds or duplicate studio shelf; acquired-project survival; normal streaming purchase; compaction/migration/reopen; and free rotation staying on schedule.
- `scripts/audit-paid-market-scouting-ui-phase7.tsx`: pass. Both surfaces render the third scout as `$1.35M` without charging on render.
- Existing `scripts/audit-streaming-opportunity-market-phases5-6.ts`: pass.
- Targeted TypeScript check of changed services, components and audits: pass. An initial all-repository `tsc --noEmit` exceeded Node's default 4 GB heap before diagnostics; this is not a claim of full-repository type-check completion.
- `npm run build`: pass, with existing Browserslist age, Firebase import, and chunk-size warnings.
- Isolated live browser QA at 390×844: market scout price and confirmation visible; studio empty-state refresh opens a centered confirmation in view. The temporary QA route was removed afterward. No real saved career or treasury was used.

## Known boundaries

- This does not deliver phase 8's multi-decade balance and memory soak, nor release/device certification.
- The new market UI copy is in English, consistent with the existing exact Content Market surface; later localization review can extend it.
