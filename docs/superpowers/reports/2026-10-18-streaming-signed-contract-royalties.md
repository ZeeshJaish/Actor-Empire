# Signed-contract streaming royalties and catalogue cash verification

Status: **green for the tested signed-royalty cash settlement paths**. Exact contract payments, finite budgets and replay controls pass the final-source run. This is not a blanket release approval: five baseline audit failures and the existing long-run amortization display limitation below remain disclosed.

## Scope and accounting

The owned and rival platform expense paths now settle title-attributed subscription and non-store receipts against each canonical signed contract, together with that contract's direct-store receipts. The previous catalogue-wide average-rate/45-percent approximation is removed. This preserves existing signed `ADJUSTED_GROSS_RECEIPTS` terms; it does not replace them with company net profit or silently recoup a non-recouppable guarantee.

The subscription pool is the simulation's actual saved monthly membership billing divided by 4.33. Each active country/plan pool is allocated once across eligible delivered titles, including owned and zero-backend titles. Existing contribution weights are 45% watch hours, 25% viewing accounts, 20% acquisition and 10% retention, normalized when signals are absent. Acquisition/retention are model signals; the weights do not prove what profit would disappear if a film were removed. Finance's title contribution also allocates shared costs and is not measured causal project profit.

Advertising follows delivered free-ad/ad-supported-plan audiences. Consumer extras retain the actual household funding kind and membership plan; store-funded extras use the underlying valid rental/purchase entitlement. These are subdivisions of receipts already paid through finite wallets/ad-market clearing. They are not additional income. Free/store services do not need subscription customer rows to owe their signed royalties. Rival title usage is projected from the existing aggregate delivered audience and content facts; it is not individual household telemetry.

Historic aggregate expenses cannot be reconstructed into exact old contract statements where a save never stored title attribution. Known recorded cumulative payments are preserved; exact settlement applies to newly earned receipt weeks, without fabricating historic per-title payments or retroactive bills.

All receipts for the same contract and earned week are combined before its signed percentage, recoupable advance and payment cap apply. Durable per-contract high-water marks and cumulative counters survive finance/decision/statement history pruning. AI closes its already-earned WE6 week, allowing valid receipts earned strictly before expiry/transfer without restoring playback rights. Owned expenses credit the genuine signed platform seller once. Resellers do not collect backend still owned by an original studio.

Studio collection follows buyer expense proof. It does not debit the buyer again. Current releases, ordinary archives and inherited archives retain the entitlement to earned receipts. Existing investor equity applies to collected title receipts, then existing talent participation applies to the studio's remaining receipts. No signing rate, upfront quote, audience budget or cost tariff was subsidized to make a case profitable.

## Focused payment evidence

The 26 focused checks cover differing rates, owned titles in the pool, zero signals, duplicate projections/receipt IDs, combined revenue modes, recoupable/non-recouppable guarantees, cap carry-forward, old receipts, expiry/transfer timing, serialization/history pruning, true seller credits, canonical buyer identity, country restrictions, no-subscription ad/store sources and ordinary/inherited archived producer receipts.

Literal-money examples:

- $500 subscription + $500 store, 20% backend: $200 accrued. A $100 recoupable advance and $50 payment cap produce exactly $50 cash payable, with the shared cap exhausted once.
- Pure-ad live engine: $65,580 delivered ads; eight signed 20% contracts produce $13,117 total royalties after per-contract rounding. Zero subscription customer rows does not waive this expense.
- Two AI contracts pay the same studio title $1,000 + $2,000. Collected gross is $3,000; 20% investor equity receives $600; two talent points receive $48 from the $2,400 studio remainder; the studio retains $2,352. Replaying after serialization and history pruning does not pay again. Current and inherited archive variants have the same result.

Independent read-only review reproduced stale-week recharging, ancillary mode misattribution, missing owned seller credit, earned-before-transfer loss, inherited archive loss and pure-ad missing-customer underpayment. The corresponding fixes and regressions are present. A final focused reread found no remaining material blocker; this is not a formal proof against every malformed save or future code change.

## Real-world comparison

There is no universal rule that a subscription streamer pays every producer a percentage of profit inferred from views. Netflix's published 2024 accounts describe content licenses with fixed fees and defined availability windows, and viewing-based estimates used in content amortization. Those accounting estimates are different from a producer royalty formula. See [Netflix 2024 Form 10-K, content accounting](https://s22.q4cdn.com/959853165/files/doc_financials/2024/ar/Netflix-10-K-01272025.pdf).

License fees, negotiated producer participation and guild residuals are different obligations. WGA's published guide distinguishes fixed and receipts-based residual structures by reuse market and project category. The game's 45/25/20/10 attribution formula is a disclosed simulation choice, not an industry standard. See [WGA residuals guide](https://www.wga.org/members/finances/residuals/residuals-survival-guide).

## Profit experiment method

The new wide-catalogue cases use 6, 12, 24 and 48 licensed quality-95 low-budget films, distributed across up to 17 valid genres, plus the same common funded Original. Counts denote licensed films, with the common Original series additional. Size comparisons also broaden genres from 6 to 12 to 17, so their full effect cannot be assigned to title count alone. Each runs 104 actual engine weeks in the same domestic market with the actual four-rack-per-city network quote. Controls vary subscription price ($7.99/$14.99/$29.99), quality (20/80/95), licensed-film genre concentration (one versus up to 17; the common Mystery Original remains in both), and advertising/store models. Existing full-company second-window rental and paid replacement tests are rerun too, together with a distinct 212-week case using current V8 founding costs.

The fixture is a funded equity experiment, not proof that all those titles are simultaneously available in normal market supply. A $3B diagnostic cash reserve prevents an early funding stop; the original reserve is excluded from earned profit. The new cases use the current V8 founding cost of $85M consumed and zero automatic opening treasury; the retained V7 comparison uses its original $70M consumed founding cost. Signed rights quotes, founding, the network purchase, funded Original, royalties, recurring costs and periodic maintenance remain real debits. Cash profit deducts acquisition investment once; content amortization is reported separately and is not subtracted a second time from cash. Replacement costs already deducted from treasury are not charged twice in analysis. The saved delegated Rights Desk policy can pay renewal guarantees before a future window starts. Actual treasury changes include these prepayments; the cash table does not assign a residual value to unconsumed future rights. A negative cash balance after investment is not automatically the same as an accounting loss. There is no assumed terminal resale value. The 104-week run includes the signed licence expiry boundary; week-52 and week-103 active-catalogue audiences are reported separately from week-104 ending membership.

An additional existing accounting limitation remains outside signed royalty cash settlement: `contentAmortization` currently repeats retained content guarantees after the initial 104-week period. The 212-week results therefore use reconciled cash profit; cumulative accounting contribution is not presented as accurate asset amortization or used as cash profit. This task does not grant a blanket green light to every Finance accounting display.



## Final frozen-run results

| Check | Result |
|---|---:|
| Actual engine scenarios | 173 |
| Actual engine weeks | 6,964 |
| Parallel simulation jobs | 170/170 pass |
| Weekly cash/budget/turnover identity failures | 0 |
| Directional balance criteria | 18/18 pass |
| Focused signed payment regressions | 26/26 pass |
| Selected regression suites | 64/69 pass; five proven baseline failures |
| TypeScript / production build / diff whitespace | Pass |
| Frozen runtime source files | 425, unchanged across final jobs and suite run |

No browser interaction or native-device performance run was repeated in this turn. Current engine flows, selected UI render audits and the production web build were verified. The attribution memoization microbenchmark preserves complete output equality: four calls took 1,455.6 ms before reuse and 60.3 ms with reuse under the measured local workload. This is not an end-to-end or device speed claim. The 400-year WE6 stress state measures approximately 970.8 KiB, below the unchanged 2,000,000-byte save ceiling.

## Measured wide-catalogue results

All money below is **game dollars**. Counts are licensed movies, plus one common funded Original series. Prices are nominal monthly plan prices; actual customer billing includes the saved annual/intro configuration. These are controlled quote-priced simulations, not the user's current personal save or evidence that all these titles are offered together in the market.

The operating column is the sum of recorded weekly operating contributions after exact royalties and operating charges. The cash column also includes periodic debits, actual Rights Desk commitments/renewals and all initial investments. It assigns no resale/future-use value to remaining assets. It is a cash recovery measure, not an audited accounting net-income figure.

| Licensed films | Film genres | Quality | Monthly price | Paid accounts W52 | 104-week revenue | Signed royalties | Operating contribution | Cash after all paid investment |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 24 | 17 | 20 | $7.99 | 27,155 | $5.07M | $1.41M | $-19.78M | $-321.23M |
| 24 | 17 | 80 | $7.99 | 1,182,050 | $168.06M | $46.76M | $+54.66M | $-408.79M |
| 6 | 6 | 95 | $7.99 | 565,978 | $80.47M | $22.40M | $+14.67M | $-318.19M |
| 12 | 12 | 95 | $7.99 | 1,373,583 | $195.12M | $54.29M | $+67.02M | $-454.73M |
| 24 | 1 | 95 | $7.99 | 1,160,111 | $164.72M | $45.83M | $+53.14M | $-841.72M |
| 24 | 17 | 95 | $7.99 | 1,815,851 | $258.42M | $71.90M | $+95.92M | $-798.73M |
| 24 | 17 | 95 | $14.99 | 786,500 | $211.36M | $58.84M | $+75.18M | $-816.27M |
| 24 | 17 | 95 | $29.99 | 455,328 | $246.25M | $68.57M | $+91.76M | $-801.49M |
| 48 | 17 | 95 | $7.99 | 2,290,727 | $326.70M | $90.90M | $+127.11M | $-961.04M |

These first-window subscription setups generate operating receipts, but do not recover all invested/committed cash inside 104 weeks. Some cash outflow buys future renewal windows before the horizon ends; it is not correctly described as a current operating loss. Higher quality and wider fit can grow audiences while expensive rights and renewal commitments still delay cash recovery. A higher title count or quality score does not guarantee faster payback.

| Other 24-film quality-95 setup | 104-week revenue | Signed royalties | Operating contribution | Cash after all paid investment |
|---|---:|---:|---:|---:|
| Ads, 4 minutes/hour | $42.24M | $11.83M | $-7.74M | $-513.19M |
| Rental, $2.99; finite rental grant | $514.29M | $144.00M | $+198.09M | $-307.37M |

## Current-cost viable licensed rental case

This is a different, longer experiment: six quality-95 low-budget second-window films per paid batch, replacement with six distinct paid films in week 105, $2.99 rent, three racks per city across three cities, and one common funded Original. It runs 212 weeks with current V8 founding costs.

- Founding: $85,000,000.
- First rights batch: $66,000,000; replacement batch: $66,000,000.
- Network: $33,750,000; funded Original: $5,000,000.
- Total committed initial/replacement investment: $255,750,000.
- Delivered revenue: $801,178,764; signed royalties: $224,330,074.
- **Net cash after all paid investment: +$11,440,129. First investment recovery: week 191.**

The retained legacy-V7 comparison separately yields +$26,414,430, recovery week 177, with $70M consumed founding costs. Use the current V8 case for a newly founded platform. Independent runs can differ slightly in the surrounding world path; the actual emitted receipts and paid contract arithmetic are reconciled in each run.

The 104-week first-window cases and 212-week second-window/replacement case have different content prices and horizons. They do not establish a universal ranking between subscription, advertising and rental.

## Standing qualifications

The five failed selected suites are unchanged baseline failures: awards scheduling, a raw contract-foundation fixture missing AI capabilities, two stale UI/source-string assertions (Talent Stability and Lead Investor), and a stale migration-version assertion. Dynamic baseline overlays reproduce the first two; the other assertion targets are byte-identical to committed HEAD. No assertion was suppressed to produce a green result. See the baseline evidence linked below.

Long-run `contentAmortization` still repeats retained guarantees beyond the initial 104-week period. Accordingly, **cash settlement is verified; the complete long-run Finance accounting-profit display is not certified green**. Historic aggregate payments also cannot be retroactively made exact where no per-title receipt evidence was saved. Known counters are retained and future earned weeks settle exactly.

No CSS redesign, design suppression, unrelated dirty-file restoration, commit, push or deployment was performed.

## Evidence and reproduction

Permanent evidence: [README](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-contract-royalties-20261018/README.md), [reconciled metrics](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-contract-royalties-20261018/final-analysis.json), [all scenario summaries](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-contract-royalties-20261018/all-scenarios.csv), [baseline failure proof](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-contract-royalties-20261018/baseline-checks/summary.json).
