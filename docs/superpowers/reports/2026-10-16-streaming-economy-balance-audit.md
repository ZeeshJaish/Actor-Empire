# Streaming economy balance audit
Follow-up: [fixes and fresh verification](/Users/zeesh/Vibe code/Actor empire/docs/superpowers/reports/2026-10-16-streaming-economy-balance-fix-verification.md) supersede this baseline verdict; the original measurements below remain pre-fix evidence.

16 October 2026 · Current local working tree, including the earlier launch/pricing fixes.

**Verdict: economic balance needs work; full balance green light withheld.** Subscription has a disproportionate advantage in the tested market, particularly because paid demand and retention barely respond to absolute title quality, content staleness or delivered service quality. Rental/store is weak as a standalone model in these scenarios. Ads show meaningful reach/load/earning tradeoffs and finite demand limits.

This is a read-only gameplay/economy audit. No production coefficients, prices, costs, saves or gameplay behavior were changed. Passing accounting checks do not override the failing product balance gates below.

## Test coverage and assumptions

**126 setups; 3,926 complete `processGameWeek` turns. All 3,926 per-week accounting/state checks passed.** Most setups ran 26 weeks, crossing launch-discount expiry; selected static libraries ran 104 weeks, and shock scenarios ran 52 weeks.

| Group | Setups | Complete game weeks |
| --- | ---: | ---: |
| Price/ad-load × catalog grid | 60 | 1,560 |
| Absolute quality, catalog saturation, operating seeds and discounts | 21 | 546 |
| Long-run libraries and adverse/refresh scenarios | 13 | 988 |
| Actual quoted networks and remaining ad UI presets | 20 | 520 |
| Quoted networks at the strongest observed grid prices | 12 | 312 |
| **Total** | **126** | **3,926** |

- Controlled US market, same world timeline, title genre mix, plan features and opening Original. Licensed catalog sizes: 2, 8, 32, with an additional 80-title saturation probe. Absolute library quality: 20, 80 and 95. Operating RNG seed variants do not constitute independent market/population samples.
- Subscription list prices: $0.99, $3.99, $7.99, $14.99, $29.99, $79 and $100. The curve has population/cohort thresholds; revenue need not decrease monotonically as price rises.
- Ads: all current UI cadence values 0, 1, 1.5, 2, 3 and 6 minutes/hour, plus saved/custom 4 and legacy/stress 12 and 30. Heavy legacy loads are not new recommendations for the current UI.
- Rental/purchase pairs: $0.99/$3.99, $2.99/$9.99, $5.99/$19.99, $12/$30, $25/$60 and $50/$100.
- Extra scenarios: introductory discount 0/90%, annual discount 50%, catalog removal, a price jump, periodic refreshed releases, quality upgrades at fixed title count, a delivery-capacity shock and a suspended opening-market saved state.
- **Explicit cost assumption:** $1M per licensed title, paid once before launch, with the same access grants across models. This is a controlled rights-cost sensitivity, not a measured marketplace quote. The common fixture also carries $20M of funded Original investment.
- The 60-case grid uses the QA fixture's controlled $100K weekly infrastructure line. Its absolute margins are not treated as normal Build economics. Follow-up comparisons use actual `quoteStreamingNetworkPlan` costs, corresponding capacity, and a separate one-time debit for that network.
- Quoted networks: three US facilities with either 1 rack each ($11.25M upfront, $60,001 quoted weekly cost) or 40 racks each ($450M upfront, $996,029/week). Automatic maintenance and other actual treasury movements are also measured. Quoted cases receive the same $1B starting capital to keep both sizes funded; capital injection is not counted as income.

These results do not certify every country, every possible commercial hybrid, or a real player's future profit. No target profit margin or payback period was supplied, so the audit uses observed tradeoffs and explicit product criteria rather than inventing an approved ROI threshold.

## Measured financial comparison

The table uses the smaller **actual quoted three-rack network**. Values are **average weekly treasury movement over weeks 19–26**, covering a complete eight-week maintenance cycle. They include operating outflows and automatic maintenance; they are not gross revenue.

Each model uses the strongest price/load observed in the main grid: subscription $29.99 per tier; ads 6 minutes/hour; rental/purchase $2.99/$9.99. These are sampled optima in this fixture, not universal recommended prices.

| Licensed titles | Subscription cash/week | Ads cash/week | Rental/store cash/week |
| ---: | ---: | ---: | ---: |
| 2 | +$227,787 | −$33,446 | −$178,368 |
| 8 | +$1,557,285 | +$27,949 | −$172,760 |
| 32 | +$6,436,321 | +$90,184 | −$161,954 |

For the 32-title case, average weekly gross is $8,900,803 subscription, $478,272 ads and $68,771 store. Thus the advantage survives using real Build quotes and giving the transactional service a much smaller network than the old QA fixture.

Weekly positive cash is not investment recovery. Across all 26 weeks, after subtracting the modeled rights purchases and the $11.25M network purchase, the 32-title result is **+$53,534,461 subscription, −$44,093,720 ads, −$48,382,282 store**. These investment figures exclude common formation spending and the already-funded $20M Original; accounting contribution separately includes content amortization. They are not total founder-lifetime profit.

Oversizing hurts every model. The 32-title quoted 120-rack network costs $450M upfront; even the profitable subscription operation does not recover that purchase within this 26-week test. Model choice does not remove the need to size infrastructure appropriately.

## Findings

### P1 — Absolute quality barely affects subscription acquisition or retention

With eight titles, the same genres/prices/coverage and quality changed from 20 to 80 to 95, **all three subscription runs end week 26 with exactly 1,558,435 paid accounts and $2,731,988 weekly subscription revenue**. Viewing hours change from 1,771,620 at quality 20 to 2,661,478 at quality 95, yet all three record **zero cancellations over the 26 weeks**.

The paid catalog-strength formula measures playable title count and genre diversity, not absolute title quality: [worldStreamingOffers.ts](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingOffers.ts:134>). Viewing consumes quality, but that signal is not fed back into the canonical paid choice/retention calculation. This rewards accumulating eligible titles rather than investing proportionately in better content.

**Direction:** make prior delivered quality, completion/satisfaction and freshness influence the shared paid-offer/retention inputs. Keep preview, launch and canonical weekly customer choice aligned; do not add a separate subscriber multiplier in HQ.

### P1 — Gross churn is understated during growth; stale libraries keep growing

A fixed eight-title $7.99 setup grows from **88,106 opening paid accounts to 2,701,210 after 52 weeks, with zero cancellations**. The 104-week static 32-title setup ends at 8,033,591 paid accounts and generates $903.9M cumulative treasury gain before the modeled rights debit, despite receiving no new catalog releases during the run.

The underlying transition converges a cohort toward a desired subscriber stock; losses are recorded when a cohort's stock falls, instead of modeling a base cancellation flow and new acquisition independently. See [worldStreamingCustomers.ts](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingCustomers.ts:460>). The legacy weekly loop computes content-gap/churn effects, but canonical customer outcomes overwrite those cancellation counts: [streamingWeeklyLoop.ts](</Users/zeesh/Vibe code/Actor empire/services/streamingWeeklyLoop.ts:708>).

The 104-week subscription runs do eventually show cancellations in some weeks as cohorts change; the problem is not a universal absence of cancellation code. It is the lack of baseline gross churn and weak content/service feedback while target stocks rise.

**Direction:** calculate gross cancellations from the current paid population even during positive growth, apply content and service retention effects there, then reconcile joins/reactivations and the next stock. Preserve affordability, paid count conservation and immutable settlement.

### P1 — Delivery pressure does not generate a commensurate retention response

The 32-title $7.99 setup on the small quoted network reaches **4,007,794 paid accounts**, while mean playback over the final eight weeks is only **87.69%**, versus its configured reliability target near 99.7%. It still records **zero cancellations across the 26 weeks**.

The larger quoted network delivers roughly 99.97% and has more reach, so capacity and coverage are not absent from the model. However, users already in the paid population do not receive the expected cancellation pressure from sustained poor delivered performance. The offer uses configured reliability rather than a robust feedback signal from actual prior delivery.

**Direction:** feed prior realized delivery/outage experience into paid retention without changing already-settled weeks. Infrastructure undersizing should trade lower costs against measurable retention damage, not only missed viewing.

### P2 — Store sales do not value a uniformly better library

The eight-title store runs at quality **20, 80 and 95 have identical rental counts, purchase counts and revenue across the full 26-week comparison**. In week 26 each earns **$66,720** from **6,770 rentals and 1,309 purchases** at the default $5.99/$19.99 prices.

The total buyer pool converts using price and eligibility before quality is applied. Quality then distributes those buyers across titles: [worldStreamingViewing.ts](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingViewing.ts:1005>). Raising every title's quality scales allocation weights without increasing aggregate purchase intent. This is why adding a title can help through catalog breadth, yet replacing a mediocre library with hits fails to improve total sales.

Store remains loss-making in the tested standalone cases, including the smaller actual quoted network and sampled favorable prices. This supports an **underpowered standalone-store finding within this benchmark**, not a claim that no possible store/hybrid can ever work.

**Direction:** let title appeal, event/freshness value and expected viewing value influence purchase intent, while retaining household budgets, rights, existing ownership and bounded conversions. Recalibrate fixed costs only after that response is correct.

### P2 — Catalog strength saturates at a small library size

The count/genre strength input reaches its 100 cap around **26 playable titles with six represented genres**. The 32- and 80-title subscription cases therefore end week 26 with the same **5,701,526 paid accounts and $9,994,824 weekly revenue** at default pricing, while the 80-title case pays $48M more modeled rights cost.

Diminishing returns are sensible; the product concern is how quickly a small permanent library becomes equivalent to the maximum catalog-strength input and can then grow with limited freshness pressure. Quality/retention feedback should be repaired before changing this cap in isolation.

### P1 functional boundary — Suspended opening market retains revenue while losing market costs

A **direct saved-state fault injection**, suspending the opening US market in week 14, still ends week 52 at **2,701,210 subscribers**, **2,177,473 current title viewing accounts**, and **$4,735,757 weekly revenue**. It produces **$31,823,758 more cumulative treasury cash** than the unchanged control because active-market taxes/operating charges disappear while audience and viewing remain.

This is a reproduced state-boundary defect, **not a demonstrated normal UI exploit**. The public clearance system can represent a `SUSPENDED` operation, but this test injects that state into an already-live company; it does not prove a player can perform this transition after launch through ordinary controls.

The package-country helper allows every non-exited opening operation regardless of active status: [streamingContentAvailability.ts](</Users/zeesh/Vibe code/Actor empire/services/streamingContentAvailability.ts:12>). Offer construction also retains identity opening countries, while [market cost settlement](</Users/zeesh/Vibe code/Actor empire/services/streamingMarkets.ts:322>) requires `ACTIVE` operations. Those gates disagree.

**Direction:** separate prelaunch planned footprint from live market entitlement. Legacy fallback should apply when authoritative market records are absent, not when a known market is suspended. Add a saved-state regression before changing that boundary.

## Behaviors that are sensible in these runs

- **Price extremes reduce demand.** With eight titles, $0.99 ends at 5,311,404 accounts versus 149,475 at $100. Revenue has peaks and cohort thresholds rather than a rule that a higher price always wins or always loses.
- **Ads have real tradeoffs.** With eight titles, 6 minutes/hour ends with 1,394,935 viewing accounts and a final-four-week mean gross of $586,640. A legacy 30-minute stress load reduces viewing to 583,029 and mean gross to $306,882. Zero ad load produces zero ad income. The current UI offers at most 6 minutes/hour; the 12-minute stress point should not be presented as a player-facing optimum.
- **Rental price extremes lose transactions.** In the eight-title grid, the $50/$100 case ends with 14 rentals and 7 purchases, far below the cheaper price points. Rights and durable ownership still constrain sales.
- **Removal does cause cancellations.** Removing the eight-title catalog in week 14 reduces paid accounts from 735,261 before removal to 831 by week 52, with 734,430 accumulated cancellations. Current title viewing is zero. This does not repair the missing churn response to stale/low-quality but still-available content.
- **Introductory discounts have consequences.** With $29.99 list pricing and a 90% intro offer, week 13 cancellation is 1,049,821 accounts, a 75.31% cancellation rate from the prior stock, when the offer expires. The engine does not preserve the entire cheap-price audience at the full price.
- **Large network purchases hurt payback.** The actual Build quote and the additional maintenance cash are included in sizing comparisons. Positive weekly operations are not represented as recovered startup investment.

## Validation status

The separate product-balance checklist has **6 passing and 5 failing gates**: quality-responsive subscription demand, quality-responsive store totals, gross churn during growth, service-failure retention response, and suspended-market delivery gating fail the stated audit criteria. Some are design criteria rather than previously specified numeric game targets. The raw passing weekly accounting checks do not make those gates pass.

Fresh `audit:streaming-commercial-c4` passes, including finite shared ad budgets, view-before-ad receipts, excessive-load reach penalties, affordability, rights, ownership, repeated settlement and real game-week commercial paths.

The additional existing `audit:streaming-commercial-economy` **fails** at its first assertion, expecting positive ads from a fixed-input call without `adMarket`. The current untouched calculator requires explicit ad-market context for that kernel; live viewing supplies market clearing separately. Both this test and the relevant calculator are unchanged from HEAD, so the reproduced first failure is an existing fixture/API mismatch, not evidence that live ad revenue is zero. It is not counted as a pass and should be updated separately. Earlier build/typecheck and 38-suite results are historical baseline evidence, not newly rerun claims for this audit.

## Recommended order

1. Repair live suspended-market entitlement/cost agreement with a regression gate; verify the normal clearance/recovery path and legacy saves.
2. Connect actual title quality, freshness and realized delivery to the canonical acquisition/retention model; calculate gross churn independently of net growth.
3. Make store purchase intent respond to content value while retaining price/budget/ownership limits.
4. Re-run this matrix, then tune catalog-strength saturation, transaction rates and fixed operating costs against explicit desired margins/payback ranges. Avoid a blanket subscription nerf or ad-income boost before the missing responses are repaired.

The current connection fixes remain useful, but **balanced-growth/churn/profit certification is withheld**. No economic coefficients were changed merely to make the comparisons pass.

## Evidence and reproduction

All data and scripts are in [the balance evidence directory](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-economy-balance/analysis.json). Start with [scenario-summary.csv](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-economy-balance/scenario-summary.csv) and [analysis.json](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-economy-balance/analysis.json); full weekly records are in `matrix.json`, `sensitivity.json`, `longrun.json`, `extra.json` and `quotedopt.json` beside them. The scripts, original failing audit log, passing C4 log, criteria and source SHA-256 hashes are saved alongside the data.

From this repository, bundle the saved `audit.ts` using esbuild (`--bundle --platform=node --format=esm --loader:.csv=text`), then run its bundle with `matrix`, `sensitivity`, or `longrun`. Bundle `extra.ts` and run with `extra`; bundle `quotedopt.ts` and run with `quotedopt`. Their output directory is `/tmp/streaming-economy-balance`. `analyze.py` combines all five result sets and evaluates the separate balance gates.
