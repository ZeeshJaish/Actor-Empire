# Streaming catalog, pricing and premiere fix verification

16 October 2026 · Current local checkout, based on `a63537102659d8be8d55980b1a1f53f3086df96d`

**GREEN for the tested local catalog → pricing → launch → live-week revenue flow.** Both reported defects are fixed. Actual opening subscribers now respond to eligible catalog, price, country coverage and commercial model. Premiere and HQ use the same committed paid subscriber count. The final run passed **38/38 audit suites**, **118/118 custom checks**, TypeScript and the production build. The browser walkthrough also passed.

This supersedes the functional verdict in [the earlier defect report](</Users/zeesh/Vibe code/Actor empire/docs/superpowers/reports/2026-10-16-streaming-catalog-pricing-qa.md>). It is not native iOS/Android device or long-session performance certification.

## What changed

- Launch and pricing preview now prepare the same opening-week offer and use canonical customer choice. The launch transaction saves that actual opening customer population, its plan allocations and matching revenue baseline. It preserves existing AI customer cells, historical movement and one current-week snapshot.
- Only subscription-playable catalog improves membership demand. Adding rental/purchase-only titles to a hybrid service cannot inflate paid subscription demand. Territory, dates and delivery coverage continue to apply.
- Premiere reads the committed opening result, including paid subscribers, expected peak and playback success. Its final receipt and opening paid counters agree with HQ; cosmetic emergency controls cannot pretend to alter an already committed result.
- Actual saved members remain eligible for valid viewing/purchase routes. Desired audience projections cannot replace the committed current-week membership entitlement.
- Final browser testing exposed a related Finance omission: earned ads/store receipts were settled but omitted from displayed revenue and title earnings. Finance totals, expenses, chart, revenue breakdown, title details and ledger now include incremental commercial receipts exactly once. Title details label subscription, advertising and other viewer receipts separately.
- Launch draft cloning preserves an absent optional commercial-offer property. The original strict continuity audit now passes without relaxing its equality assertions.

Existing launched careers retain their historical launch record; this does not retroactively reroll their opening population or replay launch charges. New launches use the corrected calculation. Replay, migration and compaction remain covered.

## Measured launch results

The controlled US fixture holds the opening slate, delivery network, readiness and standard launch option constant. Licensed-title counts exclude the separate opening Original. Every paid tier receives the listed price.

| Eligible licensed titles | Monthly price per tier | Pricing preview paid accounts | Actual committed opening paid accounts |
| ---: | ---: | ---: | ---: |
| 2 | $7.99 | 12,250 | 12,250 |
| 2 | $79 | 1,234 | 1,234 |
| 32 | $7.99 | 334,113 | 334,113 |

The old implementation committed 365,700 in all three variants. The new tests first failed on that behavior and now pass. Partial coverage also lowers opening demand and reconciles with the preview; coverage is not applied twice. Staggered premiere retains its explicit conversion penalty.

Two variants then ran the complete `processGameWeek`, rather than only the streaming component processor:

| Monthly price per tier | Saved opening subscribers | First live-week paid accounts | World billing weekly subscription revenue |
| ---: | ---: | ---: | ---: |
| $7.99 | 12,250 | 22,116 | $38,776.27 |
| $79 | 1,234 | 2,274 | $39,375.94 |

The first week starts from the committed opening population, processes real joins/cancellations and bills canonical customer plan cells. Weekly subscription billing reconciles to monthly billing divided by 4.33. Owned operations/Finance round settlement to whole currency units. Higher prices need not always produce lower total revenue; the tested requirement is that affordability changes the paying population.

See [full weekly outputs](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/launch-full-week.json) and [the new launch regression log](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/streaming-launch-audience-connection.log).

## Browser verification

The real HQ, launch wizard, Content Desk/Market, premiere and Finance components ran against a disposable in-memory career. No real save slot was loaded or overwritten. The Vite listener on port 5186 was verified to belong to this checkout.

| Action | Result |
| --- | --- |
| Empty catalog → eligible studio-title import | Catalog 0 → 1, available hours 0 → 2, opening market coverage 2/2 |
| Repeat import | Duplicate disabled; treasury unchanged at $500M |
| Return to Pricing | Subscription choice retained; conditional forecast 550/$4.19K → 12.9K/$97.8K monthly |
| Raise Essential $7.99 → $79 | Essential share 100% → 0%; Standard 97%, Premiere 3%; settled forecast 5.2K/$65K |
| Content Desk detour and return | Edited price, plan mix and forecast retained |
| Subscription launch → premiere → HQ | Exact opening paid count 12,250 on the saved career, premiere receipt and HQ |
| Ad-only launch → premiere → HQ | Exact paid count 0 throughout |
| Advance actual ad-only game week | Paid count stays 0; title viewing becomes 88K and 92K |
| Ad-only Finance | Earned revenue $49.4K; operating expense $218K; net −$169K; individual titles show $25K and $24.3K |
| Open ad-funded title detail | Subscription value $0; advertising revenue $25K; gross $25K |
| Captured browser console errors | None in the final ad launch/Finance walkthrough |

Pricing forecasts are conditional estimates, not earned cash. Empty catalogs retain launch warnings/blockers. The brief pricing-rail estimate settles to the main forecast after edits.

![Premiere and saved career agree at 12,250 paid subscribers](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/premiere-fixed.jpg)

![Live HQ uses the committed paid count](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/hq-fixed.jpg)

![Live ad earnings appear in Finance with paid subscribers still zero](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/ads-finance-fixed.jpg)

![Title details distinguish advertising from subscription revenue](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/ads-title-fixed.jpg)

## Commercial and accounting checks

Each model launches and advances the real game week. Finance matches actual operating receipts across totals, chart, breakdown and revenue ledger entries. The complete cash ledger closes to treasury.

| Model | First live-week operating receipts | Finance revenue |
| --- | ---: | ---: |
| Subscription | $38,776 | $38,776 |
| Advertising | $49,368 | $49,368 |
| Store | $8,813 | $8,813 |
| Subscription + store | $50,246 | $50,246 |

Tests also check title revenue and the actual Finance adapter labels, legacy snapshots without optional viewing receipts, zero recurring paid revenue for ads/store, no duplicate launch charge, same-week immutability and save/load continuity. Revenue is not profit: operating and separate maintenance outflows still reduce treasury. Existing maintenance ledger movements are retained.

## Catalog changes after launch

All 118 custom checks passed again, including seven forecast variants and six controlled scenarios over eight weekly turns each. These **48 component-level weekly turns** are separate from the complete `processGameWeek` launch checks.

| Scenario | End of week 8 paid accounts | Week 8 subscription billing |
| --- | ---: | ---: |
| Keep broad catalog | 1,227,903 | $2,153,250.20 |
| Remove playable catalog | 40,559 | $70,549.85 |
| Raise every tier to $79 | 123,867 | $2,145,227.51 |
| Keep one playable title | 90,335 | $158,413.75 |
| Add 35 playable titles in week 4 | 994,035 | $1,743,139.78 |
| Restore catalog in week 4 | 983,099 | $1,723,963.47 |

Removal causes cancellations and zero title viewing; additions/restoration bring joins and viewing back. Existing members churn over time, so catalog removal does not instantly erase every paid account. Wrong-country, expired and future-start titles do not improve current US paid demand. Monthly/annual and per-plan totals reconcile.

See [custom check outputs](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/custom-results.json).

## Final validation and reproduction

- **38/38 named suites pass**, covering pricing P1–P6, world pricing, build/pricing interactions, draft continuity, new opening and premiere regressions, catalog/rights/packages/anchors, forecasts/network coverage, release runs, opening programme/UI, launch/aftermath, commercial C1–C6, billing cohorts, world streaming WE4–WE7, weekly processing, Finance Room and save integrity/migration.
- **118/118 additional checks pass.**
- `npm run lint` passes (repository TypeScript check).
- `npm run build` passes. Vite still reports the existing large bundle/chunk warning; this functional fix does not certify load-time performance.
- `git diff --check` passes. A read-only review found no remaining material blockers in the changes.

The final named results and exit codes are [audit-results.json](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-fix-verification/audit-results.json). Individual suite logs, failing pre-fix regressions, screenshots, DOM evidence and final build/typecheck logs are stored beside it. Only this final results file is the aggregate for this verification.

Run the two permanent targeted regression gates from the repository:

```sh
npm run audit:streaming-launch-audience-connection
npm run audit:streaming-premiere-committed-result
```

The saved `run-audits.py` in the evidence directory reruns all 38 named suites from this repository and writes fresh logs under `/tmp/actor-streaming-recheck`.

For browser replay, open `http://127.0.0.1:5186/scripts/fixtures/streaming-catalog-pricing-qa.html`. Use `?ready=1&subscription=1` for subscription launch and `?ready=1&mode=ADVERTISING` or `?ready=1&mode=STORE` for the other models. The fixture's **Advance isolated QA week** button invokes the actual game weekly processor. It keeps state in memory and does not write career save slots.

Changes remain local and uncommitted. No deployment was performed. Native device and long-session tests remain outside this functional green light.
