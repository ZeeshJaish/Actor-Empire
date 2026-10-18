# Streaming content accounting and Finance verification

Status: **green for finite content-cost recognition and the tested Finance operating-profit paths**. The final source passed all 170 simulation jobs, 26 focused accounting cases, 26 signed-payment cases, typecheck, build and the three-width interactive Finance fixture. Five independently proven baseline audit failures remain; this is not a blanket release/native-device certification. Legacy accounting estimates remain explicitly unavailable as verified historical profit.

## What changed

The old weekly loop charged every retained minimum guarantee and funded Original divided by 104, forever. The replacement keeps a persisted, finite cost book for each acquired license and funded Original. Recognition is non-cash and cannot exceed the asset's basis. Integer cumulative recognition closes exactly to the final dollar. Source projections, statement history and weekly checkpoints cannot restart a paid asset.

- A licensed title starts when the platform can use its paid rights. A temporary license uses its remaining signed availability; expiry is exclusive. Permanent purchases use a finite 104-week game accounting life.
- An Original's actually applied production funding starts at its platform premiere, rather than its greenlight or unspent production-budget reservation. Its default accounting life is 104 weeks. A pending paid asset survives commission compaction and can start from its delivered license.
- A renewal is a separately paid asset. Prepaid future renewals do not immediately expense their entire cost or restart the prior asset.
- Secondary buyers use the actual settled transaction price and acquisition date, preserving the original contract's guarantee and backend terms for royalty settlement.
- Paid upfront production funding is included; unexercised or unpaid future commitments are excluded. The same funding recorded in an Original commission and its delivered canonical license is capitalized once.
- Early disposals and explicit production cancellations write off remaining cost once. A first upgrade on a cancellation week can recover funded basis from the paid commitment and canonical production. Merely compacting a projection is not a cancellation.
- Zero treasury no longer hides incurred operating expense in accounting contribution. Existing cash-floor behavior is kept separate from incurred-cost reporting.

Periodic infrastructure maintenance is a real operating expense paid outside the core weekly transfer. Its exact additional expense is persisted with the week's operations and deducted once in Finance and analytics. Manual payments before or after processing and automatic maintenance use the same adjustment. Ledger pruning cannot erase the expense, and physical maintenance dates plus transaction keys prevent a same-week replay debit. The cash ledger retains its original cash entries; amortization and the Finance bridge never debit treasury again. Quarter reviews run after maintenance has settled and include that adjustment.

## Reading the numbers

Finance operating profit = recorded operating receipts − incurred core operating costs − finite content expense − paid periodic maintenance.

Operating cash excludes the non-cash content expense. Cash after investment also includes the actual founding, content, network, replacement and renewal payments. These are different measures of the same business; adding amortization to cash payments would charge the content twice in a cash-profit calculation.

The live Finance adapter now separates these measures, includes content expense in title contribution, retains a consolidated remainder for omitted title rows/shared operations, and calls the bounded history “Recorded.” The save retains 104 weekly snapshots and a bounded title breakdown; the screen does not claim that this is complete lifetime history. Title contributions still allocate subscription receipts/shared costs and are not measured causal profit from a film.

The reported operating-profit measure does not claim a complete real-world audited net income, tax model or network-depreciation system. Capital raised is excluded from operating receipts. Founding/network investment recovery is shown separately in cash after investment.

## Old saves

There was no per-asset cost book in older saves. Opening recognition is inferred using elapsed legacy `/104` recognition from the known paid/signed/greenlit date, clamped to actual basis. Previously estimated accounting snapshots remain labeled legacy and do not become verified profit. No cash refund or retrospective invoice is fabricated. Missing transfer-price evidence makes the affected accounting result unavailable rather than using the old holder's guarantee. Missing historic attribution/rounding cannot be reconstructed into a perfectly exact historical statement.

## Payment and accounting checks

The content-accounting audit includes literal-money tests for 104-week completion and rounding, 52/156-week terms, permanent rights, future availability, Originals, renewals, non-cash behavior, source/checkpoint compaction, JSON reload, upfront funding, secondary transfers, legacy opening basis, cancelled productions, no-view company costs, cash starvation, maintenance timing, same-week replay and retained maintenance expense. The actual auction-funded production lifecycle also verifies delivered-funding deduplication and cancellation recovery with and without a pre-existing asset book.

Independent read-only review reproduced and resolved secondary-transfer basis, omitted production funding, duplicate funding representation, cancellation migration, pruned-pending Original activation, expiry-boundary and maintenance-persistence issues. No signed royalty rate, guarantee, cap, audience budget or cost tariff was lowered to improve profitability.

The reporting UI has a literal $1,000 receipt / $200 operating cost / $100 content-expense fixture: operating cash $800, accounting profit $700. It is a controlled UI check, not an economic forecast. Browser checks cover 320, 390 and 768 px, the title sheet, legacy unavailability, page overflow and console errors.

## Backend in real streaming deals

There is no single industry rule that a producer receives a percentage of a streaming platform's company profit inferred from views. Netflix's 2025 accounts describe fixed-fee content licenses with specific availability windows. Their viewing-based amortization estimates are accounting estimates, separate from a producer's contractual payment formula. [Netflix 2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1065280/000106528026000034/nflx-20251231.htm).

Usage-based payments also exist: Prime Video Direct's agreement distinguishes purchase/rental license fees, SVOD viewing-hours rates and ad-supported hours/receipts arrangements. That is an example of an agreement-specific model, not a universal rate for every streaming deal. [Prime Video Direct license agreement, sections 8.1–8.3](https://videodirect.amazon.com/home/agreement).

Producer licensing/backend, project-investor participation and talent residuals are separate obligations. WGA explains fixed and receipts-based residual systems; SAG-AFTRA also publishes streaming-success bonus rules. A guild residual is not automatically a producer's share of corporate net profit. [WGA residuals guide](https://www.wga.org/members/finances/residuals/residuals-survival-guide), [SAG-AFTRA success-bonus FAQs](https://www.sagaftra.org/sites/default/files/2026-01/Success%20Bonus%20FAQs.pdf).

Recommended future game design, not implemented by this accounting fix: offer clearly named fixed-license, qualified-usage/receipts-share and negotiated success-bonus terms. A net-profit deal would need its own explicit deductible-cost and recoupment waterfall; it cannot silently replace signed receipts-based deals. For subscription acquisitions, a fixed window fee with an optional capped success bonus is a readable default; usage-share deals can remain a negotiated alternative. Rentals/ads can retain explicitly negotiated receipt shares. Any bonus or backend is a funded platform expense with a matching producer receipt, never additional money created by a view. Existing signed terms remain unchanged.

The current game allocates the actual subscription-receipt pool across titles using normalized signals: 45% viewing hours, 25% viewing accounts, 20% acquisition and 10% retention. Missing signals are renormalized; integer allocation preserves the total receipt pool. These are game-design weights, not a real-world contractual standard or proof of incremental causal profit. Ad/rental receipts are title-specific. The signed contract then determines the receipt share, recoupable guarantee and remaining backend cap. The same contract's subscription and store modes share cumulative counters; replay/reload cannot pay the same earned week again. Upstream customer budgets still bound consumer receipts.

For example, $1,000 of defined receipts at a signed 20% share accrues $200. With a previously paid $100 recoupable advance, the additional cash royalty is $100: the producer has received $200 in total. A non-recoupable $100 fee does not waive the $200 royalty, so total compensation is $300. Any backend cap applies according to the signed term rather than resetting per billing mode. Accounting amortization allocates the already-paid content basis over availability; it is not another producer payment.





## Final frozen-run results

| Check | Result |
|---|---:|
| Engine scenarios | 173 |
| Engine weeks | 6,964 |
| Simulation jobs | 170/170 pass |
| Recorded weekly budget/cash/accounting identity failures | 0 |
| Directional balance gates | 18/18 pass |
| Focused finite-accounting checks | 26/26 pass |
| Focused signed-royalty checks | 26/26 pass |
| Selected regression suites | 67/72 pass; five proven baseline failures |
| TypeScript / production build | Pass |
| Browser Finance fixture widths | 320 / 390 / 768 px, pass |
| Frozen runtime/fixture source fingerprints | 489, unchanged across final jobs |

The CSV covers 171 standard scenario rows; the two funded-refresh scenarios are preserved separately in `matrix/refresh.json`. Together these are the 173 counted scenarios.

An existing launch-to-Finance test had expected only the core weekly transfer as outflow. Its exact assertion now also includes actual deduplicated same-week paid maintenance and verifies the persisted adjustment. The original failed log/test, narrow diff and before/after hashes are retained. The other 534 frozen audit/config fingerprints were unchanged. No assertions or failures were suppressed. The final runtime source remained unchanged through this test-only correction and its successful rerun.

## Wide-catalogue measurements

All money is **game dollars**. Each controlled 104-week setup has the stated count of licensed low-budget first-window movies plus one common funded Original. Quality is 95 unless stated. Prices are nominal monthly plan prices; actual billing retains configured annual/intro terms. Rights quotes, tariffs, maintenance, contractual royalties and Rights Desk renewals are paid at their modeled amounts. The diagnostic $3B financing reserve keeps loss cases funded and is excluded from every revenue/profit/cash-recovery figure. These fixtures do not prove that all titles are simultaneously available in a normal save.

| Licensed films | Film genres | Quality | Plan price | Paid accounts W52 | 104-week receipts | Finance operating profit | Cash after paid investment |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 6 | 6 | 95 | $7.99 | 565,978 | $80.46M | $-90.79M | $-318.19M |
| 12 | 12 | 95 | $7.99 | 1,373,583 | $195.12M | $-128.43M | $-454.73M |
| 24 | 1 | 95 | $7.99 | 1,160,111 | $164.71M | $-322.32M | $-841.72M |
| 24 | 17 | 95 | $7.99 | 1,815,851 | $258.43M | $-279.52M | $-798.72M |
| 24 | 17 | 95 | $14.99 | 786,500 | $211.36M | $-300.27M | $-816.27M |
| 24 | 17 | 95 | $29.99 | 455,328 | $246.23M | $-283.70M | $-801.50M |
| 48 | 17 | 95 | $7.99 | 2,290,727 | $326.70M | $-608.34M | $-961.04M |
| 24 | 17 | 80 | $7.99 | 1,182,050 | $168.06M | $-278.79M | $-408.79M |
| 24 | 17 | 20 | $7.99 | 27,155 | $5.07M | $-191.23M | $-321.23M |

| Other 24-film / quality-95 setup | Receipts | Finance operating profit | Cash after paid investment |
|---|---:|---:|---:|
| Ads, 4 minutes/hour | $42.23M | $-383.19M | $-513.19M |
| Rental, $2.99; finite rental access | $514.29M | $-177.37M | $-307.37M |

These expensive first-window setups can grow audiences while losing money after content expense. A larger catalogue is not an infinite-profit mechanism. Future renewal prepayments consume cash before their availability and remain content assets until recognized, so cash recovery and current operating profit differ. No lower cost or invented terminal resale value is used to improve the result.

## Current-cost licensed rental over two paid cycles

Six quality-95 low-budget second-window films per batch; six distinct paid replacement films enter in week 105. $2.99 rent, three racks per city across three cities, one common funded Original; 212 weeks. This is a different rights window and horizon from the wide first-window cases, so it cannot establish a universal model ranking.

- Receipts: $801,099,084.
- Signed royalties already included in operating costs: $224,307,759.
- Finite content expense: $137,000,000.
- Paid periodic maintenance: $19,926,000.
- Finance operating profit: $130,161,048.
- Operating cash before content investment payments: $267,161,048.
- Founding investment: $85,000,000.
- Network investment: $33,750,000.
- Initial rights: $66,000,000.
- Replacement rights: $66,000,000.
- Funded Original: $5,000,000.
- Cash after all paid investment: $11,411,048.
- First cash recovery: week 191.
- Closing retained Finance window: 104 weeks, operating profit $69,081,796; operating cash $132,543,340. These sums are derived from individually reconciled weekly Finance points; the full 212-week total is the external audit history, not the bounded on-screen record.
- End unamortized content: $0; cash/profit bridge difference: $0.

The last positive receipts in this run are week 203; weeks 204–212 have zero receipts. The last eight weeks average $-281,127 of actual cash movement per week, with costs continuing. This is a cumulative positive result over two paid batches, **not a proof of indefinitely sustainable rental profit**. No third paid batch is tested. Static source evidence explains the cutoff consistently: the saved fixture uses a six-week rental access window, and `services/streamingTitleAccess.ts:123–125` rejects new rentals when their access would exceed the license expiry. The second batch expires in scenario week 209: W203 + 6 = 209 is allowed, W204 + 6 = 210 is denied. These finite grants also cannot fulfill perpetual purchases. This matches the observed boundary; it is not a separately captured end-state runtime denial trace. A continuing plan must fund eligible replacement/renewed rights before the last sellable week, rather than assume a free third batch.

The legacy V7 founding-cost comparison separately returns $26,411,048 cash, recovery week 177. The old 177-week result used $70M consumed founding costs; newly founded V8 platforms use $85,000,000. Use the current-cost case for a new platform. Exact receipts can vary slightly with surrounding world evolution; every emitted cash and contract identity is checked.

## Qualifications and baseline failures

The five remaining failed suites are awards scheduling across a year boundary, the raw contract-foundation fixture without AI capabilities, stale `Talent Stability` and `Lead Investor` source-string assertions, and a stale migration-version-19 assertion. The first two reproduce against the 488-file task-start overlay; the three static targets are byte-identical to committed HEAD. These are disclosed failures, not a fully green repository.

All 13 new wide/foundation cases reconcile operating profit to cash with **zero-dollar residual** after founding/network investment and unamortized content. Older comparison harnesses do not all record full founding costs or a separate royalty breakout; `investmentCoverage` and null values disclose that limitation in the CSV. Do not interpret those rows as fully costed company profit.

The 104-week saved Finance view is a bounded record. The external harness records all 212 weeks for the full-run measurements above. Tax, depreciation of network equipment, and a complete audited financial-statement model are outside this change. Old missing per-title payment history cannot be reconstructed exactly; no retroactive refund or invented old profit is claimed. Current and future signed payments retain their contractual terms.

No CSS/font redesign, design suppression, unrelated rollback, commit, push or deployment was performed. Interactive browser verification used an isolated actual-component fixture; the user's save and native-device gameplay were not modified or certified.

## Evidence and reproduction

- [Evidence README](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-content-accounting-20261018/README.md)
- [Exact reconciled metrics](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-content-accounting-20261018/final-analysis.json)
- [Detailed scenario summaries; refresh records are in matrix/refresh.json](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-content-accounting-20261018/all-scenarios.csv)
- [Baseline failure proof](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-content-accounting-20261018/baseline-checks/baseline-results.json)
- [Interactive browser checks](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-content-accounting-20261018/ui/browser-results.json)
- [Intentional test assertion update](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-content-accounting-20261018/intentional-test-update.json)
