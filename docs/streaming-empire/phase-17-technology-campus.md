# Phase 17 — Technology Campus and Server Evolution

Status: complete.

Phase 17 turns the Tech room from a static level display into a permanent
engineering progression game. The launch stack from Phase 5 remains the
company's operating foundation; Technology Campus builds on top of it after
the platform is live.

## Player flow

1. Enter Technology Campus from the Network Operations Centre hotspot or the
   Tech room's campus launcher.
2. Inspect six physical facilities: Edge Grid Complex, Playback Foundry,
   Reliability Command, Audience Intelligence Lab, Security Citadel, and
   Content Pipeline Works.
3. Open a facility and follow its four-node upgrade spine. Existing Phase 5
   levels count as installed foundations, so old saves do not repurchase
   capabilities they already earned.
4. Inspect the blueprint's capital cost, weekly operating cost, construction
   weeks, engineering staff, permanent benefit, delivery risk, and technical
   debt.
5. Choose Hardened, Balanced, or Sprint construction. Hardened costs more and
   takes longer but lowers risk and debt; Sprint delivers faster while adding
   risk and debt.
6. Approve one construction order from company treasury. The Construction Bay
   then advances only through canonical game weeks.
7. At the due game week, the weekly platform processor completes the project
   exactly once, applies the branch/capacity/reliability benefit, begins its
   weekly run rate, and records the permanent Engineering Ledger fact.

There are no real-world timers, paid skips, fabricated viewers, or decorative
technology bonuses.

## Progression and leadership

Each branch has four designed tiers. The founder can complete Tier 1–2 work.
Tier 3–4 frontier projects require an active CTO. Engineering staff capacity is
derived from the installed launch stack, with additional capability from an
active CTO.

This keeps executives optional for ordinary operation while making advanced
specialization valuable. The campus names every unmet prerequisite instead of
silently blocking the player.

## Canonical effects

- Delivery projects expand normal and burst concurrent-stream capacity.
- Reliability projects improve the infrastructure reliability target and can
  reduce accumulated technical debt.
- Playback, recommendations, security, and content operations advance their
  canonical technology branches.
- Playback and reliability levels influence weekly playback success.
- Security levels influence weekly technology health.
- Completed projects add their persisted weekly operating cost to the same
  cash reconciliation used by infrastructure, executives, rights obligations,
  financing, and growth actions.

Project costs debit company treasury once at approval. Completing or
reprocessing the same game week cannot apply a benefit, cost, or ledger event
twice.

## Visual and mobile contract

Technology Campus is an immersive engineering environment rather than a SaaS
table:

- cinematic Network Operations Centre entry scene
- six illustrated CSS facility cards with branch-specific light and structure
- upgrade spine and detailed engineering blueprint
- animated physical Construction Bay
- permanent project ledger
- 44px actions, one-column mobile facility flow, compact mobile blueprints,
  and reduced-motion treatment

The screen uses the existing streaming visual-scene pipeline and game
typography, so generated raster art can be added later without changing the
interaction or simulation contracts.

## Persistence

Schema v15 adds `technologyProjects`. Every record keeps the definition,
branch, target level, doctrine, status, capital, weekly run rate, staff,
construction schedule, benefit, risk, technical debt, and completion week.
Schema v14 saves migrate with an empty project list while retaining existing
technology levels and infrastructure.

## Validation

- Phase 17 focused audit passes.
- Phase 1 through Phase 17 streaming audits pass.
- TypeScript no-emit lint passes.
- Production build passes.
- Desktop and mobile local browser flows are verified.

Phase 18 Product Suite and Subscriber Experience is now implemented. Phase 19
leadership and board depth remains intentionally deferred.
