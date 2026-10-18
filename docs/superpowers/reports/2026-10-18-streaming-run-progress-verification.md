# Streaming progress and legacy history repair — October 18, 2026

Approved scope: correct dashboard/filmography streaming weeks, preserve legacy streaming weeks/views, prevent duplicate revenue, verify the complete flow and push the fixes.

## Behavior

The dashboard and filmography share a phase-aware progress selector. Streaming uses its saved platform counter and recorded history; theatrical releases keep their theatrical counter. Filmography projections now retain streaming state and per-buyer runs rather than losing that information before rendering.

Canonical contract migration seeds one matching historical placement from the legacy streaming projection or its legacy fallback run. Existing canonical per-buyer records remain authoritative. Recorded cumulative views and weekly history provide a lower bound when an older reset already damaged scalar counters; recovery does not reprocess historical weeks or pay historical income. History is never duplicated across shared buyers or copied to a future replacement placement. Valid saved start dates take precedence over inferred dates when matching old placements.

Expired saved buyer runs remain available as stopped history. They contribute accumulated views, but do not simulate new views or receive royalties. Future-only gaps preserve aggregate progress until a non-stopped placement starts. All-stopped releases still complete and archive.

Weekly backend settlement uses the current week's new views and excludes stopped, future and inactive canonical placements. The legacy royalty fallback cannot bypass an existing canonical placement's payment eligibility. Existing guarantee amounts, paid royalty ledgers and settlement IDs are preserved.

## Tests

`npm run audit:streaming-run-progress` runs 19 checks using real components and services. Reported display/migration cases were observed failing before implementation. Additional edge cases found during independent review were also reproduced as failing regressions before repair.

Covered paths:

- Actual dashboard and filmography rendering, plus unchanged theatrical week display.
- Migration preserving Week 8, 28 million cumulative views, all seven historical weekly entries and the original premiere date.
- Repeat migration and JSON save reload without cash movements or duplicate contracts/payments.
- Shared buyers, existing canonical history, legacy fallback IDs and damaged aggregate-counter recovery.
- Six real weekly advances with reload after each, reaching Week 14 while preserving history and the paid $672.2M streaming amount.
- Positive $100k royalty settlement followed by migration/reload/replay, with a second payment of $0.
- Completed-run archival with preserved views and paid revenue.
- Expired buyer history, future replacement windows, stopped-buyer royalty replay and future-only gaps.

Related audits pass: streaming release runs, shared streaming game loop, streaming contract economics Phase 2, contract foundation Phase 1, legacy streaming rights Phase 1/2, save migration, save generations, legacy inheritance, reported bug regressions, TV cancellation news, and the directly bundled TV renewal matrix script.

The contract-foundation audit initially also failed on the unchanged starting commit: its hand-built AI fixture omitted current buyer capabilities, and its signing fixture expected the old backend default. The fixture now uses the existing AI normalizer and explicitly requests the historical adjusted-gross basis its assertions test. Assertions remain intact; this is a fixture repair, not a change to backend pricing rules.

## Verification boundaries

A temporary isolated browser harness renders the actual ProductionHouseGame, ProjectDashboardModal and filmography flow with synthetic legacy data. It runs the real weekly engine and save migration; browser fixture persistence uses its own IndexedDB database. Production save-generation durability is separately covered by the existing audit. Browser checks and exact staged-source typecheck/build results are recorded after completion below. Unrelated dirty streaming economics work is excluded from the repair commit.

## Completed browser verification

The actual studio dashboard loaded legacy Week 8 / 28 million views. After six completed weekly advances, the fixture was durably saved to IndexedDB and reloaded. Filmography displayed **Run W14** and opening its card displayed **Run Week 14**. Views increased to **69,082,632** and survived reload. Streaming revenue remained **$672.2M**; separate newly earned soundtrack receipts raised overall project revenue to $672.3M. No browser console errors were recorded.

Screenshots: `/Users/zeesh/.codex/visualizations/2026/10/18/01a14f08-9bde-7472-b4cd-238c8df062d1/streaming-dashboard-week14.png` and `streaming-filmography-week14.png` in the same directory.

Already-reset single-buyer canonical records can also recover a longer surviving aggregate history when their short history is its exact suffix. Recovery requires a single contract across the entire project registry history; former shared-buyer records are deliberately excluded from attribution guesses. This restores recorded progress without historical payouts. Existing canonical records otherwise retain their per-buyer attribution.

## Final staged-source checks

The exact staged source, copied to a separate temporary checkout without unrelated dirty changes, passes the 19-check progress audit, shared streaming loop, contract foundation, TypeScript check and production build. Build output contains the existing chunk-size/static-versus-dynamic-import warnings. Independent read-only review reran the final 19 checks and its expiry, replacement, stopped-royalty, gap and former-shared reproductions without remaining actionable findings.
