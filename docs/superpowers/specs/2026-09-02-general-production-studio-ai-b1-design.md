# Project B Phase B1 — Canonical Studio State, Control, and Migration Design

**Status:** Approved on 2026-09-02  
**Programme:** Project B — General Production Studio AI  
**Scope:** B1 foundation only; B2 owns script acquisition and development

## Purpose

B1 gives every established and generated production company one deterministic, persisted company runtime. It removes the split authority between `WorldState.studios` and `WorldState.npcVentures`, establishes a safe weekly/controller boundary, and prepares later Project B phases without creating scripts, greenlights, or productions early.

## Player-facing rule: show consequences, not internal labels

Company lifecycle status is private simulation state. Studio and streaming-platform cards must not print raw labels such as `ACTIVE`, `DISTRESSED`, `RESTRUCTURING`, `DORMANT`, or `CLOSED`.

Players learn what is happening through evidence already natural to the game:

- Forbes valuation, cash, debt, recent results, catalogue activity, ownership, and acquisition availability;
- News and X stories about falling value, stalled activity, funding, restructuring, mergers, or closure;
- release cadence, cancelled projects, rights sales, and acquisition pressure; and
- Studio Group information after the player gains control.

Transaction-stage language such as “offer submitted” or “auction expected” may remain because it describes a player action, not a private AI status. A distress-derived acquisition opportunity must use consequence language rather than a raw “Distressed” badge.

## Existing authorities preserved

- `WorldState.studios` remains the canonical company registry.
- The existing top-level studio `cashReserve`, `valuation`, `reputation`, hit/flop totals, and public identity remain canonical values used by Forbes, stocks, acquisitions, producer selection, and compatibility code.
- `WorldState.industryProductions` remains the physical-production authority.
- `WorldState.talentBookings` remains the talent-commitment authority.
- `WorldState.projects` remains the released-title catalogue.
- Existing acquisition, stock-control, Studio Group, subsidiary, production-calendar, risk, crisis, awards, Platform AI, and Project A services remain authoritative in their domains.

B1 does not create a second `studioAiStates` registry and does not duplicate cash inside the AI runtime.

## Canonical runtime

Each `NPCStudioState` receives an optional `ai` runtime normalized to schema version 1. The runtime contains:

- stable studio identity, origin, deterministic seed, and controller;
- private company status;
- strategy and bounded competence profile;
- risk, budget appetite, creative patience, franchise dependence, and financial discipline;
- debt principal, weekly operating cost, committed spend, runway, and a bounded ledger;
- development, production, and release capacity summaries;
- bounded decision and event histories;
- the last processed absolute week; and
- exact-once migration and ownership-handoff keys.

Public values remain on the studio record. Runtime runway is derived from canonical cash, obligations, and operating cost rather than stored as a second spendable balance.

## Profiles and maturity

Established studios are seeded from `STUDIO_CATALOG`, existing world values, archetype, reputation, valuation, project history, and ownership. Major studios begin with credible maturity and capacity rather than level zero.

Generated ventures migrate using their stable venture ID, founder identity, archetype, capital, hype, creative quality, risk, release history, and closure state. Future entrants receive one persisted launch class: bootstrapped boutique, founder-backed label, investor-backed challenger, breakout company, strategic spin-out, or financed major challenger.

Starting strength is an explained saved fact, not an invisible AI subsidy. Streaming-platform AI efficiency bonuses do not automatically apply to production studios. Player acquisition preserves real maturity while stopping autonomous Studio AI decisions.

## Controller resolution and handoff

`resolveStudioAiController(player, studioId)` is the single controller boundary. It considers direct player businesses, completed acquisitions, controlling stock positions, Studio Group subsidiaries, and canonical ownership metadata.

When control changes from AI to player:

1. the transition is recorded exactly once;
2. autonomous Studio AI mutation stops immediately;
3. cash, debt, capacity, history, productions, bookings, catalogue, rights, and obligations remain intact;
4. existing Studio Group and Production House systems become the operating surface; and
5. no project restarts and no AI-only benefit remains.

Player-controlled studios are normalized for compatibility but their finances, status, and decisions are not advanced by the Studio AI weekly processor.

## Generated-venture migration

Every `NpcVentureState` becomes or updates one `WorldState.studios[venture.id]` record with the same ID. Founder and project history are preserved. `world.npcVentures` remains temporarily as a compatibility projection for old screens and old logic, but after migration it is derived from the canonical studio rather than acting as a second authority.

The legacy instant venture-project path remains behind an explicit compatibility adapter until B2–B5 replace development, greenlight, production, and release behavior. Its results must reconcile back into the canonical studio exactly once.

Closed ventures remain represented as historical studios; they are not deleted from the canonical registry or Forbes history merely because they cannot operate.

## Finance and company condition

B1 replaces unexplained random passive studio drift with deterministic, ledgered transitional operations:

- catalogue/library operating income derived from existing released-title and company evidence;
- scale-based operating expense;
- debt service when debt exists;
- existing project-outcome cash effects; and
- explicit parent/investor support only when another existing system supplies it.

The transitional catalogue line is isolated by ledger category so B3–B6 can retire it as real financing, box office, and rights revenues take ownership.

Private statuses are determined from persisted evidence:

- `ACTIVE`: sustainable current operation;
- `DISTRESSED`: unsafe runway or sustained losses;
- `RESTRUCTURING`: a persisted recovery period after sustained distress;
- `DORMANT`: inactive but not terminal;
- `SOLD_MERGED`: absorbed by another owner; and
- `CLOSED`: terminal operation while history remains.

B1 does not secretly rescue companies or force major studios to survive. It also does not introduce a new player bankruptcy rule. Deeper financing and recovery choices belong to B3 and B7.

## Weekly order

The Studio AI B1 coordinator runs once per absolute week:

1. ensure and normalize the studio ecosystem;
2. migrate or synchronize generated ventures;
3. resolve controller and exact-once ownership handoff;
4. skip autonomous progression for player-controlled studios;
5. reconcile existing project/economic evidence;
6. apply deterministic transitional income, expense, and debt entries;
7. derive runway, capacity pressure, and private status;
8. append bounded decisions/events and update public summaries; and
9. save the processed absolute week.

Reprocessing the same studio and absolute week is a no-op. All seeded traits and weekly outcomes use deterministic ID/RNG helpers; B1 production code does not use `Math.random()` or `Date.now()`.

## Presentation changes

B1 adds no new management dashboard and no new player chores.

- Forbes continues showing company facts and consequences.
- Raw studio lifecycle labels are not rendered.
- The raw streaming-platform lifecycle label currently rendered in the Forbes Stream ranking is removed; valuation, subscribers, cash, market count, and reported events remain.
- The existing studio acquisition “Distressed” presentation is changed to consequence/action language without changing the internal acquisition rule.
- Major changes can emit bounded News/X items, but the full Studio AI observability layer remains B7.

## Persistence and safety

- Older saves with no Studio AI runtime normalize safely.
- Malformed optional fields fall back to deterministic defaults.
- Migration preserves every established studio, generated venture, founder, released project, ownership link, and acquired business.
- Histories and ledgers are bounded.
- Save compaction protects canonical studio identities and active financial/handoff evidence.
- Save integrity fingerprints studio identities, controllers, ownership transitions, debt, and processed checkpoints.
- Save/reload and same-week replay produce identical state.

## Explicit exclusions

- No script acquisition or development slate; B2 owns it.
- No new greenlight or financing decisions; B3 owns them.
- No new talent package or physical production creation; B4 owns it.
- No new marketing, theatrical scheduling, or box-office engine; B5 owns it.
- No new rights, franchise, or awards strategy; B6 owns it.
- No full rival-studio intelligence dashboard; B7 owns it.
- No hidden company-status badges.
- No broad X/Instagram reaction-template expansion.
- No lawsuit, recasting, or legal pack.

## Completion gate

B1 is complete when:

- established and generated studios share one canonical runtime;
- no studio, venture, founder, history, or ownership link is lost or duplicated;
- player control stops autonomous mutation exactly once;
- same-week replay is a no-op;
- cash, debt, ledger, operating cost, and runway reconcile;
- legacy passive drift is deterministic and ledgered behind a removable compatibility category;
- raw studio and streaming company-status labels are absent from player UI;
- save migration, compaction, integrity, and reload parity pass;
- existing Forbes, acquisition, Studio Group, venture, Platform AI, Project A, production, and weekly-loop audits remain green except separately documented pre-existing fixture drift; and
- the production build and focused B1 long-run audit pass without breaching the established late-game performance budget.
