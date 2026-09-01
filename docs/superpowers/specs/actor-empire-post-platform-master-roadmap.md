# Actor Empire Post-Platform Master Roadmap

**Living document version:** 9
**Last updated:** 2026-09-01
**Audience:** The user, future Codex chats, and Actor Empire development
**Status authority:** This file is the canonical status and sequencing authority for post-Platform-AI work
**Current next phase:** Project A, Phase A6 — Two-Sided Acquisition and Resale Synchronization

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
- Project A detailed v2 plan: `2026-08-26-unified-rights-active-bidding-master-plan-v2.md`
- Project B detailed v1 plan and baseline audit: `2026-08-30-general-production-studio-ai-master-plan-v1.md`
- Historical umbrella roadmap v3: `2026-08-30-post-platform-ai-project-a-b-master-roadmap-v3.md`
- Original user-supplied Portable Platform AI Master Plan

If a supporting document conflicts with this file, this file controls the current sequence, status, and approved player-management design. Supporting documents continue to control details that this roadmap does not replace.

## Current programme status

| Programme | Phase | Status | Current meaning |
| --- | --- | --- | --- |
| Competitive Streaming Platform AI | 1–8 | **COMPLETE** | Preserve; do not reopen without a demonstrated regression |
| Project A — Unified Rights and Active Bidding | A1 | **COMPLETE** | Canonical contract foundation exists |
| Project A — Unified Rights and Active Bidding | A2 | **COMPLETE** | Active bidding and exact contract economics exist |
| Project A — Unified Rights and Active Bidding | A3 | **COMPLETE** | Canonical compatibility and exact-scope enforcement exist |
| Project A — Unified Rights and Active Bidding | A4 | **COMPLETE** | Canonical expiry, renewal, reversion, control modes, and grouped calendar exist |
| Project A — Unified Rights and Active Bidding | A5 | **COMPLETE** | Canonical catalogue packages, bounded allocation, package bidding, and atomic title settlement exist |
| Project A — Unified Rights and Active Bidding | A6 | **NEXT** | Synchronize two-sided buying, permitted resale, sublicensing, and permanent acquisitions |
| Project A — Unified Rights and Active Bidding | A7–A8 | **PLANNED** | Complete sequentially after A6 |
| Project B — General Production Studio AI | B1–B8 | **PLANNED** | Begin only after Project A's exit gate passes |
| Shared Industry Reactions and Media World | Later project | **DEFERRED** | Build from canonical Platform AI and Studio AI event streams |
| Legal/lawsuit and contract-dispute pack | Later project | **DEFERRED** | Do not simulate a fake partial legal system inside A or B |
| Future-output and multi-picture deals | Later project | **DEFERRED** | Reconsider only after commission relationships and contract/legal systems are mature |

## Approved development order

1. Preserve completed Platform AI Phases 1–8.
2. Finish Project A from A4 through A8.
3. Publish and approve the Project A final report.
4. Re-audit the then-current Production Studio baseline.
5. Build Project B from B1 through B8.
6. Publish and approve the Project B final report.
7. Design the shared Industry Reactions and Media World.
8. Address the legal/lawsuit pack and broader save/runtime optimization as separate projects.

Project B does not begin early. Autonomous production studios require Project A's completed rights compatibility, renewals, catalogue packages, two-sided trades, and settlement history. Future-output deals are not a Project A or Project B entry requirement.

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

## Phase A6 — Two-Sided Acquisition and Resale Synchronization — NEXT

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

## Phase A7 — Rights Office, Relationship Intelligence, and Commercial Observability — PLANNED

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

## Phase A8 — Presentation, Tools, Balance, and Final Verification — PLANNED

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

## Project A exit gate

Project B may begin only when:

- A3 through A8 are complete;
- canonical compatibility is enforced everywhere;
- expiry, renewals, catalogue packages, and two-sided trades are live;
- all three control modes are safe and verified;
- Project A and Platform AI regressions pass; and
- the user approves the Project A final report.

---

# Project B — General Production Studio AI

## Project goal

Make established and generated production houses independently develop, finance, produce, market, release, license, learn, compete, grow, struggle, change ownership, or close through one persistent simulation.

Studios no longer materialize finished rival films from nowhere or survive through unexplained passive cash.

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

Project B must eventually replace the current instant rival-release generation, unexplained passive studio cash/valuation drift, and separate shallow venture simulation after migration and parity tests pass.

## Phase B1 — Canonical Studio State, Control, and Migration — PLANNED

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

### Completion gate

- Established and generated studios share one runtime.
- Same-week replay is a no-op.
- Player-controlled studios receive no AI mutation.
- Finances and controller transitions reconcile.
- Save/reload preserves deterministic state.

## Phase B2 — Script Acquisition, Development, and Slate Strategy — PLANNED

### Purpose

Make every future studio project begin as material under consideration.

### Core work

- Original concepts, internal scripts, marketplace scripts, acquired IP, sequels, reboots, spin-offs, commission briefs, output obligations, and inherited projects.
- Persisted development stages, costs, timing, quality uncertainty, and ownership.
- Bounded slates based on capital, capacity, specialization, and strategy.
- Portfolio reasoning for genre, format, audience, budget, franchise, prestige, and commercial balance.
- Rewrite, hold, abandon, sell/turnaround, package, or greenlight decisions.

### Completion gate

- Every future project has development lineage.
- Development consumes time and money.
- Script/IP conflicts are prevented.
- Studios can reject or abandon material.
- Outcomes do not reroll after reload.

## Phase B3 — Greenlight, Financing, Capacity, and Portfolio Decisions — PLANNED

### Purpose

Make greenlights real corporate commitments with opportunity cost.

### Core work

- Script/IP confidence, budget fit, runway, capacity, talent cost, distribution need, release congestion, rights opportunity, franchise value, prestige, downside, and forecast uncertainty.
- Studio cash, parent transfers, debt, investors, independent-project co-production, Project A presales/output funding, and platform commission funding.
- Exact project ownership, finance shares, obligations, and ledger entries.
- Defer, resize, seek finance, sell, or reject options.
- No arbitrary two-project cap: concurrent work depends on real capital, capacity, runway, and strategy.

### Completion gate

- Every production has a greenlight and funding lineage.
- Studios cannot spend unrecorded money.
- Capacity and runway alter decisions.
- Commission budgets and producer fees remain separate.

## Phase B4 — Talent Packaging, Physical Production, and Delivery — PLANNED

### Purpose

Turn greenlit packages into dated, fallible physical productions.

### Core work

- Canonical talent selection using ability, fame, fit, cost, load, overexposure, collaboration, and prestige/commercial value.
- Load-aware bookings that permit plausible multiple concurrent projects rather than a universal one-project lock.
- Canonical pre-production, production, post-production, delivery, and awaiting-release path.
- Milestone spending, crises, delays, overruns, financing holds, quality problems, project sale/turnaround, and cancellation.
- Final quality from material, creative team, budget fit, development, execution, recovery choices, and saved variance.
- Platform AI commission connection without granting producer ownership it did not contractually receive.
- Legal firing/replacement disputes remain deferred.

### Completion gate

- Every Studio AI title links to one canonical production.
- Talent load, money, milestones, delays, holds, and cancellation persist.
- Commissioned and independent economics stay distinct.
- Player acquisition preserves progress and stops AI decisions.
- Delivery does not automatically create a theatrical release.

## Phase B5 — Marketing, Theatrical Scheduling, and Box Office — PLANNED

### Purpose

Make studios compete for audience attention, release dates, distribution, and revenue.

### Core work

- Limited, targeted, wide, event, festival/prestige, streaming-only, hybrid/later-window, delay, sale, and hold strategies when rights permit.
- Saved marketing plan, spend, positioning, audience, and reach.
- Deterministic release calendar and congestion.
- Opening and legs or an equivalent persisted weekly result lifecycle.
- Exact distributor/studio shares, marketing, participations, investor obligations, and debt settlement.
- Quality, word of mouth, fame, IP, genre demand, audience fit, distribution, localization, and slate fatigue.
- No fake theatrical box office for streaming-only originals.

### Completion gate

- Every theatrical result has strategy, spend, date, and economic lineage.
- Release competition works without duplication.
- Studio ledgers reconcile.
- Replaying a release week cannot duplicate results.

## Phase B6 — Rights Sales, Catalogue, Franchises, and Awards — PLANNED

### Purpose

Connect completed Studio AI titles to the full post-release commercial world.

### Core work

- Studio AI acts as a real Project A seller.
- Bidding, split territories/windows, packages, renewals, reversion, and permitted resale use canonical records.
- Catalogue value derives from real owned/control rights.
- Sequel, prequel, spin-off, reboot, remake, and universe decisions consider demand, cast, quality, profit, rights, fatigue, and strategy.
- Canonical awards eligibility, campaigns, nominations, and wins.

### Completion gate

- All streaming transactions are Project A transactions.
- Packages contain eligible real titles.
- Franchise projects link to owned rights and prior releases.
- Awards and settlements cannot duplicate.

## Phase B7 — Weekly Integration, Ownership Handoff, and Observability — PLANNED

### Purpose

Make Studio AI the canonical rival-production simulation in the actual game loop.

### Core work

- One Studio AI weekly coordinator with deterministic order and checkpoint.
- Safe interaction with Platform AI through canonical commissions, productions, rights, releases, money, and events.
- Removal of old pre-generated instant rival releases after parity.
- Removal of unexplained passive studio cash/valuation progression.
- One runtime for established and generated studios.
- Exact acquisition handoff to Production House and Studio Group systems.
- Material News, Forbes, rival, slate, finance, catalogue, awards, specialization, ownership, and distress summaries.
- Smaller studios may remain grouped in `Others` until deterministic visibility thresholds are reached.

### Completion gate

- Every AI studio processes once per week.
- Player-controlled studios receive no AI mutation.
- Old random rival generation and passive cash are gone from canonical progression.
- News and Forbes read canonical records.
- No duplicate commission, production, release, deal, award, or payment appears.

## Phase B8 — Long-Run Balance, Scalability, and Final Verification — PLANNED

### Purpose

Prove the studio industry remains varied, competitive, understandable, and technically stable over decades.

### Core work

- Deterministic baseline, lean, boom, crowded, and adverse 10-, 25-, and 50-year matrices.
- Studio launch, maturity, survival, distress, restructuring, acquisition, merger, dormancy, and closure.
- Development, greenlight, production, hold, cancellation, release, and finance metrics.
- Box office, rights, catalogue, franchise, talent-load, awards, News, save-size, and runtime metrics.
- Midpoint save/reload equivalence and player-acquisition handoff tests.
- Approved balance bands documented before final tuning.

### Target behaviour

- Strong studios outperform in aggregate but not every seed.
- Every long-lived studio can succeed and fail.
- New challengers sometimes break out and sometimes close.
- Entrants may begin at credible different potential levels with funded explanations.
- No studio survives through hidden income.
- No studio wins every commercial or awards year.
- Talent may work on multiple projects within plausible load.
- Money and state never become NaN or infinite.

### Completion gate

- Focused audits and approved long-run bands pass.
- Save/reload determinism and build pass.
- No canonical path uses unpersisted random IDs/outcomes.
- No hidden passive cash or duplicate records remain.
- Existing Platform AI, Project A, player Production House, and acquisition flows remain intact.
- A final Project B report records implementation, migration, tests, balance, performance, and deferred work.

## Project B exit gate

Project B is complete only when:

- independent studios no longer materialize finished films from nowhere;
- every release has development, greenlight, production, marketing, and release lineage;
- real economics replace passive cash drift;
- Project A owns all streaming commerce;
- player acquisition stops Studio AI without deleting obligations;
- established and generated studios use one deterministic system;
- companies can grow, fail, be acquired, merge, or close; and
- the user approves the final report.

---

# Deferred follow-on projects

## Shared Industry Reactions and Media World

Build this only after Project B supplies a canonical Studio AI event stream.

It may generate:

- News stories;
- X posts and replies;
- Instagram-style posts;
- fan campaigns;
- trade rumours;
- contender narratives;
- partnership and fallout stories; and
- time-separated reaction arcs.

Templates must consume saved facts rather than inventing a parallel simulation. Core phases may continue publishing restrained material News before this project.

## Legal, lawsuit, and contract-dispute pack

Actor departures, firing, replacement litigation, breach lawsuits, indemnity, and blame allocation remain separate. Projects A and B may preserve contract statuses and production consequences without pretending the full legal system exists.

## Performance and save-size programme

Platform AI Phase 8 observed an approximately 30 MB maximum compacted 50-year save. Projects A and B must keep new histories bounded. Broader storage/runtime optimization should follow after their canonical data shapes stabilize unless a phase encounters an immediate release-blocking limit.

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
