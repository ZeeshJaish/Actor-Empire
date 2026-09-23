# Canonical Claude Frontend Integration Design

**Status:** Proposed for approval

**Source workspace:** `/Users/zeesh/Vibe code/ae frontend`

**Target workspace:** `/Users/zeesh/Vibe code/Actor empire`

**Primary source record:** `/Users/zeesh/Vibe code/ae frontend/CHANGES-FOR-CODEX.md`, entries #1-#122, newest last

## Goal

Bring the complete final Claude frontend experience into the authoritative Actor Empire game while making its region-first Build Wizard a real canonical game system. This is not a visual mock transplant: every displayed number, player choice, save field, rehearsal result, commission charge, construction timer, weekly operating cost, incident, and live status must come from Actor Empire's authoritative state and services.

## Interpretation

The user's phrase "localization only" is interpreted from the preceding choice as **canonicalization only**: Approach 1 from the review. This design does not mean language translation or i18n work.

## Product decision

The final Claude flow is the intended player experience:

- Build has four stages: Network, Money, Test, Launch.
- Network is configured by region, not by manually selecting cities.
- The player sees three server classes: Scout, Workhorse, and Titan.
- Actor Empire selects suitable cities, sites, buildings, and rooms deterministically.
- The six legacy rack duties remain an internal simulation concern and are allocated automatically.
- Cloud and physical infrastructure are first-class alternatives with different economics and operating risks.
- The player sees reached, served well, thin, and dark coverage; all surfaces use the same calculation.
- The Build flow is hands-on. The retired assisted/team flow is not retained as a hidden second implementation.
- Claude's complete final UI is the target. Earlier Claude components explicitly deleted or superseded by later entries are not resurrected.

## Non-negotiable integration rules

1. Do not replace the main repository wholesale and do not merge the Claude repository.
2. Freeze the Claude working tree before porting. Record its commit, dirty-tree patch hash, file inventory, and changelog endpoint.
3. Use the cumulative file index and entries #1-#122. Every final-state indexed file receives a recorded disposition: `PORT`, `REIMPLEMENT`, `SUPERSEDED`, or `REJECTED_WITH_APPROVAL`.
4. A `STYLE` entry may be ported when its component contract still matches.
5. A `LOGIC` or `DATA` entry must be implemented against canonical Actor Empire services and save state; visual fallback calculations must never override the real game.
6. Preserve unrelated target work and the four untracked Blender backup files.
7. No paid action is automatic. Commissioning, purchases, leases, market filings, and Opening Night remain explicit player actions.
8. Free planning state autosaves. Reopening the game restores the exact draft and its current progress.
9. Legacy saves normalize deterministically and without spending money.
10. No UI phase is complete until source parity, canonical data parity, mobile visual review, and focused audits all pass.
11. Entries #77, #78, and #79 remain an explicit approval gate before code is taken: they deliberately change balance, and #79 changes shared map behaviour beyond Network.

## Canonical domain model

### Server tiers

Add a persistent server tier to each rack group:

```ts
export type StreamingServerTier = 'SCOUT' | 'WORKHORSE' | 'TITAN';

export interface OwnedStreamingRackGroup {
  id: string;
  name: string;
  rackCount: number;
  duty: StreamingRackDuty;
  serverTier?: StreamingServerTier;
  migration?: StreamingRackDutyMigration;
}
```

Missing `serverTier` means `WORKHORSE`. This preserves old saves and fixtures. The tier must survive draft creation, commissioning, normalization, reload, weekly simulation, and later expansion.

### Regional intent

The save stores what the player chose separately from where the engine placed it:

```ts
export type StreamingCloudProviderId = 'ATLAS' | 'NORTHWIND' | 'MERIDIAN';

export interface OwnedStreamingRegionNetworkPlan {
  regionId: string;
  serverCounts: Record<StreamingServerTier, number>;
  cloudProvider: StreamingCloudProviderId | null;
  cloudCompute: number;
}
```

`OwnedStreamingInfrastructureSetupDraft` gains `regionPlans?: OwnedStreamingRegionNetworkPlan[]`. The canonical placer projects region plans into `facilities` and compatibility `networkPlacements`. Existing systems may read those projections during migration, but they may not independently recalculate a different network.

### Provider meaning

Provider choice is not artificial reach after the site catalogue makes reach nearly equivalent:

- Northwind: lowest weekly rate, limited availability, lower reliability, and higher interruption exposure.
- Atlas Compute: balanced weekly rate, global availability, reliability, and reserve.
- Meridian Edge: highest weekly rate, best resilience and future capacity headroom.

The exact tuning constants live in one service and are balance-reviewed before release.

## Canonical engines

### Placement

One deterministic `deriveStreamingRegionalPlacement` function consumes canonical markets, region plans, site catalogue, facility marketplace, data-residency rules, cooling/power limits, existing built rooms, and the current absolute week. It returns facilities, placements, placement warnings, and stable reasons. Built rooms are never silently relocated.

### Coverage and service

One `deriveStreamingNetworkCoverage` function grades population clusters. It returns country and regional reached share, served-well share, thin share, dark share, and place-level grades. The map, Network rows, Test, rehearsal, live Platform status, and AI evaluation all consume this result.

### Capacity

Geographic coverage and peak capacity are separate. `deriveStreamingNetworkCapacity` calculates compute, steady streams, burst streams, bottlenecks, redundancy, and load headroom from the placed facilities, server tiers, fibre generation, cloud allocation, condition, power, and cooling.

### Economics

One `quoteStreamingNetworkPlan` function returns region lines and a whole-plan quote: capex, deposits, setup, weekly rent, cloud, energy, water, staffing, maintenance, total weekly operating cost, runway, construction duration, and the exact commission charge. Network, Money, Launch, the contract cinematic, treasury mutation, and the live weekly loop consume this quote or its commissioned snapshot.

### Rehearsal

`deriveStreamingInfrastructureSignature` includes opening markets, region plans, placements, server tiers, cloud provider and compute, fibre state, facility repairs, pricing/launch inputs that affect demand, and relevant catalogue assumptions. Any meaningful change invalidates previous rehearsal evidence.

### Construction and live operations

Commissioning freezes the canonical plan and quote. Physical sites enter construction for a derived four-to-fifteen-week duration; cloud capacity activates on its defined schedule. Weekly progression, billing, incidents, status, expansion, and reopening the Build surface all read the commissioned snapshot rather than reconstructing it from UI state.

## Complete UI scope

The integration covers the final state represented by all non-superseded entries #1-#122, including:

- Zedbury intro and global streaming visual system.
- Define Launch wizard and its markets, identity, storefront, pricing, blueprint, campaign, and readiness surfaces.
- Content Market integration touched by the Claude pass.
- Build shell and all four final stages.
- Region Board, network atlas, map interaction, coverage fields, server tier controls, cloud controls, country breakdown, and landed-room disclosures.
- Money treasury, grouped bill, regional comparison, crossover, runway, and launch-cost presentation.
- Test status, rehearsal controls, load results, and actionable blockers.
- Launch commissioning readiness, contract and construction cinematics, signatures, and locked-under-construction return state.
- Platform HQ, Network/Status presentation, Technology Campus fibre presentation, and real-estate/dealer surfaces changed by Claude.
- Motion, reduced-motion support, tokens, typography, spacing, responsive behaviour, and all final CSS.

The source manifest test prevents a final-state indexed UI file from being omitted.

## Save and compatibility policy

- Missing region plans are reconstructed from existing facilities and placements.
- Missing server tiers become Workhorse.
- Existing cloud leases default to Standard provider and derive compute from the stored lease/rack compatibility value.
- Existing commissioned facilities retain their city, tenure, lease, construction state, repairs, and rack duties.
- Normalization is idempotent.
- Loading or migrating a save never changes treasury or advances time.
- Existing downstream consumers may temporarily use compatibility projections, but only one canonical plan produces them.

## Verification gates

### Data parity gate

For the same plan, Network, Money, Test, Launch, contract, treasury charge, construction record, weekly bill, and live status agree on regions, cities, rooms, racks, cloud compute, capex, weekly cost, readiness week, and coverage.

### Persistence gate

Scout/Titan identity, providers, compute, facilities, rehearsal, commissioning, and construction survive save normalization and reload. Old saves migrate to a stable equivalent state.

### Full-flow gate

Create a career, define launch, configure every region, inspect Money, rehearse, commission, advance construction weeks, close/reopen, reach operational status, expand, and run another week without contradictory numbers or reset approvals.

### UI parity gate

Each Claude surface is compared at 393x852 and a desktop viewport. Text does not trim unintentionally; buttons and map targets work; sticky controls do not cover content; reduced motion works; empty, loading, blocked, error, construction, and completed states are reviewed.

### Regression gate

Focused new audits pass. The pre-existing audit baseline is recorded separately; integration may not add a newly failing audit. `npm run lint`, `npm run build`, and `git diff --check` pass.

## Rollout policy

Work lands in independently reviewable phases. Each phase includes its tests and may be rejected without invalidating the previous phase. The existing Build experience remains the production route until the canonical bridge and the complete replacement UI pass the end-to-end gate. There is no half-migrated production mode.
