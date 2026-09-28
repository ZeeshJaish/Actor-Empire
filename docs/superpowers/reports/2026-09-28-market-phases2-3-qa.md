# Content Market Phases 2–3 — implementation and QA

Date: 2026-09-28

Status: **Web implementation verified on isolated synthetic saves. Native/release validation remains open.** No player career was opened or changed; no market price, signed contract, live-room terms, supply-cycle rule, or save schema was intentionally changed.

## What changed

- The Market now prepares related listings, collections, auction assignments, auction lots, and supply counts once per current player snapshot. Selectors accept these prepared inputs without changing their standalone behavior. Exact-card project lookups use one precedence-preserving index (world result, past result, historical title) rather than rebuilding released-history data for each card.
- The platform normalizer no longer constructs a complete default platform merely to read four scalar defaults. A characterization audit guards the legacy fallback values, including the empty-ID seed case found during testing.
- While a saved auction room is active, the UI reads that session directly and does not rebuild the unrelated storefront on each bid/timer player update. Opening a room cancels any pending market-draft autosave and stores the selected room with the session in one update, preventing a slow-device overwrite race.
- Add Content, enter-live-bid, and bid submit show button-level processing feedback at the first frame before expensive work. This is not a page-loading overlay or a fixed minimum delay; bid terms and click timestamp are captured at tap time.
- Cards and rails now distinguish **Live bidding**, **fixed-price licence**, and **Marquee** (a premium marker). Main discovery rails say **Live bidding**, **Hot now**, and **Box-office proven**. The detail action says **License**, **Negotiate rights**, or **Enter live bid**. A compact summary shows term, territories, exclusivity, guarantee, backend, and an explicit reminder that film IP remains with its rights holder before the signing action.
- Private Scouting and First Look use compact dark/gold modules. Poster status, rating, and Marquee markers occupy a separate metadata row; first-page rails do not repeat the same lead card. Market navigation/filter controls have at least 44 px height on the checked phone widths.
- Two decorative gradient-text rules in each active/legacy Market stylesheet were changed to solid high-contrast text. Design-hook findings fixed: four; suppressed: zero; left standing: zero for those scanned rules.

## Repeatable lab timing

The Phase 0 script used the same 390 × 844 synthetic fresh/long fixture, local Vite server, normal and Chrome DevTools 4× CPU profiles, three independent runs each. Values are median click-to-target-paint milliseconds; the Phase 0 medians are from the pre-change baseline report. These are lab timings, not real-device INP or a promise for every save.

| Interaction | Normal fresh, before → after | Normal long, before → after | 4× fresh, before → after | 4× long, before → after |
| --- | ---: | ---: | ---: | ---: |
| Add Content → gate | 379 → **84** | 384 → **85** | 1,516 → **306** | 1,538 → **319** |
| Detail → live bid room | 570 → **177** | 574 → **176** | 2,307 → **698** | 2,343 → **707** |
| Bid → feedback | 409 → **31** | 413 → **31** | 1,645 → **111** | 1,686 → **114** |

All twelve comparisons exceed the roadmap's 50% reduction target. In the final repeated runs, the first DOM response was ~1 ms normal / 4–6 ms at 4× for the three Market taps. No `Loading screen…` appeared and no page errors were observed. A 4× run explicitly waited through the 500 ms draft-autosave window and confirmed that the same live session and selected draft remained persisted before bidding.

## Functional and visual checks

- Passed: final `npm run build`; `audit:content-market-cm1`, `cm2`, `cm3`, `cm4`, `content-market-ui-transplant`, `content-market-supply-rotation`, `save-integrity`, `save-generations`, `streaming-rights-transactions-phase6`, and `streaming-rights-finalization-phase8`.
- Existing isolated Chromium smoke tests also pass for fixed-price licence, private negotiation, studio import, 320 px layout, and upcoming-rights auctions. The old smoke test searched for `The Harbour 1`, a world fixture title that is not a current shared-library offer; it now selects an actual fixed-price Market card. No gameplay search rule was changed for the test.
- The supply-rotation audit had an old `<=4` regular-collection assertion while the existing market profile caps regular cycles at five. Its assertion now matches that pre-existing five-package rule; no supply rule changed.
- Isolated Chromium layout audit passed at 390 px and 320 px: no page horizontal overflow, duplicate lead cards, poster/metadata overlap, short checked tap targets, or bottom-action collision. It also confirmed visible licence terms/IP copy and zero uncaught page errors. Screenshots: `output/playwright/market-phase23-390.png`, `market-phase23-320.png`, `market-phase23-detail-320.png`, `market-phase23-terms-320.png`.
- Full `npm run lint` completes with three errors in untouched audit scripts: `audit-ios-long-session-soak.ts:56` (missing `WorldState.aiCatalogue`) and self-referential `player` annotations in `audit-responsive-phase5-lifestyle-browser.ts:19` and `audit-responsive-phase5-nested-mobile-browser.ts:50`. An initial direct `tsc --noEmit` at Node's 4 GB default heap ran out of memory; the project lint command's 8 GB heap exposed the three errors. None point to the Phase 2–3 files.

## Remaining release gate

Phases 2–3 are web-verified, not fully shipped. Phase 1's native launch gate and Phase 5's real/representative Android/iOS, background-resume, long-save, and complete migration checks still need closure. Phase 4 alone owns any future pricing rebalance; current prices and signed/live offers are unchanged here.
