# Streaming launch S4.1 — monthly and annual buyer cohorts

## Outcome

The economy no longer tests every household against a price nobody actually pays. Each country/audience cohort is partitioned into monthly (67%) and annual (33%) buyers before affordability, plan choice, and rival competition. Monthly buyers use the applicable introductory price for its first 13 weeks; annual buyers use their discounted monthly equivalent. Country and plan totals reconcile back to the unsplit household counts. Player and AI offers use the same rule.

Weekly customer state now retains the billing path for each buyer cohort. Monthly subscription revenue is calculated from the corresponding path price. The launch first-year forecast likewise uses actual monthly/annual plan allocations: monthly buyers contribute three introductory months plus nine mature months, and annual buyers contribute twelve annual-equivalent months. The plan editor shows both affordability and buyer counts, and explicitly identifies the old blended price as a reference average, not a charge.

Version-1 customer saves migrate to schema 2 deterministically. Existing account, tenure, household, snapshot, movement, and historical treasury totals are not replayed or erased. The migration partitions accounts and recalculates *current* subscription run-rate at the path prices; it does not rewrite previously settled cash. A same-week reload is idempotent.

Annual billing remains a monthly-equivalent accrual model. There is no new upfront twelve-month cash collection, renewal contract, or annual-price lock; those would be a separate economy decision.

## Balance and verification

- Controlled $9-budget/$17.99 Premiere with a 50% targeted intro: the former blended-affordability model attracted **0 of 100** households. The path model attracts **57 monthly buyers** ($512.43 monthly-equivalent revenue) and **0 annual buyers**. The remaining cohort does not buy a plan above its budget.
- The existing worldwide pricing fixture was **5,185,763** normal-price subscribers in S4 and is now **5,203,108** (+17,345, about +0.33%); its current subscription run-rate is **$48,807,593.84/month**, with a **$710,869,190.28** first-year constant-allocation projection. The old S4 audit did not record a worldwide revenue baseline, so no worldwide revenue delta is claimed. The $78-only variant now has 458,969 subscribers. All are simulated fixture outputs, not live-player forecasts.
- `npm run audit:streaming-billing-cohorts` passes path affordability, integer reconciliation, year-one math, cache rebuild, synthetic version-1 migration, next-week movement, duplicate-cohort repair, and plan-card markup.
- `npm run audit:streaming-pricing-world` passes player/AI path prices, targeted promotions and expiry, live customer cells, Build demand, and local fallback pricing. `npm run audit:world-streaming-we4-ui` and `npm run audit:world-streaming-we5-ui` pass after correcting a WE4 test fixture that supplied current WE5 customer data while expecting the older competition headline.
- Build, launch marketing, commercial economy, opening programme, save migration/integrity/generation/mirror/transfer, launch Phase 8, and weekly-loop Phase 10 audits passed during this implementation. Final fresh checks: 8 GB TypeScript `--noEmit`, production Vite build, save migration, focused billing/pricing/WE5 audits, and scoped `git diff --check` all passed. Build retains existing missing-at-build-time `index.css`, mixed import, and large-chunk warnings.
- The isolated pricing fixture loaded in the local in-app browser at **327 px** width. I expanded Premiere: it visibly showed $17.99 list, $8.99 monthly introduction, $17.99 annual equivalent, $11.96 reference blend, 100% monthly affordability / 0% annual affordability, and 15,301 monthly / 0 annual projected buyers. DOM width equalled scroll width (327 px), with no horizontal page overflow. This was not a full saved-career click-through.

## Remaining limits and inherited failures

- `audit:world-streaming-we4`, `we5`, and `we6` main scripts have the pre-existing brittle source-text check looking for `const ownedStreamingResult = processOwnedStreamingPlatformWeek`; the current game loop, including at `HEAD`, uses a `let` declaration and later assignment. These scripts are not marked green. Their UI-specific audits and the dedicated new customer audit provide independent coverage here.
- The first-year figure holds opening account counts and plan mix constant; real weekly joins, churn, and promotions can change it.
- The full career route at phone heights and a real persisted old save remain launch-QA follow-ups; the migration was exercised with a realistic synthetic version-1 state through the save-migration entry point.

No commit or push was made. Existing unrelated dirty work was left in place.
