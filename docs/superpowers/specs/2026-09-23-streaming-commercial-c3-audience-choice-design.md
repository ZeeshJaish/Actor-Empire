# Streaming Commercial C3 — Aggregate Audience Choice Design

Status: approved C3 implementation boundary, 2026-09-23.

## Decision

Each streaming-reachable household has exactly one **primary** access choice in a country and billing cohort: a monthly subscription, an annual subscription, a free ad-supported service, a transaction-only store, or outside these services. A household may still hold secondary subscriptions and may buy a pass, rental, or purchase on a service it can access. Those overlays are not extra households. Aggregate counts only; no individual viewer records.

The same deterministic choice kernel scores player and AI offers. Paid candidates use the existing monthly/annual affordability and utility allocator, but only plans with positive subscription prices qualify. Free ad and store candidates compete for the remaining primary households using catalogue, localization, reliability, marketing, reputation, interest, budget pressure, and price sensitivity. Outside is a real option, not an unclaimed-error bucket. Paid spend cannot exceed the existing cohort streaming budget. Core population and reachable-household counts remain unchanged.

## State and integration

Persist `world.worldStreamingAudienceChoice` with schema version 1, source week/fingerprint, country-level primary-choice totals, platform-level subscription/free-ad/store counts, pass/rental/purchase overlay opportunities, and a bounded aggregate title-entitlement ledger. The ledger contains no fabricated historical purchases. A rental has an exclusive end week; a durable purchase survives ordinary license expiry only if the C2 route granted perpetual fulfillment. Repeated normalization in the same week must not create more claims. Invalid/malformed saved C3 state is rebuilt from canonical current inputs, preserving valid prior entitlements where possible.

C3 is a **shadow choice and entitlement projection**. WE5/WE6 and the treasury continue to use their existing compatibility path until C4 switches audience, viewing, realized advertising, transactions, and forecast together. This intentionally leaves the old synthetic `OPEN_ACCESS` live compatibility row in place for one phase, but it is never counted as a paid subscription in C3. C3 outputs carry zero settled revenue and never post cash or rewrites to history.

Player title overlays must pass the C2 country/week/rights/offer evaluator before an entitlement is recorded. AI platform title rights are not represented by the player catalogue adapter, so C3 may only record AI store/pass opportunity counts, not invented title ownership. C4 can settle only validated title events. Saved player purchase ownership is aggregate by country/title; rentals are additionally grouped by expiration. The ledger must be bounded by currently relevant titles and an explicit cap, without dropping an unexpired/durable claim silently.

## Acceptance

- Every reachable household reconciles to exactly one primary choice; secondary subscriptions and transaction overlays do not inflate it.
- Player and AI use the same scoring/choice kernel, including pure ad-only and store-only offers.
- Monthly/annual paid subscriptions and household budget constraints remain distinct and unchanged in the live money path.
- Ad-only/store-only primary choices never become paid accounts in C3.
- Passes do not grant title rights. Rental expiry and purchase permanence follow C2.
- Same-week processing and save migration are idempotent, deterministic, finite, and size-bounded.
- Historical cash and current weekly settlement stay unchanged; C4 is an explicit later activation gate.
