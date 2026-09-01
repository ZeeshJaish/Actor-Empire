# Actor Empire Post-Platform-AI Master Roadmap v3

> **Historical document:** Superseded on 2026-08-31 by
> `actor-empire-post-platform-master-roadmap.md`, which is the living status,
> sequencing, and approved player-control authority. Retain this v3 file for
> historical context only.

**Date:** 2026-08-30
**Audience:** Actor Empire development and future implementation chats
**Status:** Approved roadmap structure; implementation has not started from this document
**Current next phase:** Project A, Phase 3

## Purpose

This is the portable continuation plan after the eight-phase Competitive Streaming Platform AI project. It preserves the original order:

1. Finish **Project A — Unified Rights and Active Bidding**.
2. Then build **Project B — General Production Studio AI**.
3. Only after both systems are canonical, build the shared social/news reaction expansion.

This roadmap does not reopen the completed Platform AI phases. It connects the completed streaming-platform simulation to the rights market and then to autonomous production studios.

## Source-of-truth documents

- Platform AI completion evidence: `../reports/2026-08-30-platform-ai-phase8-final-report.md`
- Detailed Project A authority: `2026-08-26-unified-rights-active-bidding-master-plan-v2.md`
- Detailed Project B authority: `2026-08-30-general-production-studio-ai-master-plan-v1.md`
- Original portable plan: the user-supplied Portable Platform AI Master Plan

If an older short roadmap conflicts with these documents, this roadmap controls sequencing, the Project A v2 plan controls rights work, and the Project B v1 plan controls studio-AI work.

## Current status

| Programme | Status | Next action |
| --- | --- | --- |
| Competitive Streaming Platform AI, Phases 1–8 | Complete | Preserve and consume its canonical state |
| Project A, Phase 1 | Complete | No reopening unless a regression is found |
| Project A, Phase 2 | Complete | No replacement rights or payout system |
| Project A, Phase 3 | Next | Enforce rights compatibility everywhere |
| Project A, Phases 4–8 | Planned | Complete sequentially after Phase 3 |
| Project B, General Production Studio AI | Planned | Begin only after Project A is complete |
| Shared social/X/Instagram reaction expansion | Deferred | Build after Project B from canonical events |

## Why Project A comes before Project B

Autonomous studios must eventually decide whether to:

- keep theatrical and streaming windows separate;
- sell exclusive or non-exclusive rights;
- package catalogue titles;
- renew, resell, or let rights expire;
- use streaming funding without duplicating income; and
- preserve sequel, territory, and change-of-control restrictions.

Those decisions cannot be reliable while rights are only loosely represented. Project A therefore finishes the common contract market first. Project B then uses that market instead of inventing studio-only deals.

## Shared architectural rules

These rules apply to both projects.

### One canonical record per real thing

- `WorldState.streamingRightsContracts` owns streaming-rights contracts.
- `WorldState.streamingBiddingSessions` owns active bidding sessions.
- `WorldState.streamingRoyaltySettlements` owns exact-once backend settlement history.
- `WorldState.industryProductions` owns AI-controlled physical productions.
- `WorldState.talentBookings` owns industry talent bookings.
- `WorldState.projects` contains completed industry releases, not undeveloped ideas.
- `WorldState.studios` becomes the canonical public company/profile layer for AI production studios.

Screens may project these records, but may not create competing registries.

### Deterministic, save-safe decisions

Every long-lived AI decision must have:

- a stable ID;
- an absolute game week;
- persisted inputs or outcome rolls;
- an idempotency key for money, rights, and delivery effects;
- a bounded history; and
- the same result after save, reload, or replay.

`Math.random()` and `Date.now()` are not valid sources for canonical weekly industry decisions.

### Controller-aware simulation

AI advantages and automatic decisions apply only while a company is AI-controlled. When the player acquires a platform or studio:

- finished progress remains;
- existing contracts, debt, bookings, and obligations remain;
- the AI stops making new decisions on the next weekly turn;
- pending records transfer exactly once to the player/subsidiary representation; and
- no hidden cash, speed, cost, or quality advantage continues under player control.

### Real economics, not decorative numbers

- Cash changes require a ledgered source.
- A hit is possible but never guaranteed.
- Backend may exceed the signing forecast when real attributable revenue breaks out.
- No title may be paid, sold, released, or settled twice.
- Production funding is restricted money, not automatic studio profit.
- Studio and platform accounts must reconcile to the same transaction.

### Existing systems are reused deliberately

Project work should reuse the current production calendar, Greenlight calculations, production-risk model, crises, slate fatigue, studio specialization, canonical talent pool, awards, acquisition control, subsidiary mandates, Platform AI, and weekly game loop where their ownership boundaries fit.

Reuse means sharing types, calculators, and canonical records. It does not mean forcing autonomous AI studios through player-only UI state or keeping old placeholder simulation alive.

---

# Project A — Unified Rights and Active Bidding

## Project A outcome

All studios and streaming platforms transact through one enforceable rights market. A signed deal controls availability, money, windows, territories, expiry, renewals, packages, resale, and reporting everywhere in the game.

## Phase A1 — Canonical contract foundation — COMPLETE

Delivered:

- actor-neutral schema-v2 streaming contracts;
- deterministic IDs and idempotency;
- legacy normalization and migration;
- common buyer, seller, title, territory, window, funding, renewal, settlement, and status fields; and
- compatibility projections for Production House, owned platform, and Platform AI.

## Phase A2 — Active bidding and contract economics — COMPLETE

Delivered:

- live shared bidding clock with bidder cooldowns and a hard close;
- immutable offer revisions, withdrawals, final terms, and no player counteroffer;
- a protected clearing offer without automatic acceptance;
- exact guarantees, backend, recoupment, caps, duration, exclusivity, localization, and funding terms;
- same-week restoration and later market refresh;
- attributable title revenue and exact-once backend settlement; and
- persistent platform relationship effects.

## Phase A3 — Rights compatibility and multi-window enforcement — NEXT

Purpose: make every signed clause constrain every later rights action.

Core work:

- one compatibility engine for territory, country, window, date, and exclusivity overlap;
- enforcement across Production House, owned-platform, and AI-platform flows;
- compatible non-exclusive and split-territory windows;
- sublicensing, sequel-right, and change-of-control checks;
- catalogue removal or scheduling blocks when rights are unavailable; and
- player-readable conflict explanations that cite the controlling contract.

Visible result: the player can understand why a title is available, partially available, or blocked, and no screen can bypass the answer.

Completion gate: every rights-selling, acquisition, scheduling, and catalogue action agrees with the canonical registry.

## Phase A4 — Rights Calendar, expiry, and renewal market

Purpose: make contract time playable.

Core work:

- starts, expiry warnings, renewal windows, funding deadlines, and localization obligations;
- deterministic expiry and rights reversion;
- renewal offers based on realized economics, relationship, strategy, and demand;
- explicit accept, reject, and let-expire choices; and
- exact renewal lineage and idempotency.

Visible result: expiring rights become strategic decisions instead of silent data changes.

Completion gate: every non-permanent contract reaches a deterministic renewal, expiry, termination, or reversion state and all catalogues agree.

## Phase A5 — Catalogue packages and portfolio licensing

Purpose: support portfolio-level negotiations without losing title-level truth.

Core work:

- packages backed by real eligible titles;
- title-level rights beneath package presentation;
- package bidding driven by fit, gaps, capacity, and conflicts;
- mixed strong/weak-title economics; and
- bulk renewal preparation with per-title exceptions.

Visible result: the player can negotiate a library bundle while still auditing every title and payment.

Completion gate: package money, rights, expiry, and attribution reconcile exactly to component contracts.

Roadmap correction on 2026-09-01: future-output and multi-picture deals are deferred. New platform work continues through the existing one-project commissioned-original flow.

## Phase A6 — Two-sided acquisition and resale synchronization

Purpose: allow studios and platforms to act as buyers, sellers, licensors, and permitted resellers in one market.

Core work:

- player-owned platform acquisitions through the canonical availability engine;
- AI-platform acquisitions and disposals;
- permitted sublicensing and platform-to-platform resale;
- permanent catalogue purchases where contracts allow them;
- atomic seller proceeds, buyer cost, catalogue entry, and future settlement; and
- distress sales that cannot bypass solvency or encumbrances.

Visible result: inspecting either side of a transaction shows the same project, rights, dates, and money.

Completion gate: all transaction paths are idempotent and reconcile on both sides.

## Phase A7 — Relationship intelligence and commercial observability

Purpose: make partnerships accumulate understandable history.

Core work:

- delivery, rejection, renewal, breach, loyalty, and profitability memory;
- strategy effects on offer timing, structure, renewal aggression, and package interest;
- studio statements for guarantees, funding, recoupment, attributed gross, and backend;
- platform statements for title revenue, fixed exposure, royalty cost, retained contribution, and forecast error; and
- contract history without showing a hidden “best answer.”

Visible result: repeated business with a platform changes future behaviour for explainable reasons.

Completion gate: important commercial outcomes can be reconstructed from saved facts and bounded modifiers.

## Phase A8 — Presentation, tools, balance, and final verification

Purpose: make the whole rights market durable, readable, and balanced.

Core work:

- mobile and desktop Rights Calendar/market polish;
- restrained bidding-room tension with reduced-motion support;
- QA-only cheat shortcuts;
- migration and malformed-save coverage;
- long-run tests for solvency, guarantees, backend outliers, expiry, renewal cadence, packages, and save size; and
- Production House, owned-platform, Platform AI, subsidiary, awards, finance, and release regression coverage.

Completion gate: focused audits, long-run balance, save/reload determinism, production build, accessibility, and source-integrity checks pass with no duplicate money or rights.

## Project A exit gate

Project B starts only when:

- A3 through A8 are complete;
- `streamingRightsContracts` is enforced on every transaction path;
- expiry, renewal, catalogue packages, and two-sided trades are live;
- existing Platform AI remains green; and
- the final Project A report records evidence and remaining limitations.

---

# Project B — General Production Studio AI

## Project B outcome

Real and generated production houses independently develop slates, finance projects, hire talent, physically produce titles, market and release them, sell streaming rights through Project A, pursue franchises and awards, grow, struggle, change ownership, or close.

The detailed design and baseline audit are in `2026-08-30-general-production-studio-ai-master-plan-v1.md`.

## Phase B1 — Canonical studio state, control, and migration

Create deterministic, persisted Studio AI runtime state; unify established studios and generated ventures; resolve AI/player control; and prepare exact migration away from passive cash and instant-release placeholders.

## Phase B2 — Script acquisition, development, and slate strategy

Give studios real concepts/scripts/IP, development costs and time, genre/format strategy, slate gaps, sequel candidates, abandonment, and development memory.

## Phase B3 — Greenlight, financing, capacity, and portfolio decisions

Make studios choose budgets, funding structures, production pace, risk, partners, and projects according to cash runway, capacity, archetype, competence, market conditions, and portfolio balance.

## Phase B4 — Talent packaging, physical production, and delivery

Use the canonical talent pool, load-aware bookings, production calendars, milestones, crises, delays, overruns, holds, cancellations, quality outcomes, and Platform AI commissioning connections.

## Phase B5 — Marketing, theatrical scheduling, and box office

Give completed films real campaign choices, release-date competition, distribution strength, opening and legs, revenue settlement, audience fatigue, and failure without fake theatrical results for streaming-only originals.

## Phase B6 — Rights sales, catalogue, franchises, and awards

Connect finished titles to Project A bidding, windows, packages, renewals, and resale; then make studios reason about sequels, franchises, catalogue value, and awards campaigns.

## Phase B7 — Weekly integration, ownership handoff, and observability

Replace old rival generation and passive studio evolution in `processWorldTurn`, run every AI studio once per week, route player acquisitions safely, and expose only meaningful news, Forbes, rival, slate, and finance summaries.

## Phase B8 — Long-run balance and final verification

Run deterministic 10-, 25-, and 50-year matrices covering studio survival, churn, slate diversity, hit/flop distribution, rights activity, talent load, acquisitions, closures, generated challengers, awards, money integrity, save size, and replay determinism.

## Project B exit gate

Project B is complete only when:

- independent studios no longer materialize finished films from nowhere;
- passive cash/valuation drift is no longer the canonical studio economy;
- every release has a development, greenlight, production, and release lineage;
- rights sales use Project A;
- player acquisition stops Studio AI without deleting obligations;
- generated studios can begin at different credible potential levels;
- established and emerging studios can succeed, fail, be acquired, or close;
- weekly processing is deterministic and idempotent; and
- focused audits, long-run simulations, build, migration, and regression checks pass.

---

# Deferred follow-on projects

## Shared Industry Reactions and Media World

This is intentionally after Project B. It will consume saved events from both streaming platforms and production studios to generate coherent:

- News stories;
- X posts and replies;
- Instagram-style posts;
- fan campaigns;
- trade rumours;
- contender narratives;
- partnership and fallout stories; and
- time-separated reaction arcs.

The template engine should create varied combinations from facts, not invent an independent simulation. Core systems may continue publishing restrained News events before this project, but the broad social-drama expansion stays deferred.

## Legal, lawsuit, and contract-dispute pack

Actor departure, mid-production firing, lawsuits, indemnity, breach litigation, and blame allocation remain outside Projects A and B unless a minimal contract status is required for integrity. Production crises may delay, hold, cancel, or financially damage a project without pretending the full legal system already exists.

## Performance and save-size programme

The Platform AI Phase 8 report observed a roughly 30 MB maximum compacted 50-year save. Both Projects A and B must keep histories bounded, but a broader storage/runtime optimization programme may follow after their canonical data shapes stabilize.

## Development sequence from here

1. Project A Phase 3 design review.
2. Implement and verify Project A Phase 3.
3. Repeat design → implementation → verification for A4 through A8.
4. Publish the Project A final report.
5. Re-audit the Production Studio AI baseline against the then-current code.
6. Implement Project B B1 through B8 sequentially.
7. Publish the Project B final report.
8. Design the shared Industry Reactions and Media World from the two completed event streams.

Each phase gets its own focused design, implementation plan, audits, save migration where needed, build verification, and user approval before advancing.
