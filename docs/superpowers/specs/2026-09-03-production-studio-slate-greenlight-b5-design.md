# Production Studio Slate and Greenlight B5 Design

**Date:** 2026-09-03
**Status:** Approved for implementation
**Roadmap phase:** Project B5
**Scope:** AI-controlled production-studio opportunity, development, review, and greenlight decisions

## Decision

B5 replaces independent instant NPC-studio project creation with a compact deterministic slate. B1 remains the company, controller, finance, capacity, and ledger authority; B2 decides when a studio needs to act; B3 supplies the selected content fingerprint and private universe lineage. B5 decides whether the studio can develop and greenlight that intention.

AI studios do not replay the player's Development Lab, script marketplace, or Greenlight UI in the background. They persist only selected commitments and resolved review decisions. A full canonical project is created only when an existing public, contractual, financial, rights, talent, player, production, or ownership boundary requires it.

B5 ends at greenlight. B6 owns compact physical production, talent packaging, release, and commercial resolution.

## Authority boundaries

- `WorldState.studios` and `StudioAiRuntimeState` remain the canonical AI-studio company records.
- B1 remains authoritative for studio cash, debt, runway, lifecycle, ownership/controller, capacity totals, finance ledger, and bounded company history.
- B2 remains authoritative for due lanes, opportunity proposals, forecast uncertainty, learning, and player/terminal exclusion.
- B3 remains authoritative for fingerprints, novelty, suitable-budget curves, and private universe blueprints.
- `WorldState.industryProductions` remains authoritative for already materialized commissions and physical-production commitments.
- Project A remains authoritative for exact IP ownership, rights, external transfers, catalogue transactions, and settlement.
- Existing player Production House, Development Lab, script selection, Greenlight, career activities, platform-commission SMS, and subsidiary mandates remain the detailed player paths.
- B5 may reserve AI capacity and charge internal development spending. It may not invent external rights, talent bookings, production completion, theatrical release, or commercial results.

## Slate lifecycle

Each selected AI-only intention becomes one compact `StudioAiSlateCommitment` with a stable ID and one lifecycle:

- `DEVELOPING`: a development slot and internal development envelope are committed;
- `REWRITE`: the studio spends additional development time and a bounded rewrite cost;
- `ON_HOLD`: the intention is retained without occupying a development slot indefinitely;
- `GREENLIT`: budget, greenlight week, fingerprint facts, and production handoff are frozen for B6;
- `HANDED_OFF`: a canonical or temporary compatibility production path has consumed the greenlight;
- `TURNAROUND`: a viable but unwanted intention is available for an exact later transfer/materialization boundary;
- `ABANDONED`: development stops and the fingerprint becomes abandoned; or
- `CANCELLED`: an external or ownership boundary ended the commitment.

Terminal commitments remain only in a bounded recent archive. Active commitments are never removed by compaction.

## Opportunity and admission

Only newly due B2 `CONTENT_STRATEGY` proposals can open an independent development commitment. Each proposal is processed once by its idempotency key. The linked B3 fingerprint supplies creative identity and budget suitability.

Before admission, B5 checks:

- AI controller and non-terminal company status;
- a linked fingerprint owned by the studio;
- no existing commitment for the proposal or fingerprint;
- free development capacity;
- positive runway and no incompatible spending restriction;
- a development envelope within both proposal affordability and studio cash; and
- source feasibility.

An external-IP fingerprint without a canonical source right cannot silently become an original. It is rejected or held. Original, internal, sequel, and universe intentions may develop privately when their saved lineage is valid.

## Dynamic capacity

B5 uses the existing per-studio development and production slot totals. It introduces no universal project cap.

- `DEVELOPING` and `REWRITE` occupy one development slot.
- `GREENLIT` occupies one production reservation until B6 consumes or resolves it.
- `ON_HOLD`, `TURNAROUND`, `ABANDONED`, and `CANCELLED` occupy no active slot.
- Normalization derives committed counts from active slate records so stale counters cannot create phantom capacity.

Scale therefore matters naturally: established majors can carry broader slates, while boutiques must make sharper choices.

## Development economics

Internal development spending is exact company money and receives an exact B1 ledger entry. The opening envelope is derived from format, ideal budget, development competence, creative patience, strategy, and financial discipline, then capped by proposal affordability, cash, and runway protection.

Rewrites charge a smaller bounded amount. A rejected private candidate costs nothing because it was never selected. Once a proposal becomes a development commitment, its paid development cost is persisted and cannot reroll.

Commission production funding remains restricted project money rather than studio income. Producer fees remain separate income through the existing commission lifecycle. B5 must not mix those amounts with independent studio development spending.

## Review and greenlight model

Each active commitment stores a deterministic next review week. A review combines:

- B3 novelty and suitable-budget position;
- B2 creative, execution, commercial, prestige, and downside forecasts;
- studio development, creative, finance, and production competence;
- strategy and genre fit;
- current cash, runway, capacity pressure, momentum, repetition, and franchise fatigue;
- current project scale and source/relationship type; and
- persisted uncertainty.

The result is not a flat quality average. It produces saved creative, commercial, prestige, execution, and financial-risk scores plus a greenlight confidence.

Review outcomes are deterministic but fallible:

- high fit and affordable risk may greenlight;
- promising but weakly developed work may rewrite;
- an oversized project may be resized before greenlight;
- capacity congestion or temporary pressure may hold;
- financially attractive but strategically unwanted work may enter turnaround; and
- weak or dangerous work may be abandoned.

Competence improves forecast quality and decision discipline but creates no hit floor. Wealth permits larger choices without guaranteeing success.

## Budget commitment

Greenlight freezes a production budget inside the B3 suitable range when affordable. The decision may intentionally underfund, choose the efficient range, or stretch toward the ambitious maximum depending on strategy, risk tolerance, confidence, and runway. It cannot exceed the proposal ceiling or protected available cash.

Independent projects reserve the committed production spend in studio finance; B6 will settle actual production milestones and outcomes. Commission projects retain their existing platform-funded cap and producer-fee economics.

## Commissions and player boundary

- AI platform to AI studio: an existing canonical commission/industry-production commitment is adopted into the studio slate. The studio reserves capacity and reviews execution fit without changing platform ownership, restricted funding, delivery terms, or producer fees.
- AI platform to player studio: the existing SMS offer and full Production House flow remain unchanged.
- Player platform commissioning AI studio: existing owned-platform approval and contract systems remain authoritative.
- Player-controlled studio: rival B5 execution stops immediately. Existing compact commitments and paid costs remain; detailed expansion belongs to the existing player ownership/handoff path and B7 certification.

## Universe behaviour

B5 reads B3 universe lineage rather than creating a second franchise authority. Sequels, spin-offs, prequels, crossings, and universe entries compete for the same development and production capacity as standalone work. Momentum can encourage a branch; fatigue, financial pressure, repetition, or failure can cause rewrite, hold, abandonment, or turnaround.

## Legacy transition

The legacy generated-venture scheduler currently creates and releases a full project instantly when `nextProjectWeek` arrives. B5 retires its authority to originate unrelated projects.

During the B5-to-B6 bridge:

- the B5 slate is the only source of a new AI-studio project decision;
- the legacy venture system may continue company launch, compatibility projection, and non-project behavior;
- any temporary legacy public project generation must consume a unique B5 `GREENLIT` commitment and retain its fingerprint/commitment lineage; and
- it cannot independently select a genre, budget, or project when no B5 greenlight exists.

B6 removes the remaining instant production/release bridge.

## Persistence and performance

- Process proposal deltas and due reviews only.
- Keep at most 24 active/recent slate commitments per studio, while never evicting active work.
- Keep at most 64 processed proposal/review keys.
- Persist no rejected candidate pools or private scripts.
- Recompute committed capacity from normalized active records.
- Use stable IDs and seeded uncertainty; never use wall-clock time or unseeded randomness.
- Old saves normalize an empty B5 slate and retire the legacy origin path without replaying historical proposals.

## Player-visible impact

B5 adds no raw rival-state panel and no repetitive player chore. Existing surfaces gradually show more coherent consequences: believable studio cadence, budget scale, commission acceptance, holds, turnarounds, acquisitions, franchise behavior, and later public projects. News, IMDb, Forbes, box office, casting, and social materialization remain governed by existing public boundaries and B6/B7.

## Completion gate

B5 is complete only when:

- every new AI-studio project decision has one saved B2 proposal, B3 fingerprint, and B5 commitment;
- capacity, cash, runway, development time, suitable budget, strategy, fatigue, and competence affect outcomes;
- duplicate proposal, fingerprint, review, money, and capacity effects are impossible;
- independent and commissioned economics remain distinct;
- external-IP intentions fail closed without canonical rights;
- player-controlled and terminal studios receive no rival-AI slate mutation;
- active commitments and paid decisions survive save/reload and acquisition;
- the legacy venture generator cannot originate an unrelated instant project;
- state and histories remain bounded over 20,800 weeks; and
- focused B5, B1–B4, commission, rights, venture, save-integrity, and production-build checks pass.
