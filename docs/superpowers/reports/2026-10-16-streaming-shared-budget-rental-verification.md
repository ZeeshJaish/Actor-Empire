# Streaming shared-budget and usage-based economy verification

Status: **green for the tested streaming catalog/pricing/revenue scope**, with the pre-existing awards-audit failure below disclosed. Final production source remained unchanged across the complete matrix. These are measured game simulations, not a guarantee that every business setup is profitable.

## Final validation

| Check | Final result |
| --- | --- |
| Actual engine simulations | **161 retained scenarios / 5,608 game-weeks** |
| Final matrix runner | **157/157 jobs passed**, plus the separate 212-week full-company case |
| Weekly accounting/budget/turnover checks | **0 failures** |
| Directional balance criteria | **18/18 passed** |
| Focused shared-budget/money regressions | **29/29 passed**, included in the suite run |
| Selected regression suites | **49/50 passed**; proven baseline awards failure disclosed below |
| TypeScript | `npx tsc --noEmit` passed |
| Production build | Passed; existing Browserslist/chunk-size warnings remain |
| Diff whitespace check | `git diff --check` passed |
| Tested source fingerprint | **135 unique files**, unchanged at final reconciliation |

The matrix covers 2/8/32-title configurations, an 80-title breadth stress, quality 20/80/95, multiple seeds, cheap/expensive subscription and store prices, current ad presets and legacy extreme-ad stress, annual/intro behavior, service failure and recovery, catalog removal, paid refresh, suspension, rights expiry, full-cost quotes and replacement cycles. The focused regressions also exercise cross-platform budgets, fractional prices, zero/invalid available spending, ownership/access restrictions, exact store royalties, canonical-only rival rights, backend caps across serialization, seller credit and replay.

All 18 directional criteria passed: quality response for membership/store; gross cancellations during growth; service-failure retention response; suspended delivery and billing; extreme subscription-price resistance; zero-ad-load receipts; heavy-ad diminishing returns; expensive-store sales resistance; removal cancellations; intro expiry; observed outage churn; breadth beyond 26 titles; recurring rental cash; paid fresh membership retention and store sales; and owned-library cash after maintenance/content reserve. These criteria verify causal responses and conditional viability, not identical margins across business models.

## Implemented behavior

One household cohort has one streaming spending envelope. Paid membership reserves its actual bill first; rentals, purchases, passes and consumer product extras compete for the remaining weekly money. The remaining monthly envelope is divided by the game's existing 4.33 weeks/month convention and allocated in integer cents before player or rival transactions settle. Individual opportunity-source wallets and the shared platform allocation must both fund a transaction.

A rival subscriber can now discover and rent from a public player store. These secondary opportunities overlap existing access; they do not create additional primary households or additional spending power. Member-only stores and already-included titles retain their access restrictions. Ownership and rental windows still prevent duplicate purchases of the same title access.

Membership value now responds to expected viewing use and available rental alternatives. Expected monthly title use is `(0.5 + appetite / 10) × clamp(subscription catalogue strength / 100, 0.1, 1)`. Plan value compares the actual bill with that use and the exposure-weighted price of real public stores. An empty cheap store cannot distort subscription demand or reserve spending money. The focused 10,000-household fixture produced 4,983 occasional-viewer subscriptions versus 8,315 frequent-viewer subscriptions for the same expensive bundle.

Actual existing customer cells are budget-capped after seeding/convergence. Gross joins and cancellations reconcile with saved tenure, including simultaneous growth and churn. Quality, freshness, service failures, removal of titles and suspension keep their earlier demand and billing effects.

The paid replacement lifecycle exposed two additional correctness bugs. World-history pruning could delete a live licensed title's authored facts and silently substitute fallback quality. It now retains current licensed/owned title references before applying ordinary history limits; unreferenced history stays within the existing 320-record budget, and expired licenses release their protection. This preserves actual facts rather than assigning better quality. Already-missing old-save facts cannot be reconstructed by this change.

The twelve-week opening-slate normalizer could also make a newly acquired week-105 title appear 95 weeks old. Runtime program entries now use the actual current rights start as the earliest premiere date. The initial twelve-week setup stays the same. Future sibling windows cannot hide a presently active license, and prior settled title age still prevents a renewal or date edit from minting another premiere.

Consumer extras clear the same wallets: premium access, day/hour passes, metered use, patrons and active FAN/STORE/INTERACTIVE products. Free's advertising settles through the finite advertising market; its old second per-subscriber ad credit was removed. Unfunded ad-free passes cannot remove ad inventory. Positive transaction prices are normalized to cents; saved sub-cent/fractional-cent prices cannot credit more money than the wallet debit. Invalid obligations fail closed.

## Rights and real costs

Direct rental/purchase receipts now pay the full signed backend for the exact title, country and access-mode contract that permitted the sale. Those receipts are removed from the old aggregate rights-share base, so they are charged once. The earlier capped catalogue-weight calculation underpaid licensed rentals: a 28% signed backend could become 12.6%. This undercharge is fixed for both player and rival store economics.

Canonical rights take precedence over local projections, including a valid canonical-only rival contract. Platform-trade royalties create durable buyer expense evidence and actual seller cash; replay cannot credit the seller twice. Permanent buyouts/internal transfers remain exempt under their existing terms. Direct-store recoupment and backend caps use persisted cumulative amounts. The player cap test pays $240 across eight $30 caps, then $0 the following week; the rival $30-cap test pays $28 then $2 after serialization/normalization, with no second same-week payment.

Earned historical rival receipts remain payable after a later rights expiry, only when their saved receipt week falls inside the signed window. This is a financial projection; expired titles receive no new playback or sale permission. The retained regression uses a valid older receipt, not a transaction invented at the exclusive expiry boundary.

No audience budget, license guarantee, infrastructure tariff or capital grant was increased to make rental profitable. Rental conversion still uses its existing 0.28 coefficient; purchase conversion remains 0.04. Infrastructure sizing is a paid business choice. Maintenance, governance, compliance, audience enforcement, commercial processing, financing and the common Original funding remain costs. Store viewing now contributes to actual operating load even with zero paid subscribers.

## Measurement rules

- Results are controlled simulations through the actual `processGameWeek` engine, not predictions of real customers or results from the user's saved career.
- The original robustness matrix deliberately includes synthetic cheap/paid-up rights and stress configurations. Only the separately identified quote cases support a claim about licensed rental investment recovery.
- Quoted cases use the game's V3 license quote and signed 104-week domestic nonexclusive terms, with the suggested guarantee debited upfront. Finite rental-only grants do not invent permanent purchase rights.
- Starting capital keeps losing companies funded while measuring them; it is excluded from income and profit.
- Weekly operating cash, periodic maintenance, content amortization and initial/replacement investments are reported separately. A positive operating week does not establish investment recovery.
- A catalog/network/Original recovery calculation starts with an already incorporated company. The separate full-company lifecycle also debits the fixture's actual $70M consumed founding setup and pays for replacement catalog rights. Initial cash transferred into the business is capital, not an additional expense or income.
- The quote specimens are controlled low-budget films, with stated quality, reach, prestige, gross and release age. Their availability as a real batch of market listings is not established by this simulation.
- The legacy subscription/non-store rights attribution remains an aggregate estimate. This change does not claim full contract-by-contract reconciliation of all membership receipts, recoupment and caps across every revenue mode.

## Measured pricing and model comparisons

The following **full V3 quote cases** hold the same eight quality-80 low-budget first-window films and paid 12-rack network fixed. Rights are $106M, network $45M and the funded Original $5M: **$156M initial investment**, excluding company founding. Weekly columns average weeks 19–26 and include actual recurring treasury movements/maintenance; initial investment is separately included in the 26-week cumulative column. All figures are game dollars.

| Model and price | Week-26 paid subscribers | Week-26 rental transactions | Average weekly gross | Average weekly cash | 26-week cash after initial investment |
| --- | ---: | ---: | ---: | ---: | ---: |
| Subscription $7.99/month | 381,726 | 0 | $617,648 | +$72,236 | −$157,774,427 |
| Subscription $29.99/month | 71,195 | 0 | $439,732 | −$35,200 | −$159,415,428 |
| Advertising 6 minutes/hour | 0 | 0 | $334,282 | −$140,275 | −$161,774,707 |
| Rental $2.99 | 0 | 970,281 | $2,750,443 | +$887,689 | −$140,361,007 |
| Rental $5.99 | 0 | 301,991 | $1,716,811 | +$438,061 | −$149,350,349 |

These finite rental-only licenses produce no purchase sales even though a buy price is configured. Rental transactions are title transactions, not unique people. Subscription no longer automatically wins this comparison; rental monetizes public discovery beyond primary members, while respecting the same cohort spending cap and the full 28% signed backend. None of these first 26 weeks repays the quoted initial investment. The quality-80 $2.99 eight-film case still loses **$61,686,873 after 106 weeks**, before founding; positive weekly cash is not being relabeled as full recovery. Weak quality-20 licensed rental also loses recurring cash (−$205,761/week in weeks 19–26). Expanding to 32 full-price films increases gross but requires $474M upfront and remains −$444,386,023 at week 26. Buying more titles is not free growth.

A separate constant-cost stress comparison illustrates the usage/quality/service direction without pretending its synthetic rights are market deals:

| Controlled change | Measured response |
| --- | --- |
| Same eight titles, subscription $0.99 → $7.99 → $100 | Week-26 paid accounts 2,868,941 → 540,139 → 7,207; weeks 19–26 cash −$148,015 → +$75,546 → −$461,212/week |
| Catalog quality 20 → 95 | Week-26 subscribers 19,030 → 861,662; weekly churn 4.22% → 2.12% |
| Paid fresh releases versus stale slate, week 52 | 1,109,887 versus 586,278 subscribers; churn 2.04% versus 3.01%; additional rights cash **$13M paid** |
| Service outage versus control during the pressure interval | End-interval subscribers 432,824 versus 452,504; churn rises to 3.72% versus 2.28% |
| Remove catalog versus control, week 52 | 269 versus 586,278 subscribers |
| Suspend every active market | Paid accounts, subscription billing, viewing and total gross all **0** after suspension |

The suspension test directly injects saved market status; it does not demonstrate a suspension exploit through the normal UI.

Heavy-ad stress (30 legacy minutes/hour) earns less and loses reach compared with 6 minutes/hour; setting ad load to zero earns no advertising revenue. More ads therefore do not create unlimited advertiser money. Exact per-case weekly data and all 18 criteria are retained with the evidence.

## Browser verification

The isolated C6 QA career was launched from this checkout. Store-only Premiere and HQ both showed **0 paid subscribers**. After one actual engine week, HQ showed about 19K and 18K title accounts and **72% completion**. The completion display previously rounded the fraction 0.72 to 1%; that display is fixed.

Finance showed roughly **$254K revenue, $273K operating expenses and −$18.1K operating result**. Treasury was **$196,801,920** from $200M. The ledger separately recorded three approximately $1.06M network maintenance debits. The historical treasury adjustment is fixture capital, not earned revenue. No browser console errors were observed; the disposable tab and local QA server were closed after verification.

Premiere's authored newspaper, social reactions, ratings and poll are game presentation fiction. They are not measured customer telemetry and are not evidence for these economic conclusions.

![Isolated final Finance verification](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-shared-budget-fixed/browser-finance-final.png)

## Full-company licensed-rental result

The retained full-company case uses six controlled quality-95 low-budget movies per batch, released two years earlier, with six different genres. It buys domestic nonexclusive second-window rights for 104 weeks at the game's full V3 suggested quote: **$11M per movie, 72% platform / 28% licensor**. A second, distinct paid batch replaces the first in week 105. Rent is $2.99. Nine paid racks across NYC/LA/Chicago use the actual network quote and operating/maintenance charges. This is a funded equity scenario with no debt interest; financing availability and market supply are not proven by the fixture.

| Committed capital | Actual game currency |
| --- | ---: |
| Consumed company founding setup | $70,000,000 |
| First six licensed films | $66,000,000 |
| Second six licensed films | $66,000,000 |
| Network purchase | $33,750,000 |
| Common funded Original | $5,000,000 |
| **Total** | **$240,750,000** |

After **212 actual engine weeks**, all recurring costs, periodic maintenance, signed store royalties and both rights batches are paid. **Net company cash profit: $26,444,807. Investment recovery: week 177.** The $3B diagnostic funding reserve finishes at $3,026,444,807; the original reserve is excluded from profit. There is no terminal resale value or free replacement content in this result. Total delivered revenue is **$801,191,577** and signed store royalties are **$224,333,661**. Paid subscribers remain zero in this store-only case. New rental receipts stop when the remaining promised rental window cannot fit inside the license; later weeks still incur costs.

This establishes a viable controlled licensed-rental business case. It does not make weak catalogs, expensive first windows or every rental price profitable. In particular, the earlier week-76 payback claim from the royalty-undercharged run is superseded.

## Regression qualification

The expanded run includes an extra legacy awards audit because world-history retention changed. **49 of 50 suites pass.** The remaining `audit:award-competition` failure is the legacy assertion “World schedule did not queue two releases across the year boundary.” Rebuilding the same audit with only `services/worldLogic.ts` replaced by its `HEAD` baseline produces the identical failure. The current canonical B7 cutover audit passes and explicitly prevents the legacy world turn from inventing releases. This is a proven pre-existing test incompatibility; it was not rewritten or hidden in this economy task. Therefore the streaming scope can be green without claiming that every repository audit is green.

## Retained evidence and rerun instructions

Evidence folder: [README and reproduction commands](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-shared-budget-fixed/README.md).

- [Reconciled metrics and counts](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-shared-budget-fixed/final-analysis.json)
- [159 scalar setup summaries; two paid-refresh setups are separate in JSON](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-shared-budget-fixed/all-scenarios.csv)
- [Full-company 212-week data and accounting checks](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-shared-budget-fixed/foundation.FULL-FOUNDATION-TWO-CYCLES-SECOND-Q95-C6-R3.json)
- [All 50 selected suite outcomes](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-shared-budget-fixed/regressions/audit-results.json)
- [Baseline awards comparison](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-shared-budget-fixed/award-baseline.json)

The folder includes each matrix mode's weekly data, 157-job outcomes, source hashes, TypeScript/build logs, individual regression logs, browser captures and the exact simulation/analysis harnesses. Permanent repository checks can be rerun with `npm run audit:streaming-shared-budget` and `npm run audit:streaming-economy-balance-fixes`; the README covers full reproduction.

## Scope and review

The approved shared-budget/usage design and money corrections are local changes. Earlier launch, catalog, suspension, Premiere/HQ and Finance fixes remain intact. Unrelated dirty work, including the October 15 performance plan, was preserved. No commit, push or deployment was performed.

Independent read-only review found no remaining material blocker after reproducing and resolving player/rival backend undercharges, canonical-only cost and seller-credit gaps, cap/reload/replay behavior and delayed earned receipts. This is evidence about the tested implementation, not a formal proof against every possible malformed save or future exploit.

The previous design-hook triage remains in its existing report. This task changed no CSS and added no design suppressions; the existing typography/motion/accent findings were not broadened into an economy redesign.
