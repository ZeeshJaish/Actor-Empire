# Unified Rights and Active Bidding Master Plan v2

> **Supporting detail:** Current phase status, sequencing, and the approved
> Strategy/Custom/Full Control model are maintained in
> `actor-empire-post-platform-master-roadmap.md`. This v2 document remains the
> historical detailed authority for the A1/A2 implementation and original A3–A8 scope.

## Status and scope

This is the revised detailed plan for **Next Project A — Unified Rights and Active Bidding System** from the Portable Platform AI Master Plan. It does not reopen or reorder the completed eight Platform AI phases.

The Phase 2 implementation moved attributable platform revenue and backend settlement into this project earlier than the original short roadmap implied. That is the only material roadmap change: later phases now consume canonical contract schema v2 and exact settlement history instead of inventing another revenue-share system.

## Non-negotiable system rules

- `WorldState.streamingRightsContracts` is the only canonical rights-contract registry.
- Production House, owned platform, and AI-platform screens are views of the same records.
- Fixed promises are constrained by platform capacity; uncapped backend may exceed a signing forecast when a title breaks out.
- Bidding, contract IDs, renewals, expiry, and settlements are deterministic and save-safe.
- Money crosses actors exactly once and is recorded on both sides.
- The player receives exact contract terms, not a hidden or recommended "best" deal.

## Phase 1 — Canonical contract foundation — COMPLETE

Purpose: establish one actor-neutral contract authority before adding richer market behavior.

Delivered:

- Canonical buyer, seller, project, territory, countries, duration, exclusivity, window, funding, localization, renewal, settlement, and status fields.
- Stable IDs and idempotency keys.
- Legacy Production House, owned-platform, and Platform AI licences normalized into the shared registry.
- Save migration, transfer normalization, bounded compaction, and contract reconciliation.
- Compatibility adapters so existing gameplay continues to work while reading canonical records.

## Phase 2 — Active bidding and contract economics — COMPLETE

Purpose: turn the Production House streaming sale into a live contract market and make backend points economically real.

Delivered:

- A deterministic 15-second shared bidding clock, equal six-second bidder response cooldowns, material-event extensions, and a 45-second hard cap.
- Immutable platform offer versions that may rise, fall, restructure, become final, or withdraw.
- A protected real clearing offer, a closing table, no automatic winner, and no player counteroffer.
- Exact visible terms: guarantee, adjusted-gross backend, recoupment, backend cap, duration, exclusivity, localization, production funding, future-season funding, and renewal option.
- Same-week room restoration and next-week market refresh.
- Exact accepted-offer conversion into canonical contract schema v2.
- Separate handling of spendable production funding and locked future-season funding.
- Subscription, advertising, and direct-receipt title attribution using realized watch, account, acquisition, and retention contribution.
- Non-recoupable, recoupable, capped, and uncapped royalty calculations.
- Exact-once weekly settlement from buyer platform to seller studio, with ledgers, cumulative contract totals, migration, and compaction.
- Persistent capped platform relationships based on completed deals, profitable outcomes, loyalty, and realized partner value.

## Phase 3 — Rights compatibility and multi-window enforcement

Purpose: make the clauses signed in Phases 1 and 2 constrain every later rights action.

Planned work:

- Enforce global, domestic, multi-region, and country-level overlap rules.
- Support exclusive and non-exclusive windows without duplicate ownership.
- Allow up to the approved compatible territory/window slots.
- Block contradictory dates, exclusivity, sublicensing, sequel-right, and change-of-control combinations.
- Synchronize Production House availability with owned-platform and AI-platform catalogue availability.
- Add conflict explanations that cite the controlling contract without recommending a commercial choice.

Completion gate: no screen can sell, schedule, or acquire rights that the canonical registry says are unavailable.

## Phase 4 — Rights Calendar, expiry, and renewal market

Purpose: turn contract dates and renewal clauses into playable long-term decisions.

Planned work:

- Rights Calendar for starts, expiry warnings, option windows, funding deadlines, and localization obligations.
- Deterministic expiry and rights reversion.
- Renewal offers informed by realized title economics, relationship history, platform strategy, and competing demand.
- Player accept, reject, or let-expire choices without silent auto-renewal.
- Lapsed-rights catalogue removal and compatible re-entry into the open market.
- Exact renewal lineage through `renewedFromLicenseId` and stable idempotency.

Completion gate: every active contract reaches a deterministic renewal, expiry, termination, or permanent state and all catalogue views agree.

## Phase 5 — Catalogue packages and portfolio licensing

Purpose: expand from one-title sales to portfolio decisions while keeping every underlying title auditable.

Planned work:

- Real-project catalogue packages with package-level presentation and title-level rights records.
- Package bidding based on portfolio fit, catalogue gaps, financial capacity, and overlap conflicts.
- Mixed strong/weak-title economics, breakout upside, and package-specific guarantees.
- Bulk renewal preparation and approval, with per-title exception handling.
- No phantom titles and no package payment without underlying contracts.

Completion gate: package money, rights, expiry, and title attribution reconcile exactly to the component contracts.

## Phase 6 — Two-sided acquisition and resale synchronization

Purpose: let the same market serve studios selling rights and streaming platforms buying, trading, or relinquishing them.

Planned work:

- Player-owned platform acquisition using the canonical availability and conflict engine.
- AI-platform acquisition and disposal decisions through the same records.
- Permitted sublicensing and platform-to-platform resale.
- Permanent catalogue acquisition where the contract allows it.
- Seller proceeds, buyer cost, catalogue entry, and future settlement created as one idempotent transaction.
- Distress and rescue sales that cannot bypass solvency, exclusivity, or existing encumbrances.

Completion gate: either side of a transaction can be inspected and produces the same project, money, rights, and dates.

## Phase 7 — Relationship intelligence and commercial observability

Purpose: make repeated partnerships strategically meaningful without exposing hidden answer scores.

Planned work:

- Broader relationship memory for rejection patterns, reliable delivery, renewal behavior, contract breaches, and long-run profitability.
- Platform strategy effects on entry timing, structures, renewal aggression, package interest, and willingness to hold final terms.
- Studio finance reporting that separates guarantees, production funding, locked future-season funding, attributed gross, recoupment, and paid backend.
- Platform reporting that separates title-attributed revenue, fixed exposure, royalty expense, retained contribution, and forecast error.
- Player-readable contract history and settlement statements without a "best deal" verdict.

Completion gate: every important commercial outcome is explainable from saved facts and bounded strategy modifiers.

## Phase 8 — Presentation, tools, balance, and final verification

Purpose: finish the project as a durable game system rather than a collection of connected screens.

Planned work:

- Rights Calendar and market presentation polish across desktop and mobile.
- Bidding-room audio/visual tension and restrained cinematics with reduced-motion support.
- Cheat-menu shortcuts for focused QA, never as hidden production dependencies.
- Long-run simulations for platform solvency, guarantee bands, backend outliers, renewal cadence, package concentration, and save size.
- Migration fixtures covering legacy saves, Phase 1 schema, Phase 2 schema v2, malformed records, and repeated reloads.
- Cross-system regression coverage for Production House, owned streaming platform, Platform AI, subsidiary autonomy, finance, release, and awards.

Completion gate: focused audits, long-run balance, save/reload determinism, production build, accessibility checks, and source integrity all pass, with no duplicate money or rights.

## Connection from Phase 2 to the remaining phases

Phase 2 is the commercial source of truth for everything downstream:

1. An immutable offer becomes one schema-v2 canonical contract.
2. Phase 3 enforces that contract's territories, windows, and exclusivity.
3. Phase 4 advances its dates, options, expiry, and renewal lineage.
4. Phase 5 groups compatible title rights into catalogue packages while preserving component contracts.
5. Phase 6 lets all buyer and seller actors transact through the same authority.
6. Phase 7 explains the saved relationship and settlement history.
7. Phase 8 tunes and verifies the complete long-run market.

No later phase should recreate bidding payouts, backend math, or a parallel rights registry.

Future-output and multi-picture deals were removed from Project A's required scope on 2026-09-01. Platforms continue to request new work through the existing single-project commissioned-original system. Longer multi-picture partnerships are deferred until the relationship and legal-contract layers can support them without duplicating commissions.
