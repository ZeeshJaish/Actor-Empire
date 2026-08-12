# Phase 24 — Legacy, Succession and Endless Era

Status: implemented in owned-streaming schema v22.

## Locked player promise

Phase 24 completes the founding-to-legacy experience without ending the save.
The streaming company can record its history, discover the identity created by
real decisions, change operational leadership, pass through the existing
Actor Empire family dynasty and continue into unlimited strategic eras.

Development through this phase remains free. There is no paid succession,
legacy film, recovery, era mandate or inheritance advantage.

## Legacy Office

Company Office now opens a scene-first archive with four connected spaces:

- **History:** a horizontal gallery built from canonical founding,
  infrastructure, licensing, Original, launch, milestone, award, regional,
  acquisition, IPO, recovery, control-defence and generation-handoff facts.
- **Succession:** active executives and existing family children appear as
  evidence-scored candidates. The plan records the named successor and next
  strategic mandate without ending the player career.
- **Legacy Film:** a replayable montage cut from retained fact IDs. It cannot
  invent an award, acquisition or milestone that did not happen.
- **New Eras:** closed eras preserve leader, mandate, subscribers, treasury,
  prestige, trust, identity and defining facts. A mature era can be archived
  after 12 operating weeks and replaced by a new mandate.

The interface uses a dark archive gallery, warm gold hierarchy, mobile
horizontal journeys, visible controls, focus states and reduced-motion
fallbacks. The major montage is skippable and replayable.

## Legacy identity

The current identity is derived, not selected:

- Audience Architect
- Originals Titan
- Technology Pioneer
- Global Bridge
- Trusted Steward
- Corporate Strategist
- Comeback Builder
- Balanced Empire

Scores read subscribers, engagement, released Originals, awards, technology,
products, regions, prestige, public trust, clean initiatives, acquisitions,
public listing, recoveries and defended control events. A close contest
resolves to Balanced Empire instead of pretending one lane defined the player.

## Succession and ownership

Executive readiness reads persistent skill, performance, loyalty, founder
relationship and level. Family readiness reads the existing relationship,
closeness and age records.

An executive transition changes the real `leadership.currentCeo`, closes the
current era, opens the next era, queues a fact-backed ceremony and moves the
founder to Executive Chair or Founder Emeritus. It does not sell shares,
change founder ownership, end the acting career or trigger a new player.

A family heir may be designated in advance, but becomes active only through
Actor Empire's existing Continue as Child flow. This avoids a second,
conflicting family system.

## Dynasty handoff

The existing heir flow now transfers the owned streaming platform as well as
the production-house legacy. It:

- preserves identity, treasury, debt, ownership, rights, Originals,
  technology, products, rivals, acquisitions, public-company state, crises,
  history and archive films;
- closes the prior company era and opens a family era;
- makes the heir the operating founder-CEO for the inherited save;
- rebases every owned-platform absolute-week field to the heir's playable
  timeline;
- clears future weekly decisions and processed-week keys so the next platform
  week can run immediately.

The rebase is essential because Actor Empire's absolute clock is derived from
the active character's age. Without it, an adult heir could inherit a company
whose next weekly report remained scheduled decades in the future.

## Era mandates

Each active era has one persistent strategic bias:

- Balanced Empire
- Audience Expansion
- Originals Prestige
- Technology Leadership
- Global Bridge
- Trust & Resilience
- Durable Economics

Mandates apply small acquisition, churn, engagement or playback changes in the
same canonical weekly CEO simulation. They complement weekly decisions rather
than replacing them. Every report names the active era mandate as a causal
driver and cause marker.

## Persistence and exact-once behavior

Schema v22 adds the `legacy` aggregate, closed-era snapshots, succession plan,
archive montages, founder office role, current mandate, endless-mode state,
seven canonical ledger event types and three fact-backed cinematic types.

Closed eras and montages are bounded during persistence. A succession ceremony
cannot commit twice. A film for the same era is generated once and remains
replayable. Opening another era immediately is blocked until the current era
has 12 weeks of real operating history.

## Phase boundary

Phase 24 completes the free streaming-business content plan. Phase 25 remains
the separate community and monetization decision. No Phase 25 price, product
ID, purchase prompt or content lock is implemented here.

## Verification

Run:

```bash
npm run audit:streaming-legacy-phase24
npm run audit:streaming-weekly-loop-phase10
npm run audit:streaming-crises-security-phase23
npm run lint
npm run build
```
