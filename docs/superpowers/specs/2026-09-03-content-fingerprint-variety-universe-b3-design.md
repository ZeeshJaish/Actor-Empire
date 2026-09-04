# Content Fingerprint, Variety, and Universe Blueprint B3 Design

**Date:** 2026-09-03  
**Status:** Approved for implementation  
**Roadmap phase:** Project B3  
**Scope:** Private AI content intentions, variety control, suitable-budget modelling, universe blueprints, and lazy canonical materialization

## Decision

B3 adds a deterministic, stats-driven content layer to the shared B2 intelligence kernel. AI companies will consider compact content fingerprints rather than executing the player's script, marketplace, Greenlight, and production screens invisibly.

The phase is shadow-only. It records what the new intelligence would select, but it does not spend money, acquire rights, book talent, create public projects, alter releases, or change player-visible outcomes. B4-B7 will activate those boundaries progressively.

## Authority boundaries

- `WorldState.universes` remains the sole canonical registry for public universes.
- Project A remains the sole authority for exact rights eligibility, contracts, bidding, transfers, renewals, settlement, and territorial conflicts.
- Existing project, production, talent, finance, release, IMDb, box office, Streaming House, and Production House systems remain canonical after materialization.
- B3 state is private intelligence memory only. It may explain or prepare a future action, but cannot independently execute it.
- Player-controlled companies never receive the AI shortcut. Their existing workflows and delegated Command Centre rules remain unchanged.

## Content fingerprint

A selected private intention stores only decision-relevant facts:

- deterministic fingerprint ID and seed;
- owner company ID and company kind;
- format: movie, series, or limited series;
- primary genre and optional secondary genre;
- subgenre, tone, theme, setting, and period;
- target audience, original language, and priority market;
- commercial intent, prestige intent, creative risk, and star-power target;
- intended release path and source intent;
- standalone, sequel, prequel, reboot, spin-off, universe-entry, crossover, or event relationship;
- suitable budget curve;
- novelty signature and novelty score;
- creation week and decision cycle;
- lifecycle status; and
- optional canonical project, universe, or source-right identifiers once materialized.

Rejected candidates exist only during one deterministic evaluation and are never written to the save. Each due content decision considers exactly six candidates. Only one selected candidate can be persisted for a decision key.

## Source intents

The supported source intents are original, internal development, platform original, individual commission, licensed work, acquired IP, sequel, prequel, reboot, spin-off, universe entry, universe crossover, universe event, and inherited work.

Source intent is descriptive until an existing canonical system validates the actual boundary. Licensed and acquired-IP material cannot materialize without an eligible source-right reference. B3 never manufactures rights.

## Determinism and identity

All IDs, candidate choices, budget curves, novelty results, and universe decisions derive from the saved company seed, company ID, content decision cycle, absolute week, and candidate index. B3 must not use `Math.random`, wall-clock time, array insertion order, or transient UI state.

Reprocessing the same due decision is idempotent. A materialized fingerprint retains the same ID and seed, so later detail generation may add a title, synopsis, cast, or schedule without changing previously resolved facts.

## Variety and novelty

Each company keeps a bounded rolling memory of selected fingerprints. The engine compares a candidate against:

- the company's recent selected slate;
- the bounded recent selections of other B2 companies supplied as global context;
- repeated genre and subgenre combinations;
- repeated tone/theme combinations;
- repeated setting, audience, language, and release-path combinations;
- repeated sequel or universe patterns; and
- exact novelty signatures.

Exact duplicates are blocked. Near-duplicates receive a weighted penalty. Recent repetition is penalized more heavily than older repetition. Intentional franchise or universe continuity may reuse its anchor identity, but still accumulates fatigue if cadence, branch, genre, or audience variety is weak.

The save retains selected fingerprints only, capped at 24 per company. No unbounded title-template, candidate, or comparison history is added.

## Suitable-budget curve

Each fingerprint stores four ordered values in millions: minimum viable, ideal low, ideal high, and ambitious maximum. The curve derives from format, scale, star-power target, production demands, market ambition, creative risk, and the company's financial ceiling.

Funding below minimum harms execution sharply. Funding inside the ideal range is efficient. Funding above ideal high has diminishing creative benefit and rising downside. Spending above ambitious maximum has no automatic quality guarantee. B3 calculates and stores the curve but does not spend funds.

## Universe blueprint

A universe blueprint is a private, bounded intention. It stores:

- deterministic blueprint ID and seed;
- owner company ID and company kind;
- anchor fingerprint ID;
- core world signature and creative pillars;
- supported formats and branch families;
- current saga and phase labels;
- planned cadence and financial scale;
- crossover potential, confidence, momentum, and fatigue;
- lifecycle state: planned, emerging, active, paused, retired, failed, or materialized; and
- optional canonical universe ID.

Two paths can create a blueprint:

1. **Planned:** a capable, financially stable company deliberately selects a rare universe-founding candidate.
2. **Emergent:** repeated compatible successes may later justify converting an existing fingerprint family into a blueprint.

B3 implements planned and emergent evaluation primitives, but shadow mode does not publish or activate a universe. Founding is uncommon and fallible. It requires sufficient creative/production capability, franchise appetite, runway, capacity, novelty, and a valid ownership or rights basis. The anchor may fail; a blueprint may pause, retire, or never materialize. A universe event requires established branches, audience familiarity, capacity, and tolerable fatigue.

## Canonical universe bridge

The existing `Universe` contract gains optional owner-company metadata, blueprint identity, and origin-fingerprint identity while preserving `studioId` for compatibility. A pure materialization bridge can build a deterministic canonical-universe draft only when an activation phase supplies a valid eligible owner and anchor.

The bridge does not insert into `WorldState.universes` during B3. When a later phase activates it, insertion must use the blueprint ID as an idempotency key and may not create a duplicate public universe.

## Lazy materialization

A selected fingerprint stays compact until one of these boundaries requires canonical detail:

- public announcement;
- named talent attachment or booking;
- player hire or player-studio commission;
- player-controlled acquisition, sale, or licence;
- inter-company money transfer;
- public production commitment;
- release scheduling;
- IMDb, box office, streaming-result, awards, or permanent-history entry; or
- ownership transfer while work remains active.

The B3 bridge returns deterministic materialization drafts and eligibility reasons. It performs no public mutation. External source intents fail closed without source rights. Previously materialized IDs remain stable.

## B2 shadow integration

When an AI company's due `CONTENT_STRATEGY` proposal selects `DEVELOP_CONTENT`, B3 generates the six ephemeral candidates, evaluates novelty and suitability, persists the winning fingerprint, and optionally creates or updates one private blueprint. Other B2 lanes do not generate content.

Content selection is skipped for player-controlled and terminal companies, skipped for HOLD proposals, and idempotent for a processed content decision. The authoritative Studio AI and Platform AI paths continue unchanged.

## Persistence and performance

Per company, B3 retains at most:

- 24 selected fingerprints;
- 6 universe blueprints;
- 48 recent novelty signatures; and
- 64 materialization keys.

Normalization migrates absent or malformed B3 state to safe defaults and removes rejected/oversized history. Save compaction applies the same bounds. Footprint reporting includes B3 counts and bytes.

The long-run audit covers 20,800 weeks, multiple company identities, deterministic replay, no exact duplicates inside the recent window, bounded state, rare/fallible universe creation, and unchanged canonical gameplay projections.

## Player-visible impact

B3 itself adds no new screen or raw AI label. The player continues to use the existing Development Lab, script marketplace, Greenlight wizard, Production House, Streaming House, bidding room, franchise/universe surfaces, and acquisition flows.

Its later impact is stronger variety and causal continuity: AI companies can develop recognizable genres and formats, avoid endless template repetition, originate or abandon long-running universes, and eventually materialize credible projects without simulating every hidden player interaction.

## Completion gate

B3 is complete only when:

- private content decisions persist compact selected fingerprints and never rejected pools;
- IDs and selections replay deterministically;
- exact duplicates are blocked and near-duplicates are penalized;
- every fingerprint has a valid ordered suitable-budget curve;
- planned and emergent universe blueprints are possible but rare and fallible;
- `WorldState.universes` remains the only canonical public universe registry;
- lazy materialization is stable and fails closed for missing rights;
- player-controlled companies and all canonical gameplay outcomes remain unchanged in shadow mode;
- normalization, compaction, and save integrity preserve B3 state within fixed bounds; and
- focused audits, existing universe regressions, B2 regressions, build, and the 20,800-week endurance audit pass.
