# Claude Frontend Source Freeze Report

**Recorded:** 2026-09-22

**Purpose:** Phase 0 evidence for the canonical Claude frontend integration. No Claude UI, gameplay logic, save shape, or balance change is ported by this report.

## Frozen source identity

| Field | Frozen value |
|---|---|
| Workspace | `/Users/zeesh/Vibe code/ae frontend` |
| Branch | `claude/frontend-work` |
| HEAD | `5d02219409409d9ef3554228c69aa375d748ca29` |
| Integration-source SHA-256 | `606f037fbf53dd120d69b1bf815075b3c05199e3bb25719e347a31546cdaac93` |
| `CODEX-BRIEF.md` SHA-256 | `0615bce13f2f5877dc1b0c26883b312e5364e9524a9e528c96e8714951cec21e` |
| `CHANGES-FOR-CODEX.md` SHA-256 | `ea3486cfb2aeba99af218ca3a811575d1c1325825fdd1181cf23c7dc585dce32` |
| Changelog endpoint | `#125` |
| Changelog lines | 9,595 |
| Status entries | 80 |
| Untracked source files | 18 |
| Generated press files | 18 |
| Generated press SHA-256 | `bc2cb7972229c9571c4a6e33fa3739191db3a2014353e5cc672ca8823fab49e7` |
| Unique cumulative-index paths | 137 |

The version-two integration fingerprint hashes the branch, HEAD, complete non-press porcelain status, binary tracked diff, and the path and bytes of every non-press untracked file. Generated `press/` captures are inventoried under their own digest so additional screenshots cannot make the code freeze move. Together they identify the exact uncommitted Claude source and visual evidence inspected in Phase 0.

The source was not committed because the Claude folder is intentionally outside the authoritative target and the user did not authorize a source-side commit. Any integration fingerprint, changelog, or indexed-path change invalidates this freeze and requires Phase 0 to be rerun before further integration. A press-only digest change requires the visual evidence inventory to be refreshed, but does not invalidate code integration.

## Source comparison

- Tracked difference from HEAD: 62 files, 8,513 insertions, 8,290 deletions.
- Difference from handoff baseline `9cb772e`: 140 files, 24,698 insertions, 10,266 deletions.
- `CODEX-BRIEF.md` is an older summary and is not the integration authority.
- `CHANGES-FOR-CODEX.md` entries #1-#125, newest last, are the integration record.
- Entry #123 adds a narrow Test-row wrapping correction and dev-only seeded-stage lab controls. The Test correction is already byte-identical in the target; the target lab keeps its stronger lifecycle-state harness while retaining the same seeded-stage behavior.
- Entry #124 fixes the Money estate grid's orphaned fourth metric and stops the dev lab from inventing a missing-rehearsal-handler error. Both behaviors are retained without replacing the target's stronger lifecycle-state harness.
- Entry #125 adds a dev-only rehearsal harness and shared query parser. It does not change production gameplay; it is tracked separately so verification can exercise the canonical rehearsal without inventing another runtime path.
- The changelog's claimed broad audit baseline remains documented source evidence, not an independently rerun Phase 0 result.

## Exact source status

```text
 M App.tsx
 M CHANGES-FOR-CODEX.md
 M components/StreamingPlatformHQ.tsx
 M components/StreamingTechnologyCampus.tsx
 M components/streaming-transplant/StreamingBuildWizardExperience.tsx
 M components/streaming-transplant/StreamingBuildoutExperience.tsx
 M components/streaming-transplant/StreamingNetworkExperience.tsx
 M components/streaming-transplant/createCanonicalStreamingPresentation.ts
 M components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDesk.module.css
 D components/studio-finance/components/build/BuildMetricSheet.tsx
 M components/studio-finance/components/build/BuildWizard.tsx
 D components/studio-finance/components/build/CityScene.tsx
 M components/studio-finance/components/build/NetworkAtlas.tsx
 M components/studio-finance/components/build/NetworkMapBox.tsx
 D components/studio-finance/components/build/NetworkPage.tsx
 D components/studio-finance/components/build/NetworkParts.tsx
 D components/studio-finance/components/build/RackWall.tsx
 D components/studio-finance/components/build/ResourceMetric.tsx
 D components/studio-finance/components/build/RoomCard.tsx
 D components/studio-finance/components/build/RoomComposer.tsx
 D components/studio-finance/components/build/SpecMeters.tsx
 M components/studio-finance/components/build/StageLaunch.tsx
 M components/studio-finance/components/build/StageMoney.tsx
 M components/studio-finance/components/build/StageNetwork.tsx
 M components/studio-finance/components/build/StageTest.tsx
 D components/studio-finance/components/build/TeamPlanningCinematic.tsx
 M components/studio-finance/components/cine/CommissionCut.tsx
 M components/studio-finance/finance/build.ts
 M components/studio-finance/finance/buildPlanner.ts
 M components/studio-finance/finance/format.ts
 M components/studio-finance/styles/build.css
 M components/studio-finance/styles/kit.css
 M components/studio-finance/styles/network.css
 M lab/buildLabData.ts
 M lab/lab.tsx
 M package.json
 D scripts/_places.ts
 M scripts/audit-profile-avatar-migration.ts
 D scripts/audit-streaming-assisted-build-planner-ui.ts
 D scripts/audit-streaming-assisted-build-state-ui.tsx
 D scripts/audit-streaming-build-city-template.tsx
 M scripts/audit-streaming-build-map-readout.tsx
 M scripts/audit-streaming-build-plans-scale.tsx
 M scripts/audit-streaming-build-test-autosave-gates.tsx
 M scripts/audit-streaming-facility-marketplace-phase3.ts
 M scripts/audit-streaming-infrastructure-resource-ui.tsx
 M scripts/audit-streaming-launch-marketing-ui.tsx
 D scripts/audit-streaming-team-planning-cinematic.tsx
 M scripts/fixtures/network-flow.tsx
 M services/ownedStreamingPlatform.ts
 M services/realEstateLogic.ts
 M services/streamingFacilities.ts
 M services/streamingFacilityMarketplace.ts
 M services/streamingNetworkReach.ts
 M services/streamingResearchCore.ts
 M services/streamingResearchLifecycle.ts
 M services/streamingServerSites.ts
 M services/streamingSitePlaces.ts
 M services/streamingWeeklyLoop.ts
 M styles/streaming-technology-campus.css
 M types.ts
 M views/lifestyle/LifestyleAssets.tsx
?? components/studio-finance/components/build/RegionBoard.tsx
?? components/studio-finance/components/build/motion.ts
?? components/studio-finance/finance/placer.ts
?? lab/labQuery.ts
?? lab/rehearsalLab.tsx
?? rehearsal-lab.html
?? scripts/audit-streaming-cloud-ring.tsx
?? scripts/audit-streaming-money-crossover.tsx
?? scripts/audit-streaming-network-signals.tsx
?? scripts/audit-streaming-region-placer.tsx
?? scripts/audit-streaming-room-limits.ts
?? scripts/generate-population-clusters.ts
?? services/realEstateDealers.ts
?? services/streamingFibreLadder.ts
?? services/streamingNetworkSignals.ts
?? services/streamingTenure.ts
?? services/worldEconomy/worldPopulationClusters.generated.ts
?? services/worldPopulationClusters.ts
```

## Source diff check

`git diff --check` reports only five trailing-whitespace lines in the frozen Claude `components/studio-finance/styles/network.css` at lines 425-429. They are source defects recorded by the freeze, not copied target changes. They will be removed when the final stylesheet is ported in the UI phase.

## No-omission manifest

The cumulative index plus the three #125 dev-harness paths contains 137 unique source paths. Entry #125 did not append those paths to the older table, so the freeze adds them explicitly rather than allowing the no-omission gate to miss them.

The manifest records:

- 26 `PORT`: final visual/presentation sources that may cross after their component contracts are stable.
- 75 `REIMPLEMENT`: logic or data sources that must be connected to canonical Actor Empire services.
- 36 `SUPERSEDED`: final-source deletions or Claude-only fixtures with explicit canonical replacement paths.
- 0 `REJECTED_WITH_APPROVAL`.

The grouped fixture row for `streaming-launch-surface.html + two more` expands to:

- `scripts/fixtures/streaming-launch-surface.html`
- `scripts/fixtures/streaming-build-money.html`
- `scripts/fixtures/streaming-opening-programme.html`

The build-wizard and network-flow grouped rows likewise expand into their `.tsx` and `.html` files.

## Protected #77-#79 gate

No #77-#79 implementation has been taken. The manifest requires explicit approval before these seven affected paths can execute:

- `components/studio-finance/components/build/NetworkAtlas.tsx`
- `components/studio-finance/components/build/NetworkPage.tsx` (superseded by `RegionBoard.tsx`)
- `components/studio-finance/components/build/RoomCard.tsx` (superseded by `RegionBoard.tsx`)
- `components/studio-finance/finance/build.ts`
- `components/studio-finance/styles/network.css`
- `services/streamingNetworkReach.ts` (planned canonical target: `services/streamingNetworkCoverage.ts`)
- `services/worldEconomy/worldCountryGeography.generated.ts`

## Target boundary

The authoritative target remains `/Users/zeesh/Vibe code/Actor empire` on branch `codex/rights-market-phase1` at starting HEAD `dc0507910e08aeeef3c900dbf3abb47abc63174a`.

The four pre-existing untracked Blender backup files are unrelated and were not read, edited, staged, or removed. Phase 0 adds only the approved design/plan, this report, the manifest fixture, its focused audit, and its package script.

## Phase 0 gate

**PASS.** The source is fingerprinted, all 134 unique indexed paths have exactly one disposition, superseded files name their replacements, and the #77-#79 approval boundary is enforced by an executable audit.

Verification evidence:

- The manifest audit was first run empty and failed `0 !== 134`, proving the omission guard was active.
- The populated audit passes: 137 paths; 26 port, 75 reimplement, 36 superseded, 0 rejected.
- The initial `npx tsc --noEmit` exhausted Node's default 4 GB heap without reporting a type error.
- `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` passes.
- Target `git diff --check` and explicit trailing-whitespace scans pass.
- The source integration fingerprint was recomputed after the report and remains `606f037fbf53dd120d69b1bf815075b3c05199e3bb25719e347a31546cdaac93`.

Before Phase 1 begins, recompute the source fingerprint. If it differs from the frozen value, stop and rerun Phase 0 rather than integrating from a moving source.
