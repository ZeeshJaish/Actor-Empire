# Phase 18 — Platform Product Suite

Status: complete.

Phase 18 turns the public platform from one generic streaming home into a
portfolio of seven real audience products. Core is the existing paid service;
Kids, Free, Live, Fan, Store, and Interactive are company expansions built
inside Product Lab.

## Player flow

1. Enter Product Lab from the Network Operations Centre hotspot or the Tech
   room's product-suite launcher.
2. Inspect all seven product facilities and their current state: included,
   available, prerequisite-locked, under development, active, or paused.
3. Open a strategic product brief to see its audience, permanent consequence,
   capital, staff, weekly operating cost, peak-load demand, growth/retention/
   engagement effects, and dependency blockers.
4. Choose Validated, Balanced, or First-to-market delivery. Validated takes
   longer and costs more capital but lowers launch volatility; First-to-market
   compresses the schedule while raising risk, weekly cost, and peak load.
5. Approve one development order from company treasury. The development stage
   advances only through Actor Empire game weeks.
6. At the due game week, the canonical weekly processor launches the product
   exactly once, begins its weekly consequences, updates permanent product
   capability, and writes an auditable ledger event.
7. Operate or pause launched expansions. A paused product releases its staff,
   stops its weekly cost and benefit, and immediately disappears from the
   public Viewer Mode product dock.

There are no real-world timers, paid skips, decorative unlocks, fabricated
viewers, or a second purchase for Core.

## Seven products

| Product | Strategic role | Important dependency |
|---|---|---|
| Core | Paid catalog, profiles, search, playback, and subscriptions | Included with the operating platform |
| Kids | Safe family discovery and household retention | Security, content operations, and family catalog |
| Free | Ad-supported acquisition funnel and ad contribution | Delivery, audience data, traffic capacity, and catalog depth |
| Live | Events, countdowns, synchronized premieres | Delivery, reliability, content operations, and burst capacity |
| Fan | Franchise hubs, bonus drops, and long-tail loyalty | Audience data, security, and a released Original |
| Store | Rights-aware merchandise and digital extras | Security plus an active Free/Fan or commerce foundation |
| Interactive | Branching and synchronized experiences | Frontier playback/data/reliability plus active Live and Fan |

Product staff capacity derives from installed infrastructure, content
operations, and product-experience capability. One product can occupy the
development stage at a time, keeping approval choices readable and preventing
parallel treasury exploits.

## Canonical weekly effects

Active products can affect:

- subscriber acquisition
- churn and household retention
- engagement
- revenue per subscriber from appropriate product lines
- weekly company operating cost
- peak concurrent traffic
- Product Experience and Advertising/Commerce technology capability

The weekly CEO processor includes product revenue and product operating cost in
the same treasury reconciliation used by subscriptions, infrastructure,
rights, leadership, financing, growth actions, and Technology Campus. Product
effects are separated from campaign attribution so organic product performance
is not falsely credited to paid promotion.

## Public Viewer Mode

Viewer Mode reads the active product portfolio. It never shows an expansion
that is locked, in development, or paused. Every active line receives its own
public-facing product entry and cinematic experience banner, while CEO Lens
shows private product count, weekly run rate, and added peak load.

This creates a visible content/technology/product relationship:

- Content gives each product something worth entering for.
- Technology determines which products can operate safely.
- Product design converts both into acquisition, retention, engagement,
  revenue, cost, and public experience.

## Visual and mobile contract

Product Lab is a game space rather than a settings table:

- cinematic public-experience laboratory scene
- seven CSS-rendered product facilities with distinct product identities
- strategic brief and delivery-mode approval chamber
- physical development stage with canonical game-week progress
- live operating deck with pause/resume consequences
- 44px actions, compact mobile cards, no horizontal page overflow, and
  reduced-motion treatment

No additional raster art was required for this phase. The Product Lab uses the
existing streaming visual-scene pipeline plus lightweight CSS facility art, so
future generated assets can enhance presentation without changing simulation
or interaction contracts.

## Persistence

Schema v16 adds `productLines`. Each expansion persists its idempotency key,
line, title, state, delivery mode, capital, weekly cost, staff, load,
development schedule, benefit package, risk, strategic consequence, launch
week, and last status-change week.

Schema v15 saves migrate with an empty expansion portfolio. Core remains
derived from the live platform and infrastructure, so existing players are not
charged again.

## Validation

- Phase 18 focused audit passes.
- Phase 1 through Phase 18 streaming audits pass.
- TypeScript no-emit lint passes.
- Production build passes.
- Desktop and mobile local browser flows are verified.

Phase 19 leadership and board depth is implemented in
`phase-19-executives-promotions-governance.md`.
