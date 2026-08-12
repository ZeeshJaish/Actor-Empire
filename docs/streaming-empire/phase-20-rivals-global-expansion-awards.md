# Phase 20 — Rivals, Global Expansion and Awards

Status: complete.

Phase 20 makes Market Room a living industry. Five named fictional CEOs keep
cash, subscribers, strategy, cooldowns, mistakes, preferences, and memories
inside the owned-platform save. Their decisions use the same weekly clock as
the player, regional expansion becomes a treasury-funded operating build, one
market-share history powers both Platform Wars and Analytics, and the annual
Streaming Awards jury reads real performance evidence.

## Player flow

1. Enter Platform Wars from the physical Market Room conflict table.
2. Read the industry share model, rivalry heat, open founder responses, global
   prestige, world rank, and next annual jury date.
3. Inspect CEO dossiers to understand strategy, resources, technical strength,
   catalog power, preferred genres and regions, mistakes, respect, resentment,
   and the history of wins and defences.
4. Answer an open market move or accept its time-limited pressure. Executive
   poaching targets a real active appointment and provides role-specific
   responses.
5. Open Global Delivery Map, review a territory, choose an expansion approach,
   and inspect capital, build weeks, weekly cost, audience, localization, and
   peak-load consequences before committing.
6. Advance normal game weeks. Regional builds complete through the canonical
   weekly processor, active regions enter operating cost and capacity demand,
   and rivals recover resources and make eligible moves.
7. At 52 live weeks, receive the fact-backed Streaming Awards ceremony and
   inspect every category's top three nominees and evidence.

## Fair rival simulation

The persistent rival field contains Netflix, Apple TV+, Disney+, Hulu, and
YouTube records already present in the game world. Phase 20 adds fictional CEO
characters for this simulation:

| CEO | Strategy |
|---|---|
| Mara Voss | Scale dominance |
| Elias Sterling | Prestige first |
| Celeste Grant | Franchise fortress |
| Nadia Brooks | Agile curator |
| Kai Moreno | Attention ecosystem |

These are game characters, not claims about real company leadership.

Rivals cannot cheat:

- one move at most is created on an eligible four-week boundary
- every move has a disclosed cost and exact cash-before/cash-after record
- the acting CEO must have enough cash and be outside cooldown
- personality and strategy shape the move pool
- lower execution strength creates a genuine chance of a costly misfire
- outcomes, memories, mistakes, and future cooldowns persist
- reprocessing the same week cannot create another move

The move library includes counter-programming, rights overbids, executive
poaching, price cuts, bundle launches, cancelled-show rescues, and alliance
signals. It deliberately excludes acquisitions and covert attacks.

## Founder responses

Ordinary market pressure supports:

- hold course with no spend and accept pressure
- defend the audience for $8M
- counter-program for $15M and increase rivalry heat
- open a $5M commercial backchannel

Executive poaching supports:

- match the compensation package
- expand the executive's operating mandate
- let the executive depart

The target is an actual active leadership appointment. Retention responses
change loyalty and founder relationship. Letting the offer expire or choosing
departure can create a real vacant seat. Every response is treasury-backed,
ledgered, and idempotent.

## Global expansion

The global map has Home Market plus North America, Latin America, Europe,
South Asia, East Asia, and Middle East & Africa. There is no arbitrary
joint-venture progression chain. Qualification follows the platform the
founder has actually built:

- earned reach level
- Content Operations level
- Security level
- available company treasury
- no other region currently in localization

The founder chooses Local Partnership, Premium Entry, or Mass-market Surge.
Each approach changes real capital, build duration, weekly operating cost,
acquisition opportunity, peak load, and localization depth. Capital is charged
once. The launch completes after canonical game weeks and its continuing cost
then enters the normal weekly cash reconciliation.

Expansion is opportunity with exposure, not a guaranteed win. New regions
increase modeled acquisition potential while permanently adding delivery load
and operating cost.

## Market share

Every processed live week stores one market-share snapshot built from the
player's canonical subscriber count and each persistent rival's modeled
subscriber count. The entries reconcile to 100%.

This same history powers:

- Platform Wars world rank and share rail
- Market Room share label
- Platform Analytics market ring
- annual award evidence

There is no second decorative market-share formula in the UI.

## Annual Streaming Awards

The five categories are:

- Platform of the Year
- Original of the Year
- Audience Choice
- Technical Excellence
- Global Breakthrough

Each annual result persists a top-three nominee list, score, evidence, winner,
player nomination flag, and player win flag. Player scoring uses the canonical
52-week window: subscriber movement, engagement, title reports, playback
success, technology health, active regions, prestige, and market share.

Awards cannot be purchased. There is no campaign, currency, top-up, or
celebrity-investor action that changes the jury result. The ceremony only
reveals facts that the weekly processor has already committed; skipping it
does not change nominations or winners.

## Weekly integration

The existing weekly processor now:

- completes due regional launches exactly once
- adds active regional operating cost
- adds active regional peak demand
- adds expansion acquisition opportunity
- applies unresolved funded rival pressure to acquisition and churn
- reports global footprint and Platform War causal drivers
- updates rival resources and subscribers
- commits one canonical market-share snapshot
- resolves one eligible annual award season
- passes the latest real move into quarter and season rival reporting

## Visual and mobile contract

Platform Wars is a cinematic Market Room suite rather than a spreadsheet:

- conflict-table scene with live founder-response count
- industrial share rail, rivalry gauge, world rank, and strategic next action
- five color-coded CEO dossiers with memory instrumentation
- CSS-rendered global network map with live routes and localization pulse
- regional launch review with three visual approaches and explicit terms
- evidence-backed award hall and full-screen ceremony
- first-war transmission reveal with visible skip
- 44px actions, focus indicators, reduced-motion support, and mobile layouts

No new raster images were required. The feature reuses the shared Market Room
scene and uses scalable CSS-rendered systems for the map, dossiers, gauges, and
ceremonies.

## Persistence

Schema v18 adds the competitive-world aggregate:

- rival profiles and memories
- funded rival moves and responses
- regional launches
- market-share history
- annual award seasons
- rivalry heat and global prestige

Histories are compacted for mobile save safety. Schema v17 saves migrate with
empty collections that initialize safely on the first live competitive action
or processed week.

## Validation

```bash
npm run audit:streaming-rivals-global-awards-phase20
npm run lint
npm run build
```

The focused audit covers migration, five-CEO parity, resource debits,
cooldowns, one-move cadence, exactly-once processing, regional qualification,
treasury cost, build completion, weekly effects, real executive poaching,
response idempotency, share reconciliation, five annual categories, evidence,
cinematics, UI/HQ/Analytics integration, mobile treatment, and future-phase
boundaries.

M&A is implemented in Phase 21. IPO/public-company systems remain Phase 22, and
crises/security/shadow operations remain Phase 23. Monetization remains
development-free until the community and product decision is locked.
