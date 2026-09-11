# World Economy WE6 Completion Report

**Date:** 2026-09-11
**Phase:** WE6 — Viewing, Content Demand, and Revenue Attribution
**Status:** Complete

## Outcome

WE6 now turns the finite accounts produced by WE5 into one deterministic, country-aware title economy for the player-owned streaming platform. The same committed result feeds weekly finance, title history, the Title Dossier, Analytics Center, and weekly CEO report.

## Canonical flow

1. WE1–WE3 provide country population, cohorts, budgets, and participation.
2. WE4 selects real services and player plans from that finite world.
3. WE5 owns persistent paid accounts, plan movement, sharing, piracy reach, and subscription cash.
4. WE6 checks title availability, rights, release timing, territory, and localization before allocating viewing.
5. The owned streaming weekly processor consumes the committed WE6 title result and settles incremental commercial cash once.

## Delivered behavior

- Sparse country/title/platform/global WE6 state with a stable player platform ID.
- Rights-safe viewing: unavailable territories receive no legitimate views.
- Demand scoring from quality, genre and persona fit, language/localization, fame/franchise, marketing, recency, release pattern, recommendation technology, reliability, and deterministic variance.
- Explicit watching accounts, estimated viewers, starts, hours, completion, repeat viewing, abandonment, acquisition value, retention value, and unmet demand.
- Separate paid, shared, and pirated viewing paths.
- Six reconciled discovery sources: homepage, recommendations, search, direct, marketing, and external buzz.
- Exact attribution of WE5 subscription revenue without creating new subscription cash.
- Incremental advertising, premium-access, rental, purchase, and sponsorship activity from eligible viewing and configured commercial terms.
- Canonical WE6 title performance replaces the older flat allocator when a current result exists; the old allocator remains a safe compatibility fallback.
- Existing Title Dossier, Analytics Center, and weekly CEO report expose concise WE6 evidence without cohort micromanagement.
- Save version 46 and owned streaming schema 25 preserve old cash, treasury, subscribers, and history while adding WE6 state.
- Same-week normalization and progression cannot reroll a valid committed result.
- Malformed negative or non-finite viewing/revenue data rebuilds deterministically.
- WE6 snapshots are capped at 52 entries.

## Measured verification

- Focused seed: 184,194 viewing accounts and 534,106 watch hours.
- 400-year horizon: 20,800 game weeks represented by 400 annual persistence checkpoints.
- Final WE6 state size: 19.4 KiB.
- Latest measured long-run audit: approximately 16.5 seconds for all 400 checkpoints in the local development environment.
- Production build: green.
- TypeScript: green.
- Week-processing save-safety audit: green.
- WE6 engine, real-render UI, weekly CEO-loop, save-migration, Phase 12 analytics, and Phase 13 title-analysis audits: green.

The long-run timing is an audit-harness measurement, not the time for a normal single-week player action. Normal saves retain only bounded WE6 summaries instead of 20,800 individual weekly records.

## Financial invariant

Subscription cash is owned by WE5 and counted once. WE6 may attribute that cash across titles for analysis, but only advertising, premium access, rentals, purchases, and sponsorship add new WE6 operating revenue.

## WE7 boundary

WE6 deliberately computes the player platform first behind platform-neutral summary interfaces. WE7 is responsible for connecting every real, generated, and later acquired AI platform to the same finite population, customer, viewing, and commercial economy while preserving ownership history and removing AI-only advantages after player acquisition.
