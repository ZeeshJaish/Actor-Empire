# Global Streaming Ecosystem and Emergent Companies

**Date:** 2026-08-27

**Status:** Proposed after repository audit; awaiting user approval before implementation

**Parent phase:** Competitive Streaming Platform AI Phase 4 extension

## 1. Outcome

The streaming world will stop looking as if five global companies are the only services that exist.

Each supported country will have a believable market made from:

- the five existing deeply simulated global rivals;
- important real regional or national streaming services;
- a single `Others` segment for small services that do not yet deserve individual screen space;
- fictional services that can launch during a save at very different starting strengths;
- promotion and demotion rules that make a growing company become individually visible, or a declining company fall back into `Others`.

The extension also makes two bounded improvements to the existing NPC production-house system:

1. saved NPC-venture decisions become deterministic rather than depending on `Math.random()` and `Date.now()`; and
2. qualified NPC ventures can become physical producers for Platform AI commissions instead of producer selection being limited to the static studio catalogue.

This is a simulation extension, not a visual redesign. Existing compact country cards, market reports, rival summaries, Platform Wars surfaces, and Forbes studio rankings remain the presentation language.

## 2. Repository findings that shape the design

### 2.1 The five core platforms are a closed deep-simulation set

`PlatformId` is currently:

```ts
'NETFLIX' | 'APPLE_TV' | 'DISNEY_PLUS' | 'HULU' | 'YOUTUBE'
```

That assumption appears in Platform AI profiles, turn order, rights validation, acquisitions, the owned-platform competitive world, settlement, analytics, and UI colour maps. Adding twenty regional companies directly to `PlatformId` would force an unsafe rewrite across unrelated phases.

Therefore this extension does **not** widen `PlatformId` and does **not** put every regional service into `world.platforms`.

### 2.2 Regional rivals are currently presentation-only data

The 24 canonical launch markets already contain rival names and stable watch-share values, but their rival ID union only supports the existing globals plus Prime Video. The values are deliberately game-world estimates rather than live market-share claims.

The new ecosystem will become the source of the market rival read model while preserving stable, deterministic game balance.

### 2.3 Production houses already have the requested launch depth

The existing NPC-venture system already provides:

- celebrity or director founders;
- five studio archetypes;
- starting capital ranging from a credible small company to a well-funded entrant;
- reputation, hype, creative quality, risk, valuation, cash, projects, hits, flops, closure, news, and player role offers;
- injection into `world.studios` and automatic inclusion in Forbes rankings.

It already satisfies the requirement that a new production house need not start at level zero. Rebuilding that system would create duplicate state. Only the two improvements named in section 1 are included.

## 3. Approaches considered

### Approach A — Add every service to `PlatformId` and `world.platforms`

**Advantage:** every company could immediately use all current rights, production, research, distress, and acquisition code.

**Rejected because:** the current domain assumes a fixed five-company union in too many places. This would turn a focused ecosystem feature into a risky cross-game migration and would make weekly simulation unnecessarily heavy.

### Approach B — Keep regional services as static names in country fixtures

**Advantage:** smallest code change.

**Rejected because:** companies could not launch, grow, decline, change visibility, expand, or become meaningful competitors. It would preserve the exact shallowness this feature is intended to remove.

### Approach C — Separate ecosystem state with bounded deep simulation

**Chosen.** A new canonical ecosystem owns regional companies, dynamic entrants, per-country presence, visibility, and light company progression. The existing five platforms remain the fully simulated `PlatformState` companies. Read-model adapters combine both layers wherever the player needs to see the market.

This preserves current contracts while allowing an unlimited identity space and a bounded amount of weekly work.

## 4. Canonical data model

`WorldState` gains one optional normalized field:

```ts
streamingPlatformEcosystem?: StreamingPlatformEcosystemState
```

### 4.1 Ecosystem state

```ts
interface StreamingPlatformEcosystemState {
  schemaVersion: number;
  lastProcessedAbsoluteWeek: number;
  launchSequence: number;
  operators: Record<string, StreamingEcosystemOperator>;
  markets: Record<string, StreamingEcosystemMarket>;
  eventHistory: StreamingEcosystemEvent[];
}
```

The state is normalized from stable seed definitions plus saved progress. Seed definitions are never mutated at runtime.

### 4.2 Operator identity

```ts
type StreamingEcosystemOperatorKind =
  | 'CORE_GLOBAL'
  | 'REGIONAL_REAL'
  | 'DYNAMIC_FICTIONAL';

type StreamingEcosystemOrigin =
  | 'BOOTSTRAPPED'
  | 'VENTURE_BACKED'
  | 'TELECOM_BACKED'
  | 'BROADCASTER_BACKED'
  | 'STUDIO_SPINOFF'
  | 'TECH_BACKED'
  | 'CONGLOMERATE_BACKED'
  | 'CELEBRITY_FOUNDED';

type StreamingEcosystemLifecycle =
  | 'ACTIVE'
  | 'DISTRESSED'
  | 'ACQUIRED'
  | 'CLOSED';

interface StreamingEcosystemOperator {
  id: string;
  name: string;
  kind: StreamingEcosystemOperatorKind;
  corePlatformId: PlatformId | null;
  origin: StreamingEcosystemOrigin;
  homeCountryId: string;
  lifecycle: StreamingEcosystemLifecycle;
  foundedAtAbsoluteWeek: number;
  cashMillions: number;
  valuationBillions: number;
  subscriberMillions: number;
  technology: number;
  cataloguePower: number;
  localization: number;
  brandPower: number;
  prestige: number;
  efficiency: number;
  risk: number;
  preferredGenres: Genre[];
  languageCapabilities: PlatformAiLanguageCapability[];
  activeCountryIds: string[];
  marketMomentum: Record<string, number>;
  consecutiveStressWeeks: number;
  lastMaterialChangeAtAbsoluteWeek: number;
}
```

The exact persisted fields may be split into smaller interfaces during implementation, but the information and ownership boundaries above are mandatory.

### 4.3 Country market state

```ts
interface StreamingEcosystemMarketShare {
  operatorId: string;
  sharePercent: number;
}

interface StreamingEcosystemMarket {
  countryId: string;
  shares: StreamingEcosystemMarketShare[];
  othersSharePercent: number;
  visibleOperatorIds: string[];
  lastRebalancedAtAbsoluteWeek: number;
}
```

Rules:

- named shares plus `othersSharePercent` equal exactly 100.00 after canonical rounding;
- there is no persisted fake `OTHERS` company;
- `Others` is the residual of active companies below the visibility threshold plus unmodelled local services;
- market share cannot become negative;
- re-running the same week is idempotent;
- opening the UI never changes state.

## 5. Initial real-world roster

The initial roster is curated to make the game's 24 existing country markets feel local without pretending to provide live market-share data.

| Market group | Named local or regional operators |
| --- | --- |
| Canada | Crave |
| Mexico and Spanish-speaking Latin America | ViX |
| Brazil | Globoplay |
| United Kingdom | NOW, ITVX |
| Germany | RTL+ |
| France | CANAL+ |
| Spain | Movistar Plus+ |
| Italy | RaiPlay |
| South Africa and sub-Saharan Africa | DStv Stream, Viu where applicable |
| Egypt and Arabic-language market | Shahid |
| India | JioHotstar, ZEE5, Sony LIV |
| Japan | U-NEXT, ABEMA |
| South Korea | TVING, Wavve, Coupang Play |
| Indonesia | Vidio, Viu |
| Thailand | TrueID, Viu |
| Philippines | iWantTFC, Viu |
| Australia | Stan, Binge |
| New Zealand | Neon, TVNZ+ |

Prime Video remains a seeded global market rival even though it is not one of the current five deep Platform AI companies. It uses the same ecosystem representation as other non-core operators until a later dedicated deep-AI expansion explicitly promotes it.

Important constraints:

- These names establish believable identity and geographic fit.
- All starting shares, cash, subscribers, technology, and catalogue scores are stable game-design values.
- No save changes because a real-world subscriber report or market-share article changes.
- Closed or renamed real services are not preserved merely for nostalgia.
- Seed data is versioned so a later roster correction can migrate safely without overwriting saved progress.

## 6. Visibility and the `Others` system

Visibility is calculated separately per country and globally.

### 6.1 Country relevance score

Each active operator receives a deterministic country score from:

- current country share;
- local subscriber scale;
- recent momentum;
- home-market bonus;
- catalogue and local-language fit;
- active original or sports/event pressure;
- brand power;
- distress penalty.

The market normally exposes:

- up to four major global operators;
- up to three named local/regional operators;
- the player platform when active in that country;
- one `Others` row.

The caps are presentation caps, not simulation deletion. A market can contain more operators than it displays.

### 6.2 Promotion

An operator leaves `Others` and becomes named when it satisfies either:

- at least 4% country share for four consecutive processed weeks; or
- at least 2.5% share plus top-three momentum for eight weeks; or
- a deterministic major-launch event puts it above the entry threshold.

Promotion requires a free local visibility slot or a score high enough to displace the lowest named non-core operator. Core globals are never hidden by the local cap.

### 6.3 Demotion

A named non-core operator returns to `Others` when:

- it remains below 1.5% country share for twelve weeks; or
- it closes or exits the country.

A hysteresis gap between promotion and demotion prevents week-to-week flicker.

### 6.4 Global visibility

A regional or fictional operator becomes visible on global rival surfaces when it has:

- active presence in at least three countries; and
- either 12 million subscribers, a $2 billion valuation, or top-two position in two markets; and
- no terminal lifecycle state.

This is the moment the game begins treating it as a recognizable challenger “like Netflix” in summaries and Platform Wars presentation. It still does not become a `PlatformId` or silently gain every deep Platform AI subsystem.

## 7. Dynamic fictional streaming launches

### 7.1 Launch cadence and bounds

The weekly processor may create a fictional service only when:

- the global launch cooldown has passed;
- fewer than 24 active non-core operators exist;
- fewer than four fictional operators are globally visible;
- the chosen home market has room for new competition;
- the deterministic launch probability succeeds.

Normal cadence is one launch opportunity every 26 weeks, with an expected successful launch approximately every 52 to 104 weeks. The exact result is save-seeded and replayable.

Closed companies remain in compact event history, while only a bounded number of complete operator records are retained.

### 7.2 Starting strength is origin-driven

A launch does not always start from zero.

| Origin | Typical starting character |
| --- | --- |
| Bootstrapped | one market, low cash, narrow genre, high risk, potentially strong creative identity |
| Venture-backed | more cash, growth pressure, weak catalogue, aggressive expansion |
| Telecom-backed | strong distribution and billing, moderate catalogue, strong home-market entry |
| Broadcaster-backed | deep local catalogue and brand, moderate technology, strong home language |
| Studio spinoff | strong originals and prestige, weaker product and subscriber operations |
| Tech-backed | strong technology and cash, weak catalogue identity, fast research |
| Conglomerate-backed | high capital, multiple starting capabilities, lower initial efficiency |
| Celebrity-founded | high launch attention and brand, volatile cash and strategy |

Founders and backers affect initial cash, research, catalogue, language capability, markets, and risk. A conglomerate-backed or broadcaster-backed company can enter as a credible local leader. A bootstrapped specialist can remain tiny or grow through excellent results.

### 7.3 Names and identities

Fictional company names come from region-aware prefix/suffix sets, checked against every existing operator and production house. Identity generation uses a deterministic ID and RNG keyed by:

```text
player id + ecosystem schema + launch sequence + absolute week + home country
```

Names, origin, capabilities, and starting values are persisted immediately and never rerolled on reload.

## 8. Weekly operator simulation

The ecosystem processor runs once per absolute week after the five core Platform AI turns and before player-facing rival presentation is derived.

### 8.1 Light simulation for non-core operators

Regional and fictional operators receive a bounded company turn:

1. calculate revenue from subscribers, ad mix, and home-market strength;
2. charge catalogue, technology, localization, market, and operating costs;
3. update runway and stress;
4. choose at most one strategic action;
5. resolve small deterministic market-share movement;
6. evaluate promotion, demotion, distress, expansion, acquisition, or closure;
7. append only material events.

Possible strategic actions are:

- strengthen the home market;
- commission or license a lightweight catalogue investment;
- improve one technology or localization capability;
- enter one eligible country;
- retreat from an unprofitable country;
- conserve cash;
- seek backing;
- pursue an acquisition or accept acquisition when a later compatible buyer exists.

This layer does not create full `PlatformAiContentPlan`, physical productions, rights contracts, or localization jobs for every tiny company. Those expensive records remain reserved for the five core platforms and specifically material interactions.

### 8.2 Decision quality

The action score considers:

- runway after commitment;
- home-market defence;
- catalogue gap;
- technology and localization blockers;
- regional language fit;
- competition and addressable audience;
- company origin and risk;
- recent results;
- expansion load.

Competent companies make better choices but do not receive guaranteed growth, free cash, or a quality floor.

### 8.3 Market movement

Country share movement is a constrained transfer rather than independent growth for every company.

- Positive moves take share proportionally from `Others` and weaker visible rivals.
- Negative moves return share to `Others` and stronger competitors.
- One company cannot gain more than a bounded amount in one ordinary week.
- Major events have a higher but still capped movement.
- Canonical rounding assigns any remainder to `Others` so totals stay exact.

## 9. Interaction with existing deep systems

### 9.1 Read-model adapter

UI and analytics consume a shared summary rather than indexing `world.platforms` directly:

```ts
interface StreamingCompanySummary {
  id: string;
  name: string;
  kind: 'CORE' | 'REGIONAL' | 'DYNAMIC' | 'OTHERS' | 'PLAYER';
  countryId?: string;
  sharePercent?: number;
  subscribersMillions?: number;
  valuationBillions?: number;
  momentum?: number;
  lifecycle?: StreamingEcosystemLifecycle;
  corePlatformId?: PlatformId;
}
```

Selectors include:

- `getVisibleStreamingCompaniesForMarket(player, countryId)`;
- `getVisibleGlobalStreamingCompanies(player)`;
- `getStreamingCompanySummary(player, operatorId)`;
- `getStreamingOthersShare(player, countryId)`.

Existing market cards and summaries migrate to these selectors. No UI component performs visibility calculations itself.

### 9.2 Bidding and rights boundary

The five core platforms remain the only automatic participants in the full active bidding, contract, royalty, distress, acquisition, and commissioning systems during this extension.

Regional and fictional operators may appear as market competitors and world companies, but they do not create invalid `PlatformId` values in a rights contract. A later dedicated rights-participant generalization can give promoted challengers full bidding access after contract-party IDs are safely decoupled from `PlatformId`.

This boundary is deliberate: visual/global relevance is not the same as silently pretending every small operator has a complete Platform AI runtime.

### 9.3 Research and localization

Non-core operators store compact capability levels and languages compatible with Phase 4 definitions. Their strategic improvements use the same definition IDs and requirement concepts, but not the full multi-stage project records unless they later receive deep simulation.

Core-platform and player research behaviour is unchanged.

### 9.4 Acquisition handoff

No new player acquisition flow is added in this extension. If a later feature lets the player acquire a regional or fictional service, it must first materialize that company into an owned-platform-compatible state and remove all AI efficiencies. Saved progress, debt, markets, capabilities, and mistakes must remain.

## 10. Production-house improvements

### 10.1 Preserve the existing launch model

NPC production ventures retain their current founder eligibility, archetypes, financial ranges, project lifecycle, closure, news, role offers, studio synchronization, and Forbes placement.

No second production-company registry and no production-house `Others` aggregation will be added.

### 10.2 Deterministic NPC venture processing

All saved-world decisions in `npcVentureLogic.ts` will move from raw `Math.random()` and `Date.now()` to deterministic helpers.

Stable seeds include the player ID, absolute week, venture ID, action name, and an explicit sequence where multiple rolls are required. IDs use `createDeterministicId`.

Required properties:

- the same save and week produce the same launch, project, result, and news ID;
- processing the same absolute week twice makes no second launch/project/payment;
- reload cannot reroll a hit into a flop;
- existing venture IDs and history remain valid;
- legacy ventures gain only missing progression markers through preserve-first migration.

### 10.3 NPC ventures as Platform AI producers

`selectPlatformAiProducer` will evaluate two candidate sources:

1. the static `STUDIO_CATALOG`; and
2. active `world.studios` records where `isNpcVenture === true` and the linked venture is active.

A dynamic venture is eligible only when:

- it is AI-controlled;
- it is active and solvent enough to accept the job;
- its reputation and creative quality exceed minimum thresholds;
- it has capacity for the project;
- its archetype fits the genre and budget;
- it is not already overloaded by active canonical industry productions.

Its score uses the same relationship, genre, budget, track-record, capacity, cost, and deterministic tie-break concepts as static studios. Missing static catalogue fields are derived through one adapter from the venture's archetype and saved state.

Commissioning continues to create one canonical `IndustryProductionCommitment`, use real talent bookings, charge milestones, and obey player-acquisition handoff rules. The dynamic producer receives a physical-production fee/cash benefit through the existing commitment settlement boundary; no duplicate film is created in its autonomous project loop.

## 11. UI behaviour

### 11.1 Country and launch surfaces

Existing country cards keep their compact layout. Their rival section displays:

- recognizable global rivals;
- the strongest local names;
- `Others` as the last row;
- stable percentages from canonical ecosystem state.

The list must never overflow the current card density. A details view may show additional named operators when one already exists; no new modal is required solely for this extension.

### 11.2 Global rival surfaces

Platform Wars, analytics summaries, and relevant market desks use the global selector. Newly qualified challengers appear with:

- company name;
- home-country marker;
- subscribers or reach;
- momentum;
- a compact `Regional power` or `Rising platform` descriptor.

Core-platform cards retain their richer actions. Non-core cards must not expose buttons for unsupported deep actions.

### 11.3 Production houses

Forbes already shows NPC ventures and remains the canonical company list. A venture that wins a Platform AI commission receives a compact current-project or recent-commission fact through its existing studio profile data if that profile has an appropriate slot. No Forbes redesign is required.

### 11.4 News and social reactions

Only concise existing-style industry news is included for material company events such as launch, promotion to visible challenger, major expansion, acquisition, distress, or closure. The previously deferred large News/X reaction-template engine remains deferred until the streaming platform feature set is complete.

## 12. Persistence, migration, and compaction

### 12.1 Normalization

`normalizeStreamingPlatformEcosystem` must:

- create versioned seed state when missing;
- preserve valid saved operator values;
- add newly introduced real operators without replacing saved companies;
- reject unknown market IDs but preserve valid future operator string IDs;
- deduplicate country lists and capabilities;
- clamp financial, capability, and share values;
- repair market totals deterministically;
- remain idempotent.

### 12.2 Save migration

New saves start with the complete roster and balanced market state.

Legacy saves receive ecosystem state from the current stable country-rival fixtures, then gain local operators and `Others` without altering the player's money, owned streaming state, existing five platform states, rights, bids, or projects.

### 12.3 Save bounds

- operator history is bounded;
- event history is bounded;
- closed operators are compacted after a retention window;
- country share snapshots are not stored every week when there is no material change;
- selectors derive presentation data rather than persisting duplicate cards.

`saveCompaction.ts` and save-transfer validation must explicitly retain the new canonical field.

## 13. Error handling and safety

- Missing ecosystem state normalizes rather than crashing.
- An invalid operator cannot enter a market that is absent from the 24-country catalogue.
- A closed operator cannot receive positive share or a new action.
- The core five summaries resolve from authoritative `world.platforms`; ecosystem mirrors cannot overwrite their cash, AI state, or ownership.
- `Others` cannot be selected as a bidder, acquisition target, producer, or rights party.
- Dynamic identities never cast to `PlatformId`.
- Player-owned company state wins over any rival read model.
- No implementation step may overwrite the large unrelated dirty worktree.

## 14. Test-driven implementation slices

Every implementation slice begins with a focused failing assertion and ends with fresh green evidence.

### Slice 1 — Types, seeds, and normalization

RED assertions:

- a legacy world has no ecosystem and fails to expose JioHotstar in India;
- normalization is not yet idempotent;
- country totals do not yet include `Others` at exactly 100%.

GREEN behaviour:

- versioned seed roster exists;
- every supported country normalizes;
- exact totals, bounded values, and idempotence pass.

### Slice 2 — Visibility selectors

RED assertions:

- small operators are not grouped;
- promotion/demotion hysteresis is absent;
- global challenger qualification is absent.

GREEN behaviour:

- capped local display, `Others`, promotion, demotion, and global summaries pass.

### Slice 3 — Deterministic weekly ecosystem

RED assertions:

- dynamic launches and weekly moves do not exist;
- reprocessing can mutate twice;
- save/reload parity is absent.

GREEN behaviour:

- origin-based launches, light company turns, exact share transfer, distress/closure, idempotence, and resume parity pass.

### Slice 4 — Existing UI adapters

RED assertions:

- market cards still read static fixture rivals;
- global surfaces cannot show qualified non-core challengers.

GREEN behaviour:

- current compact surfaces consume selectors and distinguish supported card actions.

### Slice 5 — NPC production-house determinism

RED assertions:

- raw random/time decisions reroll a venture launch or project;
- the same week can create duplicate venture work.

GREEN behaviour:

- launch, progression, project, result, news, and IDs are deterministic and exactly once.

### Slice 6 — NPC venture producer eligibility

RED assertions:

- a strong fitting active NPC venture cannot be selected;
- closed, player-controlled, insolvent, or overloaded ventures can leak into the pool.

GREEN behaviour:

- eligible ventures compete fairly with static studios;
- all exclusion cases and canonical production invariants pass.

### Slice 7 — Persistence and integration

RED assertions:

- save compaction/transfer loses ecosystem state;
- weekly game integration processes in the wrong order or twice.

GREEN behaviour:

- migration, compaction, transfer, weekly order, and focused adjacent audits pass.

## 15. Verification

Completion requires fresh evidence for:

- a new focused global-streaming-ecosystem audit;
- ecosystem normalization and exact 100% market totals;
- deterministic dynamic-company launch and save/reload parity;
- local visibility and `Others` promotion/demotion;
- global challenger promotion;
- no dynamic ID entering a `PlatformId`-only contract;
- deterministic NPC production ventures;
- dynamic producer eligibility and rejection cases;
- existing Platform AI Phase 4 audit;
- active bidding and contract audits;
- Platform AI production and talent-booking audits;
- living studio ecosystem and Forbes profile audits;
- save migration, compaction, and transfer audits;
- production build;
- `git diff --check`;
- browser verification of India, at least one other region, `Others`, a promoted fictional challenger, and an NPC venture commission.

Any unrelated pre-existing audit drift must be reported separately and cannot be represented as caused or fixed by this work.

## 16. Completion criteria

This extension is complete when:

- all 24 existing country markets expose believable global, local, and `Others` competition;
- the initial real regional roster persists and migrates deterministically;
- fictional platforms can launch with origin-dependent non-zero potential;
- non-core companies grow, expand, decline, close, and change visibility without bloating the save;
- qualified challengers become visible on global rival surfaces;
- the five core platforms remain authoritative and all existing deep systems keep valid `PlatformId` values;
- the player UI remains compact and does not expose unsupported actions;
- the existing production-house launch system is preserved;
- NPC production ventures are deterministic and can win suitable Platform AI commissions;
- migration and resume parity pass;
- no unrelated user work is overwritten, staged, or committed.

## 17. Explicit deferrals

The following remain later work:

- turning arbitrary regional or fictional operators into full `PlatformState` companies;
- letting arbitrary dynamic operators bid in the active bidding room;
- generalized string-ID rights parties and settlements;
- player acquisition of a light-simulation operator;
- a full production-house visibility/`Others` redesign;
- the large shared News/X/social reaction-template engine;
- live real-world market-data updates.
