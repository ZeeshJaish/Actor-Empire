# Three-model post-launch catalog and revenue confirmation

16 October 2026 · Follow-up to the catalog/pricing fixes.

**PASS: 132/132 additional checks over 120 complete game weeks.** The earlier 8-week catalog-change comparison covered subscriptions; ads/store commercial routes had separate passing suites. This follow-up explicitly runs the same post-launch catalog scenarios in subscription, advertising and store models. No production behavior was changed for this follow-up.

## Setup and coverage

Each run creates the same launch-ready US career with two licensed films, the same opening Original, the same delivery network and the same world seed. It selects one core model and actually commits launch. Paid tier list prices are $7.99; store prices are $5.99 rental and $19.99 purchase. The title grants allow the relevant access routes.

There are 15 scenarios: three models × five changes. Each advances eight times through the complete `processGameWeek`, for 120 actual game-week simulations. These are controlled fixture results, not predictions for the user's current career.

The changes are: keep the initial catalog; add one hit in week 4; add that hit in week 4 and remove it in week 6; remove all playable catalog in week 4; and apply a price/ad-inventory shock in week 4. The added film has quality 95, rating 9.2, box office $300M, thriller genre and valid rights.

## End of week 8 results

Amounts below are **that week's gross revenue**, not cumulative revenue or profit. Subscription paid accounts and subscription revenue are shown separately. Ads/store services have zero paid subscription accounts and zero recurring subscription receipts throughout.

| Scenario | Subscription paid accounts | Subscription weekly revenue | Ad weekly revenue | Store weekly revenue |
| --- | ---: | ---: | ---: | ---: |
| Initial catalog unchanged | 102,579 | $179,757 | $131,041 | $23,478 |
| Hit added in week 4 and kept | 143,798 | $251,989 | $143,253 | $24,274 |
| Hit added in week 4, removed in week 6 | 111,789 | $195,886 | $131,043 | $23,478 |
| All playable catalog removed in week 4 | 13,920 | $24,392 | $0 | $0 |

The hit is actually watched after addition: week 8 viewing for the kept hit is 45,040 in the subscription run, 210,518 in the ad run and 1,104 in the store run. After removal, its current-service views are zero.

Subscription retention has history: removing a hit does not instantly undo every subscriber it previously attracted. Removing all titles produces zero current title viewing, no new joins and continued cancellations. Existing members still generate recurring billing until they leave; in the final removed-catalog week, 2,929 cancel and 13,920 remain.

## Price and ad-inventory changes

- **Subscription:** raising every tier to $79 in week 4 results in 11,828 paid accounts by week 8, versus 102,579 in the unchanged run. Weekly revenue is $204,875: the higher price offsets much of the smaller audience. Revenue need not decline monotonically with price.
- **Store:** requested $79 rent/$199 buy is normalized by existing allowed limits to **$50 rent/$100 buy**. Week 8 has 5 rentals and 3 purchases, versus 2,381 rentals and 461 purchases at the unchanged prices. Revenue is exactly `5 × $50 + 3 × $100 = $550`.
- **Advertising:** setting ad minutes per hour to zero in week 4 yields **$0 ad revenue** by week 8, despite 525,554 title viewing accounts. Watching alone cannot mint ad cash when no ad inventory is delivered.

## Where the numbers come from

**Subscriptions:** country/household choice considers the saved plan offer, affordability, plan features, subscription-playable catalog breadth/genre diversity, coverage, offer maturity and competition. Weekly customer movement starts from the saved population. Billing sums paid plan cells at their effective monthly-equivalent rates, including billing-path/discount rules, then divides by 4.33. In the first live week of this fixture, 22,116 paid accounts at an effective $7.59 monthly produce $167,901.24 monthly-equivalent billing, or $38,776.27 weekly. Owned operations settle that as $38,776.

Catalog quality, rating, fame, genre, language fit, freshness and marketing also affect title viewing choices. The subscription catalog strength input itself primarily measures eligible title count and genre diversity; there is no guaranteed fixed subscriber multiplier for a film labeled a hit.

**Advertising:** delivered ad-eligible viewing hours create impression inventory. Market clearing applies the country's advertiser budget, competing supply and realized CPM. Zero eligible viewing, zero ad load or zero advertiser budget cannot earn ads. The first live ad week delivers 2,873,584 filled impressions and earns $49,368; paid subscriptions remain zero. The realized blended rate is market-derived, not a guaranteed target CPM.

**Store:** eligible households choose rentals/purchases subject to price, affordability, access/plan requirements and rights. Each title's rental count is multiplied by the saved rental price; purchase count by purchase price. Per-title receipts round to whole currency units, then sum to the platform total. Therefore rounding one combined global transaction total can differ by a dollar from the sum of correctly rounded title receipts. Both title arithmetic and aggregate sums were checked.

For example, in the first live store week, The First Signal earns `round(453 × $5.99) + round(88 × $19.99) = $2,713 + $1,759 = $4,472`. After the Signal earns $4,341; platform gross is $8,813. Paid subscriptions remain zero.

Every simulated week checks Finance's latest chart revenue against actual operating receipts, the full ledger against saved treasury, and HQ subscriber metrics against canonical paid accounts. Removed catalog stops current service viewing and new transactional receipts. Previously acquired entitlements are covered separately in the existing commercial suites.

## Scope of the conclusion

The current game's implemented demand and billing rules produce connected, internally reconciled numbers in these scenarios. This validates behavior/accounting; it does not mean every price is profitable, every hit attracts the same audience, or the game's balance has been calibrated to real-world platform data. Country reach, budgets, competitors and catalog maturity can change the outcome.

The earlier **38/38 suites, 118/118 custom checks, TypeScript and build passes** remain the implementation baseline. The new 132 checks are supplemental and separate. No real career save was modified; no further gameplay code was changed.

Raw [scenario results and every weekly row](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-postlaunch-three-models/results.json), [passing run log](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-postlaunch-three-models/run-final.log), and [reproduction script](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-postlaunch-three-models/audit.ts) are saved together.
