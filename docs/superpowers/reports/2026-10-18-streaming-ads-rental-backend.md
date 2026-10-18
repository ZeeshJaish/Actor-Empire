# Streaming fixed-fee + single ads/rental backend verification

18 October 2026. Local Actor Empire simulation; measured deterministic results, not a live revenue forecast.

## Verdict

The approved licensing model is implemented in both directions. Receipt settlement, source eligibility, legacy preservation, duplicate-payment guards and finite content-cost accounting passed the targeted tests. The selected regression run passed **80 of 85 suites**; the five remaining failures are verified pre-existing failures, listed below. Final typecheck, production build, Content Market UI audit and whitespace check passed.

There is **no blanket profitability green light**: premium licensed ad-only catalogues lose money in these scenarios. Rental is viable in the measured cases, while catalogue expansion has diminishing returns and substantial real acquisition cost. No infinite-money path was found in the covered scenarios; these tests are not a formal proof over every possible save state or future week.

## Signed economics

For a new ordinary licence, the fixed upfront fee settles once. One optional rate applies automatically to both actual title advertising and rental receipts:

`licensing backend = agreed rate × (actual title advertising receipts + actual title rental receipts)`

For example, $1,000 ads plus $2,000 rentals at 10% produces one $300 payable. It does not produce separate payments on the same income. Subscription membership, purchase, sponsorship and ancillary receipts are excluded. Paid-tier advertising remains advertising even when the viewing route is subscription access.

A buyer's actual current commercial offer, active territory and signed title access grant govern eligibility. No platform-name whitelist assumes that an AI service runs rentals or advertising. A subscription-only buyer cannot attach new licensing backend. A paid subscription service with actual paid-tier ads can share that advertising income.

Ordinary new licensing backend is bounded at 0–20%. Negotiated quoted acquisitions retain the existing independent 62% cash negotiation floor, with per-title floors for produced catalogue packages. Contingent estimates cannot replace required cash. Zero, negative, nonfinite or unfunded promises are rejected at the applicable submit/signing boundaries; 90% ordinary backend cannot be signed. Existing full transfers retain their signed financial clauses.

New deals no longer add a separate viewership success bonus. Existing signed royalties, caps, advances/recoupment, settlement counters and legacy bonus promises remain intact. Missing saved policy is treated as legacy. Actor/talent participation is unchanged. Funded Original ownership/producer participation remains a separate production obligation, explicitly classified rather than silently deleted or relabelled as licensing backend.

A proven already-funded premiere continuation reuses its paid funding and cannot collect another upfront fee; an unfunded title cannot use that exception.

## Turning ads or rentals off

For new receipt-based contracts, stopping a mode stops its future eligible receipts and new backend on that source. It does not refund the sunk upfront fee, erase earned payables, reset paid counters or remove the signed percentage. Turning an allowed mode back on resumes actual-receipt settlement at the same percentage. Title grants and market suspension remain authoritative. Old signed contracts continue under their existing clauses.

## Exploit and accounting fixes

- New royalties use the actual weekly receipt engine; the old synthetic view/profit attribution path cannot pay them again.
- Duplicate receipts, processed weeks, repeated signing and seller-credit replay do not pay twice. Caps apply cumulatively to both eligible sources.
- Zero-backend drafts and AI eligibility survive save normalization. Outgoing sublicences use buyer/seller percentages in the correct direction.
- A produced catalogue package closes after one accepted package buyer instead of selling the entire package repeatedly through one bidding session.
- Three automatic AI acquisition paths now convert full currency to cash-reserve millions correctly. Malformed negative funding and unfunded bids cannot credit the seller before a valid contract exists.
- A paid legacy success bonus now carries durable obligation state through full transfers, JSON reload and bounded local-history pruning. Payment IDs, progress, deadlines and resolved state are preserved. New sublicences do not copy upstream bonus/production promises.
- Content cost is recognized only up to its paid basis. Amortization does not restart at 104 weeks and does not move cash a second time. Maintenance reduces Finance profit once.

## Balance method and what the numbers mean

All 15 scenarios ran the real game-week processor, committed launch, household choices, viewing, billing, royalty settlement and Finance projection. The suite checked **732 simulated weeks**.

The 26-week matrix uses 6 or 24 licensed titles at quality 50 or 95, distributed across up to 17 genres, plus one original with a real $5M production basis. Prices are $7.99 monthly subscription, $2.99 rental, or 4 ad minutes/hour. The three-city network has 9 racks and $33.75M initial capital cost. Full quoted licence cash, actual operating costs, exact licensing backend and finite content expense are included. Premium first-window licences cost $15M per title in these fixtures.

Long cases use 12 premium licences for 104 weeks in subscription/ads. The 212-week rental case uses 6 premium second-window titles, pays for 6 replacement titles at week 105 and continues past expiry. Replacement titles are paid new inventory, not a free freshness reset. No production cost or audience-budget boost was added to make the results profitable.

Each case starts with $3B **test equity capital**, excluded from earnings. This keeps the comparison funded; it is not an assertion that an ordinary starting player can finance this catalogue. These are unlevered cases with no borrowing interest. Household monthly subscription and residual weekly discretionary budgets are shared across all competing services and consumer purchases.

**Finance profit** below sums weekly revenue minus cash operating expense, content amortization and additional maintenance. The $85M incorporation spend occurs before the measured operating window and is not re-expensed there. **Cash surplus after all investment** compares final treasury with the original $3B: it includes upfront licences, the $5M original, network capital, incorporation, paid replacement catalogue and ongoing cash costs once. Positive operating P&L is therefore not the same as full investment payback.

| Scenario | Weeks | Revenue | Finance profit/loss | P&L margin | Cash surplus after all investment |
|---|---:|---:|---:|---:|---:|
| SUBSCRIPTION-C6-Q50 | 26 | $2,329,027 | −$22,052,972 | -946.9% | −$188,285,982 |
| SUBSCRIPTION-C6-Q95 | 26 | $14,725,789 | −$20,795,583 | -141.2% | −$210,577,141 |
| SUBSCRIPTION-C24-Q50 | 26 | $10,121,077 | −$60,565,686 | -598.4% | −$357,997,726 |
| SUBSCRIPTION-C24-Q95 | 26 | $44,952,630 | −$66,496,920 | -147.9% | −$458,123,152 |
| ADVERTISING-C6-Q50 | 26 | $3,016,337 | −$22,184,392 | -735.5% | −$188,417,402 |
| ADVERTISING-C6-Q95 | 26 | $4,144,438 | −$29,537,952 | -712.7% | −$219,319,510 |
| ADVERTISING-C24-Q50 | 26 | $3,479,808 | −$66,239,762 | -1903.5% | −$363,671,802 |
| ADVERTISING-C24-Q95 | 26 | $5,035,286 | −$97,221,139 | -1930.8% | −$488,847,371 |
| STORE-C6-Q50 | 26 | $18,232,575 | −$12,570,037 | -68.9% | −$178,803,047 |
| STORE-C6-Q95 | 26 | $75,043,684 | +$14,417,368 | 19.2% | −$175,364,190 |
| STORE-C24-Q50 | 26 | $30,939,888 | −$49,056,003 | -158.6% | −$346,488,043 |
| STORE-C24-Q95 | 26 | $114,595,875 | −$29,413,441 | -25.7% | −$421,039,673 |
| SUB-104 | 104 | $195,134,554 | −$70,621,914 | -36.2% | −$385,671,914 |
| ADS-104 | 104 | $40,783,321 | −$192,836,299 | -472.8% | −$311,586,299 |
| RENT-212 | 212 | $801,191,571 | +$274,409,262 | 34.3% | +$155,659,262 |

The 15 cases include **2 positive Finance-P&L cases** and **1 case recovering all investment** within their measured horizons. These are deliberately different costs, qualities and horizons, not a probability of success.

A larger catalogue can increase receipts without increasing them in proportion to acquisition cost. Premium quality improves audience appeal but costs more; it does not guarantee profit. Expensive licensed ad-only programming is not sustainable in this measured footprint. Rental results show a viable route without unlimited household spending or free licence cash.

Full weekly records, exact costs, royalty totals, joins/cancellations and scenario summaries are retained in the evidence archive. Rental transaction counts and ad impressions are repeatable events, not unique people; paid-plan subscribers remain zero on pure rental/advertising services.

## Verification

- New policy kernel: 9/9 checks.
- New real-week/signing/mode-switch/AI settlement integration: 16/16 checks.
- Legacy exact signed royalty coverage: 26/26 checks, including caps, advances, archival seller credits and talent/investor participation.
- Finite content accounting and Finance reconciliation: 26/26 checks.
- Produced-title AI bids, auction funding, funded Originals delivery, package signing, subsidiary upfront settlement, rights transfer chains, calendar renewals, save normalization and Content Market CM1–CM4 pass.
- 85 selected regression suites: 80 pass, 5 pre-existing failures. The 85 suite results include the targeted suites above; these counts should not be added as though they were independent suites.
- 15/15 balance scenarios; 732 weekly assertions passed.
- Final `tsc --noEmit`, `npm run build`, Content Market UI transplant audit and `git diff --check`: exit 0. Existing build bundle-size/Browserslist warnings remain.

The five baseline failures are `award-competition` (year-boundary schedule), `streaming-contract-foundation-phase1` (incomplete AI fixture accessing active countries), `talent-instability-ui` (stale Talent Stability text assertion), `project-investors` (stale Lead Investor text assertion), and `mod-talent-supplement` (stale save-version 19 assertion).

For the first two, a read-only esbuild overlay reran the pre-task source snapshot and reproduced the failures, verifying each substituted file hash. For the other three, the failing test and target source are byte-identical to the pre-task snapshot. They were not suppressed or repaired as part of this scope.

## Browser verification

The browser used the real HQ and Content Market components with an isolated React-state-only development career. No real save slot was read or changed. The single percentage is visible with the actual ads+rental basis; repeated controls clamp at 0% and 20%. Submitted terms persisted; pending offers did not charge treasury. A fixed-price licence debited $55M once ($500M→$445M) and showed an acquired/registered catalogue confirmation. Subscription-only showed 0% with both percentage buttons disabled and a fixed-fee explanation.

The skeletal market browser fixture needed its incomplete studio removed before running full weeks. This is an isolated harness correction; separate studio/actor audits cover those paths. The production engine stayed unchanged during the final regression and balance run. A final cash-only explanatory UI sentence was adjusted after the full regression; the UI audit, typecheck and build were rerun afterward. `final-verification-state.json` records the exact scoped differences and source hashes.

![One combined ads and rental backend](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-ads-rental-backend-20261018/ui/single-backend.jpg)

## Scope and handoff

Implementation and covered settlement paths are ready for local gameplay review. This is not an unconditional whole-game release certification while five baseline audits remain failing, nor a promise that every pricing/catalogue strategy makes money. No native-device run was performed in this turn. No commit, push or deployment was made. Unrelated dirty work was preserved. No typography redesign or new design-warning suppression was introduced.

Evidence: [all scenario numbers](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-ads-rental-backend-20261018/all-scenarios.csv), [verification summary](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-ads-rental-backend-20261018/verification-summary.json), [baseline comparison](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-ads-rental-backend-20261018/baseline-checks/results.json), [source diff](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-ads-rental-backend-20261018/task-diff.patch). The archive also contains raw weekly scenario JSON, regression logs, failing-before/passing-after exploit tests and before/after copies of task-edited source.
