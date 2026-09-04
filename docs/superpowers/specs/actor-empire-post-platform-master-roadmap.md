# Actor Empire Post-Platform Master Roadmap

**Living document version:** 24
**Last updated:** 2026-09-04
**Audience:** The user, future Codex chats, and Actor Empire development
**Status authority:** This file is the canonical status and sequencing authority for post-Platform-AI work
**Current next phase:** Project C Phase C2 design approval — Media Institutions and Recurring Personalities

## How to use this document

Use this same file at the beginning of every future Project A or Project B development session.

At the start of a session:

1. Read this document completely.
2. Inspect the current worktree and the implementation relevant to the phase marked `NEXT`.
3. Confirm that completed phases remain present and their focused audits still pass where practical.
4. Work on only the current phase.
5. Present the phase design and wait for user approval before implementing.
6. Implement, verify, and report that phase without silently beginning the next one.
7. Update this living roadmap's date, status table, evidence, and next phase after completion.

Do not infer completion from this roadmap alone. Repository code and fresh verification remain the final evidence.

### Copy-ready handoff for a new chat

> Read `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md` completely. Treat it as the current post-Platform-AI sequencing and status authority. Inspect the current dirty worktree and relevant code before proposing changes. Work only on the phase marked NEXT, preserve completed systems and unrelated changes, use deterministic save-safe logic, and do not begin implementation until I approve the phase design. Do not stage, commit, push, or advance to the next phase unless I explicitly ask.

## Supporting documents

These retain deeper historical reasoning and implementation evidence, but this living roadmap controls current status and sequencing:

- Platform AI completion report: `../reports/2026-08-30-platform-ai-phase8-final-report.md`
- Project A Phase A3 completion report: `../reports/2026-08-31-streaming-rights-compatibility-phase3-report.md`
- Project A Phase A4 completion report: `../reports/2026-08-31-streaming-rights-calendar-phase4-report.md`
- Project A Phase A5 completion report: `../reports/2026-09-01-streaming-catalogue-packages-phase5-report.md`
- Project A Phase A5 design: `2026-09-01-streaming-catalogue-packages-phase5-design.md`
- Project A Phase A6 completion report: `../reports/2026-09-01-streaming-rights-transactions-phase6-report.md`
- Project A Phase A6 design: `2026-09-01-streaming-rights-transactions-phase6-design.md`
- Project A Phase A7 completion report: `../reports/2026-09-02-streaming-rights-office-phase7-report.md`
- Project A Phase A7 design: `2026-09-01-streaming-rights-office-phase7-design.md`
- Late-game Process Week hardening report: `../reports/2026-09-02-late-game-week-performance-hardening-report.md`
- Save integrity and recovery report: `../reports/2026-09-02-save-integrity-recovery-report.md`
- Save integrity and recovery design: `2026-09-02-save-integrity-recovery-design.md`
- Project B Phase B1 completion report: `../reports/2026-09-02-general-production-studio-ai-b1-report.md`
- Project B Phase B1 design: `2026-09-02-general-production-studio-ai-b1-design.md`
- Project B Phase B2 completion report: `../reports/2026-09-03-shared-statistical-intelligence-kernel-b2-report.md`
- Project B Phase B2 implementation plan: `../plans/2026-09-03-shared-statistical-intelligence-kernel-b2.md`
- Project B Phase B2 design: `2026-09-02-shared-statistical-intelligence-kernel-b2-design.md`
- Project B Phase B3 completion report: `../reports/2026-09-03-content-fingerprint-variety-universe-b3-report.md`
- Project B Phase B4 completion report: `../reports/2026-09-03-streaming-platform-intelligence-migration-b4-report.md`
- Project B Phase B4 implementation plan: `../plans/2026-09-03-streaming-platform-intelligence-migration-b4.md`
- Project B Phase B4 design: `2026-09-03-streaming-platform-intelligence-migration-b4-design.md`
- Project B Phase B5 completion report: `../reports/2026-09-03-production-studio-slate-greenlight-b5-report.md`
- Project B Phase B5 implementation plan: `../plans/2026-09-03-production-studio-slate-greenlight-b5.md`
- Project B Phase B5 design: `2026-09-03-production-studio-slate-greenlight-b5-design.md`
- Project B Phase B6 completion report: `../reports/2026-09-03-studio-ai-production-release-results-b6-report.md`
- Project B Phase B6 implementation plan: `../plans/2026-09-03-studio-ai-production-release-results-b6.md`
- Project B Phase B6 design: `2026-09-03-studio-ai-production-release-results-b6-design.md`
- Project B Phase B7 completion report: `../reports/2026-09-03-player-ownership-world-presentation-b7-report.md`
- Project B Phase B7 implementation plan: `../plans/2026-09-03-player-ownership-world-presentation-b7.md`
- Project B Phase B8 completion report: `../reports/2026-09-04-shared-industry-intelligence-b8-final-report.md`
- Project B Phase B8 implementation plan: `../plans/2026-09-04-shared-industry-balance-performance-b8.md`
- Project B Phase B8 design: `2026-09-04-shared-industry-balance-performance-b8-design.md`
- Project C Phase C1 completion report: `../reports/2026-09-04-canonical-media-story-arcs-c1-report.md`
- Project C Phase C1 implementation plan: `../plans/2026-09-04-canonical-media-story-arcs-c1.md`
- Project C Phase C1 design: `2026-09-04-canonical-media-story-arcs-c1-design.md`
- Approved stats-driven industry remap: `2026-09-02-stats-driven-industry-simulation-remap-design.md`
- Project A detailed v2 plan: `2026-08-26-unified-rights-active-bidding-master-plan-v2.md`
- Historical Project B detailed v1 plan and baseline audit: `2026-08-30-general-production-studio-ai-master-plan-v1.md` (superseded by the approved remap for B2–B8)
- Historical umbrella roadmap v3: `2026-08-30-post-platform-ai-project-a-b-master-roadmap-v3.md`
- Original user-supplied Portable Platform AI Master Plan

If a supporting document conflicts with this file, this file controls the current sequence, status, and approved player-management design. `2026-09-02-stats-driven-industry-simulation-remap-design.md` controls the B2–B8 architecture over older Platform AI and Studio AI planning. Supporting documents continue to control details that the remap does not replace.

## Current programme status

| Programme | Phase | Status | Current meaning |
| --- | --- | --- | --- |
| Competitive Streaming Platform AI | 1–8 | **COMPLETE BASELINE** | Player-facing guarantees remain canonical; B4 migrated only private AI orchestration onto B2/B3 |
| Project A — Unified Rights and Active Bidding | A1 | **COMPLETE** | Canonical contract foundation exists |
| Project A — Unified Rights and Active Bidding | A2 | **COMPLETE** | Active bidding and exact contract economics exist |
| Project A — Unified Rights and Active Bidding | A3 | **COMPLETE** | Canonical compatibility and exact-scope enforcement exist |
| Project A — Unified Rights and Active Bidding | A4 | **COMPLETE** | Canonical expiry, renewal, reversion, control modes, and grouped calendar exist |
| Project A — Unified Rights and Active Bidding | A5 | **COMPLETE** | Canonical catalogue packages, bounded allocation, package bidding, and atomic title settlement exist |
| Project A — Unified Rights and Active Bidding | A6 | **COMPLETE** | Exact remaining-term transfers, sublicence lineage, atomic settlement, and AI/player resale paths exist |
| Project A — Unified Rights and Active Bidding | A7 | **COMPLETE** | Manageable Rights Office, per-studio mandates, explainable delegation, relationships, statements, and weekly digest exist |
| Project A — Unified Rights and Active Bidding | A8 | **COMPLETE** | Accessible presentation, deterministic QA tooling, migration coverage, and the full Project A exit matrix pass |
| Project A exit hardening | A8P | **COMPLETE** | Age-82 composite Process Week p95 is 158.06 ms with immediate processing feedback and save-safe parity |
| Shared save hardening | A8S | **COMPLETE** | Candidate-first writes, integrity manifests, previous-good recovery, protected compaction, and transactional signed imports exist |
| Project B — Shared Industry Intelligence | B1 | **COMPLETE** | One canonical deterministic studio-company runtime, controller handoff, finance ledger, migration, save protection, and consequence-led presentation exist |
| Project B — Shared Industry Intelligence | B2 | **COMPLETE** | One deterministic, scheduled, save-safe shared kernel now evaluates AI-only studios and platforms in shadow mode without changing canonical gameplay |
| Project B — Shared Industry Intelligence | B3 | **COMPLETE** | Compact content fingerprints, novelty protection, budget curves, and private universe blueprints exist |
| Project B — Shared Industry Intelligence | B4 | **COMPLETE** | Streaming AI intent now comes from due B2 proposals and linked B3 fingerprints while canonical services still execute every real action |
| Project B — Shared Industry Intelligence | B5 | **COMPLETE** | AI studios now form bounded development slates and make capacity-, finance-, strategy-, and forecast-aware greenlight decisions |
| Project B — Shared Industry Intelligence | B6 | **COMPLETE** | Greenlights now become canonical fallible productions, exact milestone finance, stable releases, and permanent commercial results |
| Project B — Shared Industry Intelligence | B7 | **COMPLETE** | Exact ownership materialization, player-standard subsidiary control, one event ledger/coordinator, public identity parity, and legacy rival cutover exist |
| Project B — Shared Industry Intelligence | B8 | **COMPLETE** | Five-regime 400-year matrix, midpoint parity, save growth, mature Process Week, browser, build, and regression gates pass; physical low-end Android timing remains release-device QA |
| Project C — Shared Industry Reactions and Media World | C1 | **COMPLETE** | Canonical facts now form bounded, deterministic, multi-week stories shared by News, X, and Instagram |
| Project C — Shared Industry Reactions and Media World | C2 | **NEXT — DESIGN APPROVAL** | Add recurring publications, journalists, critics, hostile/supportive commentators, and fan-theory creator identities |
| Legal/lawsuit and contract-dispute pack | Later project | **DEFERRED** | Do not simulate a fake partial legal system inside A or B |
| Future-output and multi-picture deals | Later project | **DEFERRED** | Reconsider only after commission relationships and contract/legal systems are mature |

## Approved development order

1. Preserve completed Platform AI Phases 1–8.
2. Finish Project A from A4 through A8.
3. Publish and approve the Project A final report.
4. Re-audit the then-current Production Studio baseline.
5. Build the remapped Project B Shared Industry Intelligence programme from B1 through B8.
6. Publish and approve the Project B final report.
7. Build the approved Project C Shared Industry Reactions and Media World from C1 through C8.
8. Address the legal/lawsuit pack and broader save/runtime optimization as separate projects.

Project B does not begin early. The shared industry simulation requires Project A's completed rights compatibility, renewals, catalogue packages, two-sided trades, and settlement history. Future-output deals are not a Project A or Project B entry requirement.

---

# Global architectural rules

## One canonical record per real thing

- `WorldState.streamingRightsContracts` is the only canonical streaming-rights contract registry.
- `WorldState.streamingBiddingSessions` owns active rights-bidding sessions.
- `WorldState.streamingRoyaltySettlements` owns exact-once backend settlements.
- `WorldState.industryProductions` owns AI-controlled physical productions.
- `WorldState.talentBookings` owns canonical industry talent bookings.
- `WorldState.projects` contains completed industry releases, not undeveloped concepts.
- `WorldState.studios` is the canonical public company/profile registry for AI production studios.
- Existing awards history remains the canonical awards authority.

Screens, reports, inboxes, and company cards are projections of these records. They may not create parallel ownership, production, payout, or rights truth.

## Deterministic and save-safe simulation

Every saved decision or material outcome requires:

- a stable ID;
- an absolute game week;
- persisted inputs, rolls, or resolved outcomes;
- exact-once transaction keys where money or rights move;
- bounded histories; and
- identical results after replay, save, transfer, or reload.

Canonical weekly decisions must not depend on raw `Math.random()` or `Date.now()`.

## Real economics

- Every cash movement has a source and ledger entry.
- Production funding is restricted project money, not studio profit.
- Producer fees are separate from production budgets.
- Fixed promises respect buyer capacity.
- Uncapped backend may exceed a signing forecast when real attributable revenue breaks out.
- Studio and platform sides of a transaction reconcile.
- A project, contract, release, award, or payment cannot be created twice.
- No hidden cash, fake subscriber growth, guaranteed hit, quality floor, or infinite rescue exists.

## Controller-aware simulation

AI automation and advantages apply only while the company is AI-controlled.

When the player acquires a platform or studio:

- completed progress stays;
- cash, debt, rights, projects, bookings, commitments, relationships, and mistakes stay;
- new AI decisions stop on the next applicable weekly turn;
- pending obligations transfer exactly once;
- other AI companies continue normally; and
- no AI-only cost, speed, rescue, or automatic-decision advantage remains.

## Simulation by relevance

AI-only studios and streaming platforms do not execute the complete player workflow invisibly. They use one deterministic stats-driven, scheduled-event model for private decisions.

The full canonical systems activate whenever an action becomes:

- player-controlled or player-interactive;
- a cross-company cash movement;
- a rights offer, contract, renewal, package, transfer, or settlement;
- a named talent booking;
- a public production or release commitment;
- a permanent IMDb, box-office, streaming, catalogue, franchise, or awards fact; or
- an ownership handoff.

Private simulation may be compact, but it cannot contradict, bypass, or weaken canonical public facts. Materialization adds detail to a saved decision; it never rerolls or changes previously resolved inputs.

## Reuse before replacement

Project work should reuse existing canonical systems and actor-neutral calculations where their ownership boundaries fit, including:

- Platform AI;
- production calendars;
- Greenlight budget and package calculations;
- production economy and risk;
- production crises;
- slate fatigue;
- studio specialization;
- the canonical talent pool;
- awards;
- studio acquisition, ownership, group, and subsidiary mandates;
- rights, bidding, settlement, and weekly game-loop infrastructure.

Reuse does not mean forcing AI studios through player-only UI state. Replacement paths must reach parity and pass regression coverage before legacy logic is retired.

## Phase discipline

- Work one phase at a time with the user.
- Do not use subagents for Actor Empire phase implementation unless the user explicitly changes that preference.
- Preserve unrelated dirty work.
- Do not stage, commit, or push without explicit permission.
- Use focused failing tests before implementation where practical.
- Verify persistence, idempotency, ownership handoff, money, and duplicate-event risks in every phase.
- Stop after reporting the completed phase and wait for approval.

---

# Player rights-management control model

## Core principle

The simulation always retains full contract depth. The player chooses how much of the administration they personally control.

Control mode changes interaction and delegated authority; it does not change:

- available offers;
- platform intelligence;
- compatibility rules;
- contract economics;
- title performance;
- backend settlement;
- relationship effects; or
- game difficulty.

Casual players are not financially or strategically punished for delegating routine work.

## Control Mode 1 — Strategy Mode

Strategy Mode is the low-administration experience.

The player sets a standing Licensing Mandate for future routine deals:

- **Financial priority:** upfront security, balanced return, or backend upside.
- **Distribution priority:** one global partner, regional optimization, or broad non-exclusive reach.
- **Exclusivity policy:** permit within limits, restrict, or always request approval.
- **Duration preference:** short, balanced, or long-term.
- **Partner preference:** strongest economics, widest reach, or trusted relationships.
- **Renewal policy:** favour successful renewals, retest the market, or request approval.

The Rights Office may then handle routine licensing, ordinary renewals, safe expiries, and small catalogue decisions within those exact limits.

The player receives concise weekly or decision-cycle summaries explaining what was signed, declined, renewed, expired, or returned to market.

## Control Mode 2 — Custom Control — DEFAULT

Custom Control combines a standing mandate with per-title and per-decision overrides.

The player may:

- delegate routine catalogue titles;
- mark selected titles or franchises as `Manual Control`;
- require approval above a budget, value, duration, or rights-scope threshold;
- manage new releases personally while delegating old catalogue renewals;
- bulk-delegate or bulk-review selected titles; and
- take over an active decision before it is finalized where the contract window permits.

This is the default because it provides depth without requiring management of every title in a 30–40 movie library.

## Control Mode 3 — Full Control

Full Control is the detailed deal-desk experience.

The player personally controls:

- which titles enter the market;
- offered territories and windows;
- exclusive or non-exclusive availability;
- acceptable duration and funding structures;
- bidding-room offer selection;
- renewals and expiries;
- catalogue packages;
- permitted resales and permanent acquisitions; and
- exceptions created by change of control or related rights.

Full Control preserves the approved bidding rule: platforms revise and compete with each other; the player selects or rejects offers but does not manually counterbid inside the bidding room.

## Mandatory approval boundaries

Strategy and Custom modes never silently finalize the following:

- permanent rights sales;
- global exclusivity for flagship or franchise IP;
- sequel, remake, universe, or related-IP transfers;
- large catalogue packages (more than seven titles by default);
- unusually long contracts;
- change-of-control concessions;
- transactions outside the standing mandate; or
- decisions with material studio-solvency consequences.

These decisions always require player approval. A standing mandate cannot override this protection.

## Switching and overrides

- The control mode is selectable per production house or acquired subsidiary.
- Any title may override the studio default.
- Renewal control may differ from new-licensing control.
- The player may switch modes at any time for future decisions.
- Switching modes does not undo, reroll, or alter signed contracts.
- Pending automated decisions must be revalidated against the latest mandate before signing.

## Rights Office and progressive disclosure

The player does not manage every title from separate popups.

The Rights Office groups the library into:

- `Action required`;
- `Available to license`;
- `Under contract`;
- `Approaching expiry`;
- `Delegated decisions`; and
- `No current market interest`.

The first view shows only decision-critical terms:

- platform;
- guarantee;
- backend;
- territory;
- duration;
- exclusivity; and
- deadline.

Important warnings explain material consequences. Complete clauses, compatibility maps, recoupment, settlement history, and contract lineage remain available through details.

Routine events appear in a digest. Only meaningful exceptions interrupt the player.

## Cross-phase delivery of this control model

- **A3:** compatibility produces machine-readable availability and conflict explanations for every mode.
- **A4:** Rights Calendar, grouped expiry queues, renewal mandates, and safe delegated decisions.
- **A5:** bulk title selection, package suggestions, bounded title allocations, and package-approval boundaries.
- **A6:** delegated buying/resale limits and mandatory approval for permanent or encumbered assets.
- **A7:** complete Rights Office, Licensing Mandates, explanations, relationship memory, and financial statements.
- **A8:** accessibility, presentation, balance, automation audits, and long-library workload verification.

No phase may create a separate simplified rights engine. All modes call the same canonical authority.

---

# Project A — Unified Rights and Active Bidding

## Project goal

Create one enforceable, two-sided streaming-rights market used by Production House, owned streaming platforms, and AI platforms.

A signed contract must control:

- who owns or controls the right;
- territory and countries;
- start and end dates;
- streaming window;
- exclusivity;
- guarantees, funding, backend, recoupment, and caps;
- renewal, sublicensing, related-IP, and change-of-control rights;
- catalogue availability; and
- exact money movement.

## Phase A1 — Canonical Contract Foundation — COMPLETE

### Purpose

Create one actor-neutral contract authority before adding richer market behaviour.

### Delivered

- Canonical buyer, seller, project, territory, country, duration, exclusivity, window, funding, localization, renewal, settlement, and status fields.
- Stable IDs and idempotency keys.
- Legacy Production House, owned-platform, and Platform AI licences normalized into the shared registry.
- Save migration, transfer normalization, bounded compaction, and reconciliation.
- Compatibility projections so existing gameplay can consume the shared records.

### Preservation rule

Do not create another rights registry or replace schema-v2 contract economics in a later phase.

## Phase A2 — Active Bidding and Contract Economics — COMPLETE

### Purpose

Turn Production House streaming sales into a time-sensitive contract market and make backend points economically real.

### Delivered

- Deterministic 15-second shared bidding clock.
- Equal six-second bidder-response cooldowns.
- Material-event extensions and a 45-second hard cap.
- Immutable offer revisions that may improve, fall, restructure, become final, or withdraw.
- Protected real clearing offer, closing table, no automatic winner, and no player counteroffer.
- Exact visible guarantee, adjusted-gross backend, recoupment, cap, duration, exclusivity, localization, production funding, future-season funding, and renewal terms.
- Same-week room restoration and later market refresh.
- Exact offer-to-contract conversion.
- Restricted production funding and future-season funding handling.
- Title-attributed platform revenue.
- Recoupable/non-recoupable, capped/uncapped exact-once backend settlement.
- Persistent platform relationship effects.

### Preservation rule

Later phases consume these offers, contracts, and settlements. They do not recreate the bidding timer, payout math, or a hidden “best offer.”

## Phase A3 — Rights Compatibility and Multi-Window Enforcement — COMPLETE

### Purpose

Make every clause signed in A1 and A2 constrain every later sale, acquisition, catalogue addition, and release schedule.

### Dependencies

- Canonical schema-v2 contracts from A1.
- Immutable bidding sessions and acceptance flow from A2.
- Existing Production House, owned-platform, and Platform AI catalogue paths.

### Core compatibility authority

Build one resolver that evaluates:

- canonical project identity;
- buyer and seller;
- global, domestic, regional, and country scope;
- proposed start and end weeks;
- streaming window type;
- exclusive or non-exclusive status;
- active and future contracts;
- compatible licence-slot limits;
- sublicensing permission;
- sequel, remake, franchise, universe, and related-IP restrictions; and
- change-of-control clauses.

The result is not only yes/no. It returns:

- `AVAILABLE`;
- `PARTIALLY_AVAILABLE`;
- `AVAILABLE_IN_FUTURE`;
- `RESTRICTED`; or
- `UNAVAILABLE`;

with available countries, blocked countries, compatible windows, controlling contract IDs, conflict reasons, and earliest compatible start dates.

### Compatibility rules

- Separate territories may be licensed independently when no contract blocks them.
- Separate time windows may coexist when their dates and clauses are compatible.
- Global exclusivity blocks overlapping streaming licences.
- Non-exclusive contracts may coexist only within approved territory/window limits.
- An existing non-exclusive licence blocks a later overlapping exclusive grant unless the earlier rights are resolved.
- Physical production does not grant streaming ownership to a commissioned producer.
- Platform ownership or distress cannot bypass an encumbrance.
- Title matching is never used as a canonical rights join.

### Atomic acceptance protection

Before any offer is accepted:

1. Re-read canonical contracts.
2. Re-run compatibility against the exact accepted version.
3. Reject a newly conflicting offer safely.
4. Create the contract exactly once.
5. Update catalogue/availability projections.
6. Invalidate other offers that became impossible.

An open bidding room does not itself reserve rights.

### Player experience

Phase A3 runs mainly in the background. It does not require the player to configure every movie.

The UI exposes concise results such as:

- `Worldwide rights available`;
- `Available in 14 countries`;
- `India licensed to Netflix`;
- `Non-exclusive window available`;
- `Available after Week 38`; or
- `Blocked by global exclusivity`.

The player may open the controlling contract for full detail. The game explains restrictions but never recommends a commercial answer.

### Control-mode integration

- Strategy Mode uses compatibility to keep delegated actions inside the mandate.
- Custom Control uses it for per-title and threshold exceptions.
- Full Control uses it to show precise territory/window options.
- All three modes receive identical legal/economic results.

### Work sequence

1. Audit every existing rights-availability and catalogue-entry path.
2. Define the actor-neutral compatibility result and conflict codes.
3. Implement territory, date, window, exclusivity, and clause evaluation.
4. Connect Production House market entry and bidding acceptance.
5. Connect player-owned platform acquisition and scheduling.
6. Connect Platform AI sourcing, catalogue, and release scheduling.
7. Add compact conflict explanations and optional details.
8. Normalize legacy/malformed contracts safely.
9. Add simultaneous-session and same-week replay coverage.
10. Run Project A, Platform AI, Production House, save, and build regressions.

### Out of scope

- Renewal events and expiry workflow belong to A4.
- Catalogue packages and portfolio licensing belong to A5.
- Two-sided resale belongs to A6.
- Complete Rights Office mandates and reporting belong to A7.
- Existing A2 bidding and settlement mechanics are not redesigned.

### Completion gate

- Every rights-selling, acquisition, catalogue, and scheduling path calls the same resolver.
- Compatible split-territory and later-window deals work.
- Contradictory deals are blocked with a useful explanation.
- AI and player actors follow identical compatibility rules.
- Acceptance revalidates atomically.
- No duplicate project, contract, catalogue entry, or payment appears.
- Legacy saves normalize without silently granting rights.
- Save/reload and same-week replay remain deterministic.
- A1, A2, Platform AI, Production House, and build regressions pass.

### Delivered in A3

- One actor-neutral resolver now derives availability, partial availability, future availability, restrictions, and unavailability from `WorldState.streamingRightsContracts`.
- Production House auctions receive an immutable exact-country lot before opening. Partial lots can never be stored or displayed as global rights.
- Every offer revision inherits that lot's territory, country snapshot, window, and exclusivity. Impossible scopes and ineligible bidders are excluded before the room opens.
- Production House acceptance rechecks the exact accepted offer before cash, energy, project, catalogue, or contract mutations.
- Owned-platform acquisition, renewal, and sublicensing use the same compatibility authority and return concise factual conflict copy.
- Platform AI sourcing, renewal, distress sublicensing, catalogue scheduling, and release-country use are constrained by canonical contracts rather than display projections.
- Legacy bidding sessions normalize to a deterministic conservative global lot, while malformed bounded scopes cannot silently grant rights.
- A2 bidding behavior remains intact: shared clock, equal bidder cooldowns, offer revisions and withdrawals, no player counteroffer, no automatic winner, and same-week restoration.

### A3 verification evidence

- `audit:streaming-contract-foundation-phase1`
- `audit:streaming-active-bidding-phase2`
- `audit:streaming-contract-economics-phase2`
- `audit:streaming-rights-compatibility-phase3`
- `audit:streaming-rights-marketplace-phase16`
- `audit:platform-ai-sourcing`
- `audit:platform-ai-rights-lifecycle`
- `audit:platform-ai-distress`
- `audit:platform-ai-release`
- `audit:save-migration`
- Vite production build (exit 0)
- Repository-wide TypeScript was also run: A3-local typing errors were fixed; the remaining failures are stale pre-A3 owned-platform audit fixtures missing fields such as `publicManifesto` and `networkPlacements`, plus obsolete fixture enum literals
- Live Production House pre-room and bidding-room checks at mobile and desktop widths, with no horizontal overflow

### A3 boundaries retained for later phases

- A4 owns expiry events, renewal offers, reversion, and the player-facing Rights Calendar.
- A5 owns catalogue packages and portfolio licensing. Future-output deals are deferred.
- A6 owns the complete two-sided resale market.
- A7 owns the full Rights Office, delegation mandates, and portfolio reporting.
- A8 owns the final cross-system hardening and long-run Project A exit audit.

## Phase A4 — Rights Calendar, Expiry, and Renewal Market — COMPLETE

### Purpose

Turn contract time into long-term strategy without overwhelming large catalogues.

### Core work

- Rights Calendar for start dates, expiry, renewal options, funding deadlines, and localization obligations.
- Deterministic expiry and rights reversion.
- Catalogue removal when a platform's window lapses.
- Compatible return of reverted rights to the market.
- Renewal offers based on realized economics, relationship history, strategy, and competing demand.
- Exact renewal lineage and idempotency.
- Grouped warnings and action queues rather than one popup per title.

### Control-mode integration

- Strategy Mode applies the Renewal Policy to routine eligible contracts.
- Custom Control delegates routine renewals while escalating protected titles and threshold exceptions.
- Full Control presents every renewal/expiry decision in the Rights Office.
- Permanent, flagship, out-of-mandate, and material relationship decisions remain protected.

### Player experience

The player sees an actionable portfolio calendar such as:

- two decisions requiring approval;
- five contracts approaching expiry;
- three delegated renewals completed; and
- four titles returned to market.

### Completion gate

- Every non-permanent contract reaches a deterministic renewal, expiry, termination, or reversion state.
- All catalogue and availability projections agree.
- Delegated actions are mandate-safe, logged, explainable, and replay-safe.
- Large libraries do not create repetitive popup spam.

### Completion evidence

- One saved renewal case is created per eligible canonical contract at the notice boundary; permanent purchases remain outside the renewal clock.
- A contract remains usable through its listed expiry week and expires at the beginning of the following week. Replacement rights begin at that exact following week.
- Renewal offers persist realized performance, demand, relationship, rival-interest, and affordability facts instead of using the removed fixed-percentage uplift.
- Strategy, default Custom, Full, protected-case escalation, and manual takeover all resolve through the same case registry.
- Renewal acceptance reruns A3 compatibility, registers one exact-scope replacement, settles its guarantee once, and synchronizes owned/AI projections.
- Production House and EMPIRE+ use the same grouped Rights Calendar; project details expose one restrained factual rights line.
- Weekly changes collapse into one digest. Only protected decisions within one week of deadline create one idempotent grouped inbox notice.
- Fresh A1–A4, marketplace, Platform AI lifecycle/economy/release, migration, save-transfer, production-build, server-render, and live Chromium checks passed on 2026-08-31. The global TypeScript run contains no A4-local error; its remaining failures are the documented stale owned-platform audit fixtures.

## Phase A5 — Catalogue Packages and Portfolio Licensing — COMPLETE

### Purpose

Support portfolio-level negotiations while preserving title-level rights and economics.

### Core work

- Packages containing real, compatible catalogue titles.
- Package-level presentation backed by title-level contracts.
- Package bidding based on portfolio fit, catalogue gaps, buyer capacity, relationship, and conflicts.
- Mixed strong/weak-title economics and breakout upside.
- Visible per-title guarantees and backend terms using a deterministic `15%` equal / `60%` independent reference / `25%` bidder-fit allocation.
- Independent-value guardrails, mirrored buyer/seller accounting, and exact investor attribution.
- Bulk renewal preparation with per-title exceptions.
- No phantom titles or package payment without underlying contracts.

### Control-mode integration

- Strategy Mode may allow the Rights Desk to propose or execute routine packages inside a saved mandate, but protected package execution requires approval.
- Custom Control lets the player delegate catalogue selection while pinning titles out of a package.
- Full Control lets the player build and approve every component.

### Completion gate

- Package money, rights, expiry, and title attribution reconcile exactly to component contracts.
- Package reservations, hybrid component allocations, and atomic signing are bounded and enforceable.
- Excluded or conflicting titles cannot leak into a package.
- Bidder-specific title splits cannot manipulate investor payouts or buyer cost basis.
- Batch gameplay reduces workload without hiding important asset transfers.

### Completion evidence

- The package registry is an envelope over one canonical title contract per component; it never acts as a second rights authority.
- Real completed same-studio titles are filtered through A3 exact-scope compatibility, while outsourced commissions, conflicts, and live overlapping reservations are excluded.
- Package offers reserve a `$1M` title floor, use the approved `15% / 60% / 25%` hybrid allocation, persist title-specific backend terms, and reconcile exactly to the headline guarantee.
- A2's shared timed room drives package competition and never auto-selects an interactive winner. Strategy automation uses that same room only inside the player's saved mandate.
- Signing is atomic and idempotent across buyer cash, seller receipt, investor payouts, buyer cost basis, relationship memory, energy, package lineage, and child contracts.
- Production House exposes one responsive Package Desk; EMPIRE+ exposes real primary-studio package opportunities; Platform AI no longer uses equal-split catalogue acquisition.
- A4 renewal cases remain canonical per title and gain a non-mutating grouped package review projection.
- Migration reconstructs only factual historical signed packages, while compaction preserves unresolved and contract-referenced lineage.
- Fresh A1–A5, marketplace, Platform AI, settlement, migration, transfer, weekly save-safety, production build, server-render, and responsive live-browser checks passed on 2026-09-01. Repository-wide TypeScript still reports only the pre-existing stale owned-platform audit-fixture mismatches documented in the A5 report; no A5-owned compiler error remains.

## Phase A6 — Two-Sided Acquisition and Resale Synchronization — COMPLETE

### Purpose

Let studios and streaming platforms act as buyers, sellers, licensors, and permitted resellers through the same market.

### Core work

- Player-owned platform acquisitions through the A3 compatibility authority.
- AI-platform acquisitions and disposals through canonical records.
- Permitted sublicensing and platform-to-platform resale.
- Permanent catalogue purchases where contracts allow them.
- Atomic seller proceeds, buyer cost, catalogue entry, and future settlement.
- Distress sales that cannot bypass solvency, exclusivity, or encumbrances.
- Change-of-control handling connected to existing acquisition systems.

### Control-mode integration

- Delegated buying/selling obeys cash, rights-scope, duration, and asset-protection mandates.
- Permanent acquisitions, protected IP, and material solvency decisions require approval by default.
- Full Control may inspect and approve every side of the transaction.

### Completion gate

- Either side of a transaction resolves to the same project, rights, dates, and money.
- All transaction paths are idempotent.
- Acquisition or distress cannot erase obligations.
- Delegation cannot exceed the player's saved authority.

### Completion evidence

- One shared A6 settlement authority now handles full player/AI licence transfers and existing sublicences without creating a second rights registry.
- A full transfer closes the seller position, creates one active successor, preserves the original dates, exact countries, exclusivity, backend, accrued royalty evidence, localization, package attribution, and unresolved obligations.
- The resale price moves only from buyer to current holder; the original studio retains IP and original backend but receives no downstream resale participation or consent action.
- EMPIRE+ listings are derived from real canonical contracts and show original owner, current holder, exact scope, remaining term, inherited backend, obligations, and incompatibility reasons.
- The Production House Rights Desk reconstructs `original owner → former holder → current holder` from persisted lineage.
- Platform AI distress and four-week strategic disposal use the same exact-scope transfer authority even when the player owns no streaming platform.
- Multi-title transfer batches stage all components and return the untouched input state when any component fails.
- Fresh A1–A6, marketplace, Platform AI distress/economy/release/turn, migration, save-transfer, production build, SSR, and mobile/desktop browser checks passed on 2026-09-01. Repository-wide TypeScript continues to report only the older owned-platform audit-fixture mismatches recorded before A6; no A6-owned diagnostic remains.

## Phase A7 — Rights Office, Relationship Intelligence, and Commercial Observability — COMPLETE

### Purpose

Make a deep rights market manageable, explainable, and strategically persistent.

### Core work

- Complete Rights Office portfolio view and action queue.
- Strategy, Custom, and Full Control selection per studio.
- Licensing Mandates and per-title overrides.
- Weekly/cycle rights digest.
- Relationship memory for rejection, delivery, renewal, breach, loyalty, and long-run profitability.
- Platform strategy effects on offer timing, structure, renewal aggression, package interest, and final terms.
- Studio statements separating guarantees, production funding, locked future-season funding, attributed gross, recoupment, and backend.
- Platform statements separating title-attributed revenue, fixed exposure, royalty expense, retained contribution, and forecast error.
- Full contract, delegated-decision, and settlement history without a hidden “best deal.”

### Workload targets

Long-library tests should prove that a 30–40 title studio can operate in Strategy or Custom mode with a small actionable queue rather than dozens of repetitive decisions.

Routine decisions stay in the digest. Protected exceptions and meaningful bidding wars remain playable.

### Completion gate

- Every delegated decision cites its mandate and saved facts.
- Switching modes affects only future decisions.
- Full Control retains complete access.
- Important commercial outcomes are reconstructable.
- Large libraries remain manageable without reducing simulation depth.

### Completion evidence

- Production House now opens one restrained Rights Office with Portfolio, Mandate, Relationships, Statements, and Packages sections; the existing A4 calendar and A5 package desk remain the detailed execution surfaces beneath it.
- Per-production-house mandates persist control mode, financial, distribution, exclusivity, duration, partner, renewal, and protected-title policy with revision history. Identical updates are true no-ops, while mode changes affect only future unresolved decisions.
- New delegated renewals and routine catalogue packages persist the exact mandate revision, rule, literal decision facts, and human explanation used at commitment time.
- The portfolio projection groups action-required, available, contracted, approaching-expiry, delegated, and low-interest titles without creating a second rights authority. A 40-title fixture retains all records while capping the action rail at seven.
- Relationship intelligence is derived from existing offer outcomes, renewals, commission delivery/cancellation, recovery, royalties, and transfer history rather than a new relationship ledger.
- Studio and platform commercial statements reconcile guarantees, producer fees, restricted production funding, future-season funding, adjusted gross, backend accrual/payment, recoupment, transfers, and retained contribution. Production caps are never counted as studio income and unavailable forecasts remain blank.
- One bounded, idempotent weekly Rights Office digest is emitted only when material rights activity occurred. Save migration and compaction normalize the new state without duplicate digests.
- The A6 AI transfer projection now uses the shared 40-entry Platform AI decision-history bound. The long-run audit also recognizes same-week transfer sale proceeds received after the economy allocation step; its exact 104-week resume-parity preflight passed, while the complete 2,600-week multi-fixture matrix remains part of A8's explicit exit audit.
- Fresh A1–A7, rights marketplace, Platform AI rights lifecycle/distress, save migration, save transfer, weekly-loop, production-build, server-render, and live desktop/mobile browser checks passed on 2026-09-02. The mobile page had no horizontal overflow and the browser logged no runtime errors.
- Repository-wide TypeScript contains no A7-owned diagnostics. Remaining failures are the older owned-platform audit fixtures missing fields such as `publicManifesto` and `networkPlacements`, plus obsolete fixture enum literals already documented before A7.

## Phase A8 — Presentation, Tools, Balance, and Final Verification — COMPLETE

### Purpose

Finish Project A as a durable, accessible, balanced game system.

### Core work

- Mobile and desktop Rights Office, Calendar, market, and contract polish.
- Progressive disclosure and compact decision cards.
- Restrained bidding-room tension with reduced-motion support.
- QA-only cheat shortcuts with no production dependency.
- Migration fixtures for legacy, A1, A2 schema-v2, malformed, and repeated-reload saves.
- Long-run tests for solvency, guarantees, backend outliers, expiry, renewals, package concentration, automation, workload, and save size.
- Cross-system regression coverage for Production House, owned streaming platform, Platform AI, subsidiaries, finance, release, and awards.

### Control-mode verification

- The three modes produce the same offer and contract universe.
- Delegation does not produce hidden bonuses or penalties.
- Protected decisions cannot auto-sign accidentally.
- Mode switching does not change signed contracts.
- Same-week replay cannot repeat an automatic action.
- A 30–40 title catalogue remains usable in Strategy and Custom modes.
- Full Control retains every approved detailed action.

### Completion gate

- Focused audits and approved long-run bands pass.
- Save/reload determinism passes.
- Production build and relevant type/source checks pass.
- Accessibility and mobile/desktop checks pass.
- No duplicate money, rights, catalogue entries, or decisions appear.
- A final Project A report records changes, migration, tests, balance, workload evidence, and deferred work.

### Completion evidence

- The Rights Office now uses accessible Portfolio, Mandate, Relationships, Statements, and Packages tabs with keyboard navigation, visible focus, reduced-motion behavior, compact progressive disclosure, and no page-level mobile overflow.
- The developer-only `Rights Market A8 QA` shortcut creates a deterministic 40-title Empire Studios workload through the canonical A1–A7 registries; production simulation has no dependency on the fixture.
- Strategy, Custom, and Full Control retain the same offer and signed-contract universe. Protected decisions stay pending, mode changes affect future unresolved work only, and same-week replay is idempotent.
- Legacy-without-rights, A1, A2 schema-v2, malformed, compacted, and repeated-reload fixtures migrate safely. Contract, transaction, settlement, package, delegation, and News histories remain bounded and duplicate-free.
- The canonical 12-world Platform AI matrix passed 31,200 simulated weeks and 156,000 platform turns with 8,362 releases, 36.87% hits, 19.42% clear flops, 16 distress episodes, and 14 rescues.
- Netflix's measured expectation band was corrected to preserve a real lower tail: 43.90% hits and 12.15% clear flops. Every platform remained inside its approved company band.
- Integrated News produced 53,000 observed events with zero duplicate IDs and zero date violations; maximum compacted save size was 29,781,334 bytes.
- Fresh A1–A8, Platform AI sourcing/research/economy/distress/localization/rights/release/turn/scalability, save migration, subsidiary streaming, production build, and browser checks passed on 2026-09-02.
- The full exit evidence and intentionally deferred work are recorded in `../reports/2026-09-02-streaming-rights-finalization-phase8-report.md`.

## Project A exit gate

Project B may begin only when:

- A3 through A8 are complete;
- canonical compatibility is enforced everywhere;
- expiry, renewals, catalogue packages, and two-sided trades are live;
- all three control modes are safe and verified;
- Project A and Platform AI regressions pass; and
- the user approves the Project A final report.

---

# Project B — Shared Industry Intelligence

## Project goal

Make established and generated production studios and rival streaming platforms appear to run complete, consequential businesses through one efficient stats-driven simulation.

AI-only companies do not play every player-facing management screen invisibly. They use scheduled statistical decisions and compact project fingerprints. Exact systems activate when money, rights, talent, ownership, a public project, or the player becomes involved.

Studios no longer materialize finished rival films from nowhere, platforms no longer need to scan and administer every private candidate in full, and no company survives through unexplained passive cash.

## Existing foundation to reuse

Project B should build on:

- `WorldState.studios` and public studio summaries;
- `WorldState.industryProductions`;
- `WorldState.talentBookings`;
- canonical completed `WorldState.projects`;
- generated `NpcVentureState` identity/founder history;
- production calendars;
- Greenlight calculations;
- production economy, risk, crises, slate fatigue, and specialization;
- acquisition, stock control, Studio Group, and subsidiary mandates;
- awards and release systems;
- Platform AI commissioning; and
- completed Project A rights commerce.

Project B must also reuse the working Platform AI bidding, commission, economy, market, capability, release, distress, acquisition, and presentation boundaries. The regional/generated streaming ecosystem's compact company model is evidence for the shared direction, not a second authority.

Project B must eventually replace the current instant rival-release generation, expensive AI-only content administration, and separate shallow venture simulation after migration and parity tests pass. It must not replace Project A, the player's Production House or Streaming House, or canonical player-facing transactions.

## Phase B1 — Canonical Studio State, Control, and Migration — COMPLETE

### Purpose

Create one deterministic persisted Studio AI runtime for established studios and generated ventures.

### Core work

- Versioned Studio AI state nested within or canonically linked to `WorldState.studios`.
- Strategy, competence, risk, finance, development, production, commercial, and relationship profiles.
- Cash, debt, runway, capacity, ledger, decision history, event history, seed, and weekly checkpoint.
- Established-studio seeding and generated-venture migration.
- Company statuses including active, distressed, restructuring, dormant, sold/merged, and closed.
- AI/player controller resolver.
- Exact-once acquisition handoff to existing player/subsidiary systems.
- Legacy-save normalization without losing companies or founder history.
- Internal lifecycle states remain simulation-only; Forbes, News, and X show their consequences instead of raw company-state badges.
- The legacy instant venture-project scheduler remains temporarily behind a canonical studio compatibility projection until B3–B6 replace its creative pipeline.

### Completion gate

- Established and generated studios share one runtime.
- Same-week replay is a no-op.
- Player-controlled studios receive no AI mutation.
- Finances and controller transitions reconcile.
- Save/reload preserves deterministic state.

**Completion evidence:** All seven focused B1 audits, the 400-year/20,800-week B1 run, production build, save transfer/generation/integrity, venture determinism, studio production economy, acquisition, Studio Group, subsidiary streaming, Platform AI production, and weekly performance audits passed on 2026-09-02. No B1-owned TypeScript diagnostics remain; repository-wide `tsc` still reports the pre-existing owned-streaming audit-fixture drift recorded in the completion report.

## Phase B2 — Shared Statistical Intelligence Kernel — COMPLETE

### Purpose

Build the common deterministic brain used by AI-only production studios and streaming platforms before migrating either creative pipeline.

### Core work

- Four-layer company model: slow identity, capability, current condition, and bounded learning memory.
- Production-studio development, creative, production, finance, marketing, distribution, negotiation, and talent-relationship competence.
- Streaming-platform content, technology, catalogue, localization, finance, discovery, negotiation, and market-operations competence.
- Shared cash, debt, runway, capacity, momentum, fatigue, audience/market need, relationship, and strategic-pressure inputs.
- Stable next-due weeks for content, production review, release review, finance, expansion, and capability growth.
- Deterministic competence-shaped forecast error with no quality or commercial floor.
- Diminishing success gains, momentum cooling, overextension, repetition, franchise fatigue, and scale costs.
- Machine-readable decision reasons and shadow/parity instrumentation against current AI behaviour.
- Hard controller boundary: rival AI decisions stop for player-controlled companies; player delegation remains a separate player-standard authority.

### Completion gate

- Identical company state and entered week produce identical decisions.
- Only due companies perform material decision work.
- Strong companies outperform in aggregate without always winning.
- Stats remain finite, normalized, versioned, explainable, and save-safe.
- Same-week replay is a no-op.
- Player-controlled companies receive no rival-AI mutation.
- B2 changes no canonical bidding, commission, rights, release, or player Production House outcome.

**Completion evidence:** All nine focused B2 audits passed on 2026-09-03, including deterministic state, immutable adapters, due-only scheduling, eligibility/scoring, bounded learning, shadow isolation, weekly integration, save protection, and a 20,800-week pure-kernel run across six representative company conditions. The run was exactly replayable, kept material intelligence work below 70% of weeks, retained approximately 49 KB for the exercised company, and produced stronger aggregate forecasting/outcomes while still allowing strong-company failures and developing-company breakouts. Existing Studio AI, Platform AI, bidding, rights, acquisitions, save, late-game performance, and production-build gates also passed. Repository-wide `tsc` remains non-green only because of the previously recorded owned-streaming audit-fixture drift; no B2-owned diagnostic remains.

## Phase B3 — Content Fingerprint, Variety, and Universe Blueprint Engine — COMPLETE

### Purpose

Generate varied, strategy-fitting project intentions without consuming a complete script or narrative template for every private AI idea.

### Core work

- Compact fingerprints for format, genres, subgenre, tone, theme, setting, period, audience, language, budget band, strategic intent, franchise relationship, creative risk, star-power target, and intended release path.
- Original, internal, licensed, acquired-IP, sequel, prequel, reboot, spin-off, individual commission, and inherited-project source intents.
- Global and company-level novelty memory with cooldowns for repeated title structures, genre/theme combinations, settings, audiences, and franchise patterns.
- Lazy title, synopsis, cast presentation, and public metadata generation only after materialization.
- Suitable-budget curves with underfunding penalties and diminishing over-budget returns.
- Deterministic identity and uncertainty that survive save/reload.
- Rare, fallible planned and emergent universe blueprints with cadence, branch, crossover, momentum, fatigue, pause, failure, and retirement inputs.
- Pure materialization drafts that retain stable fingerprint/blueprint lineage while `WorldState.universes` remains the sole canonical public universe registry.
- Existing player Development Lab, script marketplace, and Greenlight flow remain the detailed player path.
- Future-output and automatic multi-picture obligations remain deferred.

### Completion gate

- Private rejected concepts do not become permanent full-script records.
- Every selected or public project has a stable fingerprint and ID.
- Long-run title and fingerprint repetition remain inside approved limits.
- Materialized facts cannot reroll.
- Real external IP still passes canonical ownership and rights checks.

**Completion evidence:** All nine focused B3 audits passed on 2026-09-03. The engine creates exactly six deterministic ephemeral candidates per due content decision, persists one winner only, blocks exact recent duplicates, applies recency/global/continuity penalties, stores ordered suitable-budget curves, and forms rare private universe blueprints without publishing them. A 20,800-week replay across four AI companies produced 12,800 selected intentions and 17 private blueprints, retained only 24 fingerprints and 6 blueprints per company, used 281,416 bytes across all four complete intelligence states, and left canonical money, projects, rights, and universes unchanged. B2, universe, rights, save-integrity, production-build, and diff checks passed. Repository-wide `tsc` remains non-green only because of the previously recorded owned-streaming fixture drift; no B3-owned diagnostic remains.

## Phase B4 — Streaming Platform AI Migration — COMPLETE

### Purpose

Move the five flagship platforms and the wider regional/generated ecosystem onto the shared private-decision model while preserving all player-facing streaming depth.

### Core work

- Replace constant hidden catalogue scanning with scheduled content-need decisions.
- Derive content appetite, expected value, affordability, risk, catalogue gap, subscriber opportunity, strategic territory need, and preferred deal shape from saved platform stats.
- Convert routine AI-only research and localization administration into capability progression while retaining exact languages, markets, commitments, and acquisition handoff facts.
- Preserve real platform economy, subscribers, valuation, market competition, distress, recapitalization, dormancy, acquisition, and controller rules.
- Preserve the complete A2 bidding room: eligibility, 15-second clock, equal six-second response cooldown, extensions, revisions, final/withdrawal behaviour, offer terms, restoration, and settlement.
- Preserve individual commission offers to the player and the complete Production House fulfilment flow.
- Use compact AI-only originals until a public, contractual, or player boundary requires materialization.
- Allow any canonically representable regional or generated platform to become a real bidder only when rights scope, market presence, finance, branding, and settlement identity are valid.

### Completion gate

- Existing bidding, commission, subscriber, economy, market, distress, and release guarantees remain valid.
- Project A remains the sole rights and settlement authority.
- Impossible rights and financially incapable bidders never enter a room.
- Strategic overpayment and uncertain backend remain possible without exceeding fixed affordability.
- Player acquisition preserves markets, capabilities, projects, rights, finances, and mistakes, then removes AI-only advantages.
- AI-only candidate, job, and history growth is bounded.
- Old saves migrate without losing platform history.

**Completion evidence:** B4 now converts newly due B2 proposals and linked B3 fingerprints into stable platform intents, then routes them through the existing canonical content, player-commission, research, localization, market-entry, rights, finance, distress, release, and acquisition systems. The old unconditional Platform AI catalogue/research/market planning call is retired from live turns while lifecycle progression remains intact. Non-core regional and generated operators receive bounded due-only B2/B3 private intelligence, and an explicit bidder bridge fails closed until canonical identity and settlement support exist. Seven focused B4 audits passed, including a deterministic 20,800-week run across four representative operators that processed 72,035 proposals while retaining approximately 327 KB. B2, B3, Platform AI sourcing/commission/research/localization/rights, Project A compatibility/finalization, ecosystem, save-integrity, Platform AI turn, and production-build checks passed. Repository-wide lint still reports only the previously recorded owned-streaming fixture drift. The broader legacy `audit:platform-ai` aggregate currently stops at its pre-existing Phase 6 relationship-memory sample because that deterministic sample resolves as a flop and produces a negative remembered-pair modifier; the B4-owned and adjacent domain audits remain green.

## Phase B5 — Production Studio Slate and Greenlight Simulation — COMPLETE

### Purpose

Turn B1 studio identity, capability, finance, and capacity into coherent automatic slates without making every AI studio operate the player's Development Lab.

### Core work

- Scheduled project opportunities based on desired release cadence, money, runway, development/production capacity, strategy, specialization, catalogue gaps, market demand, and commissions.
- Compact development commitment rather than saved invisible searches, meetings, and rejected full scripts.
- Aggregate private scouting/development cost with exact ledger entries for selected or external commitments.
- Bounded concurrent slates based on real resources, not a universal flat cap.
- Develop, rewrite, hold, abandon, sell/turnaround, resize, approve, or reject outcomes.
- Suitable budget and greenlight confidence with competence-shaped mistakes and persisted uncertainty.
- Exact script/IP ownership only when a real external asset is selected.
- Individual platform commissions use the same statistical need but keep commission funding and producer fees separate.
- Player-controlled and delegated studios continue through player-standard systems and approval mandates.

### Completion gate

- No AI studio release begins without a saved project intention and commitment.
- Development time, cost, capacity, and runway alter decisions.
- Private rejected ideas do not bloat the save.
- Commissioned and independent ownership/economics stay distinct.
- Player-linked projects escalate to the existing detailed workflow.
- Development and greenlight outcomes do not reroll.

**Completion evidence:** B5 now admits only newly due B2/B3 studio intentions into compact development commitments, charges exact idempotent development/rewrite money through the B1 ledger, and resolves due reviews into greenlight, rewrite, hold, turnaround, or abandonment from real strategy, competence, suitable budget, capacity, cash, runway, fatigue, and saved uncertainty. Canonical platform commissions are adopted without duplicating funding, and the legacy venture generator cannot originate a project without consuming one unique B5 greenlight. Nine focused B5 audits passed. A deterministic 20,800-week replay across four studio profiles admitted 9,586 commitments, produced 9,582 greenlights plus non-automatic rewrite decisions, retained approximately 484 KB, and completed its first audit pass in 17.919 seconds. B1–B4, Platform AI production/commission, rights, venture, acquisition, save-integrity, build, and scoped diff checks passed. Repository-wide TypeScript validation retains only the previously recorded owned-streaming fixture drift; no B5-owned diagnostic remains.

## Phase B6 — AI Production, Release, and Commercial Results — COMPLETE

### Purpose

Progress AI-only commitments through compact but fallible production and release milestones, then materialize the full permanent result.

### Core work

- Compact development, production, post-production, awaiting-release, and released checkpoints for AI-only work.
- Public talent packages selected from canonical ability, fame, genre/audience/language fit, load, overexposure, collaboration, and prestige/commercial value without simulating every negotiation.
- Canonical talent bookings when schedule or player interaction makes them material.
- Saved delays, overruns, quality problems, financing holds, recovery, turnaround, and cancellation.
- Final creative, execution, commercial, prestige, and downside results from fingerprint, company stats, budget suitability, capacity, talent, timing, and saved variance.
- Limited, wide, event, prestige, streaming-only, hybrid/later-window, delay, sale, and hold release choices when rights permit.
- Existing theatrical box office for theatrical releases and existing streaming audience/economy effects for streaming-only releases.
- Exact external finance, Project A rights commerce, catalogue attribution, franchise lineage, and canonical awards.
- No automatic theatrical release for a delivered platform original.

### Completion gate

- Every public title has stable studio/platform lineage, cast, budget, status, date, IMDb record, rating, and commercial result.
- Public facts, milestones, rights, money, bookings, releases, and awards do not reroll or duplicate.
- Streaming-only titles receive no fake theatrical box office.
- Company ledgers reconcile exact external money.
- Player-linked productions use the complete existing Production House/career workflow.
- AI companies can succeed, delay, fail, sell, or cancel.

**Completion evidence:** Eleven focused B6 audits passed on 2026-09-03. Independent B5 greenlights now hand off exactly once into the canonical physical-production registry, share the canonical talent pool and bookings, pay four exact idempotent milestones, persist checkpoint problems/recovery/holds/turnarounds/cancellation, freeze multidimensional final quality, use Project A compatibility for streaming routes, and materialize one canonical release with exact cash, ledger, IMDb, box-office/streaming, award, universe, and fingerprint lineage. The live venture instant-release path is retired. A deterministic 20,800-week replay created 520 releases with 67 hits, 312 flops, 173 delayed productions, zero duplicate project IDs, and a 1,165,308-byte compacted save; replay reproduced the same digest. Platform AI production/player commissions, Project A compatibility, venture determinism, save integrity, and build passed. Repository-wide TypeScript retains only the previously recorded owned-streaming fixture drift; no B6-owned diagnostic remains.

## Phase B7 — Player Interaction, Ownership, and World Presentation — COMPLETE

### Purpose

Make compact private simulation become complete gameplay whenever the player touches it, and project one consistent industry story across the game.

### Core work

- One shared weekly coordinator with deterministic order, due-event scheduling, sparse processing, and checkpoints.
- One materialization boundary for player involvement, cross-company money, rights, named talent, public projects/releases, and ownership changes.
- Exact acquisition handoff: compact active work expands at its last saved milestone without restart or reroll.
- Existing Production House, Streaming House, career, Studio Group, and subsidiary Command Centre become the detailed control surfaces.
- Delegated player subsidiaries may use shared decision scoring but must execute through player-standard costs, time, capacity, rights, approvals, and no AI-only rescue or advantage.
- Material News, Forbes, IMDb, box office, awards, X, and Instagram projections reference the same canonical events and IDs.
- Importance thresholds, channel cadence, cooldowns, and bounded histories prevent spam.
- Rival internal status remains private; public surfaces show valuation, releases, relationships, ownership, distress consequences, and other evidence.
- Smaller companies may remain grouped in `Others` until deterministic visibility thresholds are reached.
- Current flagship Platform AI orchestration, instant rival releases, and compatibility bridges retire only after replacement parity.

### Completion gate

- AI-only companies process light settlement once and material decisions only when due.
- Player-controlled companies receive no rival-AI mutation.
- Acquired companies retain finances, markets, capabilities, rights, catalogue, projects, commitments, relationships, progress, and mistakes.
- News, Forbes, IMDb, social, box office, and awards do not contradict one another.
- Old random rivals and expensive AI-only lifecycle paths are gone from canonical progression only after parity.
- No duplicate commission, production, release, contract, settlement, award, or presentation event appears.

**Completion evidence:** Seven focused B7 audits passed on 2026-09-03. One deterministic entered-week coordinator now orders Platform AI, streaming ecosystem, Studio AI, canonical event collection, and restrained presentation exactly once. Studio acquisition/sale handoff preserves exact private intelligence, cash, ledger, slate, active-production progress, cast, problems, spend, dates, and lineage without restart or same-week double progression. Existing manual, board-review, and auto subsidiary modes reuse B2/B3 strategy while always paying player-standard cost and time. Release Wizard, Box Office, Forbes evidence, IMDb, awards, and News share canonical project identity. Migration version 33 and compaction remove independent legacy rival schedules. The cutover RED test initially found nine unbacked instant public projects in one forced week; the final path creates zero. B4, B5, B6, Project A rights, acquisition/sale, build, and local browser checks passed. Full combined balance/device/save certification remains B8.

## Phase B8 — Balance, Mobile Performance, and Long-Run Verification — COMPLETE

### Purpose

Prove the shared industry looks deep, remains varied, and stays technically safe for mobile devices and multi-generation careers.

### Core work

- Deterministic baseline, lean, boom, crowded, and adverse 10-, 25-, 50-, 100-, and 400-year matrices.
- Production-studio and streaming-platform launch, maturity, survival, distress, funding, restructuring, acquisition, merger, dormancy, and closure.
- Content variety, fingerprint repetition, project cadence, budget fit, development, production, hold, cancellation, release, finance, and relationship metrics.
- Bidding, commission, rights, catalogue, franchise, talent-load, box-office, streaming, awards, News, social, save-size, and runtime parity metrics.
- Midpoint save/reload equivalence, old-save migration, player-acquisition conversion, and delegated-subsidiary tests.
- Device-oriented Process Week budgets and protection of the existing A8P/A8S boundaries.
- Approved company, outcome, repetition, churn, runtime, and save-growth bands documented before final tuning.

### Target behaviour

- Strong companies outperform in aggregate but not every seed.
- Every long-lived company can succeed and fail.
- Small specialists can create breakout successes and major companies can make expensive failures.
- New challengers sometimes break out and sometimes close.
- Entrants may begin at credible different potential levels with funded explanations.
- No company survives through hidden income.
- No company wins every commercial, subscriber, box-office, or awards year.
- Wealth expands options but does not guarantee quality.
- Talent may work on multiple projects within plausible load.
- AI-only records and histories stay bounded while permanent public history remains inspectable.
- Money and state never become NaN or infinite.

### Completion gate

- Focused audits and every approved horizon/band pass, including a practical complete 400-year run.
- Save/reload determinism, old-save migration, build, and player-handoff parity pass.
- No canonical path uses unpersisted random IDs/outcomes.
- No hidden passive cash, unbounded private workflow, or duplicate record remains.
- Existing Project A, bidding, commissions, player Production House/Streaming House, career, and acquisition flows remain intact.
- Mobile Process Week and save-growth budgets pass.
- A final Shared Industry Intelligence report records implementation, migration, parity, tests, balance, performance, and deferred work.

**Completion evidence:** Five deterministic regimes completed 20,800 canonical weeks each, for 104,000 scenario-weeks and 2,000 simulated years. The matrix retained expensive failures, small/regional breakouts, company failures, funded challengers, active competitors, and material public activity with zero unexplained rescue cash, exact non-lineage fingerprint repeats, routine-accounting publications, or silent years. Baseline leadership peaked at 49.3%, under the approved 65% ceiling. The mature 20.2 MB fixture passed at 349.09 ms total p95, 308.18 ms annual-heavy time, and a 1.40 second four-times slowdown proxy. A 25-year midpoint save/load replay matched uninterrupted progression, 50/100/400 MB legacy shapes migrated, terminal rights no longer resurrect after compaction, the isolated browser career processed weeks and rendered the 33-platform Forbes index without JavaScript errors, Project A/B1–B7 regressions passed, and the production build passed. Physical low-end Android timing was not available and remains explicit release-device QA. Full evidence is in `../reports/2026-09-04-shared-industry-intelligence-b8-final-report.md`.

## Project B exit gate

Project B is complete only when:

- AI-only studios and streaming platforms use scheduled stats-driven private decisions rather than invisible player-screen simulation;
- independent studios no longer materialize finished films from nowhere;
- every public release has stable intent, production, release, ownership, and economic lineage;
- real economics replace passive cash drift without saving irrelevant internal transactions;
- Project A owns all streaming commerce;
- bidding and individual commission behaviour retain full player-facing depth;
- player acquisition converts active work and stops rival AI without deleting obligations;
- delegated subsidiaries use player-standard rules and approvals;
- established and generated studios/platforms use one shared decision architecture;
- companies can grow, fail, be funded, acquired, merged, or closed;
- content diversity, save growth, and mobile runtime pass approved long-run limits;
- the complete 400-year certification finishes in practical engineering time; and
- the user approves the final report.

---

# Follow-on projects

## Project C — Shared Industry Reactions and Media World

Project C is active after the approved Project B exit. It deepens presentation while B7 remains the canonical fact stream.

- **C1 — COMPLETE:** Canonical Media Story Arcs.
- **C2 — NEXT:** Media Institutions and Recurring Personalities.
- **C3:** X Discussions, Public Statements, and Player Responses.
- **C4:** YouTube Theory, Breakdown, and Creator Culture.
- **C5:** Fandoms, Instagram, and Public Campaigns.
- **C6:** Rumours, Leaks, Predictions, and Resolution.
- **C7:** Long-Term Narratives, Feuds, and Media Control.
- **C8:** Variety, Balance, Mobile Performance, and Long-Run Audit.

All Project C templates and personalities must consume saved facts rather than inventing a parallel simulation. They may interpret, criticize, support, speculate with labelled uncertainty, or react, but cannot independently change money, rights, projects, ownership, relationships, awards, production, or company outcomes.

## Legal, lawsuit, and contract-dispute pack

Actor departures, firing, replacement litigation, breach lawsuits, indemnity, and blame allocation remain separate. Projects A and B may preserve contract statuses and production consequences without pretending the full legal system exists.

## Performance and save-size programme

Platform AI Phase 8 observed an approximately 30 MB maximum compacted 50-year save. A8P added an age-82 combined production/streaming benchmark and reduced its complete measured Process Week path to 158.06 ms p95 across 20 weeks. A8S now guards compaction with protected career invariants and promotes saves only after candidate read-back verification; generated 50 MB, 100 MB, and 400 MB payload shapes pass the bounded-memory preparation audit. Projects A and B must still keep new histories bounded, and new phases must preserve this benchmark budget and the A8S integrity boundary.

---

# Per-phase execution and roadmap maintenance

## Required workflow

For each phase:

1. Read this living roadmap completely.
2. Inspect current code, relevant supporting documents, and the dirty worktree.
3. Confirm the exact phase boundary and existing reusable systems.
4. Present a focused design and obtain user approval.
5. Write a phase implementation plan where required.
6. Add or identify a meaningful failing audit before implementation.
7. Implement only the approved phase.
8. Run focused and adjacent regressions.
9. Verify save migration, determinism, money, rights, duplicate records, and player-acquisition boundaries.
10. Run the production build and relevant UI checks.
11. Report delivered behaviour, visible player result, verification evidence, and remaining limitations.
12. Update this file and wait for user approval before the next phase.

## Required roadmap update after a phase

Update:

- `Last updated`;
- `Current next phase`;
- the programme status table;
- the completed phase heading and delivered list;
- new approved architectural decisions;
- verification commands/results;
- migration or compatibility notes;
- remaining limitations; and
- the change log.

Do not rewrite historical completion facts unless current repository evidence disproves them. Record a regression separately.

## Phase completion report format

Every completion report should answer:

1. What changed in the simulation?
2. What does the player now see or control?
3. Which existing systems were reused?
4. Which legacy paths were removed or retained temporarily?
5. What data migrated?
6. Which audits and builds passed?
7. What remains intentionally deferred?
8. What is the next phase?

## Current baseline evidence

Before this living roadmap was created:

- Platform AI Phase 8 completed its 12-world, 31,200-week verification matrix.
- Project A A1 and A2 focused audits passed in their implementation work.
- The Production Studio baseline audits passed for living studio ecosystem, NPC venture determinism, production economy, production risk, slate fatigue, and Studio Group.
- No gameplay code was changed while preparing the post-Platform roadmaps.

Fresh phase work must rerun the checks appropriate to its current code boundary.

## Change log

### Version 24 — 2026-09-04

- Approved the Project B exit and activated Project C.
- Completed Project C Phase C1 with a separate bounded `industryMedia` registry grounded entirely in B7 canonical event IDs.
- Added deterministic story identity, compatible event merging, lifecycle stages, fading, terminal resolution, channel eligibility, and one restrained delayed public-conversation beat.
- Linked News, X, and Instagram items with shared `mediaStoryId` values while retaining the existing two-story editorial budget and exactly-once publication keys.
- Advanced save migration to version 34 and reconciled compacted story references against retained canonical evidence before applying bounds.
- Passed five focused C1 audits, a 20,800-week C1 run, all seven B7 audits, B8 foundation/experience/performance checks, and the production build.
- Advanced the approval gate to C2 — Media Institutions and Recurring Personalities.

### Version 23 — 2026-09-04

- Completed Project B Phase B8 and moved the programme to Project B exit approval; Project C remains gated.
- Added deterministic baseline, lean, boom, crowded, and adverse certification scenarios, bounded observers, midpoint save/resume parity, frozen experience rules, and a five-report matrix verifier.
- Completed 104,000 canonical scenario-weeks across five 400-year worlds with contested leadership, major failures, smaller-company breakouts, funded challengers, company exits, and no unexplained rescue cash, exact non-lineage fingerprint repeats, routine-accounting publications, or silent years.
- Certified the mature 20.2 MB Process Week fixture at 349.09 ms p95 and 1.40 seconds under the four-times low-end proxy, while keeping exact-once week progression and zero input mutation.
- Replaced large-save JSON equality clones, preserved valid plan references while filtering malformed IDs, bounded expired rights history, and prevented canonical save loads from resurrecting pruned terminal buyer-local projections.
- Passed B8 foundation, scenario, runner, experience, breakout, parity, performance, final matrix, Project A/B1–B7 regression, save, build, and isolated browser checks. Physical low-end Android timing remains release-device QA.

### Version 22 — 2026-09-03

- Completed Project B Phase B7 and advanced the approval gate to B8.
- Added one exactly-once entered-week coordinator and bounded canonical industry event ledger with deterministic News, X, and Instagram projection.
- Added exact studio acquisition and reverse-sale materialization across private intelligence, finance, slate, active production, talent, problems, progress, and release lineage.
- Reused the existing subsidiary manual, board-review, and automatic modes; connected saved B2/B3 strategy and prohibited AI cost/time advantages under player ownership.
- Unified Release Wizard rivals, Weekly Box Office, IMDb, awards, News, and Forbes evidence around canonical production/project IDs.
- Retired two-per-week instant rivals, extra random finished releases, legacy universe instant releases, and independent saved rival schedules.
- Passed seven focused B7 audits, B4-B6 long-run regressions, Project A rights regression, acquisition/sale checks, production build, and local browser verification.

### Version 21 — 2026-09-03

- Completed Project B Phase B6 and advanced the approval gate to B7.
- Replaced the temporary venture instant-release bridge with canonical greenlight handoff, physical production, talent booking, milestone payment, risk, recovery, final-quality, release-planning, and commercial-result services.
- Kept Platform AI commissions on their existing authority and stopped all rival progression when a studio is player-controlled.
- Required active Project A rights compatibility for streaming/hybrid release modes and guaranteed zero theatrical box office for streaming-only projects.
- Added exact-once release economics and stable project, cast, rating, awards, universe, and fingerprint materialization.
- Passed eleven focused B6 audits, deterministic 20,800-week replay, adjacent Platform AI/rights/venture/save checks, build, and B6-scoped compiler review.

### Version 20 — 2026-09-03

- Completed Project B Phase B5 and advanced the approval gate to B6.
- Replaced independent instant AI-studio project decisions with due B2 proposal, linked B3 fingerprint, and compact B5 development commitments.
- Added controller, lifecycle, ownership, duplicate, capacity, runway, affordability, and external-right admission gates.
- Added exact idempotent development/rewrite ledger transactions, multidimensional deterministic review, budget sizing, bounded rewrites, holds, turnarounds, abandonment, greenlight, and production-reservation handoff.
- Adopted canonical platform commissions without duplicating independent development cost, platform funding, or producer fees.
- Prevented the legacy venture generator from originating an unrelated project and preserved commitment/fingerprint lineage through its temporary B5-to-B6 bridge.
- Added a due-lane fast path so non-due studio weeks skip full intelligence-context construction.
- Passed nine focused B5 audits, deterministic 20,800-week replay, B1–B4 regressions, commission/production, rights, venture, acquisition, save integrity, build, and scoped diff checks.

### Version 19 — 2026-09-03

- Completed Project B Phase B4 and advanced the approval gate to B5.
- Made newly due B2 proposals and their immutable B3 fingerprints the authoritative private intent source for AI-controlled flagship streaming platforms.
- Retired the old live unconditional catalogue/research/market planning call without replacing canonical production, commission, research, localization, market, rights, finance, distress, release, or acquisition executors.
- Added deterministic content-source routing, proposal affordability ceilings, exact research and market intent routing, one-time processing, bounded execution outcomes, and committed fingerprint lineage.
- Added due-only bounded B2/B3 intelligence to regional and generated streaming operators while preserving their lightweight ecosystem economy.
- Added a fail-closed canonical-bidder bridge with explicit identity, territory, runway, lifecycle, and settlement-support rejection reasons.
- Preserved Project A as the only rights and settlement authority, retained all existing bidding-room mechanics, and kept player-controlled platforms outside rival-AI execution.
- Passed seven focused B4 audits, a deterministic 20,800-week B4 run, B2/B3 regressions, adjacent Platform AI and rights audits, ecosystem, save integrity, Platform AI turn, production build, and scoped diff checks. The older aggregate Platform AI Phase 6 fixture mismatch remains documented separately.

### Version 18 — 2026-09-03

- Completed Project B Phase B3 and advanced the approval gate to B4.
- Added deterministic six-candidate content fingerprint generation for movie, series, and limited-series intentions, with broad creative, audience, language, market, source, relationship, and release-path vocabulary.
- Added company/global novelty scoring, exact-repeat rejection, recency decay, market saturation, continuity fatigue, and deterministic winner selection without persisting rejected candidates.
- Added suitable-budget curves with explicit underfunding, ideal, ambitious, and excessive-spend behavior; wealth expands scale but cannot guarantee quality.
- Added rare planned/emergent universe blueprints with capability, runway, ownership, capacity, branch, crossover, momentum, fatigue, pause, failure, and materialization gates.
- Preserved `WorldState.universes` and Project A as the canonical universe and rights authorities; B3 exposes only pure, rights-safe materialization drafts.
- Integrated B3 inside the B2 shadow path for due AI content decisions, protected and compacted its bounded save state, and kept all player-controlled and canonical gameplay outcomes unchanged.
- Passed nine B3 audits, the deterministic 20,800-week certification, B2 regressions, all existing universe audits, rights market, save integrity, build, and diff checks.

### Version 17 — 2026-09-03

- Completed Project B Phase B2 and advanced the approval gate to B3.
- Added one versioned statistical intelligence section inside existing Studio AI and Platform AI runtimes, with immutable domain adapters rather than another company or finance authority.
- Added deterministic due-lane scheduling, eligibility-before-scoring, competence-shaped forecast uncertainty, bounded learning, momentum cooling, fatigue/overextension pressure, reason codes, and hard player-controller exclusion.
- Integrated the kernel in shadow mode: current studio/platform systems remain authoritative while bounded proposals and parity comparisons are saved without player-visible events or canonical gameplay mutation.
- Protected and compacted intelligence state through the existing save pipeline and added nine aggregate B2 audits.
- Passed a deterministic 20,800-week pure-kernel run and the adjacent Studio AI, Platform AI, bidding, rights, acquisition, save, late-game performance, and production-build gates; full-world 400-year certification remains B8.

### Version 16 — 2026-09-02

- Approved and documented the move from invisible player-workflow simulation to one shared stats-driven, scheduled-event model for AI-only production studios and streaming platforms.
- Preserved completed Platform AI player-facing guarantees, Project A as the sole rights/settlement authority, B1 company state, and the player's detailed Production House, Streaming House, career, acquisition, and subsidiary-control systems.
- Remapped B2–B8 around the statistical intelligence kernel, compact content fingerprints and novelty protection, flagship streaming migration, studio slate/greenlight simulation, compact AI production and release, materialization/player handoff, consistent world presentation, and 400-year mobile-oriented certification.
- Locked the bidding boundary: stats supply platform appetite and valuation, while eligibility, clocks, revisions, terms, restoration, contracts, and settlements remain canonical.
- Locked the controller boundary: rival shortcuts apply only to AI-controlled companies; acquired and delegated businesses retain facts and operate under player-standard costs, time, capacity, rights, and approvals.
- Added `2026-09-02-stats-driven-industry-simulation-remap-design.md` as the controlling design when older Project B or Platform AI planning conflicts with the approved remap.

### Version 15 — 2026-09-02

- Completed Project B Phase B1 and advanced the approval gate to B2.
- Added one schema-versioned deterministic Studio AI runtime nested in `WorldState.studios`, with mature established profiles and generated-venture migration that preserves stable IDs, founders, history, and closed companies.
- Added exact-once ownership handoff and a hard player-control boundary; acquired studios retain cash, competence, capacity, ledger, history, projects, and obligations while autonomous mutation stops.
- Replaced the live weekly passive studio drift with ledgered catalogue income, operating cost, debt service, runway, valuation pressure, and internal company-condition transitions.
- Routed meaningful consequences through existing News/X feeds and removed raw lifecycle text from Forbes streaming cards; distress-derived acquisition presentation now says “Board under pressure.”
- Added save schema v32 normalization, bounded studio histories, integrity fingerprints, and a deterministic 400-year run covering 23 companies and a mid-run player acquisition. B1-owned diagnostics are green; older owned-streaming fixture type errors remain repository-wide.

### Version 14 — 2026-09-02

- Completed the A8S save-integrity and recovery addendum before Project B.
- Added deterministic integrity manifests for protected career identity, progression, finances, businesses, rights, productions, achievements, family, inventory, entitlements, and owned-streaming state.
- Replaced authoritative slot writes with candidate-first IndexedDB promotion, one previous-good generation, damaged-current quarantine, explicit recovery UI, and same-slot write serialization.
- Replaced clear-first signed import with read-back-verified batch staging and one atomic multi-slot promotion; internal generations never enter public exports.
- Added a space-aware oversized-legacy path, persistent-storage request, and audits for generated 50 MB, 100 MB, and 400 MB save shapes without claiming cloud, uninstall, or physical-device recovery.
- Project B B1 remains the next approval-gated phase.

### Version 13 — 2026-09-02

- Completed the A8P late-game Process Week exit addendum before Project B.
- Added an age-82 combined production-house, owned-streaming, Platform AI, and 6,000-contract benchmark with real weekly progression and persistence preparation.
- Removed the redundant actor-arc full save snapshot, the successful-week remigration pass, the artificial 300 ms flavor-text delay, and futile oversized localStorage mirror serialization.
- Added a pre-computation paint boundary and indexed/cached the large rights-calendar scan without changing weekly outcomes.
- Passed the 20-week benchmark at 158.06 ms p95, 71.8% below the same-run 559.46 ms legacy-equivalent path; Project B B1 remains approval-gated.

### Version 12 — 2026-09-02

- Completed Project A Phase A8 and moved the programme to final-report approval before Project B B1.
- Finalized the compact accessible Rights Office and added a deterministic developer-only 40-title workload fixture.
- Hardened canonical rights lookups, compaction, expiry, localization commitments/payments, terminal market scope, recapitalization history, and deterministic obligation order.
- Passed the 12-world, 31,200-week Project A/Platform AI exit matrix with approved outcome bands, bounded persistence, and duplicate-free News chronology.

### Version 11 — 2026-09-02

- Completed Project A Phase A7 and advanced the current phase to A8.
- Added one per-studio Rights Office with manageable portfolio/action views, durable licensing mandates, explainable delegated decisions, relationship intelligence, reconciled studio/platform statements, and bounded weekly digests.
- Preserved A1–A6 as the only rights, bidding, settlement, package, and transfer authorities; A7 is projection and player-control policy rather than parallel truth.
- Verified a real Monarch Pictures save on desktop and 390px mobile with no page overflow or console errors, and retained the complete long-run/balance matrix for A8's final exit gate.

### Version 10 — 2026-09-01

- Completed Project A Phase A6 and advanced the current phase to A7.
- Added exact remaining-term licence transfers, persisted holder lineage, current-holder projections, inherited obligations, atomic multi-title settlement, and a distinct sublicense transaction path.
- Routed EMPIRE+ inbound/outbound resale and Platform AI distress/strategy disposal through one actor-neutral authority.
- Added compact resale facts in EMPIRE+ and a Production House transfer ledger without adding studio consent or resale participation.

### Version 9 — 2026-09-01

- Completed Project A Phase A5 and advanced the current phase to A6.
- Added real-title catalogue packages, per-title commercial schedules, A2 package bidding, atomic A1 child-contract settlement, and A4 renewal grouping.
- Connected Strategy/Custom/Full workload controls, Production House, EMPIRE+, Platform AI, weekly progression, migration, and save compaction to the same package registry.
- Replaced Platform AI's equal-split catalogue shortcut with shared valuation and bounded allocation while retaining future-output deals as deferred.

### Version 8 — 2026-09-01

- Finalized the A5 catalogue-package specification and retained future-output deals as deferred.
- Added visible per-title guarantees and backend terms, bounded hybrid allocation, mirrored buyer/seller cost attribution, and investor anti-manipulation rules.
- Kept packages as negotiation envelopes over canonical title contracts rather than a parallel rights authority.

### Version 7 — 2026-09-01

- Narrowed A5 to real completed-title catalogue packages and deferred future-output deals.
- Linked the dedicated A5 design as the detailed supporting specification.

### Version 6 — 2026-08-31

- Completed Project A Phase A4 and advanced the current phase to A5.
- Added the canonical rights clock, saved renewal cases, realized-economics offers, safe delegation, atomic renewal/reversion, and grouped Rights Calendar.
- Connected Production House, owned-platform, Platform AI, weekly progression, project detail, save migration, and compaction to the same A1–A4 authority.
- Replaced repetitive title notices with one weekly digest and protected-deadline-only inbox escalation.
- Recorded focused regression, A4-local typecheck review, build, server-render, and live Chromium evidence.

### Version 5 — 2026-08-31

- Completed Project A Phase A3 and advanced the current phase to A4.
- Added the canonical compatibility resolver and exact-country immutable auction lots.
- Connected Production House, owned-platform, and Platform AI rights paths to the same authority.
- Recorded A3 migration, regression, build, and responsive live-flow evidence.
- Preserved the approved player-control model and all A2 bidding behavior.

### Version 4 — 2026-08-31

- Created one stable living roadmap for future chats.
- Preserved Platform AI completion and Project A A1/A2 completion.
- Kept A3 as the next phase.
- Added the approved Strategy, Custom, and Full Control model.
- Made Custom Control the default.
- Added per-studio, per-title, renewal, and future-decision switching rules.
- Added mandatory approval boundaries and progressive disclosure.
- Integrated workload management across A3–A8.
- Preserved Project B sequencing and detailed phase gates.
- Added a mandatory phase-status maintenance protocol.

### Version 3 — 2026-08-30

- Restored the original post-Platform sequence: complete Project A before Project B.
- Recorded A1/A2 as complete and A3 as next.
- Added the first detailed General Production Studio AI roadmap and baseline audit.
