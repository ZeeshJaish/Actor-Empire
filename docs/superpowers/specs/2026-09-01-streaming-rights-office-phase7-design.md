# Project A Phase A7: Rights Office and Commercial Intelligence Design

**Date:** 2026-09-01

**Status:** COMPLETE — verified 2026-09-02

**Roadmap phase:** A7 — Rights Office, Relationship Intelligence, and Commercial Observability

## Purpose

Make the A1–A6 rights market manageable for a studio with 30–40 titles without removing contract depth. A7 changes how the player controls and understands the simulation; it does not create easier offers, hidden bonuses, or a parallel rights engine.

## Player contract

The player chooses one of three control modes per production house:

- `STRATEGY`: routine decisions may execute inside a saved mandate.
- `CUSTOM`: the saved mandate applies, but protected titles and configured thresholds require approval. This remains the default.
- `FULL`: every commercial decision remains manual.

Changing mode affects only decisions that have not yet been finalized. Signed contracts, live offers, saved package allocations, settlement history, and transfer lineage never reroll.

Every delegated action must retain a factual trace containing the mandate revision, control mode, rule, decision facts, and explanation. The interface never claims that an offer is the hidden “best deal.”

## Canonical ownership

`WorldState.streamingRightsContracts` remains the exploitation authority.

A7 reuses:

- A1 contracts and settlements;
- A2 bidding sessions and accepted offers;
- A3 compatibility results;
- A4 renewal cases and calendar timing;
- A5 catalogue packages and component allocations;
- A6 transactions and transfer lineage;
- royalty settlements;
- platform commission offers and industry productions;
- Production House finance ledgers and platform relationships;
- owned-platform finance history; and
- the existing weekly game loop.

A7 adds no second contract, cash, catalogue, relationship, or revenue authority. Its persisted office state contains only idempotent digests and observability history that cannot reconstruct or override legal rights.

## Licensing mandate

Each studio mandate stores:

- financial priority: upfront security, balanced return, or backend upside;
- distribution priority: one global partner, regional optimization, or broad non-exclusive reach;
- exclusivity policy: allow within limits, restrict, or require approval;
- duration preference: short, balanced, or long;
- partner preference: strongest economics, widest reach, or trusted relationships;
- renewal preference;
- maximum automatic guarantee;
- maximum automatic duration;
- global-exclusive and franchise protection;
- title-level manual or delegated overrides; and
- a monotonically increasing revision.

Legacy saves receive a migration-safe Custom mandate. Existing A4 policy values remain readable and become the default mandate values.

Mandatory protections cannot be disabled by a mandate: permanent rights, protected franchise or related IP, unusually long terms, large packages, transactions outside thresholds, and material solvency decisions always require approval.

## Rights Office projection

The service builds one portfolio projection from canonical records and groups work into:

- `ACTION_REQUIRED`;
- `AVAILABLE_TO_LICENSE`;
- `UNDER_CONTRACT`;
- `APPROACHING_EXPIRY`;
- `DELEGATED_DECISIONS`; and
- `NO_CURRENT_INTEREST`.

The default view prioritizes a bounded action rail and grouped counts. Complete lists remain available through category filters. A 40-title catalogue may contain 40 records, but routine records do not become 40 interruptions.

Each row exposes only decision-critical facts first: platform, guarantee, backend, territory, duration, exclusivity, deadline, and a short warning. Contract details, compatibility, recoupment, settlements, packages, and lineage remain available through the existing detailed surfaces.

## Relationship intelligence

Relationship cards are reconstructed from persisted facts:

- accepted and rejected bidding offers;
- completed contracts and packages;
- renewal outcomes;
- commission delivery, cancellation, and quality;
- funding breaches and recovery periods;
- royalty-producing partnerships;
- realized partner value; and
- transfer history.

The service produces a bounded 0–100 score, a plain-language tier, a trend, and factual reasons. Existing `PlatformFundingRelationship` remains the durable gameplay memory used by bidding, package automation, renewals, and commission selection. A7 explains that memory rather than replacing it.

## Commercial statements

The studio statement separates:

- licensing guarantees;
- producer fees;
- platform-funded production budgets;
- locked future-season funding;
- attributed adjusted gross;
- gross backend accrued;
- backend paid;
- recoupment remaining; and
- downstream transfer proceeds received by the studio, which remain zero unless the studio is the actual current seller.

The platform statement separates:

- title-attributed adjusted gross;
- guarantees and acquisition cost;
- production and future-season funding;
- royalty expense;
- transfer purchases and sale proceeds;
- retained contribution; and
- forecast variance only where a canonical forecast exists.

Funding is labelled as restricted production capital rather than studio income. Estimates and unavailable data are not fabricated.

## Weekly digest

After existing renewal and catalogue-package processing, A7 writes at most one rights-office digest per absolute week. It summarizes routine renewals, expiries, packages, transfers, royalties, and protected actions. Empty weeks do not create noise. Same-week replay returns the existing digest and creates no duplicate log, inbox item, or state mutation.

Only protected or deadline-sensitive decisions are interruptions. Routine outcomes remain inside the Rights Office digest.

## Interface direction

The Production House `Rights Calendar` becomes `Rights Office`. The visual language remains a restrained studio business-affairs desk: compact rows, ledger rules, paper-trail labels, and one narrow action rail. It must not become a box-heavy SaaS dashboard.

Studio sections:

- Portfolio
- Mandate
- Relationships
- Statements
- Packages

The owned-platform embedded view keeps its platform context and gains the relevant portfolio and statement projections without exposing studio-only controls.

Mobile uses horizontally scrollable section labels, compact two-column figures, visible keyboard focus, and no horizontal page overflow. Reduced-motion behavior is preserved.

## Persistence and performance

- Save schema advances once for A7.
- Normalizers bound all free text, arrays, histories, and numbers.
- Office digests retain a finite recent history.
- Relationship and statement projections are derived and are not persisted as duplicate truth.
- A 40-title projection must remain deterministic and produce a bounded action queue.

## Deferred scope

- Broad X/Instagram/news melodrama templates remain outside A7.
- Lawsuits, actor replacement clauses, and the legal pack remain deferred.
- Output and multi-picture deals remain deferred.
- A8 owns final balance, accessibility audit, animation polish, and long-run Project A verification.

## Completion gate

A7 is complete when:

1. Per-studio modes and mandates persist safely.
2. Delegated actions cite a mandate revision and saved facts.
3. Switching modes changes only future decisions.
4. The complete portfolio projection is available without repetitive interruptions.
5. Relationship cards use factual history and affect no separate hidden economy.
6. Studio and platform statements reconcile with canonical contracts, settlements, commissions, and transfers.
7. Weekly digest processing is idempotent.
8. A 40-title workload test shows a bounded actionable queue in Strategy and Custom modes.
9. A1–A7 regressions, migration, save transfer, production build, and responsive browser checks pass.
