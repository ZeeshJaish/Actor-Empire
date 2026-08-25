# Competitive Streaming Platform AI — Phase 1 Design

**Date:** 2026-08-25

**Status:** Approved direction; awaiting written-spec review

**Scope:** Rival streaming-platform strategy, project development, production, release, research, and finance simulation

## 1. Outcome

Actor Empire's rival streaming companies will become persistent competitors rather than cash counters with random subscriber movement.

Each active AI-controlled platform will:

- maintain a recognizable company strategy;
- develop and produce its own movies and series;
- compete for cast, directors, release dates, viewers, box office, and awards;
- grow its markets, localization, and technology from real research decisions;
- make offers using only capabilities and money it actually has;
- learn from recent results without becoming omniscient;
- suffer bad projects, cash pressure, cancellations, retreats, and takeover vulnerability;
- stop receiving every AI advantage as soon as the player takes control.

The target competence range is **7 to 10 out of 10**. This measures decision quality, not guaranteed success. A 10/10 platform makes excellent choices with limited information; it can still lose because execution, audience response, timing, and competitors remain uncertain.

## 2. Why this is Phase 1

The complete streaming economy contains three related but independently shippable systems:

1. **Platform company AI** — this specification.
2. **Unified rights and bidding AI** — offers, exclusivity, localization, packages, renewals, and the active bidding room.
3. **Studio AI** — production-house strategy beyond projects commissioned by a platform.

Platform AI must come first because later bids need a truthful buyer: its cash, catalogue need, markets, localization, technology, risk appetite, and future slate must all exist before the bidding room can use them.

This phase creates the simulation data and player-facing event summaries needed by future UI. It does not redesign the bidding-room screens.

## 3. Existing Systems to Preserve

The implementation must extend current systems rather than create a parallel game world.

- `WorldState.platforms` remains the canonical list of the five current platform companies.
- Released rival work remains an `IndustryProject`, so existing box-office, awards, news, cast-fame, and studio-ecosystem systems can consume it.
- `OwnedStreamingPlatformState.competitiveWorld` remains the player's owned-platform rivalry model.
- `corporateDevelopment.acquiredPlatformIds` remains an ownership signal for acquired streaming companies.
- Existing deterministic helpers in `services/deterministicRandom.ts` are used for all new AI decisions.
- Existing funded-project contract timing remains unchanged:
  - deadline: 104 weeks;
  - first warning: 26 weeks remaining;
  - final warning: 8 weeks remaining;
  - default consequences remain enforced by `streamingFundingLogic.ts`.

The current random platform evolution block in `worldLogic.ts` will be replaced by the new platform AI economy. It must not continue adding free cash or random subscriber growth after the new processor runs.

## 4. Company Personalities and Competence

### 4.1 Competence is multi-dimensional

Each platform receives persistent scores from 7.0 to 10.0:

- `strategy` — identifies catalogue gaps and useful opportunities;
- `creative` — evaluates concepts, genres, audience, and creative teams;
- `production` — schedules work and controls delays and overruns;
- `commercial` — forecasts demand, release windows, and marketing;
- `prestige` — recognizes festival and awards potential;
- `finance` — protects runway and avoids irrational spending;
- `technology` — chooses useful platform research;
- `negotiation` — reserved for Phase 2 bidding and renewals.

No platform is best at every dimension. The static profile also defines preferred genres, audiences, release appetite, franchise appetite, risk tolerance, localization ambition, and parent-backing tier.

### 4.2 Initial company identities

These are starting identities, not permanent winners:

| Platform | Overall level | Strongest behavior | Meaningful weakness |
| --- | ---: | --- | --- |
| Netflix | 9.4 | scale, volume, global genre reads | can overspend and chase momentum |
| Apple TV+ | 8.8 | prestige, talent, technology | slower slate and expensive perfectionism |
| Disney+ | 9.1 | franchises, family, launch events | concentration and franchise fatigue |
| Hulu | 7.4 | agile curation, cost control | smaller cash and global reach |
| YouTube | 8.2 | attention, discovery, live/creator behavior | inconsistent prestige and premium identity |

Performance can raise or lower effective skill by at most 0.5 over time. The underlying identity remains recognizable.

### 4.3 Controlled AI advantages

AI advantages exist only to keep the world competitive and compensate for the player having deeper direct control.

1. **Candidate depth:** the AI evaluates several concepts and teams before selecting one.
2. **Lower decision noise:** stronger companies estimate likely value more accurately, but never see the final random outcome.
3. **Production-speed advantage:** while AI-controlled, production duration uses:

   `duration multiplier = 0.90 - 0.05 × (production skill - 7)`

   clamped from 0.75 to 0.90. A player-standard 20-week project therefore takes approximately 18 weeks at skill 7 and 15 weeks at skill 10.
4. **Operational attention:** AI companies do not forget to start a funded project, schedule a completed title, or respond to an urgent cash problem.

The AI receives no hidden quality bonus, guaranteed hit, free audience, free rights, or unlimited cash.

## 5. Player-Control Handoff

A single controller resolver determines whether a company receives AI behavior:

`resolvePlatformController(player, platformId) -> 'AI' | 'PLAYER'`

It checks streaming acquisitions and any later canonical company-ownership bridge. Every AI processor must call this resolver before planning or progressing a platform.

When control changes to the player:

- new AI decisions stop immediately;
- AI production-speed multipliers stop immediately;
- existing cash, debt, research, projects, commitments, and mistakes remain;
- completed project progress is preserved;
- remaining project duration is recalculated at the normal player rate without resetting completed weeks;
- the company cannot receive a parent rescue, AI-only scheduling help, or automated greenlight;
- no previously generated decision is rerolled.

If an acquired brand is preserved as a sub-platform, it is still player-controlled. It may later receive user-configurable delegation, but that is outside Phase 1.

## 6. Data Model

### 6.1 Extend `PlatformState`

`PlatformState` gains one optional normalized field:

```ts
ai?: PlatformAiRuntimeState
```

It remains optional for legacy saves. The normalizer creates deterministic defaults when missing.

### 6.2 Runtime state

`PlatformAiRuntimeState` contains:

- `schemaVersion`;
- `profileId` and competence dimensions;
- `lastProcessedAbsoluteWeek`;
- `nextPlanningAbsoluteWeek`;
- `strategyCycle` and current priorities;
- `capabilities`;
- `researchQueue`;
- `slate`;
- `talentBookings`;
- `strategyMemory`;
- `financeHistory`;
- `decisionHistory`;
- `rescueState`;
- `status: 'ACTIVE' | 'DISTRESSED' | 'RESTRUCTURING' | 'DORMANT'`.

### 6.3 Platform capabilities

Capabilities are compact, simulation-facing facts:

- active regions;
- subtitle coverage level;
- dubbing coverage level;
- playback and delivery levels;
- recommendations/discovery level;
- content-operations level;
- localization level;
- security and reliability levels;
- current research slots and active initiatives.

The capability model is compatible with the owned platform's technology branches. Adapters may project owned-platform and rival-platform state into one read model; Phase 1 must not duplicate player research logic inside UI components.

### 6.4 Platform slate record

`PlatformAiProject` stores the unreleased lifecycle:

- stable deterministic ID;
- platform ID and controller at greenlight;
- movie or series;
- original, co-production, or acquired-development source;
- concept, genre, target audience, and optional universe/franchise link;
- intended release strategy;
- budget, committed spend, paid spend, marketing reserve, and contingency;
- selected cast, director, and later writer identifiers;
- creative, commercial, prestige, and risk forecasts;
- status and all lifecycle dates;
- production progress, delay, overrun, and cancellation state;
- localization package planned from real platform capability;
- final execution rolls recorded once, never recomputed on reload.

Lifecycle:

`CONCEPT -> DEVELOPMENT -> PRE_PRODUCTION -> PRODUCTION -> POST_PRODUCTION -> SCHEDULED -> RELEASED`

Exceptional exits:

`ON_HOLD`, `CANCELLED`, and `SOLD`.

### 6.5 Released project bridge

On release, a platform slate item creates one canonical `IndustryProject` with optional source metadata:

- `producerKind: 'PLATFORM'`;
- `producerPlatformId`;
- `releaseStrategy`;
- `streamingPerformance` summary when applicable;
- a stable link to the source platform project.

Existing consumers that do not know these optional fields continue to work.

### 6.6 Strategy memory

Memory is a bounded rolling summary, not an unbounded event log. It tracks:

- last 12 released projects;
- genre and audience performance;
- talent-pair outcomes;
- prestige and awards conversion;
- theatrical and streaming performance;
- overruns and cancellations;
- release-date collisions;
- regional performance;
- broken or fulfilled future commitments;
- encounters with the player.

Decision history retains only the latest 40 meaningful decisions plus aggregate career totals.

## 7. Weekly Processing Order

The processor is idempotent for `(save seed, platform ID, absolute week)` and runs once per game week.

1. Normalize legacy platform AI state.
2. Resolve AI or player control.
3. Settle the previous week's platform revenue and costs.
4. Check distress, runway, and commitment deadlines.
5. Progress research and capability upgrades.
6. Progress development and production projects.
7. Resolve delays, overruns, holds, cancellations, and completions.
8. Reserve or release talent bookings.
9. Schedule completed projects against the industry calendar.
10. Release projects due this week into `WorldState.projects`.
11. Apply audience, subscriber, reputation, cash, box-office, and awards inputs.
12. Learn from released outcomes.
13. If the planning cadence is due, analyse needs and make a bounded set of new decisions.
14. Write compact event summaries and advance `lastProcessedAbsoluteWeek`.

No processor may use `Date.now()` or raw `Math.random()` for a saved AI decision.

## 8. Planning and Greenlight Logic

### 8.1 Need analysis

At each planning cycle, a platform scores:

- genre and audience gaps in its slate;
- franchise fatigue or opportunity;
- prestige need before awards windows;
- subscriber acquisition and churn needs;
- active-region localization needs;
- competitor and player release congestion;
- cash runway and production capacity;
- existing future commitments.

Planning usually runs every 4 weeks. Distressed companies plan every 2 weeks but can only cut, sell, delay, or make low-risk commitments until runway recovers.

### 8.2 Candidate generation

The AI creates 3 to 6 deterministic candidates from current game data. Candidates use actual genres, audiences, title generation, available talent, budget tiers, and optional franchise assets.

Each candidate receives separate forecast scores for:

- strategic fit;
- likely audience value;
- likely creative quality;
- prestige upside;
- production risk;
- release-window fit;
- cost and cash strain;
- localization fit.

The AI never reads the final release roll. Competence changes forecast error and selection consistency, not the underlying truth.

### 8.3 Selection

The platform chooses from its top candidates using weighted probability rather than always selecting the mathematically highest score. At skill 7, an attractive but imperfect option remains common; at skill 10, the top two dominate, but a surprise remains possible.

A greenlight is blocked when any of these are true:

- projected post-commitment runway is below the platform's risk floor;
- maximum concurrent production is reached;
- the slate is already overexposed to that genre or audience;
- no viable talent or release window exists;
- the company is restructuring;
- the project conflicts with an accepted funded commitment.

### 8.4 Slate capacity

Capacity comes from content-operations level, cash, company profile, and existing workload. It is not a flat privilege.

- small/agile platforms: normally 1 to 3 simultaneous productions;
- global scale platforms: normally 3 to 6;
- distressed platforms: maximum capacity is reduced by at least half.

This prevents an AI company from solving competition by producing infinite projects.

## 9. Talent Competition

AI projects use the same NPC actor and director pools as player projects.

When an AI project enters pre-production, it creates dated talent bookings. Candidate generation and player casting must treat conflicting bookings as unavailable unless the project explicitly supports a compatible schedule.

The AI scores talent using:

- ability and fame;
- genre fit and target-audience fit;
- cost;
- recent overexposure;
- prior collaboration results;
- schedule availability;
- platform prestige and relationship.

It cannot reserve every top actor speculatively. A booking requires an approved project and paid commitment. Cancellation releases the booking and may damage the platform's talent relationship.

## 10. Production and Outcome Logic

### 10.1 Duration

Projects start from the same standard duration model used for player work. The AI-only multiplier from section 4.3 applies while the company remains AI-controlled.

Production skill also lowers, but never removes:

- delay chance;
- budget-overrun severity;
- avoidable cancellation risk;
- quality loss from rushed recovery.

### 10.2 Quality

Final quality combines:

- concept strength;
- selected creative team;
- budget suitability;
- production execution;
- platform creative competence;
- development time;
- disruptions and recovery choices;
- bounded outcome variance.

Competence improves choices and execution; it does not directly add a permanent quality floor. Even a 10/10 company can release a flop, and a 7/10 company can create a masterpiece.

### 10.3 Failure choices

When a project deteriorates, the AI chooses among:

- add contingency money;
- delay the release;
- replace talent when contractually possible;
- reduce marketing;
- move to streaming-first;
- sell or co-produce;
- cancel and absorb the loss.

Finance skill and company personality control that response. Sunk-cost bias exists but is stronger for aggressive and franchise-focused profiles.

## 11. Release Strategy and Competition

Each completed project selects one strategy:

- `STREAMING_FIRST` — default for most platform originals;
- `LIMITED_THEATRICAL` — prestige, festival, and awards positioning;
- `WIDE_THEATRICAL` — selected event, franchise, family, or commercial projects;
- `HYBRID_WINDOW` — theatrical opening followed by a planned streaming window.

The selection uses project type, predicted demand, prestige, platform strategy, cash, market reach, and calendar congestion.

- Streaming-first projects affect subscriber acquisition, engagement, churn, platform reputation, and later awards eligibility.
- Theatrical projects receive real box-office outcomes and compete with player and studio films.
- Qualifying projects use the existing `awardProfile` and enter the existing awards system.
- A platform project must not receive both invented box office and invented streaming revenue for the same viewing window.

The existing rival-release queue remains the global release calendar. Platform projects count toward weekly rival density so Phase 1 does not simply stack extra releases on top of the current two-per-week floor.

## 12. Research, Markets, and Localization

Platform AI chooses research from the same strategic needs that drive player platform upgrades.

Research decisions consider:

- active market blockers;
- localization gaps;
- playback and reliability weakness;
- recommendation/discovery weakness;
- content-operation capacity;
- current rival advantage;
- cash runway and expected payoff.

Localization is represented in the future bidding UI as:

- none;
- subtitles;
- dubs and subtitles.

Under the hood, an AI platform may only promise coverage supported by its active regions and completed localization capability. Research grows this coverage gradually; the offer layer cannot manufacture unsupported countries or languages.

## 13. Financial Model and Anti-Infinite-Money Rules

### 13.1 Real weekly cash flow

The current unconditional `cashReserve += subscribers × 0.1` behavior is removed.

Each platform settles:

**Income**

- subscription and advertising income derived from subscribers, price, reach, engagement, and churn;
- project-specific theatrical or licensing receipts;
- catalogue-sale or co-production receipts;
- explicit, recorded parent support when eligible.

**Costs**

- service operations and delivery;
- staff and active-market costs;
- production instalments and overruns;
- marketing;
- rights and catalogue acquisition;
- research and technology;
- debt or restructuring costs;
- localization.

Every cash movement writes a compact finance-history record. No balance is silently reset.

### 13.2 Reserve discipline

Companies maintain a strategy-specific target cash runway. Excess reserve is allocated through visible decisions: content, research, market expansion, debt reduction, dividends/buybacks represented as cash leaving the simulation, or acquisitions in later phases.

Valuation is derived from trailing operating performance, subscribers, catalogue strength, technology, growth, debt, and risk. It is smoothed over time and does not compound from random weekly percentage changes.

This replaces both quarter-trillion runaway growth and artificial zero-balance protection.

### 13.3 Distress ladder

When cash weakens, the platform responds in order:

1. reduce marketing and new greenlights;
2. delay research and market expansion;
3. sell, share, or cancel projects;
4. license or package catalogue assets;
5. withdraw from weak regions;
6. restructure debt and leadership strategy;
7. request capped parent support if its profile allows it;
8. become dormant or a distressed acquisition target.

Parent support is not a safeguard floor. It is a recorded exceptional event with:

- a profile-based eligibility rule;
- a maximum amount tied to real operating scale;
- at least a 104-week cooldown;
- reputation, autonomy, and strategic consequences;
- no availability after player acquisition.

## 14. Learning Without Cheating

After a release, the AI updates bounded beliefs about genres, audiences, talent, regions, and release strategies.

Learning uses weighted history:

- recent results matter most;
- one surprise hit cannot permanently rewrite company identity;
- repeated failure causes a real strategy shift;
- companies may overcorrect, especially at lower competence;
- the AI knows public game-world facts, not the player's hidden future rolls.

The player can therefore read and exploit rival behavior. The AI is strong, but understandable.

## 15. Determinism and Save Compatibility

### 15.1 Stable decisions

Every decision seed includes:

- save/player simulation seed;
- platform ID;
- absolute week;
- decision cycle;
- decision type.

The selected candidate, cast, execution rolls, crisis rolls, and release decision are persisted. Reloading cannot reroll them.

### 15.2 Legacy migration

For a save without `PlatformState.ai`:

- assign the static company profile;
- initialize capabilities from current reputation, subscribers, and existing competitive-world profile;
- begin with an empty active slate;
- create a small bounded historical memory from `recentHits` rather than fabricating full projects;
- preserve current cash, subscribers, valuation, reputation, and churn;
- set `lastProcessedAbsoluteWeek` to the current absolute week so migration does not simulate missed years in one frame.

Normalization must be pure, deterministic, and idempotent.

## 16. Service Boundaries

Phase 1 should use focused modules under `services/platformAi/`:

- `platformAiProfiles.ts` — static identities and competence;
- `platformAiState.ts` — normalization, controller resolution, selectors;
- `platformAiPlanning.ts` — need analysis, candidate generation, greenlights;
- `platformAiTalent.ts` — reservations and talent scoring;
- `platformAiProduction.ts` — lifecycle progression and production incidents;
- `platformAiResearch.ts` — capabilities and research queue;
- `platformAiEconomy.ts` — weekly cash flow, runway, distress, valuation;
- `platformAiRelease.ts` — scheduling, IndustryProject conversion, outcomes;
- `platformAiTurn.ts` — ordered weekly orchestration only.

`worldLogic.ts` calls the orchestrator and handles the returned world/news/log changes. It must not absorb the new subsystem's internal rules.

## 17. Player-Facing Observability

Phase 1 does not build the final bidding-room UI, but every major AI decision must expose a concise presentation model:

- what the platform decided;
- why it decided it;
- money committed or saved;
- expected timing;
- the player-facing competitive consequence.

Only high-value events enter the normal news feed: major greenlights, cast battles, cancellations, event releases, hits/flops, awards pushes, region exits, restructuring, and rescue events. Routine weekly accounting stays in diagnostics to avoid notification spam.

## 18. Testing and Simulation Audits

### 18.1 Unit tests

- profile values remain within 7.0–10.0;
- production multiplier maps 20 weeks to 15–18 weeks while AI-controlled;
- player control removes the multiplier and all automated decisions;
- deterministic seeds produce identical decisions and outcomes;
- legacy normalization is idempotent;
- greenlights obey cash, runway, capacity, talent, and commitment blockers;
- talent bookings prevent invalid double-booking and release correctly;
- research cannot unlock unsupported localization instantly;
- platform releases create valid `IndustryProject` records;
- awards and box-office adapters accept platform projects;
- parent support respects amount, eligibility, cooldown, and ownership rules;
- no weekly free-cash path remains.

### 18.2 Long-run audits

Run deterministic 10-, 25-, and 50-year simulations across multiple seeds. Assert:

- no platform cash or valuation becomes `NaN`, infinite, or negative without a recorded debt/distress state;
- cash reserves do not grow indefinitely without profitable operations and visible allocation decisions;
- at least one platform can enter distress in adverse seeds;
- not every distressed platform receives a rescue;
- AI companies continue producing without exceeding capacity;
- project outcomes include hits, solid results, and flops;
- no platform wins every annual box-office or awards cycle;
- stronger companies outperform weaker companies over many seeds, but not in every seed;
- platform acquisition stops AI processing on the next weekly turn;
- reload/replay of the same save produces identical AI history.

### 18.3 Balance targets

These are tuning bands, not per-save guarantees:

- platform hit rate: approximately 35–55%;
- clear flop rate: approximately 10–25%;
- annual output follows capacity and finances rather than a fixed quota;
- top AI platforms remain credible awards and commercial rivals without owning every season;
- a well-run player company can consistently beat them, while careless play is punished.

## 19. Implementation Sequence After This Spec

1. Add data types, static profiles, normalizer, and ownership resolver.
2. Add deterministic planning and candidate evaluation.
3. Add talent reservations and production lifecycle.
4. Add platform research and localization capability growth.
5. Add real cash flow, runway, distress, rescue, and valuation.
6. Add release scheduling and canonical IndustryProject bridge.
7. Replace the old random platform evolution and reconcile rival-release density.
8. Connect news/diagnostic summaries.
9. Add focused unit tests and long-run simulation audits.
10. Tune only from audit results, not by adding hidden cash or guaranteed quality.

## 20. Definition of Done

Phase 1 is complete when:

- every unacquired platform runs a persistent deterministic company AI;
- each company behaves differently and stays within the 7–10 competence design;
- AI platforms build real slates and release movies/series that compete in existing systems;
- 20-standard-week projects complete in roughly 15–18 weeks for AI companies, according to production skill;
- the advantage disappears under player control;
- cash comes from real operations and recorded financing rather than passive injections;
- distress and failure are possible and understandable;
- research and localization capabilities grow and can later constrain bids;
- existing funded-project deadlines remain 104/26/8 weeks;
- legacy saves normalize safely;
- deterministic long-run audits pass;
- the existing game builds without new TypeScript or runtime errors.

## 21. Explicit Non-Goals

Phase 1 does not:

- redesign the active bidding-room UI;
- implement catalogue packages, shared/exclusive rights, or renewals;
- add the future cheat-menu bidding-room shortcut;
- rebuild general production-house Studio AI;
- give acquired companies autonomous AI advantages;
- guarantee that a named real-world-inspired platform always wins;
- solve balance failures with hidden cash floors or silent bailout injections.
