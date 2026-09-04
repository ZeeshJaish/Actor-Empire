# Project B Phase B6 Design — AI Production, Release, and Commercial Results

**Date:** 2026-09-03
**Status:** Awaiting written-spec review
**Roadmap phase:** Project B6

## Purpose

B6 converts saved B5 greenlights into canonical, compact, fallible AI productions. It progresses physical work, records material talent, charges exact production money, resolves persistent problems, selects a rights-valid release path, and creates one permanent public result.

B6 does not make an AI studio operate a hidden copy of the player's Production House. It processes deterministic milestones only when due and uses existing canonical registries and settlement systems.

## Approved product rules

- B5 remains the only origin of new independent Studio AI productions.
- AI studios use statistical decisions, not invisible player clicks or full private scripts.
- Player-controlled projects continue through the existing detailed Production House and career workflows.
- Platform commissions keep their existing canonical commissioning, milestone-payment, delivery, localization, and streaming-release paths.
- NPC talent may work on several projects. Bookings record material workload but do not become a universal hard conflict until the future contract/law system.
- Production problems may delay, overrun, hold, resize, turn around, sell, or cancel a project. B6 does not implement actor firing, replacement litigation, or lawsuits.
- Streaming-only releases never receive theatrical box office.
- A delivered platform original does not automatically receive a theatrical release.
- News, Forbes, IMDb, box office, awards, X, and Instagram must ultimately read the same canonical production and project IDs. B7 owns complete cross-surface presentation and spam control.
- AI-only cost or speed advantages stop when the player controls the relevant company. Existing progress, money, talent, incidents, and mistakes remain.

## Approaches considered

### 1. Extend the Platform AI production engine for every studio project

This would reuse substantial code, but the current engine correctly depends on a commissioning platform, platform content plan, escrow, localization, and platform cash. Inventing those records for independent films would corrupt ownership and accounting.

### 2. Add a second private Studio AI production registry

This would isolate independent work but duplicate identity, status, talent, save compaction, and acquisition handoff. A project could disagree between the private registry and `WorldState.industryProductions`.

### 3. Canonical hybrid — selected

All material physical productions use `WorldState.industryProductions`. Independent projects receive a B6 Studio AI execution record; commissioned projects retain their existing Platform AI execution record. Shared calendars, talent bookings, canonical project IDs, rights, save compaction, and public results are reused, while funding-specific progression remains separate.

This avoids parallel authority without forcing independent films into platform economics.

## Canonical ownership and identity

`WorldState.industryProductions` remains the canonical physical-production registry.

An independent B6 production stores:

- one stable production ID derived from the B5 commitment ID;
- one stable canonical project ID used later by `WorldState.projects`, rights, IMDb, awards, and streaming windows;
- producer studio ID;
- B5 slate commitment ID;
- B3 fingerprint ID and universe lineage;
- source `STUDIO_INDEPENDENT`;
- production calendar, budget, paid production cost, material talent booking IDs, status, and B6 execution record.

A commissioned production continues to store its platform plan and commissioner IDs, source `PLATFORM_COMMISSION`, and existing `PlatformAiProductionRecord`.

No second canonical project or production may be created for the same B5 commitment, platform plan, or project ID.

## Lifecycle

Independent production follows:

```text
B5 GREENLIT
→ PLANNED
→ PRE_PRODUCTION
→ PRODUCTION
→ POST_PRODUCTION
→ DELIVERED / AWAITING_RELEASE
→ RELEASED
```

Fallible branches are:

```text
active phase → ON_HOLD → resumed phase
active phase → TURNAROUND → same production under a new studio
active phase → CANCELLED
awaiting release → delayed / rights market / release / turnaround / cancellation
```

The B5 commitment becomes `HANDED_OFF` only after the canonical production is created successfully. Its committed production reservation transfers to the production record rather than disappearing.

## Handoff from B5

The handoff runs inside `processStudioAiWeek` after B5 review and before B1 weekly finance settlement.

For each independent `GREENLIT` commitment not already linked to a production:

1. Recheck AI controller, non-terminal company status, production capacity, fingerprint identity, and frozen budget.
2. Generate one deterministic title using the existing title vocabulary.
3. Build a production calendar from format, budget scale, studio production competence, and the existing `ProductionCalendar` structure.
4. Create the canonical independent `IndustryProductionCommitment`.
5. Move the B5 commitment to `HANDED_OFF` and save `industryProductionId`.
6. Preserve the B5 budget reservation as outstanding committed spend.

The handoff is idempotent through `b6-handoff:<commitmentId>` and stable IDs. Failure leaves the B5 greenlight unchanged so it can retry safely.

The temporary `consumeStudioGreenlightForLegacyRelease` instant-release bridge is retired after B6 parity. The older venture projection may continue for compatibility, but it cannot create a title or commercial result.

## Talent packaging

B6 extracts a shared deterministic industry-talent selector from the current Platform AI talent ranking without changing existing Platform AI output.

Selection considers:

- ability and tier;
- fame and commercial reach;
- genre, audience, prestige, and language fit;
- studio talent-relationship competence;
- expected cost versus production budget;
- recorded workload and overexposure;
- prior collaboration and remembered outcomes where available;
- dynasty-career availability decisions;
- persisted selection variance.

Independent production selects one lead actor and one director from the canonical stable celebrity pool plus valid generated NPC extras. The current canonical model has no named writer booking; `writerSource: IN_HOUSE_TEAM` and the studio's development/creative ability remain authoritative until a real writer-contract system exists.

Talent selection is saved once. `reserveProjectTalentBookings` records actor and director workload with `allowOverlaps: true`, matching the approved Phase 3 rule. Cancellation releases bookings as cancelled; delivery or release releases them as completed. B6 does not reroll talent because a better option appears later.

## Calendar and milestone processing

B6 uses the existing `ProductionCalendar` fields and phase boundaries. Full production context is built only for a due handoff, milestone, problem checkpoint, hold review, turnaround review, delivery, or release.

Independent production cost is paid in four exact idempotent milestones:

- 15% at pre-production start;
- 30% at production start;
- 30% at post-production start;
- 25% at delivery.

Rounding residue is included in the delivery milestone so total paid principal equals the frozen B5 greenlight budget exactly.

Each payment:

- debits the B1 studio cash balance;
- creates one B1 `PRODUCTION` ledger entry;
- increases production `paidMillions`;
- reduces outstanding `committedSpendMillions` by the same principal;
- cannot apply twice after reload or repeat processing.

Development and rewrite money paid in B5 is not charged again. Release marketing is a separate B6 ledger expense and is never silently included in production principal.

If cash cannot meet a due milestone, the project enters a saved financing hold. B6 does not create hidden income. At later reviews the studio may resize remaining scope, accept explicit debt already available through B1 rules, find a turnaround buyer, remain on hold, or cancel.

## Problems and recovery

Problem checks occur only at stable checkpoints: production start, approximately 35% progress, approximately 70% progress, and post-production start. Each checkpoint has one deterministic persisted key.

Problem likelihood and severity use:

- production and finance competence;
- budget suitability;
- slate congestion;
- talent package strength and workload;
- franchise fatigue;
- current cash and runway;
- prior delay/overrun pressure;
- saved B2/B3 uncertainty.

Possible material problems are delay, overrun, quality loss, talent issue without replacement, financing hold, and post-production difficulty. At most three material problem records are retained per production; their accumulated effects remain in the final scores.

Allowed responses are contingency spend, schedule extension, scope reduction, quality protection, release delay, financing hold, turnaround/sale, and cancellation. Talent replacement and contract litigation remain excluded.

## Turnaround and project sale

A turnaround preserves the production ID, canonical project ID, calendar progress, paid cost, talent package, problem history, fingerprint, and universe lineage.

An eligible AI buyer must be active, AI-controlled, have spare production capacity, fit the genre/strategy, and have sufficient post-purchase runway. Purchase price is deterministic from paid cost, remaining cost, creative forecast, rights position, and distress discount.

Settlement is exact and atomic:

- buyer cash decreases once;
- seller cash increases once;
- producer studio ID changes once;
- remaining committed production cost transfers to the buyer;
- both B1 ledgers receive matching transaction references;
- no existing platform commission may be sold by this independent turnaround path.

If no valid buyer exists, the production remains on hold or cancels according to its persisted review outcome.

## Final quality

Delivery freezes five B6 result dimensions:

- creative quality;
- execution quality;
- commercial potential;
- prestige potential;
- downside risk.

They are derived from the B3 fingerprint, B5 scores, studio competence, budget suitability, talent package, development time, production execution, problems, recovery choices, universe strength/fatigue, and saved variance.

Competence changes the distribution but creates no quality floor. A major studio can make an expensive failure, and a small specialist can create a breakout success. Reloading cannot reroll any result dimension.

## Release planning and rights

B6 saves one release plan after delivery. It translates the B3 release-path intention into the existing public primitives rather than expanding the public `ReleaseStrategy` union unnecessarily.

Private B6 release modes are:

- limited theatrical;
- wide theatrical;
- event theatrical;
- prestige theatrical;
- streaming-only;
- theatrical followed by streaming;
- hold;
- sale/turnaround.

The public project continues to use `releaseStrategy: THEATRICAL | STREAMING_ONLY`, with theatrical scale and later streaming windows expressing the richer plan.

Release selection considers project format, rights, active contracts, audience, quality, prestige, commercial potential, studio distribution ability, marketing affordability, competing releases, season, universe timing, and platform relationships.

Rules:

- An independent theatrical release needs no fabricated streaming buyer.
- A streaming-first independent title cannot release until a real Project A rights contract identifies an eligible platform and territories.
- A theatrical-first or hybrid title may receive a later streaming window only through Project A rights.
- A commissioned original remains on its existing platform release path and receives no theatrical release unless a future explicit canonical entitlement permits it.
- If the intended path is unavailable, the production stays `AWAITING_RELEASE`, chooses another fingerprint-compatible path at a saved review, enters turnaround, or cancels. It never invents rights.

B6 may expose a delivered independent production to the existing rights opportunity boundary, but it does not create a second bidding or contract system.

## Commercial results and exact settlement

### Independent theatrical release

B6 uses the existing box-office caps, audience/talent/quality inputs, market climate, and studio outcome projection through an AI adapter. The AI project does not create player `activeRelease` chores.

The saved result includes worldwide theatrical gross, studio receipts, marketing spend, production spend, net studio result, rating, review class, and award profile. `IndustryProject.boxOffice` stores theatrical gross in base currency.

The B1 ledger receives only actual new cash movement. Production principal already paid at milestones is not deducted again. `studioEcosystem` receives an exact-settlement input so reputation, momentum, valuation, hit/flop history, lifetime gross, and lifetime profit update without its legacy estimated-budget cash calculation double-counting B6 money.

### Streaming-only release

`IndustryProject.boxOffice` is exactly zero. Existing Platform AI release and streaming-economy systems create streaming windows, audience performance, subscriber effects, catalogue value, and platform settlement.

The producer studio receives only canonical contract money, commission fees, backend participation, or sale proceeds. B6 does not convert platform subscriber revenue into theatrical gross.

### Hybrid or later-window release

The theatrical result settles first. A later streaming window is added only through the canonical Project A contract and Platform AI release systems. Rights, territory, time window, and revenue IDs prevent double counting.

## Commission compatibility

Existing commissioned productions remain authoritative in:

- `platformAiCommissioning`;
- `platformAiProduction`;
- `platformAiRelease`;
- `platformAiEconomy`;
- `industryProductions`;
- `talentBookings`.

B6 observes their status to reconcile the producer studio's B5 commitment and capacity. It does not progress them a second time, charge independent milestones, change platform escrow, or create another public project.

On delivery, cancellation, or release, the linked B5 commission commitment becomes terminal and releases studio capacity exactly once.

## Public materialization

An independent production becomes one `IndustryProject` only when its public release occurs. The materialized record contains stable title, genre, format, language, target audience, studio, physical producer, B5 commitment ID, B3 fingerprint ID, universe ID, budget tier, cast, director, quality, rating, reviews, release date, release strategy, box office, award profile, and streaming windows where applicable.

`WorldState.projects`, IMDb, awards, rights, Forbes studio profiles, and box-office consumers reference this same ID. B6 records canonical facts; B7 decides which facts appear in News/social channels and when.

The unrelated legacy random-industry and universe filler paths remain until B7 replacement parity, as required by the roadmap, but they cannot consume B5 commitments or share B6 IDs. B7 retires those instant rival-release paths after presentation parity.

## Player control and acquisition

Before every B6 handoff or progression, controller authority is resolved from the existing ownership systems.

If the producer becomes player-controlled:

- AI progression stops immediately;
- production ID, project ID, progress, calendar, paid cost, remaining committed cost, talent, problems, release plan, and saved variance remain;
- no phase restarts or rerolls;
- AI-only commission speed handling follows the existing acquisition handoff;
- B7 expands the compact record into the existing Production House/Studio Group control surface.

B6 does not mutate player-controlled or delegated projects through rival-AI rules.

## Persistence, migration, and bounded cost

- Old saves activate B6 at their current absolute week; historical B5 greenlights already consumed by the legacy bridge are not replayed.
- Unconsumed B5 greenlights become eligible for B6 handoff.
- Active industry productions are never evicted by compaction.
- Terminal production retention continues through the existing global 104-record production cap, with referenced award, platform, rights, and project records protected.
- Each independent production retains at most three material problems and bounded processed milestone/review keys.
- Full context is built only for due productions.
- Batch normalization and project indexes avoid repeatedly scanning all historical projects per studio.
- Save/reload at any milestone produces the same subsequent state as uninterrupted play.

## Idempotency

Stable keys cover:

- `b6-handoff:<commitmentId>`;
- `b6-talent:<productionId>`;
- `b6-milestone:<productionId>:<milestone>`;
- `b6-problem:<productionId>:<checkpoint>`;
- `b6-recovery:<productionId>:<problemId>`;
- `b6-turnaround:<productionId>:<buyerStudioId>`;
- `b6-release-plan:<productionId>`;
- `b6-release:<productionId>:<channel>`;
- `b6-settlement:<productionId>:<channel>`.

Money, bookings, status, public projects, studio outcomes, rights references, and awards must all reject duplicate application.

## Implementation boundaries

B6 includes:

- B5 independent-greenlight handoff;
- canonical independent production metadata and normalization;
- shared talent selection and canonical bookings;
- milestone progression and exact studio-funded production accounting;
- problems, holds, recovery, turnaround, and cancellation;
- final quality and persisted result dimensions;
- rights-valid release planning;
- theatrical and streaming result adapters;
- one canonical public project materialization;
- commission observation and capacity reconciliation;
- acquisition stop and save migration;
- focused and long-run audits.

B6 excludes:

- a new player UI or repetitive production actions;
- complete News/X/Instagram/Forbes/IMDb orchestration, which is B7;
- final balance/device certification, which is B8;
- actor firing, replacements, contract disputes, and lawsuits;
- a second bidding room, rights registry, streaming economy, awards engine, or box-office authority;
- retroactive replay of old private AI history.

## Verification matrix

Focused RED-to-GREEN audits must prove:

1. production state normalization, source separation, bounded problem/key history, and old-save activation;
2. exactly-once B5 handoff, stable IDs, calendars, capacity transfer, and no immediate release;
3. deterministic talent choice, canonical booking history, overlap policy, cancellation, and commission parity;
4. milestone timing, exact 100% principal, no duplicate payment, committed-spend reconciliation, and financing holds;
5. deterministic problems, recovery effects, bounded history, turnaround atomicity, and no talent replacement;
6. fallible final quality, suitable-budget and competence effects, stable replay, and universe fatigue;
7. rights-valid release plans, zero streaming-only box office, hybrid window separation, and platform-original protection;
8. exact commercial settlement, no double charging, canonical public project identity, outcome history, and award profile;
9. player-controller stop, acquisition preservation, commission observation, save/reload equivalence, and legacy instant-release retirement;
10. deterministic 20,800-week varied-company replay with bounded state, varied hits/flops/delays/holds/cancellations, no duplicate IDs or money, and measured runtime/save size.

Adjacent regressions must cover B1–B5, Platform AI commissioning/production/release/economy, Project A rights compatibility and transactions, talent bookings, studio acquisition, save integrity/compaction, world progression, production build, and scoped diff checks.

## Completion gate

B6 is complete when:

- no independent Studio AI production begins without one saved B5 greenlight;
- every material production has one canonical identity and lineage;
- production time, money, talent, problems, recovery, and outcomes persist without reroll;
- exact production payments and commercial receipts reconcile in the B1 ledger;
- commissioned and independent economics never cross;
- AI projects can succeed, fail, delay, hold, turn around, sell, or cancel;
- every released public title has stable cast, budget, status, date, rating, result, rights, and award inputs;
- streaming-only titles have zero theatrical box office;
- player control stops rival-AI progression without losing progress;
- save growth and Process Week cost remain bounded;
- the temporary B5 venture instant-release bridge is retired;
- all focused and adjacent verification gates pass, with unrelated repository noise reported honestly.
