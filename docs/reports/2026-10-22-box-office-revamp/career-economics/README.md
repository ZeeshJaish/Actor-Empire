# Normal-career verification and gross-to-profit review — 23 October 2026

**The system should not yet be declared fully calibrated.** Four normal starter careers finish successfully, with preserved saves and exactly-once weekly settlements. The observed normal-world theatrical loss rate is high. Separately, $1B of public ticket gross should not promise $700M of studio profit. These are different findings and need different remedies.

This follow-up changes verification/report files only. It does not change live payouts, save migration, admission demand, booking fees or existing paid history. Previous dirty workspace changes are preserved.

## Four normal careers

Each starts from INITIAL_PLAYER with $2,000, zero acting skills/fame and no authored production house, cast, completed film, gross or favorite audience. The existing sustainable action policy uses actual current jobs, affordable catalogue care/training, auditions, rehearsals and promotions. All 832 weeks run processGameWeek with the full evolving industry, countries, cinema supply and rival platforms.

USD millions; open runs are excluded from financial classifications. HIT uses the current NPC threshold: project theatrical profit at least 60% of production cost. SOLID means nonnegative profit below that threshold. LOSS means theatrical under-recovery, not a proven lifetime all-media loss.

| Runtime seed | Weeks | Closed titles | Open titles | HIT | SOLID | LOSS | Largest gross, including open |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0 | 208 | 79 | 24 | 3 | 4 | 72 | 693.57 |
| 1 | 208 | 81 | 25 | 2 | 4 | 75 | 701.59 |
| 2 | 208 | 79 | 26 | 2 | 4 | 73 | 681.52 |
| 3 | 208 | 81 | 30 | 3 | 3 | 75 | 705.07 |

Across 425 title-by-career observations (132 distinct canonical title IDs), 320 runs close. All 320 closed runs have recorded production/campaign costs; 0 unknown-cost rows are excluded. 10 qualify as HIT, 15 as SOLID and 295 under-recover theatrically. Recoupment is **7.81%**; theatrical under-recovery is **92.19%**. Median closed gross is $54.72M; p90 is $106.18M.

No observed title, including unfinished runs, has crossed $1B or $2B. This checks for automatic billion-dollar outcomes in these early careers. It does not establish the probability of an advanced player achieving $2–3B. The [previous advanced-owner routes](../billion-potential/README.md) separately establish conditional attainability and meaningful failure.

These are **four runtime/module seeds using one normal action policy and the standard shared industry roster**. Studio AI profiles and some early slates are deterministic by studio identity. Repeated title observations are correlated; do not present the aggregate as independent trials or a global player hit probability. Ordinary acting careers also do not establish a self-funded studio founder-to-crossover journey.

## Check for censoring and small-film bias

The first-104-week release cohort has at least another 104 observed weeks: 149 observations, 149 closed and 0 still open. 12/149 recover theatrical costs (8.05%); 137 do not. The high loss rate is therefore not explained solely by recent films being unfinished. Remaining successful open tails are still excluded; this is not lifetime revenue certification.

Among closed films costing at most $10M, 9/12 recover theatrical costs and 3 lose money. Their gross range reaches $34.20M. Small films can succeed without a budget return floor. This is a small, policy-dependent sample, not proof that every indie strategy is balanced.

Actual player-credit releases are reported separately from company project profit. Upfront acting salaries are inside production budgets; the player's career cash and backends are separate. Some careers may not book a theatrical role during this horizon.

| Seed | Actual player-credit film | Production $M | Gross $M | Project theatrical result $M | Paid run weeks | 95% gross by week |
|---|---|---:|---:|---:|---:|---:|
| 0 | Fleeting Jump | 1.91 | 0.33 | -1.77 | 14 | 10 |
| 1 | River Moon | 2.01 | 0.23 | -1.91 | 13 | 10 |
| 3 | Golden Ember | 10.97 | 0.02 | -10.97 | 3 | 3 |

These early minor-role films have weak delivered packages and little/no paid campaign; they must not be compared with the authored advanced crossover packages as if preparation were equal.

## Why the normal-world loss rate deserves review

A separate first-year diagnostic replays seed 0 and records the first 10 NPC releases; it is not a fifth independent seed. **Eight choose LIMITED_THEATRICAL**, including $95.552M, $120.243M and $124.957M productions. Their campaigns cost $7.644M, $9.619M and $9.997M. Limited films map to North America, while these NPC paid-campaign events carry no country scope and spread impressions across world cohorts. The player campaign adapter can scope an explicitly selected regional release.

These are source-traced concerns about budget/release fit and campaign targeting. They are not proof that changing either alone fixes profitability. A matched, future-only counterfactual is still required before selecting tuning.

Removing every producer booking charge while holding historical gross fixed would raise closed recoupment only from 25 to 37 of 320. Booking charges deserve contract review, but they do not explain all the normal-world losses. Avoid a blanket ticket conversion multiplier or a forced hit quota.

Sources: [recorded release diagnostic](evidence/npc-release-diagnostic.json), [NPC commercial release](../../../../services/studioAi/studioAiCommercialResult.ts), [NPC release-to-market adapter](../../../../services/boxOffice/boxOfficeWeek.ts), [region defaults](../../../../services/regionMap.ts), [player campaign scoping](../../../../services/boxOffice/boxOfficeExposureAdapters.ts).

## Real-world gross and profit

Cinema box office is shared through negotiated exhibition/distribution terms. The money the producer can use to recover costs is smaller than public gross. [UK Cinema Association](https://www.cinemauk.org.uk/the-industry/about-the-uk-cinema-sector/film-distribution-and-cinema-operators/) explains this relationship. Disney describes theatrical revenue as film rentals, with TV/VOD and home entertainment as separate revenue sources in its [FY2025 report](https://investors.thewaltdisneycompany.com/files/doc_financials/2025/ar/2025-Annual-Report.pdf).

| Film | Reported worldwide gross | Trade-estimated film profit |
|---|---:|---:|
| Avatar: The Way of Water | About $2.3B | $531.7M |
| The Super Mario Bros. Movie | $1.36B | $559M |

These are original Deadline estimates with downstream media revenue, not audited theatrical-only accounts. [Avatar study](https://web.archive.org/web/20230419172938/https://deadline.com/2023/04/avatar-the-way-of-water-box-office-profits-1235328725/) reports $1.26B theatrical rentals and substantial production, marketing and participation costs. [Mario study](https://web.archive.org/web/20250206165223/https://deadline.com/2024/05/the-super-mario-bros-movie-profits-1235902894/) reports a $100M production cost. Cost structure and contract terms make equal gross produce very different returns.

For a purely illustrative $1B gross with 50% producer receipts, $100M production and $50M campaign leave $350M before other costs. A $300M production and $200M campaign already consume those receipts. Neither is a forecast or a fixed take-rate rule. A $700M lifetime profit can occur with exceptional revenue/cost/rights economics; it should not be a $1B theatrical profit guarantee.

## The game's prior large-film accounting

The previously completed exceptional route earns $2,330.30M gross and **$1,133.31M producer receipts**. After $300M production, $200M campaign and $138.84M booking costs, theatrical profit is **$494.48M**. No future streaming revenue is included. The magnitude is not inherently unrealistic; comparing this theatrical result directly with a trade lifetime estimate would be misleading.

The strong crossover earns $1,581.13M gross, $768.33M receipts and $271.07M theatrical profit after its $300M production, $100M campaign and $97.26M booking fees. The weak expensive branch loses $223.84M. These are prior controlled engine results, not newly earned films in the four normal careers. [Preserved source totals and frozen-gross fee arithmetic](evidence/advanced-waterfalls.json).

## Two distinct accounting/contract concerns

1. **Finance presentation:** the current presenter reproduces a $50M loss for a $100M production financed $50M by investors and $50M by the studio, when $100M receipts return $50M to each. Project result before financing is $0; studio result after financing is $0; current studio ROI correctly says 0%, but the displayed project profit says −$50M. It mixes investor distributions and full project cost. This is a presentation diagnostic, not evidence of a duplicate cash debit. [Executable probe](probe-finance.ts) · [Actual output](evidence/finance-probe.json).
2. **Producer booking fees:** producer receipts already exclude the exhibitor share and a 5% distribution deduction; quoteCinemaSupply also supplies a fee for every booked show. Actual booking fees were $138.84M on the exceptional route. Standard revenue-share exhibition should make the cinema's operating costs its own concern; an explicit rental/guaranteed-placement deal can have different economics. ICO describes negotiated [flat/percentage arrangements](https://www.independentcinemaoffice.org.uk/advice-support/working-in-film-exhibition/working-in-distribution/) and [cinema operating costs](https://www.independentcinemaoffice.org.uk/advice-support/how-to-start-a-cinema/the-economics-of-the-operation/). The latter's film-hire guarantee is paid by the cinema to the distributor; it does not justify a universal reverse producer-per-show fee. Our recommendation is a contract review, not a claim that every real-world flat fee is invalid.

As a primary financial cross-check, Cinemark reports $1,544.7M admissions and $877M film rentals **and advertising combined**, alongside its own staffing and facility lease costs. The combined expense must not be treated as a pure studio take-rate. [SEC results filing](https://www.sec.gov/Archives/edgar/data/1385280/000119312526056010/cnk-ex99_1.htm).

## Recommended next change

1. Separate **project profit before financing**, **studio return after financing**, **actor earnings** and **collected all-media profit to date**. Keep future rights estimates visibly separate from actual signed/paid receipts. Fix the reproduced funded-film display without paying any cash again.
2. Give existing distributors explicit standard revenue-share versus paid-placement/rental terms. Standard deals should not silently charge producer operating rent in addition to a full exhibitor share. Retain actual campaign, localization and agreed release-service costs; show their basis. Preserve booked contracts and paid history.
3. Match NPC production budgets, selected release footprint and campaign territory. Use the same audience/awareness logic for player and NPC films. Test targeted campaigns against the current unscoped baseline before deciding exposure or budget tuning.
4. Repeat matched small/medium/tentpole/universe cases and normal careers after those fixes. Compare mature cohorts and actual signed downstream receipts. Keep $2–3B conditional on earned audience and outstanding delivery; no earning cap, guaranteed return, extra free audience or forced flop/hit percentage.

Historical receipt IDs, cash, grosses, actor/investor payments and consumed audiences must remain immutable. New contract/tuning behavior needs a future-only boundary; repairing a display does not authorize refunds or repayment of prior weeks.

## Safety and verification evidence

- 832 actual weekly-engine advances; 832 same-week replay attempts all rejected as already applied.
- 77 successful verified-generation writes, 73 reload/migration checks, and 4 failed-promotion recovery/retry cases. Exact root cinema paid state, cash and business balances survive reload; the prior persisted generation survives a failed promotion.
- Every week checks ticket conservation, audience wallets/leisure, seat/screen-minute bounds and total signed payouts against available receipts. All four careers survive and remain funded.
- Fresh migration audit: 24 groups pass, including signed tuning upgrades, legacy-paid protection and restored investor mirrors. Finance-contract audit passes. These do not make the separately reproduced finance-label mismatch correct.
- Portable runner smoke check passes for a separate one-week seed; it is excluded from the 832-week results. Global TypeScript result and source hashes are recorded in provenance.
- Persistence uses a disposable in-memory implementation of the actual generation protocol, not a real user's save. This is engine/save verification, not full App UI, native storage or device performance certification. Final serialized saves are roughly 79.59–86.01 MB; no latency claim is made.

[Complete metric summary](evidence/summary.json) · [Research references](evidence/research-sources.json) · [Source provenance](evidence/provenance.json). Individual career JSON/logs remain in evidence/ with all actual actions and paid-film rows. No global build claim is needed for this report-only follow-up.

## Reproduction

From the repository root, run:

~~~sh
CAREER_OUTPUT=/private/tmp/actor-cinema-career-economics-rerun \
node docs/reports/2026-10-22-box-office-revamp/career-economics/run-audit.mjs

CAREER_OUTPUT=/private/tmp/actor-cinema-career-economics-rerun \
node docs/reports/2026-10-22-box-office-revamp/career-economics/summarize.mjs
~~~

Runner defaults are seeds 0–3, 208 weeks and two workers. Four concurrent workers produced the recorded run after the first two were already in progress; wall-clock observations are not comparative performance benchmarks. The archived harness has portable import paths and a type-only Map annotation added after the executed bundle; its simulation logic is unchanged. Provenance records the executed bundle hash rather than relabelling a later build as the original executable.
