# Competitive Streaming Platform AI Phase 6 Design

## Status

Approved on 2026-08-30 for inline implementation. This design completes the existing release foundation; it does not replace canonical projects, the rights system, the awards system, or the Phase 5 economy.

## Goal

Move every valid commissioned, licensed, owned-studio, and catalogue title through a legally valid streaming release, settle its audience effects exactly once, and feed bounded evidence into future AI decisions.

## Invariants

- A release always references one canonical `IndustryProject`.
- A platform never creates a duplicate theatrical or streaming project.
- Existing box office is preserved. A commissioned streaming original remains `STREAMING_ONLY` with zero theatrical box office.
- Contract territory, start, expiry, exclusivity, holdback, localization, active-market, rollout, and delivery-capacity rules are checked at schedule time and again at release time.
- A weekly or split-volume series uses one project and one streaming window; installment weeks are evidence attached to that window.
- Release performance never invents direct subscription-title revenue. It produces audience acquisition, retention, churn, engagement, catalogue, reputation, and awards effects; Phase 5 settles the resulting platform economics.
- All saved decisions and results are deterministic, bounded, idempotent, and migration-safe.
- Acquired platforms keep historical state and signed commitments but lose AI scheduling, learning, and operating advantages prospectively.

## Readiness passport

Each schedulable plan receives a persisted readiness snapshot containing:

- canonical project IDs and content route;
- production delivery proof for originals;
- exact contract bindings for non-originals;
- contract start, expiry, territory, and complete-rollout coverage;
- active release countries;
- required localization jobs and latest ready week;
- release capacity and planned title count;
- selected release pattern and installment weeks;
- an ordered list of blockers and the week the snapshot was evaluated.

The passport is diagnostic evidence, not an entitlement. Release revalidates the live canonical records.

## Strategic premiere selection

The AI evaluates the next 52 weeks and selects the highest deterministic score rather than the first legal week. The score balances:

- rights-expiry urgency;
- plan commercial and prestige forecasts;
- awards-season suitability for prestige titles;
- self-cannibalization from same-genre or same-audience releases;
- total platform release congestion;
- marketing scale;
- platform strategy competence and a small persisted deterministic judgement error.

Illegal weeks are never scored. Equal scores use the earliest week, then stable plan identity.

## Streaming outcome

Performance is calculated per active release country and then aggregated. Each regional row records reach, appreciation, completion, views, commercial score, and net subscriber impact. Inputs include project quality, plan forecast, platform competence, reputation, subscriber scale, recommendation technology, localization comprehension, genre/audience fit, marketing, congestion, and deterministic variance.

The aggregate separates:

- acquired subscribers;
- retained subscribers;
- churned subscribers;
- net subscriber impact;
- engagement delta;
- catalogue-strength delta;
- commercial and prestige scores;
- `HIT`, `SOLID`, or `FLOP` outcome.

The existing Phase 5 audience queue settles the net subscriber impact on the following economy week exactly once. Reputation, recent-hit, catalogue, and learning mutations are also idempotent.

## Series rollout

The streaming window owns its complete deterministic installment calendar. Contract and localization readiness must cover every installment. Phase 6 stores a cumulative season outcome and rollout evidence without creating episode projects. Phase 7 remains responsible for richer week-by-week presentation and orchestration.

## Awards

The canonical `IndustryProject.awardProfile` continues to feed `awardLogic.ts`. Award history is observed by stable project and award keys. No parallel Platform AI awards engine is allowed.

## Bounded learning

Recent release evidence is limited and weighted. The runtime stores readable beliefs for:

- genres and audiences;
- countries/regions;
- localization modes;
- actor-director pairings;
- release patterns;
- commercial and prestige conversion;
- production delay and cancellation outcomes.

One release changes an existing belief by at most 20 points and effective competence by at most 0.05, with total drift clamped to +/-0.5. Lower strategy competence may place more weight on the latest result, but no single result erases company identity.

## Player-facing boundary

Phase 6 exposes compact release/readiness/outcome presentation data and significant news records. Full rival dashboards, continuous weekly explanation, and presentation polish remain Phase 7.

## Completion evidence

- Focused Phase 6 RED/GREEN audit.
- Existing release, rights-lifecycle, economy, turn, awards, save-migration, and save-transfer audits.
- Deterministic replay of schedule, release, settlement, learning, and save normalization.
- Production build and `git diff --check`.
