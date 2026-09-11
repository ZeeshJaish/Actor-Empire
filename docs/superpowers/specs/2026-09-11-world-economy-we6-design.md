# World Economy WE6 — Viewing, Content Demand, and Revenue Attribution

**Date:** 2026-09-11
**Status:** Approved for implementation
**Roadmap:** `docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md`

## Purpose

WE6 translates the finite audience access produced by WE5 into title-level attention, engagement, and commercial results. It deepens the existing owned-streaming title telemetry rather than creating a parallel audience or finance model.

## Architectural boundary

The new `worldStreamingViewing` state is a deterministic, sparse weekly ledger. The first canonical consumer is the player platform; the interfaces remain platform-neutral so WE7 can run the same allocator for every AI and generated platform.

Weekly order is:

1. WE1–WE4 establish population, cohorts, participation, offers, and competition.
2. WE5 commits customers, plans, sharing, piracy reach, and paid subscription revenue.
3. WE6 filters the player's live catalogue by country rights, release status, plan access, and localization, then allocates viewing and transactions.
4. The existing owned-platform weekly processor consumes WE5 customer facts and WE6 title/revenue facts to settle cash, infrastructure load, analytics, and the CEO report.

The same absolute week is immutable. A save reload cannot reroll viewing or revenue.

## Canonical inputs

- WE1 country population and language facts.
- WE2 country/cohort preferences, budgets, price sensitivity, local affinity, sharing, and piracy tendencies.
- WE3 streaming participation and barriers.
- WE4 platform offers and competition.
- WE5 exact customer plan cells, shared viewers, piracy reach, and movement reasons.
- Canonical catalogue, rights contracts, release calendar, release runs, originals, and licensed titles.
- Project genre, quality, talent, franchise/universe, marketing, buzz, awards, and recency signals where available.
- Platform pricing streams, exact plans, discounts, advertising terms, rentals, purchases, premium access, day passes, sponsorships, recommendation technology, localization research, and reliability.

## Availability rule

A title may receive legitimate viewing only when it is delivered, released, live on the platform, within its rights window, and covered in the evaluated country. A missing subtitle or dub does not invent availability; it reduces comprehension, starts, and completion according to the platform-wide localization capability and the country's language profile.

Unserved demand remains explicit. It may become competitor viewing, piracy, or no viewing rather than being forced into an available title.

## Demand model

For each player country and WE5 cohort, the engine forms a finite weekly attention budget and scores eligible titles using:

- genre and audience fit;
- local-language and cultural fit;
- project quality and audience reception;
- talent, franchise, and universe appeal;
- marketing, social buzz, media narrative, and awards;
- freshness, release pattern, and catalogue fatigue;
- platform recommendation technology and discovery decisions;
- accessibility, playback reliability, and price/access friction;
- competing releases and the option to watch nothing.

Scores allocate integer viewing accounts and starts without exceeding the cohort's accessible audience or weekly attention. Completion and repeat viewing are independently derived from quality, fit, runtime, release pattern, satisfaction, and deterministic outcome variance.

## Canonical outputs

WE6 stores bounded current-week and historical summaries for:

- title starts, viewing accounts, estimated viewers, watch hours, completion, repeat viewing, and abandonment;
- paid, shared, and pirated viewing paths;
- country performance and discovery mix;
- acquisition and retention attribution;
- ad impressions and advertising revenue;
- premium-access, rental, and purchase transactions and revenue;
- sponsorship impressions and earned sponsorship revenue;
- subscription-value attribution, cash cost, amortization, cash contribution, and accounting contribution;
- unmet demand and infrastructure stream load.

## Revenue ownership and reconciliation

- WE5 alone creates paid subscription revenue. WE6 may attribute that revenue to titles but never create it again.
- Ad-tier subscribers may legitimately create subscription and advertising revenue.
- Shared access produces viewing and infrastructure load but no extra subscription payment.
- Piracy produces reach and possible lost transactions, but no direct revenue.
- Premium access, rentals, and purchases require an enabled commercial stream, an eligible title window, audience affordability, and an actual modeled transaction.
- Sponsorship revenue is earned from eligible delivered impressions and cannot exceed configured contract value.
- Title totals reconcile to the platform weekly totals; platform totals reconcile to the owned streaming weekly finance result.

## Existing-system reuse

The implementation reuses `streamingContentAvailability`, canonical rights compatibility, `streamingCatalog`, originals/slate records, release calendar/runs, global localization, pricing configuration, marketing/growth actions, project facts, `streamingWeeklyLoop`, `streamingTitleAnalytics`, `streamingAnalytics`, the Content Desk, and the CEO report. The current flat title-weight block remains only as a legacy fallback when no valid WE6 outcome exists.

## Player experience

The player manages existing levers—catalogue, rights, release strategy, localization research, pricing, commercial streams, marketing, recommendations, and infrastructure. There is no country/cohort micromanagement.

The Content Desk, Title Dossier, Analytics Center, and weekly CEO report surface the same canonical outcomes: top title, watch hours, completion, repeat viewing, countries, discovery, acquisition/retention value, advertising and transaction revenue, piracy, unmet demand, and momentum.

## Persistence and performance

- Store sparse player-title/country summaries rather than viewer records.
- Cap weekly snapshots at 52 and keep bounded material title history through the existing platform weekly history.
- Normalize malformed cells and rebuild deterministically from canonical inputs.
- Preserve old cash, subscribers, catalogue, and prior title telemetry during migration.
- Verify deterministic JSON reloads and a 400-year checkpoint horizon with finite, non-negative, reconciled results.

## Non-goals

- No individual-person simulation.
- No duplicate population, subscription, rights, localization, or release engine.
- No full AI-platform viewing settlement until WE7.
- No cinema attendance or box-office allocation until WE9.
- No manual cohort controls.

## Completion gate

- No title receives legitimate demand where it is unavailable.
- Cohort attention, title totals, platform totals, and revenue streams reconcile.
- Subscription revenue is attributed but never duplicated.
- Advertising and transactions come from canonical eligible activity.
- Local, niche, prestige, fandom, mass-market, and high-hype/low-completion outcomes can emerge.
- Existing player-facing streaming surfaces consume the same WE6 facts.
- Migration, same-week idempotency, malformed recovery, long-run, TypeScript, production build, and diff checks pass.
