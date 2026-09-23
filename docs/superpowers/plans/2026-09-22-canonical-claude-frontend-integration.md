# Canonical Claude Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Actor Empire's affected streaming UI with the complete final Claude experience while making the region-first three-server Build model authoritative across saves, simulation, rehearsal, commissioning, construction, and live operations.

**Architecture:** Freeze and inventory the Claude source, define one canonical regional network model, then move placement, coverage, capacity, economics, rehearsal, and construction into shared services before replacing UI surfaces. Compatibility projections preserve older consumers and saves, but no UI fallback engine may override canonical results in a real career.

**Tech Stack:** React, TypeScript, deterministic Actor Empire services, Vite, esbuild audit scripts, CSS modules and scoped streaming styles.

**Spec:** `docs/superpowers/specs/2026-09-22-canonical-claude-frontend-integration-design.md`

## Global Constraints

- Treat `/Users/zeesh/Vibe code/ae frontend/CHANGES-FOR-CODEX.md` entries #1-#125, newest last, as the source record.
- Port the complete final Claude UI; do not silently omit files or selectively retain older UI.
- Explicitly deleted or superseded Claude components stay deleted.
- Canonical Actor Empire state, services, purchases, saves, tutorials, and weekly progression remain authoritative.
- Player-facing Build is region-first and always hands-on: Network, Money, Test, Launch.
- Scout, Workhorse, and Titan are persistent canonical server tiers; six rack duties remain internal.
- City and facility placement is deterministic system output, not a player-facing city picker.
- Free planning autosaves; paid actions remain explicit.
- Legacy saves normalize without spending money or advancing time.
- Preserve unrelated target changes and untracked Blender backup files.
- Do not commit or push unless the user explicitly requests it during execution.
- Do not advance a phase until its completion gate passes.
- Stop for explicit user approval immediately before taking entries #77, #78, or #79; #77-#79 deliberately change balance and #79 affects every map.

---

## Roadmap and gates

| Phase | Outcome | Completion gate |
|---|---|---|
| 0 | Frozen source and exhaustive disposition ledger | Every Claude final-state file is accounted for |
| 1 | Canonical save types and migrations | Old and new saves round-trip without value loss |
| 2 | Placement, coverage, capacity, economics, and signature engines | Pure-service fixtures agree across all projections |
| 3 | Real-game bridge and downstream compatibility | Lab and career produce identical results for identical inputs |
| 4 | Complete Build UI replacement | Network, Money, Test, Launch match Claude and canonical data |
| 5 | Complete non-Build Claude UI replacement | All remaining non-superseded entries are ported or reimplemented |
| 6 | Commissioning, construction, weekly loop, and live status | One plan survives commission, time progression, and reload |
| 7 | Visual, interaction, accessibility, and mobile parity | All UI states pass viewport and interaction review |
| 8 | Regression, save fixtures, and release switch | No new failures and old production route can be removed safely |

**Execution status (2026-09-22):** Phases 0–5 are complete. The production Build route is now the final region-first Network, Money, Test, Launch experience; career values come through the canonical placement, coverage, capacity, quote, signal, rehearsal, and construction bridge. Superseded city/team/server-room flows are removed. Empty, configured, blocked, failed, commissioned, construction, and complete states were checked at 393x852 and 1440x900 with no horizontal overflow or footer overlap. Phase 5 adds the final Zedbury intro, Define Launch, Content Market, Platform, Technology/fibre, Network status, real-estate, and load-rehearsal presentation while retaining canonical purchases, saves, coverage and research lifecycle.

---

### Task 1: Freeze the Claude source and create the no-omission ledger

**Files:**
- Create: `docs/superpowers/reports/2026-09-22-claude-frontend-source-freeze.md`
- Create: `scripts/audit-claude-frontend-integration-manifest.ts`
- Create: `scripts/fixtures/claude-frontend-integration-manifest.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ClaudeIntegrationDisposition = 'PORT' | 'REIMPLEMENT' | 'SUPERSEDED' | 'REJECTED_WITH_APPROVAL'`
- Produces: `CLAUDE_FRONTEND_INTEGRATION_MANIFEST`
- Produces: `npm run audit:claude-frontend-integration-manifest`

- [x] **Step 1: Freeze the source workspace**

In `/Users/zeesh/Vibe code/ae frontend`, record the branch, commit, full `git status --short`, `git diff --stat`, `git diff --check`, and SHA-256 hashes for `CODEX-BRIEF.md` and `CHANGES-FOR-CODEX.md`. Commit the Claude workspace only after the user authorizes that source-side commit; otherwise record the dirty-tree patch hash and stop integration if the source changes.

- [x] **Step 2: Write the failing manifest audit**

Parse the final cumulative file index and assert every non-superseded final-state path appears exactly once in `CLAUDE_FRONTEND_INTEGRATION_MANIFEST`. Reject duplicate target paths, missing reasons, `REJECTED_WITH_APPROVAL` without an approval record, and `SUPERSEDED` without the newer entry/path named.

```ts
export interface ClaudeIntegrationManifestEntry {
  sourcePath: string;
  sourceEntries: string[];
  tags: Array<'STYLE' | 'LOGIC' | 'DATA' | 'DEP' | 'ASSET'>;
  disposition: ClaudeIntegrationDisposition;
  targetPaths: string[];
  reason: string;
  approvalRecord?: string;
}
```

- [x] **Step 3: Run the manifest audit and verify RED**

Run `npm run audit:claude-frontend-integration-manifest`. Expected: failure because the manifest is absent or incomplete.

- [x] **Step 4: Populate the manifest from the cumulative file index**

Record every final-state file from entries #1-#122. Mark deleted Claude components such as `NetworkPage.tsx`, `RoomCard.tsx`, `RoomComposer.tsx`, `NetworkParts.tsx`, `RackWall.tsx`, `BuildMetricSheet.tsx`, `ResourceMetric.tsx`, `CityScene.tsx`, and `TeamPlanningCinematic.tsx` as `SUPERSEDED`, naming their final replacements.

- [x] **Step 5: Verify the source and target are clean enough to begin**

Run the manifest audit, `git diff --check` in both workspaces, and record unrelated target changes. Expected: all indexed files accounted for; only known source whitespace failures and the target's unrelated Blender backups are recorded.

**Phase 0 gate:** The source fingerprint and manifest are stable. If the Claude workspace changes, rerun Task 1 before porting another phase.

### Task 2: Add canonical server tiers and regional-plan save state

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingCanonicalState.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Create: `scripts/audit-streaming-regional-plan-migration.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `StreamingServerTier`
- Produces: `StreamingCloudProviderId`
- Produces: `OwnedStreamingRegionNetworkPlan`
- Produces: `OwnedStreamingRackGroup.serverTier?: StreamingServerTier`
- Produces: `OwnedStreamingInfrastructureSetupDraft.regionPlans?: OwnedStreamingRegionNetworkPlan[]`
- Produces: `normalizeStreamingRegionPlans(player)` through the existing canonical normalization boundary

- [x] **Step 1: Write failing legacy and new-save round-trip cases**

Cover a legacy facility with no tier, a Scout/Titan mixed facility, all three cloud providers, extended compute, malformed region IDs, duplicate region rows, and a commissioned setup. Assert missing tiers become Workhorse and normalization is idempotent.

```ts
assert.equal(normalized.facilities?.[0].rackGroups?.[0].serverTier, 'WORKHORSE');
assert.equal(normalizedAgain, normalized);
assert.equal(normalized.ownedStreamingPlatform.treasuryCash, beforeCash);
```

- [x] **Step 2: Run the audit and verify RED**

Expected: server tier and regional-plan properties do not exist.

- [x] **Step 3: Add types and canonical normalization**

Add the exact types from the spec. Sort region plans by canonical region order, clamp counts/compute to non-negative finite integers, reject closed regions, and preserve valid providers. Do not mutate treasury or calendar state.

- [x] **Step 4: Derive region plans for legacy saves**

Reconstruct regional intent from saved facilities and `networkPlacements`. Assign Workhorse to untyped groups, Standard to untyped cloud leases, and preserve every existing facility city and tenure.

- [x] **Step 5: Run the migration audit and existing canonical-state audits**

Run:

```text
npm run audit:streaming-regional-plan-migration
npm run audit:streaming-canonical-foundation-phase1
npm run audit:streaming-facility-foundation-phase1
```

**Phase 1 gate:** Old and new infrastructure saves normalize twice to the same value, and Scout/Titan/provider identity survives reload.

### Task 3: Port the shared geography, site, fibre, tenure, and provider catalogues

**Files:**
- Create: `services/streamingNetworkReach.ts`
- Create: `services/streamingServerSites.ts`
- Create: `services/streamingSitePlaces.ts`
- Create: `services/worldPopulationClusters.ts`
- Create: `services/worldEconomy/worldPopulationClusters.generated.ts`
- Create: `scripts/generate-population-clusters.ts`
- Create: `services/streamingFibreLadder.ts`
- Create: `services/streamingTenure.ts`
- Create: `services/realEstateDealers.ts`
- Modify: `services/streamingFacilities.ts`
- Modify: `services/streamingFacilityMarketplace.ts`
- Modify: `services/realEstateLogic.ts`
- Modify: `types.ts`
- Modify: `package.json`
- Test: `scripts/audit-streaming-facility-marketplace-phase3.ts`

**Interfaces:**
- Produces: `STREAMING_SERVER_SITES`
- Produces: `STREAMING_SITE_PLACES`
- Produces: `WORLD_POPULATION_CLUSTERS`
- Produces: `STREAMING_FIBRE_LADDER`
- Produces: `STREAMING_REAL_ESTATE_DEALERS`
- Produces: canonical provider definitions keyed by `StreamingCloudProviderId`

- [ ] **Step 0: Obtain the required #77-#79 approval**

Present the exact #77 reach/balance changes, #78 room/server calculations, and #79 shared-map correction to the user. Do not copy or reimplement those entries until the user explicitly approves them.

- [ ] **Step 1: Add catalogue integrity assertions**

Assert unique IDs, valid country/region references, finite coordinates, cluster weights per country, residency coverage, facility capacity, provider tuning, and deterministic generation output.

- [ ] **Step 2: Run the focused audits and verify RED**

Expected: the new services and generated population clusters are absent.

- [ ] **Step 3: Port final Claude catalogue data and generators**

Take the final #80-#116 source state, including all 194 server sites present at frozen source HEAD `5d022194` and 398 population clusters. Do not recreate removed room-art assets or other #105 deletions.

- [ ] **Step 4: Connect facilities, marketplace, tenure, and dealer rules**

Preserve existing Actor Empire facility IDs and save semantics. Add purchase/lease/provider fields through the canonical types rather than UI-only structures.

- [ ] **Step 5: Regenerate and verify deterministic output**

Run the population generator twice and verify the second run produces no diff. Run facility marketplace, country geography, fibre, real-estate, and profile-avatar audits.

### Task 4: Build the canonical regional placement engine

**Files:**
- Create: `services/streamingRegionalNetworkPlan.ts`
- Port from source: `components/studio-finance/finance/placer.ts`
- Modify: `services/streamingFacilityMarketplace.ts`
- Modify: `services/streamingFacilities.ts`
- Create: `scripts/audit-streaming-regional-placement-canonical.ts`
- Port/modify: `scripts/audit-streaming-region-placer.tsx`

**Interfaces:**
- Produces: `deriveStreamingRegionalPlacement(input: StreamingRegionalPlacementInput): StreamingRegionalPlacementResult`
- Produces: `projectStreamingCompatibilityPlacements(result)`
- Produces: `projectStreamingCompatibilityRackDuties(result)`

```ts
export interface StreamingRegionalPlacementInput {
  regionPlans: OwnedStreamingRegionNetworkPlan[];
  openingCountryIds: string[];
  existingFacilities: OwnedStreamingFacility[];
  absoluteWeek: number;
}

export interface StreamingRegionalPlacementResult {
  facilities: OwnedStreamingFacility[];
  placements: OwnedStreamingNetworkPlacement[];
  warnings: Array<{ regionId: string; code: string; message: string }>;
}
```

- [ ] **Step 1: Write failing deterministic-placement tests**

Cover identical-input determinism, population-first placement, data residency, cooling limits, Titan minimum room size, provider capacity, breadth before depth, and preservation of already-built facilities.

- [ ] **Step 2: Verify RED against the old city/manual path**

Expected: no canonical region-plan placement service exists.

- [ ] **Step 3: Move placement logic out of the UI finance folder**

Port the final placer algorithm into `services/streamingRegionalNetworkPlan.ts`. UI `placer.ts` becomes a thin re-export during migration and is removed after all callers move.

- [ ] **Step 4: Implement internal rack-duty allocation**

Split each visible server tier across the six duties using demand shares. Preserve `serverTier` on every generated `OwnedStreamingRackGroup`; duty allocation may change without changing the player's server counts.

- [ ] **Step 5: Run round-trip and no-relocation tests**

Assert region plan -> facilities -> reconstructed region plan preserves tier counts/provider compute, and that committed facilities keep their cities through later expansion.

### Task 5: Build one coverage, service-signal, and capacity engine

**Files:**
- Create: `services/streamingNetworkCoverage.ts`
- Create: `services/streamingNetworkCapacity.ts`
- Port from source: `services/streamingNetworkSignals.ts`
- Modify: `services/streamingLaunch.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Modify: `components/streaming-transplant/createCanonicalStreamingPresentation.ts`
- Create: `scripts/audit-streaming-network-canonical-parity.ts`
- Port/modify: `scripts/audit-streaming-network-signals.tsx`

**Interfaces:**
- Produces: `deriveStreamingNetworkCoverage(input): StreamingNetworkCoverage`
- Produces: `deriveStreamingNetworkCapacity(input): StreamingNetworkCapacity`
- Produces: `deriveStreamingNetworkSignals(coverage, capacity)`

- [ ] **Step 1: Write the real-career blocker reproductions**

Create a career fixture where one Workhorse in New York does not make all six regions Strong. Assert a dark India cannot simultaneously report 100% reached and a major outage. Assert coverage changes monotonically as servers/cloud increase.

- [ ] **Step 2: Run and verify the current bridge fails**

Expected: the old `country.cityId ? 1 : 0` projection incorrectly passes full reach.

- [ ] **Step 3: Port population-cluster coverage and tier reach**

Use the final squared falloff, tier-weighted reach, cloud allocation, country/region weighted shares, and reached/served/thin/dark grades. Remove real-career boolean-city coverage.

- [ ] **Step 4: Separate geographic coverage from capacity**

Calculate steady/burst capacity, power/cooling/fibre bottlenecks, redundancy, and headroom independently. A country can be geographically reached but capacity-limited; the presentation must name which condition is failing.

- [ ] **Step 5: Connect every consumer to the canonical results**

Update Build, rehearsal, live status, AI evaluation, and launch services. The local Build fallback may remain only in isolated fixture/lab data and must throw if used with a real canonical player.

- [ ] **Step 6: Verify cross-surface parity**

For one fixture, assert identical country and regional figures from Network rows, Test, rehearsal snapshot, and Platform Status.

### Task 6: Build one quote, construction, and signature engine

**Files:**
- Create: `services/streamingNetworkQuote.ts`
- Create: `services/streamingNetworkConstruction.ts`
- Modify: `services/streamingLaunch.ts`
- Modify: `services/streamingLaunchProgram.ts`
- Modify: `services/streamingWeeklyLoop.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Modify: `components/studio-finance/finance/build.ts`
- Create: `scripts/audit-streaming-network-quote-parity.ts`
- Port/modify: `scripts/audit-streaming-money-crossover.tsx`
- Port/modify: `scripts/audit-streaming-cloud-ring.tsx`

**Interfaces:**
- Produces: `quoteStreamingNetworkPlan(input): StreamingNetworkQuote`
- Produces: `deriveStreamingConstructionSchedule(input): StreamingConstructionSchedule`
- Produces: `deriveStreamingInfrastructureSignature(input): string`

- [ ] **Step 1: Write failing mismatch tests**

Reproduce infrastructure $25.7M versus regional $24.2M, differing rack/city counts, incorrect cloud deposits, and a contract total different from the commission charge.

- [ ] **Step 2: Verify RED against existing independent totals**

Expected: at least one current surface or mutation reports a different value.

- [ ] **Step 3: Implement one immutable quote**

Return region lines plus whole-plan totals for rooms, cities, racks, compute, capex, deposits, setup, weekly cloud, rent, power, water, staffing, maintenance, runway, and exact due-now amount.

- [ ] **Step 4: Implement provider economics and risks**

Encode Northwind, Atlas Compute, and Meridian Edge in one table. Reach comes from actual network geometry; provider differentiation comes from price, availability, resilience, interruption exposure, and future headroom.

- [ ] **Step 5: Implement construction and signature**

Derive four-to-fifteen-week physical construction from facilities and volume. Include region plans, tiers, providers, repairs, fibre, demand-affecting launch/pricing state, and quote version in the signature.

- [ ] **Step 6: Connect commission and weekly billing**

Commission exactly the quote's due-now amount and freeze its recurring-cost basis. Weekly progression uses the commissioned snapshot and current explicitly variable utility/risk inputs; it does not rerun UI approximation code.

- [ ] **Step 7: Verify all monetary projections**

Assert Network header, Money, Launch, contract, treasury mutation, construction record, and first weekly bill agree.

**Phase 2 gate:** Placement, coverage, capacity, quote, construction, and signature services pass pure tests without importing React.

### Task 7: Replace the Build adapter with the canonical bridge

**Files:**
- Modify: `components/streaming-transplant/StreamingBuildWizardExperience.tsx`
- Modify: `components/streaming-transplant/StreamingBuildoutExperience.tsx`
- Modify: `components/studio-finance/finance/build.ts`
- Modify: `components/StreamingPlatformHQ.tsx`
- Create: `scripts/audit-streaming-build-lab-career-parity.tsx`

**Interfaces:**
- Consumes: Tasks 4-6 canonical services
- Produces: `createCanonicalBuildData(player, draft)`
- Produces: `buildSelectionFromDraft` that preserves `serverTier`

- [x] **Step 1: Add an identical lab/career fixture**

Render the same regional plan through fixture data and a real canonical Player. Compare regions, countries, facilities, racks, compute, coverage, costs, schedule, and rehearsal signature.

- [x] **Step 2: Verify RED**

Expected: the current canonical adapter overrides the new model with city booleans and old totals.

- [x] **Step 3: Replace adapter calculations with canonical services**

Delete boolean city coverage and old independent totals from the bridge. Pass canonical results into the presentational `BuildData` shape.

- [x] **Step 4: Preserve tiers and providers in conversion**

Update `buildSelectionFromDraft` so every fitted rack group retains `serverTier`; cloud provider, compute, tenure, repairs, and construction state also round-trip.

- [x] **Step 5: Make fallback usage explicit**

Fixture/lab callers may use a local adapter built from the same canonical services. A real Player without the required canonical handlers throws a development error rather than silently calculating different data.

- [x] **Step 6: Run lab/career parity to GREEN**

**Phase 3 gate:** Identical inputs produce identical results in the lab and a real career.

### Task 8: Replace the complete Build UI with Claude's final four-stage experience

**Files:**
- Modify: `components/studio-finance/components/build/BuildWizard.tsx`
- Modify: `components/studio-finance/components/build/StageNetwork.tsx`
- Create: `components/studio-finance/components/build/RegionBoard.tsx`
- Create: `components/studio-finance/components/build/NetworkAtlas.tsx`
- Create: `components/studio-finance/components/build/NetworkMapBox.tsx`
- Create: `components/studio-finance/components/build/CloudRing.tsx`
- Create: `components/studio-finance/components/build/motion.ts`
- Modify: `components/studio-finance/components/build/WorldMap.tsx`
- Modify: `components/studio-finance/components/build/StageMoney.tsx`
- Modify: `components/studio-finance/components/build/StageTest.tsx`
- Modify: `components/studio-finance/components/build/StageLaunch.tsx`
- Modify: `components/studio-finance/components/build/NightBand.tsx`
- Modify: `components/studio-finance/components/cine/CommissionCut.tsx`
- Modify: `components/studio-finance/styles/build.css`
- Create/modify: `components/studio-finance/styles/network.css`
- Modify: `components/studio-finance/styles/kit.css`
- Test: `scripts/audit-streaming-region-placer.tsx`
- Test: `scripts/audit-streaming-build-test-autosave-gates.tsx`
- Test: `scripts/audit-streaming-linked-budget-sheets.tsx`

**Interfaces:**
- Consumes: canonical Build data and handlers from Task 7
- Produces: final Claude Network, Money, Test, and Launch surfaces

- [x] **Step 1: Add source-parity assertions before replacing UI**

Assert four stages, six region rows, three server tier controls, cloud provider/compute controls, country coverage, landed-room disclosure, grouped Money bill, rehearsal CTA, and commission readiness. Assert no city picker, assisted/team planner, architecture dial, safety buffer, build-pace selector, or deleted server-room composer remains.

- [x] **Step 2: Port the final Build shell and Network UI**

Use the final #103-#119 components and styles, not intermediate #76-#102 layouts. Bind all controls to regional intent and canonical projections.

- [x] **Step 3: Port the final Money UI**

Use #120-#121 treasury vault, grouped bill, region comparison, crossover, room disclosures, runway, and launch cost. Every line reads `StreamingNetworkQuote`.

- [x] **Step 4: Port Test and Launch UI**

Use canonical coverage/capacity signals, explicit player-run rehearsal, current-signature gate, one commission amount, contract cinematic, and construction schedule.

- [x] **Step 5: Remove superseded Build UI**

Delete or leave deleted every component marked `SUPERSEDED` in the manifest and remove its CSS/audits/imports. Do not retain a hidden second Build flow.

- [x] **Step 6: Verify empty, configured, blocked, failed, commissioned, construction, and complete states**

Render each state at 393x852 and desktop. Verify no trimmed labels, covered content, contradictory counters, or inactive controls without explanations.

**Phase 4 gate:** The complete final Claude Build UI is present, all controls work, and every visible value comes from canonical services.

### Task 9: Replace the complete Define Launch, intro, and content-market UI from the manifest

**Files:**
- Port/create: `components/ZedburyStudiosIntro.tsx`
- Port/create: `styles/zedbury-intro.css`
- Port/create: `assets/zedbury.ts`
- Modify: `App.tsx`
- Modify: `components/StreamingFoundingJourney.tsx`
- Modify: `components/studio-finance/components/launch/LaunchWizard.tsx`
- Modify: `components/studio-finance/components/launch/StepBlueprint.tsx`
- Modify: `components/studio-finance/components/launch/StepMarkets.tsx`
- Modify: `components/studio-finance/components/launch/StepIdent.tsx`
- Modify: `components/studio-finance/components/launch/StepStorefront.tsx`
- Modify: `components/studio-finance/components/launch/StepPricing.tsx`
- Modify: `components/studio-finance/components/launch/ResearchLockMark.tsx`
- Modify: `components/studio-finance/finance/launch.ts`
- Modify: `components/studio-finance/styles/launch.css`
- Modify: `components/studio-finance/styles/tokens.css`
- Modify: `components/studio-finance/styles/cine.css`
- Modify: `components/studio-finance/styles/studio-finance.css`
- Modify: `components/studio-finance/components/kit.tsx`
- Modify: `components/StreamingContentMarket.tsx`
- Modify: `content-market-exact/ExactContentMarket.tsx`
- Modify: `content-market-exact/ContentMarket.module.css`
- Modify: `components/StreamingDefineLaunchExperience.tsx`
- Modify: `components/StreamingPlatformHQ.tsx`

**Interfaces:**
- Consumes: existing canonical launch-program, pricing, markets, catalogue, campaign, and content-market services
- Produces: complete final-state Claude presentation for entries #1-#76a

- [x] **Step 1: Extend the manifest audit with UI selectors and removed selectors**

For each final surface, record one required landmark and each explicitly retired element. Fail if required UI is absent or a retired control returns.

- [x] **Step 2: Port shared tokens, kit, typography, intro, and cinematic foundations**

Port final styles and components while retaining Actor Empire navigation, Player state, purchase handlers, and tutorials.

- [x] **Step 3: Port every Define Launch step in final entry order**

Use final entry semantics, including autosave, pricing economy connections, research locks, launch-step progress, and removed duplicate/manual-save UI.

- [x] **Step 4: Port the Content Market surfaces touched by Claude**

Keep existing rights, bidding, catalogue, and treasury services authoritative. Only presentation and explicitly documented logic changes cross over.

- [x] **Step 5: Run founding, launch, pricing, content-market, and browser fixture audits**

Run the affected audits named by the manifest plus `npm run build`.

### Task 10: Replace the remaining Platform, Technology, status, and real-estate surfaces

**Files:**
- Modify: `components/StreamingPlatformHQ.tsx`
- Modify: `components/StreamingTechnologyCampus.tsx`
- Modify: `styles/streaming-technology-campus.css`
- Modify: `components/streaming-transplant/StreamingNetworkExperience.tsx`
- Modify: `components/streaming-transplant/createCanonicalStreamingPresentation.ts`
- Modify: `components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css`
- Modify: `components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDesk.module.css`
- Modify: `views/lifestyle/LifestyleAssets.tsx`
- Modify: all additional non-superseded paths assigned to this phase by `CLAUDE_FRONTEND_INTEGRATION_MANIFEST`

**Interfaces:**
- Consumes: canonical commissioned network, fibre ladder, tenure, dealer, quote, coverage, and capacity services
- Produces: complete post-commission presentation parity

- [x] **Step 1: Write post-commission surface assertions**

Assert commissioned server tiers, regions, providers, costs, coverage, construction, fibre generation, leases/purchases, and dealer values display from canonical state after reload.

- [x] **Step 2: Port final Claude Platform and Network status UI**

Remove duty-based player messaging superseded by reached/served/thin/dark signals. Preserve internal duty simulation data.

- [x] **Step 3: Port Technology Campus and fibre UI**

Connect the final fibre ladder presentation to canonical research lifecycle and weekly maintenance costs.

- [x] **Step 4: Port tenure, dealer, and lifestyle-asset UI**

Use current market sale value, lease term, ownership, and renewal data from services; do not embed display-only financial values.

- [x] **Step 5: Clear every remaining manifest entry**

Run the manifest audit. Expected: no `PORT` or `REIMPLEMENT` entry remains unverified and no path lacks a target test or visual checkpoint.

**Phase 5 gate:** Every non-superseded Claude UI surface is present in the main game and every omitted source file is explicitly superseded or user-rejected.

### Task 11: Connect commissioning, construction, weekly simulation, and reopening

**Files:**
- Modify: `services/streamingLaunch.ts`
- Modify: `services/streamingLaunchProgram.ts`
- Modify: `services/streamingWeeklyLoop.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Modify: `services/streamingResearchLifecycle.ts`
- Modify: `services/streamingResearchCore.ts`
- Modify: `components/StreamingPlatformHQ.tsx`
- Create: `scripts/audit-streaming-regional-network-lifecycle.ts`

**Interfaces:**
- Consumes: canonical plan, quote, signature, rehearsal, and construction schedule
- Produces: idempotent commission result and weekly construction progression

- [x] **Step 1: Write the complete lifecycle test before implementation**

Configure multiple regions with all three tiers and cloud, save/reload the draft, rehearse, commission once, reject duplicate commission, advance weeks, verify bills/construction, reload during construction, complete construction, open status, expand, and advance another week.

- [x] **Step 2: Verify RED at the first contradictory/resetting state**

Capture the exact failure instead of weakening assertions.

- [x] **Step 3: Commission the canonical snapshot**

Persist region plans, placed facilities, compatibility placements, tiered rack groups, quote, load evidence, construction schedule, and signature together. Deduct only the quoted due-now amount.

- [x] **Step 4: Progress construction and operating state idempotently**

Construction advances once per committed week. Reopening the Build route during construction displays locked progress and does not request team approval or another rehearsal.

- [x] **Step 5: Connect weekly costs, incidents, reach, and status**

Use commissioned providers, tiers, facilities, fibre, power, cooling, condition, and coverage. Do not rebuild the network from region intent after commission.

- [x] **Step 6: Run lifecycle test to GREEN**

**Phase 6 gate:** The exact commissioned network survives time progression and reload, and every post-commission surface agrees.

### Task 12: Complete interaction, responsive, motion, and accessibility parity

**Files:**
- Modify: final manifest-listed CSS and TSX presentation files
- Create: `scripts/audit-streaming-claude-ui-responsive.tsx`
- Create: `scripts/audit-streaming-claude-ui-accessibility.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: final integrated UI
- Produces: viewport and accessibility evidence for each surface/state

- [x] **Step 1: Define the visual-state matrix**

Capture 393x600, 393x852, 430x932, and 1440x900 for empty, configured, loading, blocked, failed, commissioned, under-construction, and complete states where applicable.

- [x] **Step 2: Add automated layout assertions**

Assert no horizontal overflow, sticky-footer overlap, unintended ellipsis on primary content, unreachable map controls, duplicate IDs, or controls without accessible names/reasons.

- [x] **Step 3: Port final motion and reduced-motion behaviour**

Use Claude's final count-up, map-field, route, and status animations. Under `prefers-reduced-motion`, provide stable immediate states.

- [x] **Step 4: Perform manual mobile interaction review**

Tap region, country, server increment/decrement, cloud provider, compute, disclosures, Test, blockers, commission, back navigation, and reopen flows. Record screenshots and results in the integration report.

- [x] **Step 5: Fix only integration defects in this phase**

Balance changes require a separate approval; visual parity fixes may proceed when they preserve the approved design.

**Phase 7 gate:** Claude's final UI is visually complete and usable on phone and desktop without trimmed or obscured content.

### Task 13: Run final regression, migration, and release gates

**Files:**
- Modify: `scripts/fixtures/claude-frontend-integration-manifest.ts`
- Create: `docs/superpowers/reports/2026-09-22-canonical-claude-frontend-integration-report.md`
- Modify: affected audit scripts only when an approved product contract changed

**Interfaces:**
- Consumes: all earlier phase evidence
- Produces: final go/no-go report

- [x] **Step 1: Run all new focused audits**

Run manifest, migration, placement, canonical parity, quote parity, lab/career parity, lifecycle, responsive, and accessibility audits.

- [x] **Step 2: Run all manifest-linked existing audits**

Build the list from each manifest entry's affected audits. Use per-audit timeouts and compare failures to the frozen baseline; do not relabel a new failure as pre-existing.

- [x] **Step 3: Run static and production checks**

```text
npm run lint
npm run build
git diff --check
```

- [x] **Step 4: Run the real-career acceptance path**

Create a new career and load a migrated save. In both, complete Define Launch, configure a multi-region mixed-tier network, review Money, pass and fail rehearsals, commission, reload, advance through construction, open live status, expand, and advance another week.

- [x] **Step 5: Reconcile the no-omission manifest**

Every final-state Claude file must be verified in its target or documented as superseded. Any `REJECTED_WITH_APPROVAL` row must link the user's approval. The report names every known baseline failure separately.

- [x] **Step 6: Make the release decision**

Release only if all eight phase gates pass. If a gate fails, keep the existing production route and report the first failing contract with reproduction steps.

**Phase 8 gate:** The report can truthfully state that the complete Claude UI is integrated and its data is canonical, persistent, and operational.

---

## Recommended execution sequence

Execute Tasks 1-7 first as the canonical foundation. Review the real-career parity gate before replacing any production UI. Then execute Tasks 8-10 as the complete frontend replacement, followed by Tasks 11-13 for lifecycle and release proof. This ordering prevents a beautiful but disconnected UI from becoming the production system.
