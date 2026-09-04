# Project B Phase B2 — Shared Statistical Intelligence Kernel Design

**Date:** 2026-09-02  
**Status:** Approved by the user on 2026-09-03  
**Programme:** Project B — Shared Industry Intelligence  
**Scope:** Shared AI-only decision kernel, scheduling, uncertainty, learning, controller safety, and shadow verification. B2 does not migrate the live streaming or studio creative pipelines.

## Purpose

B2 creates one deterministic statistical intelligence kernel for AI-controlled production studios and streaming platforms. It replaces neither company's canonical runtime and owns no cash, projects, rights, talent bookings, or releases. Instead, domain adapters present existing company facts to pure shared decision functions.

The governing rule is:

> Company statistics decide why and how strongly an AI company wants to act. Existing canonical systems execute material actions when their migration phase is enabled.

B2 runs this brain in shadow mode. Existing Platform AI and legacy studio creative behaviour remain authoritative until their B4–B6 replacements pass parity checks.

## Decisions already made

- AI-only companies use scheduled statistical decisions rather than invisible player-screen simulation.
- The shared kernel supports streaming platforms and production studios without flattening their different capabilities.
- Canonical systems remain authoritative for money, rights, talent, ownership, public projects, releases, and player interaction.
- Player-controlled companies never receive rival-AI mutation.
- Player delegation is a separate authority that may consult the same intelligence later but must execute through player-standard rules.
- Better competence improves forecast accuracy; it never creates a quality, commercial, or survival floor.
- No existing creative pipeline is retired in B2.

## Approaches considered

### Immediate full replacement

Replace existing Platform AI and studio generation as soon as the shared functions exist. This is rejected because one defect could silently alter bidding, commissions, releases, or long saves without a comparison baseline.

### One universal company score

Reduce every company to one strength rating and periodically roll an action. This is rejected because it cannot represent specialization, capability gaps, financial pressure, relationships, fatigue, or explainable strategy.

### Shared kernel with domain adapters and shadow comparison

This is the selected approach. A common normalized decision context drives shared scoring, scheduling, forecast error, learning, and explanations. Streaming and studio adapters provide domain-specific facts and options. B2 records bounded comparisons but executes no shadow action.

## Ownership boundaries

The following existing records remain authoritative:

- `WorldState.studios` for production-company identity and public company facts;
- each studio's `StudioAiRuntimeState` for B1 finance, capacity, controller, and company history;
- `WorldState.platforms` and `PlatformAiRuntimeState` for rival streaming-company facts;
- `WorldState.industryProductions` for physical productions;
- `WorldState.talentBookings` for named talent commitments;
- `WorldState.projects` for completed industry releases;
- `WorldState.streamingRightsContracts` for streaming rights;
- `WorldState.streamingBiddingSessions` for active rights auctions;
- existing finance ledgers for spendable balances and obligations; and
- existing player Production House, Streaming House, Studio Group, acquisition, and delegation systems for player-controlled operation.

B2 adds shared intelligence state inside the existing company runtime or as a normalized optional section linked to it. It does not add a parallel world-level company registry.

## Four-layer company model

### Identity

Identity changes slowly and describes what the company is trying to be:

- scale and launch class;
- strategy and risk tolerance;
- preferred genres, formats, audiences, languages, and markets;
- commercial versus prestige intent;
- franchise appetite;
- normal budget band;
- desired release cadence; and
- financial discipline and creative patience.

Existing Platform AI profiles and B1 studio profiles remain the source facts. The shared adapter normalizes them without replacing them.

### Capability

Capabilities use normalized finite values with domain-specific dimensions.

Production studios expose development, creative, production, finance, marketing, distribution, negotiation, and talent-relationship competence.

Streaming platforms expose content judgement, technology, catalogue management, localization, finance, discovery and marketing, negotiation, and market operations.

Capabilities affect option quality, forecast accuracy, safe scale, and execution expectations. Capability improvement is slow, diminishing, and supported by real results or completed investment.

### Current condition

Condition changes more quickly and includes:

- canonical cash, debt, obligations, runway, and spending pressure;
- free development, production, research, localization, and release capacity;
- momentum and recent-result strength;
- audience trust, catalogue need, and market opportunity;
- current genre, format, and franchise fatigue;
- overextension and operating burden;
- bilateral relationship strength; and
- competitive or strategic pressure.

Condition derives from current authoritative records. The kernel cannot create spendable cash or erase an obligation.

### Bounded learning memory

Memory retains decision-relevant aggregates only:

- recent genre, audience, market, localization, budget, and release results;
- commercial and prestige form;
- partner and talent outcomes;
- cancellations, delays, and turnaround outcomes;
- project-fingerprint summaries once B3 exists; and
- recent decision-family outcomes.

Memory uses bounded rolling samples and exponential summaries. It does not store every rejected option, narrative draft, or invisible meeting.

## Shared normalized decision context

Domain adapters construct an immutable `IndustryIntelligenceContext` for a company and entered absolute week. It contains:

- stable company ID, company kind, schema version, and deterministic seed;
- resolved controller;
- normalized identity, capability, condition, and memory views;
- canonical affordability and capacity ceilings;
- applicable decision lanes and their saved next-due weeks;
- active material commitments summarized by stable IDs; and
- the latest processed checkpoint.

The context is a calculation view, not a second save authority. Calculations must not mutate source records.

## Decision lanes and scheduling

Every company carries stable next-due weeks for applicable lanes:

- `CONTENT_STRATEGY`;
- `PRODUCTION_REVIEW`;
- `RELEASE_REVIEW`;
- `FINANCE_REVIEW`;
- `MARKET_EXPANSION`; and
- `CAPABILITY_GROWTH`.

Streaming platforms use all lanes where applicable. Production studios normally omit market-expansion and localization-specific options while retaining company growth and distribution choices.

The coordinator performs only constant-cost eligibility checks for a company whose lanes are not due. A due lane:

1. reads the immutable company context;
2. produces eligible domain options;
3. removes options blocked by hard rules;
4. scores the remaining options;
5. persists one decision proposal or an explained hold;
6. advances only that lane's next-due week; and
7. records the company/week/lane checkpoint exactly once.

Cadences derive deterministically from company scale, strategy, condition, and lane. Saved due weeks do not shift on reload. Processing the same lane for the same company and absolute week is a no-op.

## Eligibility before scoring

Hard constraints run before preference scoring. An option is ineligible when, as applicable:

- the company is player-controlled;
- the company cannot fund its fixed commitment or minimum runway protection;
- capacity is unavailable;
- spending restrictions block the decision family;
- required technology, language, market, or producer capability is absent;
- rights scope is impossible or conflicts with a canonical contract;
- a duplicate active commitment already exists; or
- the company is terminal or prohibited from new commitments.

An ineligible option cannot win because of strong strategy or a high random roll. The proposal retains bounded reason codes for important rejections.

## Option scoring

Eligible options use a common shape:

`need + strategy fit + expected upside + relationship value + competitive value - financial risk - capacity pressure - fatigue - execution risk`

Each term is normalized and finite. Domain adapters provide weights appropriate to the decision type rather than forcing research, localization, content, and finance into identical formulas.

Examples include:

- research scoring capability gap, strategic relevance, expected use, competitor pressure, cost, duration, and active-program burden;
- localization scoring market opportunity, language gap, catalogue relevance, audience demand, release pipeline, cost, lead time, and localization capacity;
- content scoring catalogue or slate need, identity fit, audience demand, novelty, budget suitability, capacity, and downside exposure; and
- finance scoring runway, debt service, commitments, momentum, distress duration, and recovery credibility.

Deterministic tie-breaking uses company ID, lane, option ID, decision cycle, and entered week.

## Forecast uncertainty

Every material proposal separates expected value from forecast error.

- Competence narrows the error distribution and improves calibration.
- Risk tolerance changes which uncertainty the company accepts.
- Creative, execution, commercial, prestige, and financial forecasts retain separate error components.
- Saved deterministic samples replace raw `Math.random()` and `Date.now()`.
- A high-competence company may still misjudge a project or market.
- A low-competence company may still find a breakout.
- Forecast skill never modifies the eventual canonical outcome to guarantee success.

Any uncertainty capable of affecting a later material action is saved before that action executes and cannot reroll after reload.

## Learning, momentum, and anti-snowball rules

Learning occurs only from resolved evidence, never from a proposal alone.

- Capabilities improve slowly through completed work or investment, with diminishing gains near the upper bound.
- Momentum reacts faster to recent results but cools toward a company-specific neutral level.
- Repeated genre, audience, format, or franchise use creates fatigue.
- Excess simultaneous commitments create overextension and forecast penalties.
- Larger scale increases opportunities and operating burden.
- Success cannot compound indefinitely into certain hits.
- Failure does not permanently destroy competence after one result.

All updates are clamped, finite, versioned, and idempotent. Learning histories remain bounded.

## Decision proposal and explanation contract

A shared proposal contains:

- stable decision ID and idempotency key;
- company ID, company kind, lane, decision cycle, and absolute week;
- proposed action family and domain option ID;
- urgency, confidence, expected exposure, and affordability ceiling;
- normalized score components;
- concise primary and secondary reason codes;
- deterministic uncertainty reference;
- status: shadow, proposed, accepted, rejected, executed, expired, or superseded; and
- next review week.

Reasons are machine-readable first and can later support player-facing explanation templates. Raw internal scores and hidden outcome samples are not exposed to players.

## Shadow and parity instrumentation

B2 operates in `SHADOW` mode for live creative decisions.

At the existing company decision boundary, the kernel receives the pre-action state and records what it would choose. The legacy system remains authoritative. The comparison layer records bounded facts:

- whether both systems acted or held;
- action family;
- timing and cadence difference;
- budget or exposure band;
- strategic reason family;
- affordability and eligibility agreement; and
- divergence category.

Shadow evaluation cannot create a project, transfer money, reserve rights, book talent, change subscribers, start research, localize content, or emit player-facing events. Instrumentation is bounded and can be removed or reduced after B4–B6 migration.

## Controller boundary and acquisition preparation

Controller resolution occurs before normalization, scheduling, scoring, or learning.

- A player-controlled company is skipped by the rival coordinator.
- Ownership handoff checkpoints prevent same-week double processing.
- Existing progress, facts, and mistakes remain unchanged.
- Future player delegation may request a recommendation from the kernel but executes through a separate player-standard authority.
- B2 does not grant AI cost, speed, rescue, or approval benefits to a player-owned company.

B2 preserves sufficient stable state for B4 and B7 to materialize active streaming work during acquisition, but it does not build the final takeover UI or complete streaming handoff in this phase.

## Integration with existing weekly progression

B2 adds one shared intelligence coordinator to the established weekly sequence without creating a second Process Week loop.

The safe order is:

1. normalize existing company runtimes and resolve ownership;
2. read the pre-decision authoritative state;
3. evaluate only due shadow lanes;
4. let the existing Platform AI or transitional studio path perform its authoritative work;
5. compare outcomes without executing the shadow proposal;
6. append bounded checkpoints and diagnostics; and
7. pass the resulting world through existing save preparation and integrity protection.

The implementation should reuse `services/deterministicRandom.ts`, `services/weekProcessingScheduler.ts`, Studio AI control/state normalization, Platform AI control/state normalization, and existing A8P/A8S save protections.

## Expected code organization

Shared code belongs under `services/industryIntelligence/` with focused modules for:

- normalized types and invariants;
- studio and streaming adapters;
- due-lane scheduling;
- scoring and deterministic forecast uncertainty;
- bounded learning and fatigue;
- proposal reasons and checkpoints;
- shadow comparison; and
- the weekly coordinator.

`types.ts` receives only persisted shared contracts that must cross service or save boundaries. Platform- and studio-specific formulas stay in their adapters. `services/gameLoop.ts` should receive only a narrow coordinator call rather than domain logic.

## Persistence and migration

- Shared intelligence state is versioned and optional for older saves.
- Missing state normalizes deterministically from existing company facts.
- Existing companies, projects, rights, bookings, payments, and history are never deleted or recreated.
- Due weeks derive once and are then persisted.
- Decision, comparison, and learning histories have explicit bounds.
- Compaction preserves active lane checkpoints, material proposal references, uncertainty used by active work, and controller handoffs.
- Save integrity includes schema version, controller, processed checkpoints, due lanes, and active material decision references.
- Export/import and save/reload retain identical next decisions.

## Player-visible behaviour in B2

B2 adds no player chore and no new management screen. Existing News, Forbes, bidding, commissions, releases, Production House, and Streaming House behaviour remains authoritative.

Shadow decisions and raw scores are development evidence, not player content. B3–B7 turn the shared intelligence into visible content variety, platform behaviour, studio slates, productions, acquisition handoff, and world presentation.

## Failure handling

- Non-finite or malformed optional stats normalize to bounded deterministic defaults.
- An invalid adapter result produces an explained hold and advances no material system.
- A missing canonical dependency makes the affected option ineligible; it does not fabricate an asset.
- A shadow failure cannot interrupt the authoritative weekly simulation.
- Duplicate company/week/lane keys are ignored.
- Controller ambiguity fails closed to no rival mutation.
- Diagnostics remain bounded and never become a second event authority.

## Verification strategy

Focused B2 audits must cover:

1. identical state and entered week produce byte-equivalent proposals;
2. same-week replay is a no-op;
3. only due company lanes perform material evaluation;
4. player-controlled companies receive no rival-AI mutation;
5. studio and streaming adapters produce finite normalized contexts;
6. affordability and other hard gates cannot be overridden by preference scores;
7. forecast error narrows with competence without creating an outcome floor;
8. strong companies outperform in aggregate while still producing failures;
9. momentum cools and capability growth diminishes;
10. fatigue and overextension constrain repeated strategies;
11. shadow proposals never change canonical money, rights, projects, talent, subscribers, research, localization, or releases;
12. bounded histories and save compaction preserve active evidence;
13. old-save normalization, save/reload, export/import, and deterministic resume pass;
14. existing Studio AI B1, Platform AI, Project A, acquisition, Production House, Streaming House, save-integrity, and weekly-performance audits remain green; and
15. the production build completes without B2-owned TypeScript diagnostics.

A focused long-horizon kernel audit measures statistical stability and scheduling cost. Full 10/25/50/100/400-year game certification remains B8.

## Explicit exclusions

B2 does not:

- generate complete content fingerprints, titles, scripts, or synopses;
- replace live Platform AI research, localization, market, bidding, commission, production, release, economy, or distress execution;
- create automatic production-studio slates or greenlights;
- materialize new public productions or talent packages;
- build the final streaming acquisition data room or inherited-project UI;
- expose raw AI stats or private company-status badges;
- add a new News, X, Instagram, or reaction-template system;
- change Project A contract, bidding, compatibility, expiry, package, resale, or Rights Office authority; or
- retire any legacy creative path before its later replacement passes parity.

## Completion gate

B2 is complete when:

- one shared deterministic kernel can evaluate both production studios and streaming platforms through domain adapters;
- the four-layer company model, decision lanes, due-week scheduling, uncertainty, learning, fatigue, explanations, and shadow comparison are persisted and save-safe;
- identical inputs reproduce identical decisions and same-week replay is a no-op;
- only due companies perform meaningful decision work;
- player-controlled companies receive no rival-AI mutation;
- strong companies perform better in aggregate without guaranteed success;
- stats remain finite, normalized, bounded, versioned, and explainable;
- shadow operation has zero canonical gameplay side effects;
- existing player-facing systems and canonical outcomes remain unchanged; and
- focused audits, adjacent regressions, persistence checks, performance checks, and the production build pass.

After B2 completion, B3 may build compact content fingerprints on top of this kernel. Streaming Platform AI migration remains B4.
