# General Production Studio AI Master Plan v1

> **Supporting detail:** Current programme status and sequencing are maintained
> in `actor-empire-post-platform-master-roadmap.md`. This document remains the
> detailed Project B architecture and baseline-audit reference.

**Date:** 2026-08-30
**Project:** Post-Platform-AI Project B
**Status:** Approved roadmap design; not yet implemented
**Dependency:** Complete Project A before starting Phase B1
**Audience:** Actor Empire development and future implementation chats

## Purpose

Build autonomous production houses that operate like persistent companies rather than weekly random movie generators.

An AI studio should be able to:

- find or create material;
- develop a slate;
- greenlight only what it can support;
- finance, cast, and physically produce projects;
- survive delays, overruns, hits, and flops;
- market and release theatrical titles;
- sell streaming rights through the canonical Project A market;
- build catalogues and franchises;
- compete for talent, box office, and awards;
- launch with different levels of potential;
- be acquired, handed to the player, restructured, or closed; and
- repeat the same saved decisions after reload.

This project covers both established real-world-inspired studios already present in the game and fictional studios generated during play.

## Player-visible result

Instead of seeing two unexplained rival releases appear every future week, the player sees a living studio industry:

- a prestige label develops a difficult drama and searches for financing;
- a commercial studio protects cash after a flop;
- a genre house turns a low-budget hit into a sequel;
- a new founder-backed company enters with real capital and a credible first slate;
- studios compete for talent and release dates;
- finished films enter theatrical and streaming-rights markets;
- a studio's catalogue, cash, reputation, valuation, and relationships reflect its history; and
- acquiring the company transfers its real pipeline and obligations.

The player is not shown private AI scores or a recommended answer. They see projects, deals, newsworthy decisions, company results, and explainable summaries.

## Scope boundaries

### Included

- independent studio development and slate creation;
- script/IP acquisition and development;
- greenlight and portfolio decisions;
- financing and cash runway;
- talent packaging and load-aware bookings;
- physical production, milestones, crises, delays, overruns, holds, and cancellation;
- marketing and theatrical distribution strategy;
- box-office economics;
- canonical streaming-rights sales;
- catalogue, sequel, franchise, and awards strategy;
- established and generated studio growth/decline;
- acquisition handoff and player/subsidiary control;
- meaningful News/Forbes/rival observability; and
- deterministic weekly and long-run verification.

### Not included

- the broad X/Instagram/fan-reaction template expansion;
- a complete lawsuit or entertainment-law pack;
- mid-production actor firing and replacement litigation;
- player-facing redesigns unrelated to understanding Studio AI;
- a second streaming-rights registry;
- guaranteed hits, hidden rescues, or unledgered passive income; and
- forcing the player through new manual activities for AI-only productions.

## Dependency on Project A

Project B may develop and produce films only after Project A supplies the full common rights market.

Project B must consume:

- territory and window compatibility;
- exclusivity enforcement;
- rights expiry and reversion;
- renewals;
- catalogue packages;
- two-sided acquisitions/resales;
- relationship memory; and
- exact guarantee/backend settlement.

Studio AI must never calculate a private streaming sale and then merely copy a number into Project A. It must become a real seller in the same market.

## Existing-system audit

Project B starts from meaningful foundations, but the complete autonomous Studio AI does not yet exist.

### Existing foundations to preserve and reuse

| Existing system | What it already provides | Project B use |
| --- | --- | --- |
| `WorldState.studios` / `NPCStudioState` | Public studio identity, valuation, reputation, cash, hit/flop and release summaries | Expand into the canonical public projection of Studio AI state |
| `WorldState.industryProductions` | Canonical physical production records and normalized statuses | Use for AI studio and commissioned physical productions |
| `WorldState.talentBookings` | Dated actor/director bookings tied to projects | Extend to load-aware availability and Studio AI packaging |
| `WorldState.projects` | Completed industry projects and release results | Keep as the released-title catalogue, not the development pipeline |
| `NpcVentureState` | Generated production-house identity, founder, archetype, capital, history, launch and closure shell | Migrate generated ventures into the same Studio AI runtime as established studios |
| Production calendar | Pre-production, production, post-production, elapsed weeks, focus window | Share as the canonical time model |
| Greenlight calculators | Budgets, available funds, package budget, casting strength, estimated quality | Extract/reuse actor-neutral calculations where applicable |
| Production economy | Real crew/equipment/infrastructure costs and campaign reach | Reuse instead of inventing free production capacity |
| Production risk | Budget pressure, craft, hype, slate fatigue, theatrical/streaming/bid effects | Use a saved risk snapshot in greenlight and release reasoning |
| Production crises/events | Existing production problem templates and consequences | Reuse safe crisis categories; keep legal replacements deferred |
| Studio slate fatigue | Release-cadence and repeated-genre/franchise pressure | Generalize to AI studio release histories |
| Studio specialization | Genre reputation and specialization labels | Feed development, greenlight, producer fit, and learning |
| Studio acquisition/group systems | Ownership percentage, operating model, mandates, treasury and subsidiary operation | Route player-controlled studios into existing player/subsidiary control |
| Awards and release systems | Canonical awards history and player release calculations | Use shared outcome records without duplicate awards or theatrical releases |
| Platform AI commissioning | Producer selection, commissioned production lifecycle, canonical delivery | Make Studio AI capacity and competence inform AI producer participation |
| Project A | Canonical bidding, rights, packages, renewals, resale, settlement | All Studio AI streaming commerce |

### Existing placeholder behaviour to replace

The following are useful prototypes, not the target architecture:

- `processWorldTurn` pre-generates two completed rival releases for each upcoming week.
- `generateIndustryProject` uses `Math.random()` and `Date.now()` and produces a finished result without development or production lineage.
- rival talent fees, backend, quality, and awards rolls are recalculated from unpersisted randomness.
- `applyPassiveStudioEcosystemTurn` adds passive cash and valuation movement without a real operating source.
- generated ventures can create and release a project in the same weekly decision.
- generated ventures receive passive valuation-based cash rather than ledgered revenue.
- `NPCStudioState` has no persisted slate, development pipeline, finance obligations, decision memory, or weekly checkpoint.
- established studios and generated ventures follow different shallow simulations.
- role-offer generation still contains non-deterministic IDs/rolls outside the deterministic venture core.

Project B must retire these paths only after the replacement owns their responsibilities and regression coverage proves the handoff.

### Verified baseline on 2026-08-30

The existing focused audits passed before this roadmap was written:

- `audit:living-studio-ecosystem`
- `audit:npc-venture-determinism`
- `audit:studio-production-economy`
- `audit:production-risk`
- `audit:studio-slate-fatigue`
- `audit:studio-group`

These passes prove the current foundations behave as currently specified. They do not prove that General Production Studio AI is complete.

## Canonical architecture

### Company authority

`WorldState.studios` remains the canonical industry studio registry. Each active AI studio gains a persisted runtime object, preferably nested on its studio record, rather than creating a second top-level company registry.

The runtime must include at least:

- schema version;
- controller (`AI` or `PLAYER`);
- company status;
- archetype and strategy profile;
- competence and bounded decision traits;
- starting advantages with disclosed sources;
- cash, debt, investor obligations, and runway;
- development slate and active greenlight candidates;
- production capacity and committed load;
- owned IP/franchise/catalogue references;
- current relationships;
- learned genre/format/talent outcomes;
- deterministic seed;
- last processed absolute week;
- processed week keys;
- immutable or append-only important decisions; and
- bounded weekly/event history.

The public `NPCStudioState` fields remain convenient summaries derived from this runtime.

### Canonical records by lifecycle stage

| Stage | Canonical record |
| --- | --- |
| Concept/script/IP development | Studio AI development record linked to a canonical script/IP identity |
| Approved but not started | Studio AI greenlight/finance decision |
| Physical production | `WorldState.industryProductions` |
| Talent commitment | `WorldState.talentBookings` |
| Completed release | `WorldState.projects` plus the relevant release/economic records |
| Streaming bid/session | `WorldState.streamingBiddingSessions` |
| Signed streaming rights | `WorldState.streamingRightsContracts` |
| Backend payout | `WorldState.streamingRoyaltySettlements` |
| Awards outcome | canonical awards history |
| Player acquisition | existing studio acquisition, ownership, group, and subsidiary records |

References must be stable IDs. Title matching is never a canonical join.

### Company categories

All categories share one runtime and weekly coordinator:

- established global studio;
- established regional/local studio;
- platform-owned physical producer;
- independent fictional studio;
- founder/creator-backed venture;
- prestige boutique;
- commercial studio;
- genre specialist;
- distressed/restructuring studio; and
- player-controlled or player-subsidiary studio.

Differences come from saved profiles and resources, not separate simulators.

### Starting maturity and future entrants

New studios do not always begin at level zero. A generated entrant receives a deterministic, financed launch profile such as:

- **Bootstrapped boutique:** lean capital, narrow genre edge, one development slot.
- **Founder-backed label:** recognisable founder, stronger relationships and publicity, limited operating depth.
- **Investor-backed challenger:** meaningful capital, hired leadership, multiple development candidates.
- **Breakout production company:** existing creative track record/IP and a credible first greenlight.
- **Strategic spin-out:** inherited talent relationships, catalogue or facilities, with corresponding obligations.

High-potential launches must also carry a cost or source: founder capital, investor dilution, debt, parent funding, transferred IP, or experienced leadership. Potential cannot be free hidden power.

Established real studios begin with suitable scale, specialization, catalogue, relationships, capacity, and competence. They should not replay a startup tutorial internally.

### Controller resolution and acquisition handoff

One resolver decides whether a studio is AI- or player-controlled by inspecting existing acquisition, stock-control, business, and studio-group state.

While AI-controlled, the studio coordinator may make autonomous decisions. When control changes:

1. Finish no new AI decision after the acquisition boundary.
2. Preserve development spend, projects, bookings, debt, rights, relationships, and history.
3. Convert pending studio records to the player's production-house/subsidiary representation exactly once.
4. Respect the existing operating model and mandate controls.
5. Stop AI-only efficiencies or automatic decision authority immediately.
6. Keep other studios processing normally.

Full merger, controlled subsidiary, and independent-label operating models remain distinct. General Studio AI must not override the player's chosen subsidiary policy.

### Deterministic weekly coordinator

Each active AI studio processes at most once per absolute week:

1. Normalize state and references.
2. Resolve controller and status.
3. Settle due income, expenses, debt, payroll, overhead, and rights payments.
4. Update runway, distress, capacity, relationships, and market observations.
5. Progress script/IP development.
6. Re-evaluate eligible greenlight candidates when a decision is due.
7. Finance and start approved projects.
8. Progress physical productions and milestone payments.
9. Resolve persisted crises, holds, delays, overruns, delivery, or cancellation.
10. Progress marketing and release preparation.
11. Release projects scheduled for this week.
12. Apply theatrical, rights, catalogue, awards, reputation, and learning results.
13. Evaluate rights sales, renewal, package, sequel, or abandonment decisions when due.
14. Evaluate new development only if capacity and runway permit.
15. Publish bounded summaries and advance the processed-week checkpoint.

Repeating the same studio/week must be a no-op.

## Decision model

### Inputs

Studio decisions may use saved facts such as:

- company archetype and mandate;
- executive/creative/production/commercial competence;
- cash, debt, runway, expected commitments, and risk tolerance;
- production and development capacity;
- genre, format, audience, territory, and language fit;
- script quality, IP strength, sequel demand, and franchise fatigue;
- talent fit, cost, availability load, prior collaboration, and overexposure;
- market trends and release congestion;
- studio specialization and recent learning;
- Project A rights availability and platform demand;
- platform/studio relationship history;
- catalogue gaps and strategic goals; and
- forecast uncertainty.

### Decision quality

Competence improves forecast accuracy and option selection. It does not create a quality floor or immunity from bad luck.

An elite studio may still:

- overpay for a package;
- back a weak sequel;
- misread audience demand;
- lose talent;
- suffer a delay;
- release into bad competition; or
- produce a flop.

A weak or new studio may still find an undervalued script, execute efficiently, or create a breakout.

### Saved outcome variance

Concept, production, marketing, and audience variance are rolled once from deterministic seeds and persisted at the decision boundary. Reloading cannot reroll a bad project, better opening, cheaper overrun, or different offer.

### No hidden answer score

Player-facing screens may show facts, risk language, and contract clauses. They must not reveal:

- the AI's exact utility score;
- which offer is mathematically best;
- an unreleased final quality score;
- a guaranteed hit chance; or
- private bidder ceilings.

---

# Phase B1 — Canonical Studio AI foundation, control, and migration

## Purpose

Create one persistent company brain and safe weekly boundary before adding deeper creative decisions.

## Work

- Add a versioned Studio AI runtime to canonical studio records.
- Seed established studios from the existing studio catalogue and current world values.
- Migrate active `NpcVentureState` companies into the same runtime without deleting founder history.
- Add company status: active, distressed, restructuring, dormant, sold/merged, or closed.
- Add deterministic strategy, competence, risk, development, production, finance, and commercial profiles.
- Add ledger, debt, runway, capacity, event history, decision history, and last-processed checkpoints.
- Add a single controller resolver for AI/player ownership.
- Add player-acquisition handoff scaffolding and exact-once transfer keys.
- Normalize malformed and legacy saves while preserving playable companies.
- Build the coordinator shell as a no-op for player-controlled studios.
- Keep legacy world generation temporarily behind a clear compatibility boundary.

## Existing systems reused

- `STUDIO_CATALOG` identities and archetypes;
- `ensureStudioEcosystem` migration entry point;
- acquisition, stock control, `StudioGroup`, and subsidiary operating models;
- deterministic random/ID helpers; and
- bounded Platform AI state patterns.

## Visible result

Forbes and industry views still show familiar studios, but every company now has stable strategy, finances, capacity, status, and history beneath the card. Generated studios appear in the same ecosystem instead of a separate venture tier.

## Completion gate

- Established and generated studios normalize into one schema.
- AI/player control resolves correctly.
- Player-controlled studios receive no Studio AI mutation.
- Same-week replay is a no-op.
- Cash/debt/runway summaries reconcile.
- Save/reload preserves state and deterministic decisions.
- No company is lost or duplicated during migration.

---

# Phase B2 — Script acquisition, development, and slate strategy

## Purpose

Make projects begin as material under consideration rather than finished releases.

## Development sources

- internally generated concept;
- internally developed script;
- script marketplace purchase;
- acquired book/game/real-story/other IP;
- sequel, prequel, spin-off, reboot, or franchise continuation;
- platform commission brief;
- output-deal obligation; and
- inherited project from an acquisition.

## Work

- Add canonical Studio AI development records with source, owner, genre, format, audience, language, stage, cost, and target dates.
- Reuse actor-neutral script, concept, IP, market-trend, and specialization definitions.
- Create development stages such as scouted, optioned, developing, draft-ready, packaged, abandoned, sold, and greenlit.
- Charge option, acquisition, writer, rewrite, research, and development costs through a ledger.
- Give development real weeks and persisted quality/uncertainty changes.
- Let studios maintain a bounded slate sized by capital, staff, and strategy.
- Evaluate portfolio gaps: genre repetition, format mix, budget mix, franchise exposure, prestige/commercial balance, and release cadence.
- Allow abandonment, turnaround sale, hold, rewrite, or continued development.
- Preserve script/IP ownership so one right cannot be sold or developed inconsistently.
- Feed platform commission briefs into the same pipeline without giving the producing studio profit rights it does not own.

## Player-visible examples

- “Northstar Pictures options a crime thriller.”
- “A24-like prestige studio places a troubled biopic into turnaround.”
- “A founder-backed venture develops two scripts but can finance only one.”
- “A commissioned drama brief is waiting for a suitable script package.”

Only material developments become News; routine drafts remain in diagnostics/company views.

## Completion gate

- Every future Studio AI project starts from a persisted development record.
- Development consumes time and money.
- Studios can reject or abandon weak material.
- Script/IP ownership conflicts are prevented.
- Slates reflect company strategy and capacity.
- No development rerolls on reload.

---

# Phase B3 — Greenlight, financing, capacity, and portfolio decisions

## Purpose

Make a greenlight a real corporate commitment with opportunity cost.

## Greenlight evaluation

The studio evaluates:

- script and IP confidence;
- genre/format/audience fit;
- budget suitability;
- available cash and runway after commitment;
- production/development capacity;
- talent package or realistic talent cost;
- distribution and marketing need;
- release congestion;
- Project A presale/output opportunities;
- sequel/franchise value;
- prestige and award value;
- downside exposure; and
- uncertainty shaped by competence.

## Financing sources

- studio cash;
- parent/company funding with a recorded transfer;
- debt with terms and repayment;
- outside investor capital with ownership or profit obligations;
- independent-project co-production;
- permitted Project A presales or output-deal funding;
- platform commission production funding; and
- tax/location incentives if a future location system supplies them.

Commissioned originals follow their contract: platform production money funds the film, the physical producer earns its producer fee, and the producer does not silently gain title/backend ownership.

Co-production may support independently owned Studio AI projects. It is not an automatic recovery button for a fully financed outsourced platform commission.

## Work

- Extract or share actor-neutral Greenlight budget, funding, casting, and estimated-quality calculators.
- Add saved greenlight alternatives and one persisted selected decision.
- Reserve money and production capacity at commitment time.
- Add project-level finance ledgers and exact ownership/economic shares.
- Enforce a runway floor unless strategy explicitly accepts distress risk.
- Allow defer, resize, seek finance, sell, or reject instead of always greenlighting.
- Apply slate fatigue and specialization to portfolio decisions, not as hard blocks.
- Make new studios choose achievable first slates based on their launch profile.

## Visible result

Studios announce fewer but more coherent projects. Large companies can sustain several productions when their runway and capacity support them; a flat arbitrary two-project cap is not used.

## Completion gate

- Every started production has a greenlight and funding lineage.
- No studio spends money it does not have or record.
- Capacity and runway affect choices.
- Commission budgets and producer fees remain separate.
- Finance sources reconcile exactly.
- AI can defer or cancel before production.

---

# Phase B4 — Talent packaging, physical production, and delivery

## Purpose

Turn a greenlit package into a dated, fallible production using the same physical world as player and platform projects.

## Talent model

Studios hire from the canonical talent pool using:

- ability and fame;
- role, genre, audience, and language fit;
- salary/backend demands;
- schedule load;
- overexposure;
- prior collaboration;
- prestige/commercial value; and
- studio/talent relationship.

Talent availability is load-aware, not a universal one-project lock. Actors and directors may work on multiple projects when their configured workload permits it. Excess load reduces availability or adds execution/quality risk rather than creating impossible silent duplication.

The existing rotating/refreshing talent-pool presentation can remain a player discovery mechanic. Canonical bookings, not whether a card is visible this week, determine AI availability.

## Physical production

The canonical path is:

Development/package

→ Greenlit

→ Talent contracted

→ Pre-production

→ Production

→ Post-production

→ Delivered

→ Awaiting release or rights window

## Work

- Create `industryProductions` from greenlight records rather than generating completed `IndustryProject`s.
- Reuse canonical production calendars and progress them weekly.
- Add milestone spending and payment idempotency.
- Reserve/release talent load through `talentBookings`.
- Reuse appropriate production crisis templates.
- Persist delays, overruns, financing holds, quality problems, and cancellation.
- Allow saved responses such as contingency funding, schedule delay, reduced marketing, hold, project sale/turnaround, or cancellation.
- Keep talent replacement/firing litigation out until the legal pack; use hold, rewrite, delay, or cancellation where necessary.
- Calculate final quality from concept/script, creative team, budget fit, development, execution, crisis decisions, and persisted variance.
- Connect Platform AI commissions to real Studio AI capacity and production competence.
- Keep player commission acceptance and player Greenlight/activity flows unchanged when the player's studio is the producer.

## Completion gate

- Every Studio AI original links to one canonical production.
- Talent load is valid and persisted.
- Production money is charged through milestones.
- Progress, delays, overruns, holds, and cancellations survive reload.
- Commissioned and independent projects preserve different ownership/economics.
- Player acquisition stops AI progression while preserving completed work.
- Delivery does not automatically create a theatrical release.

---

# Phase B5 — Marketing, theatrical scheduling, and box office

## Purpose

Make studio releases compete for audience attention, dates, screens, and revenue.

## Release strategy

Studios choose among strategies supported by the title's rights and format:

- limited theatrical;
- targeted theatrical;
- wide theatrical;
- event theatrical;
- festival/prestige launch;
- platform/streaming-only release;
- hybrid or later streaming window when contracts permit; and
- delay, sale, or hold.

Streaming originals never receive fake box office merely because a film was delivered.

## Work

- Add saved marketing plans, spend, campaign positioning, reach, and target audience.
- Reuse campaign-reach, marketing-reality, production-risk, release-timing, and presentation calculations.
- Build a deterministic release calendar with studio and title congestion.
- Let studios move dates based on competition, confidence, obligations, and cost.
- Replace instant lifetime box office with a canonical opening-and-legs lifecycle or equivalent saved weekly result model.
- Settle distributor/studio shares, marketing, participations, investor obligations, and debt exactly once.
- Apply word of mouth, quality, fame, IP, genre demand, audience fit, distribution, localization where relevant, and slate fatigue.
- Persist flop, solid, sleeper, hit, blockbuster, and prestige outcomes without guaranteed bands per studio.
- Feed canonical release results to Forbes, studio valuation, talent careers, awards, Platform AI sourcing, and Project A rights demand.

## Completion gate

- Every theatrical result has a release strategy, spend, date, and economic lineage.
- Competing releases affect one another without duplicate scheduling.
- Studio ledgers reconcile production, marketing, revenue, and obligations.
- Streaming-only projects have no theatrical box office.
- Replaying a release week cannot duplicate revenue, fame, news, or awards eligibility.

---

# Phase B6 — Rights sales, catalogue, franchises, and awards

## Purpose

Make post-production and post-release strategy continue beyond one box-office number.

## Streaming rights

Studio AI enters Project A as a real seller. It may:

- open or respond to a live bidding room;
- accept an upfront-heavy or backend-heavy structure;
- split compatible territories/windows;
- keep rights available when bids are weak;
- package catalogue titles;
- renew or let rights revert;
- resell only when allowed; and
- use relationship and realized economics in later negotiations.

The studio sees the same exact terms as the player-facing system internally, but its decision score remains private.

Future-output and multi-picture deals were removed from the Project A/Project B completion path on 2026-09-01. Platforms commission one real project at a time through the existing commissioning system; any broader partnership model remains deferred.

## Catalogue and franchise strategy

- Track catalogue value from actual owned/control rights.
- Identify sequel, prequel, spin-off, reboot, remake, and universe candidates.
- Consider audience demand, cast availability, quality, profitability, rights, fatigue, and strategic fit.
- Preserve franchise ownership and lineage.
- Allow libraries and IP to be sold during strategy shifts or distress through Project A/acquisition rules.

## Awards strategy

- Reuse canonical award eligibility and results.
- Let studios decide campaign focus and spend.
- Avoid creating separate Studio AI awards.
- Feed wins and nominations into prestige, talent demand, catalogue value, and later decisions.

## Completion gate

- All streaming transactions are Project A transactions.
- Catalogue packages contain real eligible titles.
- Renewal and backend settlements reconcile.
- Sequel/franchise projects link to owned rights and prior releases.
- Awards are canonical and not duplicated.
- A theatrical hit can still be a poor rights deal, and a modest theatrical title can gain long-tail value.

---

# Phase B7 — Weekly integration, ownership handoff, and observability

## Purpose

Make Studio AI the canonical rival-production simulation in the actual game loop.

## Replacement boundary

After parity and migration tests pass, retire the old paths that:

- pre-fill every week with two unexplained rival releases;
- generate completed projects through unpersisted randomness;
- give studios passive unexplained cash/valuation growth; and
- progress established studios and generated ventures through separate models.

Compatibility projections may remain for UI consumers, but they must read the new canonical state.

## Game-loop order

The shared weekly loop should:

1. process Platform AI once;
2. process Studio AI once;
3. let each system exchange only canonical commissions, productions, rights, money, releases, and events;
4. process awards and other world systems from final canonical records; and
5. publish bounded News/social-event facts.

The exact placement must avoid processing a commission, delivery, rights sale, or release twice when both coordinators touch it.

## Observability

### News

Publish only material events such as:

- studio launch or closure;
- major script/IP acquisition;
- important greenlight;
- major casting or talent competition;
- financing problem;
- delay, hold, overrun, project sale, or cancellation;
- major premiere;
- hit, flop, or sleeper success;
- important rights/package deal;
- franchise decision;
- awards push/win;
- distress, restructuring, acquisition, or recovery; and
- a meaningful repeated partnership.

Routine ledger entries remain in company diagnostics.

### Forbes and industry screens

Read canonical data for:

- valuation, cash, debt, and runway;
- active development and productions;
- recent releases and outcomes;
- catalogue/IP power;
- awards/prestige;
- specialization;
- ownership/controller;
- distress status; and
- generated-studio emergence.

Smaller studios may remain grouped in “Others” where an existing screen needs density control. If a studio grows past deterministic visibility thresholds, it becomes a named visible competitor without changing identity or losing history.

### Player acquisition

Acquiring a studio immediately routes control to existing Production House/Studio Group systems. The player receives its real slate, cash, debt, IP, rights, productions, bookings, and obligations. AI advantages stop.

## Completion gate

- Every AI studio processes once per week.
- Player-controlled studios receive no Studio AI mutation.
- Old random rival-release generation is removed from canonical progression.
- Old passive studio cash growth is removed.
- Established and generated studios use one coordinator.
- News and Forbes read canonical records.
- No duplicate commission, project, release, rights deal, award, or payment appears.
- Existing unrelated weekly systems remain green.

---

# Phase B8 — Long-run balance, scalability, and final verification

## Purpose

Prove that the studio industry remains varied, competitive, understandable, and technically stable over decades.

## Deterministic simulation matrix

Run multiple baseline, lean, boom, crowded, and adverse seeds for:

- 10 years;
- 25 years; and
- 50 years.

Track at minimum:

- active, launched, acquired, merged, distressed, rescued, dormant, and closed studios;
- development candidates, abandonment, greenlights, productions, holds, cancellations, and releases;
- production and marketing spend;
- financing mix, debt, investor obligations, cash, runway, and valuation;
- theatrical openings, totals, profits, hits, solid results, sleepers, and flops;
- streaming-rights bids, accepted deals, packages, renewals, expiry, guarantees, and backend;
- catalogue and franchise concentration;
- sequel quality/performance and fatigue;
- talent bookings, concurrent load, conflicts, and overexposure;
- awards nominations/wins and studio concentration;
- generated-studio launch maturity and survival;
- player-acquisition handoffs;
- duplicate IDs/events/releases/payments;
- News volume and history bounds;
- save size and runtime; and
- midpoint save/reload equivalence.

## Target behaviour

- Strong studios outperform weaker studios in aggregate, not every seed.
- Every long-lived studio can produce both successes and failures.
- New challengers sometimes break out and sometimes close.
- Not every new company starts from zero, and high-potential entrants have funded explanations.
- No studio survives only because of passive hidden income.
- A studio may become distressed, restructure, sell assets, be acquired, recover, or close.
- No studio wins every box-office or awards year.
- Studios do not all converge on the same genre, budget, talent, or release strategy.
- Talent load remains plausible without enforcing a one-project-only rule.
- Cash, debt, valuation, rights, and revenue never become NaN or infinite.
- Every material cash increase has an observable source.
- Save/reload produces the same final state.
- Player acquisition stops AI on the next weekly turn.

Exact hit/flop and survival bands should be proposed from initial calibration runs rather than copied blindly from Platform AI. They must be documented before tuning to avoid moving audit targets after seeing results.

## Tuning rules

Allowed tuning factors include:

- development volume and duration;
- greenlight thresholds;
- budget appetite;
- production/marketing costs;
- capacity and overhead;
- financing availability and rates;
- forecast accuracy;
- genre and audience demand;
- talent costs/load;
- release congestion;
- distribution strength;
- rights demand;
- sequel appetite and fatigue;
- distress thresholds; and
- company personality.

Do not tune with:

- hidden cash;
- guaranteed hits;
- artificial quality floors;
- silent infinite rescues;
- fake box office;
- duplicate streaming payouts;
- immunity for famous studios; or
- deletion of failed companies merely to keep screens tidy.

## Final verification

Run:

- all focused Studio AI phase audits;
- Project A full regression suite;
- Platform AI full regression suite;
- industry production and talent-booking audits;
- player Production House/Greenlight/finance/crisis audits;
- studio acquisition/group/subsidiary audits;
- theatrical/release/awards audits;
- weekly-loop idempotency audits;
- save migration and save-transfer audits;
- production build;
- targeted type checks or full type check when the repository baseline permits;
- source-integrity checks for forbidden random/parallel paths; and
- browser checks for the player-visible screens changed by the project.

## Completion gate

- Every focused audit passes.
- Approved long-run bands pass across the full seed matrix.
- Save/reload determinism passes.
- The build passes.
- No canonical Studio AI path uses unpersisted random IDs/outcomes.
- No hidden passive-cash system remains.
- No duplicate projects, releases, rights, payments, awards, or News events appear.
- Existing Platform AI, rights, player Production House, and acquisition flows remain intact.
- A final report records code changes, migration, tests, balance evidence, save/runtime measurements, and deferred work.

## Phase-by-phase implementation discipline

For each phase:

1. Reinspect the then-current code and dirty worktree.
2. Write a focused phase design that names the canonical records and replacement boundary.
3. Write an implementation plan with tests before production changes.
4. Observe a meaningful failing audit for the missing behaviour.
5. Implement only that phase.
6. Run focused regressions and build checks.
7. Review persistence, idempotency, acquisition, and duplicate-payment risks.
8. Report exactly what is complete and what remains.
9. Wait for user approval before the next phase.

Do not stage, commit, or push unless the user explicitly requests it at that time.

## First implementation task when Project B begins

Start with a fresh Phase B1 design and code audit. Do not begin by expanding `generateIndustryProject`.

The first engineering slice should prove:

- one established studio and one generated venture normalize into the same versioned Studio AI runtime;
- both process deterministically once per week;
- neither receives unexplained passive cash;
- player acquisition freezes only the acquired studio;
- current Forbes/public summaries still resolve; and
- save/reload produces identical state.

Only after that foundation is green should script development or autonomous greenlights be added.
