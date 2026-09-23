# S2 implementation: registration, filing, honest Build entry

Status: implemented and verified in an isolated synthetic career on 2026-09-23. Scope is the S2 section of the streaming-launch stabilization roadmap. Work was inline in the existing checkout; no commit, push, balance change, or S3 work.

## Contract

Registration opens HQ/Home. The welcome guide offers a direct, optional founder-capital action. An untouched Build has zero chosen facilities/placements. A saved draft or live/change-order setup survives. The Build can be browsed without a filed opening market, but cannot mutate, rehearse, or commission until a canonical opening-market filing exists. Market decisions come from the operation ledger, not a region/preset fallback. Before a market is selected, country-specific forecast totals are unavailable; illustrative unit pricing remains readable. The canonical commission quote must not silently file a planned market.

## Task 1 — Regression first

- Extend the existing S0 blank-Build failure with an S2 audit covering no selection, planned, filed-under-review, approved, action-required, exited, saved draft, and live network.
- Assert the route-to-HQ and read-only wizard affordance from rendered markup; assert no cash or energy movement during previews.
- Run the audit to observe the expected red state before changing production code.

## Task 2 — Canonical access and draft projection

- Add a small read-only market-access selector in `services` using committed opening operations, with an explicit old-save compatibility case.
- Remove initial server preset insertion from the default draft and first HQ Build selection. Preserve committed setup and saved draft data.
- Project filed country IDs into Build demand, while legacy saves retain explicitly saved opening IDs. Never use generic region leads for a new career.

## Task 3 — Route, guide, and Build gate

- Change incorporation destination to HQ/Home. Update the welcome guide to explain capital and offer a direct Inject Capital action, without forcing it.
- Send canonical access state through the Build adapter to the wizard. Keep all four stages navigable, but visibly lock editing/rehearsal/commissioning before filing and link to Market Clearance. Avoid a fabricated country total with no market.
- Guard canonical commission against unfiled opening operations; filing remains the only charged market action.

## Task 4 — Verify and report

- Run the S0/S2, draft-continuity, network-lifecycle, founding, opening, TypeScript, and production-build checks. Inspect the real career in isolated browser storage at phone and desktop widths if possible.
- Update the failure ledger with any new or inherited failures and write a short S2 report. Do not claim a full S6 journey from targeted checks.
