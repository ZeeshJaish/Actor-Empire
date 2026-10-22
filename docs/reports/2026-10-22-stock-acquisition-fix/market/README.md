# Market and appraisal verification

The stock-market audit passes 21 targeted checks and 16 deterministic long scenarios. Each scenario updates all 16 stocks for 50 or 100 years using bullish, bearish, seeded, or stale-hit inputs with seeds 17 and 491. This covers 256 security careers and 998,400 stock updates. All quotes remain finite and inside the existing company/sector limits. Quarterly payouts occur 216 times over 50 years and 433 over 100 years; repeated processing and settled reloads cannot pay again.

`stock-market-long.log` is the complete fresh run; `long-run-results.json` contains its scenario output. These are service-level stress checks, separate from the root end-to-end gameplay/save harness.

`listed-world-green.log` covers six appraisal cases: original oversized value retained in per-studio provenance, actual finance settlement unchanged, normal below-cap growth, release growth bounded, owned studios exempt, and first provenance preserved. `corporate-stock-cash.log` covers eight ownership/cash regressions.

The red logs capture observed failures before each repair, including SX precision loss, stale clocks, malformed funding, exact large mixed receipts, valid zero-cost holdings, and integer-valued mixed cash receipts. Every mixed cash receipt distributes exact cents to its owners, including personal dividend fractions. Zero historical basis now remains zero both during partial disposal and when a legacy zero-cost holding buys more shares.

Only future unowned listed appraisal fields and derived market quotes are bounded. Actual cash reserves, debt principal, owned studio achievements, valid share counts, and historical costs are preserved. An unrepresentable stock settlement fails without consuming cash or shares; this does not introduce arbitrary precision for unrelated game currency.

Unknown-cost legacy positive holdings now retain undefined basis on purchases and partial sales. New positions retain actual known purchase cost. `market-unknown-basis-red.log` captures the two original invented-history failures; the complete fresh green run has 21 targeted checks.
