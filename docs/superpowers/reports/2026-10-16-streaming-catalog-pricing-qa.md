# Streaming catalog pricing and live revenue test report

16 October 2026 · Local checkout `a63537102659d8be8d55980b1a1f53f3086df96d`

**Verdict: full green light withheld.** Catalog selection updates the pricing forecast, and ongoing customer movement responds to catalog and price changes. Actual launch seeds paid subscribers through a separate calculation that ignores price and catalog attractiveness. This inflated starting population reaches real first-week subscription receipts. The premiere also displays an independent account count that does not reconcile with the saved launch result.

| Area | Result |
| --- | --- |
| Catalog acquisition and return to Define the Launch | PASS in browser |
| Eligible catalog changes update pricing forecasts | PASS |
| Price edits update demand and plan mix | PASS |
| Monthly and annual paths and country totals | PASS in focused suites |
| Territory, access-mode, future and expired rights | PASS |
| Ongoing catalog additions, removals and restoration | PASS in 48 simulated weekly turns |
| Paid, free-ad, store and hybrid live revenue routes | PASS in commercial suites |
| Launch population responds to chosen price and available catalog | FAIL |
| Premiere result agrees with saved launch facts | FAIL |
| Existing audit suites | 27 PASS, 1 FAIL |
| Additional custom checks | 118 PASS |
| TypeScript check | PASS with `npm run lint` |
| Additional launch regression gates | 2 FAIL, reproducing the launch defect |

## Browser catalog and pricing results

The real `StreamingPlatformHQ`, Define the Launch, Content Desk and Content Market components ran against a disposable deterministic player. The test did not load or overwrite a real career save. The existing Vite listener on port 5186 was confirmed to belong to this checkout; the normal game tab displayed Actor Empire 2.0 and version 1.0.25.

| Browser action | Observed result |
| --- | --- |
| Choose Subscription with no catalog | 550 conditional households and about $4.19K potential monthly gross; missing-catalog warning |
| Import the eligible studio title The Last Light | Catalog changes from 0 to 1 available title and from 0 to 2 estimated hours; 2 of 2 opening markets covered |
| Try the same import again | Duplicate import disabled; studio source reports 0 ready titles |
| Check company treasury | Remains $500M after the internal import |
| Return automatically to launch and open Pricing | Subscription selection retained; forecast rises to 12.9K households and $97.8K per month |
| Raise Essential from $7.99 to $79 | Essential share falls from 100% to 0%; Standard wins 97%, Premiere 3%; total forecast becomes 5.2K households and $65K monthly |
| Visit Content Desk and return again | $79 price, plan mix and $65K forecast retained |
| Choose Free with ads | Breakdown reports 0 monthly and 0 annual paid subscribers; free viewing and conditional ad opportunity are separate |
| Switch to Rent or buy | Confirmation appears; store offer uses rental/purchase prices and reports 0 recurring paid subscribers |

The pricing rail briefly shows an estimate at the prior audience during an edit, then settles to the same value as the main forecast. The settled values reconciled. Empty-catalog forecasts are explicitly conditional opportunity estimates; the launch blocker remains visible and the displayed amount is not earned cash.

Browser launch walkthrough: Opening Programme → Begin Opening Night → GO LIVE → premiere → live HQ → advance a real `processGameWeek` → Finance. Live title views and earned revenue appeared. The tested browser tabs reported no captured console errors.

## Launch defect and first week revenue impact

**Priority P1.** The following variants use the same US launch-ready career, delivery network, readiness score, three-entry opening slate and launch option. Prices are applied to every paid tier. Additional titles are eligible licensed catalog additions; the opening slate remains identical.

| Eligible licensed titles | Every plan monthly price | Pricing forecast paid accounts | Saved opening paid subscribers |
| --- | ---: | ---: | ---: |
| 2 | $7.99 | 17,987 | 365,700 |
| 2 | $79 | 1,810 | 365,700 |
| 32 | $7.99 | 334,113 | 365,700 |

The title counts exclude the separate opening Original. All three launch variants pass readiness and commit successfully. A forecast need not predict an opening exactly; the defect is that large changes in price and eligible catalog change the commercial forecast while leaving actual launch demand completely unchanged.

Two variants then ran the real game weekly processor:

| Every plan monthly price | Paid accounts after first real game week | Weekly subscription revenue booked |
| --- | ---: | ---: |
| $7.99 | 365,700 | $641,078.38 |
| $79 | 365,700 | $6,332,207.60 |

Revenue is being calculated and settled, but its initial paying population is not validated by the pricing/catalog demand model. Raising the price increases the first-week booked revenue by about 9.9 times while preserving the same account count.

Root cause:

- [streamingLaunch.ts](</Users/zeesh/Vibe code/Actor empire/services/streamingLaunch.ts:82>) computes paid seed as likely concurrent streams × `(2.45 + readinessScore / 100)` × conversion multiplier whenever a subscription offer exists. It does not evaluate price, billing affordability, rivals or catalog appeal.
- [streamingLaunch.ts](</Users/zeesh/Vibe code/Actor empire/services/streamingLaunch.ts:422>) commits this result to the launch record and subscriber metrics.
- [worldStreamingCustomers.ts](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingCustomers.ts:189>) scales customer cells to that seed, and initialization reads it from platform metrics. The seed therefore propagates into subscription receipts.

The red regression gates are `Launch paid accounts respond to price` and `Launch paid accounts respond to eligible catalog additions`. Their full inputs and outputs are in [launch regression results](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/launch-regression-results.json). The actual first-week outputs are in [full weekly results](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/launch-full-week.json).

## Premiere account display mismatch

**Priority P2.** The browser premiere reports about **489K accounts**, while the saved launch state and live HQ report **365,700 paid subscribers**. A subscription-only repeat rules out a free-ad audience as the explanation.

[StreamingPremiereExperience.tsx](</Users/zeesh/Vibe code/Actor empire/components/streaming-transplant/StreamingPremiereExperience.tsx:421>) calculates its own `subsGained` from its simulated target multiplied by 3.1. [StreamingPlatformHQ.tsx](</Users/zeesh/Vibe code/Actor empire/components/StreamingPlatformHQ.tsx:2138>) closes the experience without applying that result to the committed launch. The cinematic and saved launch therefore report independently calculated facts.

![Premiere account count and isolated saved paid count](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/premiere-summary-subscription.jpg)

## Ongoing catalog response

Six controlled scenarios used the same existing customer state and world seed. Each ran eight consecutive turns through canonical competition, customer movement, viewing, platform economy and owned-platform weekly settlement. These 48 component-level weekly turns are separate from the full `processGameWeek` launch checks above.

| Scenario | End of week 8 paid accounts | Week 8 subscription receipts |
| --- | ---: | ---: |
| Keep broad catalog | 1,227,903 | $2,153,250.20 |
| Remove all playable catalog | 40,559 | $70,549.85 |
| Raise every tier to $79 | 123,867 | $2,145,227.51 |
| Keep only one playable title | 90,335 | $158,413.75 |
| Add 35 playable titles in week 4 | 994,035 | $1,743,139.78 |
| Restore removed catalog in week 4 | 983,099 | $1,723,963.47 |

Removal produced zero title viewing and more cancellations than the unchanged control. Adding content produced joins and improved retention over the thin-catalog control. Restoration brought viewing and subscriber growth back. Existing subscribers cancel over time, so removing catalog does not instantly erase all subscription accounts or receipts.

The forecast matrix separately checks empty, one-title, broad, wrong-territory, expired, future-start and expensive catalogs. Wrong-territory, expired and future titles did not improve US demand. Monthly plus annual buyers and per-plan totals reconciled. All 118 custom checks passed. See [custom results](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/custom-results.json).

## Additional commercial coverage

Fresh existing suites covered subscription, free-ad, store-only and hybrid models; zero recurring receipts for free/store models; delivered viewing before ad income; ad inventory and advertiser budget limits; ad-free passes; valid rental/purchase routes and durable entitlements; early windows; unopened countries; country totals; capacity and outages; save migration and compaction; signed first-live-week save/load; duplicate billing partitions; immutable same-week settlement; and the real weekly processor order.

The named results and individual exit codes are in [audit results](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/audit-results.json). All raw logs are stored beside that file.

The existing `audit:streaming-launch-draft-continuity` exits 1 because strict object equality distinguishes an absent `commercialOffers` property from an added `commercialOffers: undefined` property. A supplemental test that compares serialized values passes the remaining snapshot independence checks. Browser detours also retained the edited price and commercial model. The original failing suite remains unmodified and is not counted as a pass. See [original failure](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/streaming-launch-draft-continuity.log) and [supplemental semantic test](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/continuity-semantic.log).

The Finance walkthrough also verified that maintenance cash movements are present in the ledger. In the controlled subscription-only week, three automatic maintenance entries total $3.18M; these explain why treasury falls despite a positive operating contribution. This is not missing subscription revenue. Operating-summary opening cash excludes those separate maintenance entries, so it should not be read as the actual prior week's bank balance. See [accounting details](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/accounting-detail.json).

## Reproduction and green light conditions

Run commands from `/Users/zeesh/Vibe code/Actor empire`:

```sh
python3 '/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/run-audits.py'
./node_modules/.bin/esbuild '/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/custom-audit.ts' --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/streaming-catalog-connection.mjs
node /tmp/streaming-catalog-connection.mjs
./node_modules/.bin/esbuild '/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-qa-evidence/launch-regression.ts' --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/streaming-launch-regression.mjs
node /tmp/streaming-launch-regression.mjs
```

The current launch-regression command should exit 1 with both gates false. To repeat the browser fixture, copy the supplied `.html` and `.tsx` fixture files into `scripts/fixtures`, start this checkout's Vite server, and open `/scripts/fixtures/streaming-catalog-pricing-qa.html`. Use `?ready=1` for the launch-ready career and `?ready=1&subscription=1` for subscription-only premiere reproduction. The fixture has no save-slot persistence.

Green light requires actual launch demand to use the same eligible commercial inputs as pricing/customer choice, both red launch gates to pass, first-week receipts to use a validated customer count, and the premiere/HQ/receipt to agree on one committed result. Then replay catalog imports, price edits, all commercial models, catalog change weeks and save/load checks.

This is a local browser and deterministic simulation assessment. Native iOS/Android device behavior and long-session release performance are outside this functional verdict. No production gameplay code, real career saves or existing audit assertions were changed.
