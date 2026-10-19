# Streaming model profit and payback — 18 October 2026

**Verdict:** the identified accounting, country-cost, ad-discovery and automatic-renewal defects are fixed and covered by tests. This is not an unconditional investment or whole-game release green light. The tested rental refresh strategy recovers all initial investment; the tested premium subscription strategy loses money, and the ads strategy has positive operating profit but does not recover all investment within 260 weeks.

## Screenshot stage

Streaming HQ → Content Market → The Market → choose a released film → Negotiate rights. The Heads of Terms screen is a draft offer before **SEND IT**. Sending submits an offer; seller response/signing happen afterward. The “Isolated QA” header was a test overlay; its treasury is not proof that this draft was paid.

## Corrected financial basis

Earlier QA diagnostics omitted country-entry and country operating charges. They remain archived as mechanical diagnostics and must not be used for complete-cost payback. These final cases pay the production US quote: **$53M entry** ($48M rights/market access plus $5M compliance). No part of that quote was waived. Incorporation costs $85M, network capital $33.75M, and the common funded original costs $5M. Twelve first-window licences cost $180M; six second-window licences cost $66M. All licences use actual V3 quotes and consume cash once. The optional refresh costs another $66M and introduces new title IDs; it does not reset old titles for free.

Each case uses US-only rights/audience, quality95 films across distinct genres, the same nine-rack/three-city network and existing service/capacity rules. The common original is additional to the licensed count. Annual/intro preferences are inherited from the shared fixture. Initial $3B is test equity, not revenue. These runs assume equity funding: they do not include loan interest. Costs, receipts and payback are **measured game simulation results**, not a prediction of the user's current save or real-world business earnings.

**Finance profit** = sum of weekly accounting contribution minus separately paid maintenance. The weekly accounting contribution includes finite content amortization and real royalties, taxes and operating expenses. Pre-launch incorporation/market entry/network investment is outside this post-launch Finance window.

**Cash after ALL investment** = final treasury minus the original $3B equity. It includes incorporation, market entry, network, original funding, actual licences, paid refresh/renewals and maintenance. Content amortization is noncash and is not debited again. **Sustained cash payback** is the first week the cash surplus becomes nonnegative and remains so through the tested horizon; later spending beyond the horizon is not forecast.

## Final full-cost results

| Setup | Weeks | Receipts | Finance profit | Cash after ALL investment | Sustained cash payback |
|---|---:|---:|---:|---:|---|
| Subscription:12 first-window titles,$7.99/month | 104 | $193.86M | −$31.59M | −$203.34M | Not reached |
| Ads:12 first-window titles,4min/hour | 104 | $159.03M | −$101.41M | −$273.16M | Not reached |
| Rental:6 second-window titles,$2.99 | 104 | $356.37M | $147.80M | −$23.95M | Not reached |
| Ads:6 second-window titles,6min/hour,paid refresh W105 | 260 | $572.91M | $140.36M | −$43.68M | Not reached |
| Rental:6 second-window titles,$2.99,paid refresh W105 | 212 | $758.57M | $334.71M | $162.96M | Week 133 |

The subscription run earns only a little more than its $185M content basis over104 weeks. Service, tax, maintenance and other operating expenses turn that narrow gap into a loss. The premium ads run earns less than that content basis even before other expenses. Higher quality does not guarantee recovery of an expensive rights package.

The lower-cost, paid-refresh ads run is operationally viable in this test but still has unrecovered startup/future-content investment. The rental refresh case crosses full cash payback in week133 and stays cash-positive through week212. Licence expiry is real: unrefreshed catalogues lose their licensed receipts, and the last weeks of the rental refresh run have no new licensed receipts after expiry. Continuing to operate an empty service still costs money.

## Implemented changes

1. **Country service cost follows served load.** The old US charge used all225M potential audience people every week ($1.08M), even for a small service. The final charge is `min(approved weekly budget, max($55K, serviced audience load × existing privacy rate))`; rates remain0.0048/0.0034. The country fee, floor and maximum remain. Only observed paid stock/authorized service activity drives the variable bill. External piracy is excluded; known member store activity is not charged as another membership. Aggregate legacy/AI store activity without membership proof gets no invented overlap discount. This is a bounded service-load estimate, not a new unique-human audience metric. AI uses its preceding settled week explicitly, matching its revenue chronology; player uses the current settled week. Missing/stale/future proof retains the old conservative bill.
2. **Income tax follows positive contribution.** The receipts levy remains on gross receipts. Real operating expenses, finite paid-content amortization and maintenance reduce taxable contribution. No negative tax/loss subsidy is created. Actual earned country receipts prevent an empty low-tax market sheltering earned income.
3. **Maintenance true-up is durable and funded.** Manual and assisted maintenance use a frozen earned-week tax assessment. Refunds are limited to actual overpayment after revised liability, with remaining payment proof persisted. Reducing unpaid tax creates no cash. Reload/replay and repeated facilities cannot claim the same relief twice. Old snapshots without payment proof receive no invented credit.
4. **AI content deductions reflect actual funding.** Paid licences and funded delivered originals get a finite noncash tax deduction; expiry/useful-life boundaries stop it. No second content cash payment is introduced. Pending/internal/unfunded positions do not create deductions.
5. **Free-ad discovery includes complementary use.** Subscription households may discover one additional public ad service across competing offers. Existing exposure, catalogue value, service, country rights and ad tolerance govern it. This adds no paid accounts, households or discretionary money. Live viewing clips discovery against actual retained paid stock. Forecasts and live settlement use the same path.
6. **Managers need investment-return evidence.** Popularity/large treasury alone cannot justify a renewal. Recent real title cash contribution after maintenance, aging conservatism and recovery margin gate delegation. Saved offers are checked again immediately before settlement. A failed check requires a manual decision; it does not rewrite signed deals or block manual choices.
7. **An empty catalogue creates no new paid/free choice.** Existing rights, mode restrictions, expiry, suspension and shared spending constraints remain.

Subscription attribution remains analytics rather than a new ads/rental backend payment. Existing signed/legacy deals, producer ownership and talent backend were preserved. No CPM, advertiser budget, household budget, licence quote, upfront fee or content-quality input was inflated by these production fixes.

## Verification

- **Five final full-cost scenarios:784 simulated weeks, all weekly financial/stock/budget/royalty checks passed.** Actual all-platform country advertising is bounded by the shared demand pool. Every consumer receipt must be funded by residual household wallets; subscription spending is bounded separately. Customer joins/reactivations/cancellations reconcile to paid stock, and Finance rows reconcile to the weekly ledger.
- **89 relevant audit suites:84 passed;5 known pre-existing failures remain**, listed below. Signed royalties, finite content accounting, launch/Premiere consistency, live commercial modes, save integrity and player/AI economy regressions were rerun.
- Focused new checks:11 profit/renewal,2 actual-paid-stock ad projection,7 tax settlement,10 country usage/chronology/legacy checks. They include observed failing regressions before fixes.
- Production build and full TypeScript check passed. The first TypeScript attempt exhausted its4GB heap; the successful run used8GB. No type errors were suppressed.
- Final source rechecks ran eight complete weeks for each of the five full-cost setups (40 weeks); their weekly rows exactly match the saved long-run prefixes. This covers the later defensive legacy-population guard; it does not claim a second full784-week run. The final portable CLI output was clarified to show full cash surplus rather than a partial “cash after rights” value.
- Seven old audit fixtures were repaired with actual titled/granted catalogues, retaining their assertions. An old gross-tax expectation was replaced with independent expense/levy arithmetic; dormant AI recovery still requires13 qualifying weeks. These changes did not weaken financial invariants.

Known remaining failures:
- award-competition
- talent-instability-ui
- mod-talent-supplement
- project-investors
- streaming-contract-foundation-phase1

The awards and raw contract-foundation failures were reproduced against the task baseline. The other three are existing stale source/version assertion failures; their current logs and prior evidence are retained. No fixes to those unrelated systems were made as part of this task. They prevent an unconditional whole-game release claim.

## Reproduce and inspect

- `npm run audit:streaming-model-profit`
- `npm run audit:streaming-secondary-ad-stock`
- `npm run audit:streaming-tax-settlement`
- `npm run audit:streaming-market-usage-cost`
- `npm run audit:streaming-model-payback` runs the full-cost cases; explicit scenario selectors can reproduce labeled historical diagnostics.

The harness fixes its RNG seed and wall-clock IDs while advancing the game's weekly clock. Inputs and individual weekly rows are saved. The exact executed full-cost bundle, final portable bundle, source hashes, raw JSON/CSVs, audit logs and read-only baseline are archived under:

`/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-model-profit-payback-20261018/`

The executed long-run bundle predates only the defensive malformed-legacy-population fallback and later CLI formatting; normal full-cost paths were rechecked against current source as described above. No live player save was edited, and no commit, push or deployment was performed.
