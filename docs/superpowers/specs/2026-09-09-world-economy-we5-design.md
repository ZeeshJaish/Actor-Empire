# World Economy WE5 — Persistent Streaming Customers Design

**Date:** 2026-09-09
**Status:** Approved for implementation
**Roadmap:** `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

## Purpose

Turn WE4's current-week plan demand into persistent, explainable customer behaviour. WE5 owns aggregate joins, cancellations, reactivations, plan changes, platform switches, multi-service rotation, external account sharing, and platform-level piracy access. It does not create individual consumer records.

## Authority boundaries

- WE1 remains the only population and household authority.
- WE2 remains the only cohort, entertainment-budget, sharing-tendency, and piracy-tendency authority.
- WE3 remains the only streaming eligibility and streaming-budget ceiling.
- WE4 remains the desired current-week platform and plan allocation.
- WE5 owns the saved transition from last week's actual customer state toward WE4 demand.
- The existing owned-platform weekly loop continues to own revenue, operating costs, infrastructure, crises, treasury, title accounting, and weekly reporting, but consumes WE5's actual player movements and plan mix.
- WE6 will own title-level viewing, advertising inventory, and title-level piracy.
- WE7 will make AI company finance and strategy consume the shared audience state; WE5 still tracks every platform needed to reconcile switching.

## Recommended model

Use deterministic sparse aggregate cells. A cell represents a country, audience cohort, platform, and plan with non-zero actual accounts. The engine also keeps a bounded recently-lapsed pool so reactivation has memory. It must not save a person or household record.

WE4 is an equilibrium target, not an instant assignment. Each week WE5 calculates bounded transitions from the previous actual state toward the current target:

1. Validate and normalize the previous state.
2. Read current WE1-WE4 states and the canonical offer registry.
3. Reconcile offers and countries that appeared, disappeared, launched, or closed.
4. Calculate retained accounts, cancellations, joins, reactivations, upgrades, downgrades, switch-ins, switch-outs, and secondary-service rotation.
5. Calculate external shared households and piracy access from the same eligible cohorts.
6. Produce country, platform, plan, global, and player summaries.
7. Append a bounded snapshot and a bounded explanation ledger.

## Customer quantities

- **Paying accounts:** paid platform-plan contracts. Subscription revenue is calculated from these only.
- **Paying households:** unique households funding one or more accounts. A household may fund multiple platforms.
- **Profiles:** derived people/profiles covered by an account; not another subscription.
- **Active viewers:** derived people using access during the week; title allocation remains WE6.
- **External shared households:** households accessing another household's valid account; no extra subscription revenue.
- **Piracy reach:** people using an unauthorized access path; no direct platform revenue.

## Transition rules

- Starting accounts plus joins plus reactivations minus cancellations must equal ending accounts.
- An upgrade or downgrade moves an account between plans without changing the platform's total accounts.
- A platform switch is one linked movement with a source and destination. It contributes one source cancellation and one destination join, never two unrelated invented movements.
- A household may hold multiple platform accounts, but no more than one plan from the same platform.
- Movement is gradual. Acquisition is bounded by awareness and demand; churn is bounded by the current base and dissatisfaction.
- Introductory offers and plan tenure affect transition pressure without storing unbounded weekly vintages.
- Recently lapsed memory is bounded and expires into an aggregated older-lapsed pool.
- Deterministic absolute-week inputs prevent reload rerolls.

## Behaviour inputs

Transitions consume existing signals: exact price and discounts, plan features, advertising, catalogue depth, originals, releases, rights availability, localization, marketing, product research, reliability, infrastructure, crises, reputation, competitor moves, household budget, persona, loyalty, price sensitivity, entertainment appetite, and macroeconomic pressure.

Each aggregate movement stores one primary reason code from: `PRICE`, `PLAN_VALUE`, `CATALOGUE`, `RELEASE`, `LOCALIZATION`, `RELIABILITY`, `MARKETING`, `COMPETITOR`, `PROMO_EXPIRY`, `ROTATION`, `ECONOMY`, `SHARING_POLICY`, `PIRACY_ACCESS`, or `OTHER`.

## Sharing and piracy

External sharing uses WE2 sharing tendency, household structure, plan screen/device features, price pressure, and the platform's access posture. It increases reach and legitimate platform load but does not increase paid accounts.

Piracy uses WE2 piracy tendency, affordability, payment access, territorial availability, localization gaps, and enforcement strength. It creates zero subscription revenue. WE5 records country/platform access pressure and potential conversion; WE6 later assigns title-level activity.

The player receives two optional global controls with automatic defaults derived from the existing leadership strategy:

- sharing posture: `REACH_FIRST`, `BALANCED`, or `HOUSEHOLD_ONLY`;
- enforcement investment: `LIGHT`, `STANDARD`, or `AGGRESSIVE`.

These are platform-wide controls. There is no country-by-country or cohort-by-cohort micromanagement.

## Persistence and performance

- Save only non-zero active cells and bounded lapsed summaries.
- Keep at most 52 weekly global/player snapshots.
- Keep at most 12 player-facing weekly explanation rows per processed week and compress history to lifetime counters plus recent evidence.
- Use integer household/account allocation and currency-safe monthly revenue.
- Rebuild malformed state deterministically without changing player cash during migration.
- Existing saves seed actual membership from the current owned-platform subscribers and WE4 plan/country shares, preserving the saved subscriber total.

## Existing integration

- `services/worldEconomy/worldStreamingCompetition.ts` supplies WE4 targets.
- A new `services/worldEconomy/worldStreamingCustomers.ts` owns WE5 state, transitions, reconciliation, normalization, and selectors.
- `services/gameLoop.ts` advances WE5 after WE4 and before owned-platform weekly economics.
- `services/streamingWeeklyLoop.ts` consumes WE5 player movement, actual accounts, actual plan mix, and access load. Its legacy acquisition/churn calculation remains only as a fallback when no eligible WE5 player offer exists.
- `services/streamingEconomyCore.ts` remains the revenue/cost authority.
- `services/streamingAnalytics.ts` consumes canonical WE5 waterfall, plan movement, switching, sharing, and piracy summaries instead of reconstructing customer behaviour when WE5 is available.
- `services/streamingAudienceMarket.ts` projects canonical WE5 paying and access quantities.
- Existing Audience Market, Analytics Center, Weekly CEO report, Platform Wars, leadership, Product Lab, Technology Campus, infrastructure, and finance surfaces are extended; no duplicate management app is added.

## Player-visible result

- Weekly CEO results explain joins, cancellations, returns, upgrades, downgrades, switch-ins, switch-outs, sharing pressure, piracy pressure, and the strongest causes.
- Audience Market distinguishes paying accounts, paying households, active viewers, shared external households, piracy reach, country movement, and plan mix.
- Analytics displays canonical subscriber waterfall, retention vintages, plan movement, reactivation, and switching.
- Finance bills only actual paid plan accounts. Shared access may increase platform load; piracy never becomes subscription revenue.
- Pricing, releases, crises, competitor action, and enforcement take effect over time rather than instantly rewriting the customer base.

## Migration and recovery

- Bump the save migration version.
- Missing WE5 state is seeded deterministically after WE4 normalization.
- Seeding preserves owned-platform subscriber count, treasury, and existing weekly history.
- Invalid counts, broken plan IDs, missing platforms, impossible country totals, or malformed snapshots trigger deterministic repair.
- Repeated normalization at the same absolute week is idempotent.

## Completion gate

- Subscriber waterfalls reconcile at plan, platform, country, player, and global levels.
- Upgrades and downgrades do not fabricate platform accounts.
- Switches reconcile their source and destination.
- Sharing and piracy never count as subscription revenue.
- Accounts, households, profiles, viewers, external sharing, and piracy remain distinct.
- Weekly finance, Audience Market, Analytics Center, and CEO reports agree.
- Save/reload does not reroll results.
- Existing saves preserve cash and subscribers during migration.
- A deterministic 400-year projection remains bounded and mobile-safe.
- Casual players require no cohort micromanagement.

## Explicit exclusions

- No individual consumer records.
- No title-level watch allocation, completion, advertising inventory, or piracy allocation; those belong to WE6.
- No replacement of AI company finance and strategic decision authority; that belongs to WE7.
- No full long-run economy rebalance beyond the safety required for WE5; that belongs to WE8.
