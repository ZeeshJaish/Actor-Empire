# Streaming Platform Intelligence Migration B4 Design

**Date:** 2026-09-03  
**Status:** Approved for implementation  
**Roadmap phase:** Project B4  
**Scope:** Proposal-driven decisions for flagship, regional, and generated streaming operators

## Decision

B4 activates the shared B2 intelligence and B3 content-fingerprint layers for AI-controlled streaming companies. Intelligence decides *what the company wants to do*; existing canonical domain services continue to decide whether that action is legal, affordable, schedulable, and successfully executed.

The migration is parity-first and fail-closed. A B2 proposal is converted into one bounded platform intent, evaluated against the current canonical state, and routed to an existing executor. Rejected or impossible intents are recorded without inventing rights, projects, money, markets, or capability. Player-controlled platforms never receive the AI operating shortcut.

## Authority boundaries

- Project A remains the sole authority for rights eligibility, territorial conflicts, bidding-room lots, contracts, transfers, renewals, resale, and settlement.
- The existing 15-second bidding-room clock, six-second bidder cooldown, offer revisions, final/withdrawal states, and deal terms remain unchanged.
- Existing Platform AI services remain authoritative for production, player commissions, research, exact market entry, localization jobs, release scheduling, finance, distress, rescue, and acquisition handoff.
- B4 may provide appetite, valuation, source preference, genre, format, market priority, and affordability ceiling. It may not bypass a domain validator.
- Regional and generated operators receive private intelligence immediately. They may become canonical counterparties only when a bridge proves stable identity, branding, active territorial scope, adequate finance, and settlement support.

## Core decision flow

`platform identity and condition -> due B2 proposal -> linked B3 fingerprint -> B4 intent -> canonical feasibility -> existing executor -> outcome learning`

Only newly due proposals are considered. The old planning cycle no longer performs an unconditional catalogue scan and parallel strategy choice. Existing weekly lifecycle progression remains intact.

## Platform intents

One proposal produces at most one intent with a stable idempotency key and one of these routes:

- commission a platform original;
- invite an eligible player production studio through the existing SMS commission flow;
- license one released title;
- acquire a valid catalogue package;
- transfer eligible owned-studio content;
- research technology;
- research localization capability;
- enter one exact market;
- localize already committed content through the existing requirements engine; or
- hold.

Content source routing comes from the B3 fingerprint. `PLATFORM_ORIGINAL` and `ORIGINAL` prefer commissioned originals; `INDIVIDUAL_COMMISSION` uses the same original commitment but preserves the existing player-studio invitation boundary; `LICENSED_WORK` considers individual released-title rights; `ACQUIRED_IP` considers owned transfers and catalogue packages. No fallback may silently change an impossible external-rights intent into fabricated ownership.

## Fingerprint materialization

The B2 content proposal stores the selected B3 fingerprint ID. B4 uses that immutable identity to derive genre, format, audience, budget range, source route, language, priority market, and universe relationship. When a canonical content plan is committed, the fingerprint becomes `COMMITTED` and stores the canonical plan/project reference where available.

The canonical plan uses the B3 ideal budget only within the platform's real runway, production-capacity, profile, and spending restrictions. High ambition does not bypass affordability. A failed canonical commit leaves the fingerprint selected and records a rejected execution, allowing later intelligence to learn rather than retrying endlessly in the same week.

## Capability and market migration

`CAPABILITY_GROWTH` proposals route to the existing research portfolio and commitment services. Technology proposals prefer technology branches; localization proposals prefer localization-capability branches. The existing concurrent-program, cost, dependency, and runway rules decide the result.

`MARKET_EXPANSION` proposals route to the existing market-expansion chooser and commitment service. Exact country policy, lead time, infrastructure, language capability, operating cost, and acquisition/player-control behavior stay canonical. `LOCALIZE_CATALOGUE` does not create abstract fake progress; it allows the existing exact localization-requirement engine to plan jobs only for committed titles.

## Flagship migration state

Each flagship platform stores a compact migration ledger containing:

- schema version and activation mode;
- stable processed proposal keys;
- bounded intent/outcome records;
- activation week; and
- legacy planning retirement marker.

Normalization creates it for old saves. Processing is idempotent, bounded, and deterministic. AI acquisition stops future intent execution immediately while preserving completed commitments and exact work already in progress.

## Regional and generated operators

Each non-core ecosystem operator receives a normalized B2/B3 intelligence state adapted from its cash, risk, technology, catalogue strength, localization, brand, prestige, subscribers, active countries, and lifecycle. Only due lanes run. The operator's lightweight weekly financial and market-share simulation remains authoritative.

A pure canonical-bidder eligibility bridge returns explicit failure reasons. It does not add an operator to the rights market unless the operator is active, has a stable brand and ID, operates in an eligible country, has sufficient positive cash/runway, and the requested canonical boundary supports its identity. Operators grouped under “Others” still think and grow privately; UI visibility remains driven by existing market-share thresholds.

## Bidding-room compatibility

B4 changes platform appetite, not auction mechanics. Before a platform is admitted to a lot, Project A removes impossible territories and invalid rights. A platform can value remaining eligible territories aggressively—for example, offer more for United States rights when India is unavailable—but cannot bid for already granted India rights. The player-facing summary continues to explain the reduced scope, such as “India is already licensed. This auction covers the remaining eligible markets.”

## Persistence and performance

- Process proposal deltas, never the full historical proposal list.
- Scan the bounded released-title universe only for a due external-rights content intent.
- Keep at most 64 processed keys and 32 outcome records per flagship platform.
- Reuse B2/B3 caps for regional/generated operators.
- Never persist rejected candidate pools.
- Never use wall-clock time or unseeded randomness.

## Player-visible impact

B4 adds no raw AI dashboard or company-status badge. The player experiences more coherent platform behavior through existing surfaces: better-timed commission messages, bids that fit platform identity and territory, credible regional interests, research and expansion consequences, catalogue changes, releases, Forbes movement, and news generated by canonical events.

## Completion gate

B4 is complete only when:

- flagship AI decisions are driven by newly due B2 proposals and linked B3 fingerprints;
- the old unconditional content/research/market planning path is retired from live turns;
- all actions pass through existing canonical validators and executors;
- player commission, bidding, rights, research, localization, finance, distress, release, and acquisition regressions pass;
- regional/generated operators own bounded B2/B3 state and due-only progression;
- unsupported wider operators fail closed at the canonical bidder boundary;
- old saves normalize safely and acquired platforms stop receiving AI decisions;
- focused audits, build, save integrity, and bounded long-run verification pass.
