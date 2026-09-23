# Streaming Billing-Path Cohorts — S4.1 Design

Date: 2026-09-23
Status: approved in conversation for inline implementation

## Purpose and boundary

The world economy currently checks household affordability against a 33% annual / 67% monthly blended price. A monthly introductory offer can be affordable even when that average is not. S4.1 makes monthly and annual households choose and pay by their actual billing path in launch forecasts, world competition, and weekly customer state. It does not change the existing 33/67 mix, discount caps, utility coefficients, annual payment timing, treasury history, or unrelated streaming controls.

## Canonical model

- A plan offer exposes both its monthly-path price (including an applicable, unexpired introduction) and annual-path monthly-equivalent price (including its annual discount). Its existing blended price remains a display/legacy aggregate, not an affordability gate.
- Each country audience cohort is deterministically partitioned into monthly and annual household counts at the existing 67/33 mix. The two integer counts sum to the original reachable households. Each partition retains the same per-household budget and audience preferences.
- Competition chooses the best affordable plan for each platform independently in each billing partition. Utility, multi-service budget, spend, and revenue use that partition's actual price. Country and global plan totals aggregate both paths and expose the count of each path so first-year revenue applies the correct promotion schedule.
- The weekly customer state persists one customer cohort per `(country, audience cohort, billing path)`. Existing one-plan-per-platform movement logic remains scoped to a billing partition, so monthly and annual buyers cannot overwrite each other. Aggregate summaries, viewing, and Build demand still sum the same customer accounts once.
- Annual subscriptions continue to accrue at their discounted monthly equivalent. S4.1 does not collect a year upfront or change treasury cash timing.

## Existing save migration

Customer schema advances to version 2. On loading version 1, each saved cohort and each plan cell are partitioned deterministically into monthly and annual counts, preserving exact paid-account and tenure totals. The migration uses the current offer's path prices for the two new cells; it does not rerun acquisition, generate movements, append a snapshot, or book historical cash. The next weekly turn converges from those preserved counts. Version-2 reload at the same week is idempotent. Derived competition snapshots may be recomputed from the new model without touching historical cash or customer counts.

## Presentation and balance

The launch plan explanation identifies monthly-promo and annual affordability separately and shows their counts; a blended opening value is explicitly an average, not a charged price. First-year subscription revenue uses path-specific counts: monthly customers receive an applicable 13-week introduction and then list price; annual customers accrue their annual discounted price for 12 months. Existing Build demand uses the new canonical subscriber forecast without another multiplier.

Before/after fixture numbers and regression failures must be reported. A balance movement caused by the corrected eligibility is expected, but no coefficient should be tuned to hide it. The real saved-career flow remains an S6 gate if it cannot be completed here.

## Acceptance

1. A $9-budget cohort can buy an $8.99 monthly introduction even when the blended price is above $9; its annual partition cannot buy an unaffordable annual path.
2. Targeted player and AI promotions affect only their intended monthly plan and expire after 13 weeks. Annual-path pricing is unaffected by the monthly introduction.
3. Monthly + annual households, accounts, spend, plan counts, and revenue reconcile at country and global boundaries; no household spends beyond its budget.
4. Version-1 saves retain exact subscriber and tenure counts through migration; no treasury/history mutation; reload is idempotent.
5. Forecast, weekly customers, TypeScript, build, and applicable economy audits pass, with inherited failures named separately.
