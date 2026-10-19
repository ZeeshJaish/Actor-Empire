import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingOpeningProgramme from '../components/streaming-transplant/StreamingOpeningProgramme';
import * as presentation from '../services/releasePresentation';
import * as founding from '../services/streamingFounding';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { checkpointStreamingLaunchBlueprint, getStreamingLaunchDefinitionSignature } from '../services/streamingLaunchProgram';
import { rehearsalSnapshotToBuild, buildSelectionFromDraft, StreamingBuildWizardExperience } from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { createDefaultStreamingInfrastructureDraft, getStreamingInfrastructureForecast } from '../services/streamingInfrastructure';
import { deriveStreamingConstructionSchedule } from '../services/streamingNetworkConstruction';
import StreamingLaunchBlueprintReview from '../components/StreamingLaunchBlueprintReview';
import { resolveStreamingProductionReadiness } from '../services/streamingProductionReadiness';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createCanonicalViewerState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { createLabBuildData, createLabDraft } from '../lab/buildLabData';
import { placeRegion, regionReport, regionsOf } from '../components/studio-finance/finance/placer';
import { facilitiesOf } from '../components/streaming-transplant/StreamingBuildoutExperience';
import { quoteStreamingNetworkPlan } from '../services/streamingNetworkQuote';

const blockedMarkup = renderToStaticMarkup(<StreamingOpeningProgramme {...{
  brand: { name: 'Empire+', hue: 35, sat: 85 },
  view: { state: 'READY_TO_OPEN', commissioned: true, remainingWeeks: 0, workstreams: [], cityCount: 3, rackCount: 1, releasedCapital: 4e6, earliestOpeningAbsoluteWeek: 763 },
  launchReadiness: { canLaunch: false, blockerCount: 1, items: [{ id: 'launch-definition', label: 'Launch blueprint', detail: 'Refresh the blueprint.', tone: 'BLOCKED' }] },
  onBack() {}, onOpenCommissionedPlan() {}, onResolveClearance() {}, onOpeningNight() {}, focus: 'OVERVIEW',
} as any} />);
assert.doesNotMatch(blockedMarkup, /Opening Night is cleared|All systems ready|READY FOR OPENING NIGHT/);
assert.match(blockedMarkup, /Refresh the blueprint/);
assert.match(blockedMarkup, /Review launch requirements/);

for (const [phase, label] of [['PRE_PRODUCTION', 'PRE-PRODUCTION'], ['PRODUCTION', 'PRODUCTION'], ['POST_PRODUCTION', 'POST-PRODUCTION']]) {
  assert.equal((presentation as any).getCommitmentDisplayPhase({ projectPhase: phase, projectDetails: { releaseStrategy: {} } }), label);
}
assert.deepEqual((founding as any).getStreamingFounderCredits({ activeReleases: [], pastProjects: [] }), []);
assert.deepEqual((founding as any).getStreamingFounderCredits({ activeReleases: [{ projectDetails: { title: 'Real debut' } }], pastProjects: [{ name: 'Real debut' }, { name: 'Second role' }] }), ['Real debut', 'Second role']);

const player = createC6QaCareer();
player.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
player.ownedStreamingPlatform.launchSlate.revision += 1;
assert.notEqual(player.ownedStreamingPlatform.launchProgram.lastBlueprintSignature, getStreamingLaunchDefinitionSignature(player));
const before = structuredClone(player);
const refreshed = checkpointStreamingLaunchBlueprint(player);
assert.equal(refreshed.changed, true);
assert.equal(refreshed.player.ownedStreamingPlatform.launchProgram.lastBlueprintSignature, getStreamingLaunchDefinitionSignature(refreshed.player));
assert.equal(refreshed.player.money, before.money);
for (const field of ['treasuryCash', 'facilities', 'infrastructureSetup', 'launchRehearsal', 'costCommitments', 'originalCommissions'] as const) {
  assert.deepEqual(refreshed.player.ownedStreamingPlatform[field], before.ownedStreamingPlatform[field], `Review must preserve ${field}`);
}
assert.equal(checkpointStreamingLaunchBlueprint(refreshed.player).changed, false);
const review = renderToStaticMarkup(<StreamingLaunchBlueprintReview player={player} brand={{ name: 'Empire+', hue: 35, sat: 85 } as any} onBack={() => {}} onRefresh={() => {}} />);
assert.match(review, /Refresh launch blueprint/);
assert.match(review, /The First Signal/);
assert.doesNotMatch(review, /<input|<select/);

const snapshot = {
  configurationSignature: 'current-network', scenario: 'LIKELY', verdict: 'HELD',
  peakConcurrentStreams: 100, steadyCapacity: 1000, burstCapacity: 1200,
  failedPercent: 0, catalogueAvailabilityPercent: 100, regionalSinglePointFailures: [], countries: [],
  facilities: ['owned-toronto', 'cloud-toronto'].map(facilityId => ({ facilityId, cityId: 'TOR', loadPercent: 10, limitingFactor: 'NONE', failedPercent: 0 })),
} as any;
const replay = rehearsalSnapshotToBuild(snapshot, 'ui-network', new Map([['TOR', 'Toronto']]));
assert.equal(replay?.spare, 1100, 'Burst capacity already includes steady capacity.');
assert.deepEqual(replay?.rooms.map(room => room.id), ['owned-toronto', 'cloud-toronto']);
assert.equal(rehearsalSnapshotToBuild(snapshot, 'ui-network', new Map(), 'changed-network'), null);
const lostRelease = structuredClone(player);
const original = lostRelease.ownedStreamingPlatform.originalCommissions[0];
const projectId = original.canonicalProjectId!;
lostRelease.commitments = [];
lostRelease.activeReleases = [];
lostRelease.pastProjects = [];
lostRelease.world.projects = lostRelease.world.projects.filter(item => item.id !== projectId);
lostRelease.world.industryProductions = {};
original.releasePlan = { scope: 'DOMESTIC', releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek), authorizedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) - 1 };
lostRelease.ownedStreamingPlatform.eventLedger.push({ type: 'ORIGINAL_RELEASE_AUTHORIZED', metadata: { commissionId: original.id, projectId, premiereAtAbsoluteWeek: original.releasePlan.premiereAtAbsoluteWeek } } as any);
assert.deepEqual(resolveStreamingProductionReadiness(lostRelease, projectId, original), { ready: true, status: 'RELEASED' },
  'A verified release authorization must recover an Original lost by the legacy no-platform release branch.');
lostRelease.ownedStreamingPlatform.lifecycle = 'ACTIVE';
lostRelease.ownedStreamingPlatform.marketOperations = lostRelease.ownedStreamingPlatform.marketOperations.map(operation => ({ ...operation, status: 'ACTIVE' }));
assert.ok(createCanonicalViewerState(lostRelease).titles.some(title => title.id === projectId), 'A released Original must appear in the actual cinematic viewer, even without a separate catalogue ID.');
original.localization = { packageId: 'DOMESTIC', readyAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) + 1 } as any;
assert.equal(createCanonicalViewerState(lostRelease).titles.some(title => title.id === projectId), false, 'Viewer cannot play before localization delivery.');
original.localization = null;
original.releasePlan!.premiereAtAbsoluteWeek += 1;
assert.equal(createCanonicalViewerState(lostRelease).titles.some(title => title.id === projectId), false, 'Viewer cannot bypass a future premiere.');
original.releasePlan!.premiereAtAbsoluteWeek -= 1;
const authorization = lostRelease.ownedStreamingPlatform.eventLedger.at(-1)!;
authorization.type = 'SYSTEM_REPAIR';
authorization.idempotencyKey = `original-release:${original.id}`;
assert.equal(resolveStreamingProductionReadiness(lostRelease, projectId, original).ready, true, 'Recover release evidence whose type was lost by the old ledger whitelist.');
lostRelease.commitments = [{ id: projectId, projectPhase: 'PRODUCTION' } as any];
assert.equal(resolveStreamingProductionReadiness(lostRelease, projectId, original).ready, false, 'Unfinished canonical production still overrides release authorization.');
const draft = createDefaultStreamingInfrastructureDraft(player);
draft.facilities = player.ownedStreamingPlatform.infrastructureSetup!.facilities;
draft.regionPlans = player.ownedStreamingPlatform.infrastructureSetup!.regionPlans;
const forecast = getStreamingInfrastructureForecast(player, draft);
assert.equal(forecast.buildWeeks, deriveStreamingConstructionSchedule({ facilities: draft.facilities, absoluteWeek: 0 }).weeks,
  'The quoted construction duration must equal the duration committed by the career.');
const lab = createLabBuildData(['CA']);
const network = placeRegion(lab, createLabDraft(), 'NORTH_AMERICA', {
  servers: { SCOUT: 0, WORKHORSE: 1, TITAN: 0 }, cloud: { provider: 'NORTHWIND', compute: 3 },
}).draft;
const selection = buildSelectionFromDraft(network, { placements: [], facilities: [], arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE' }, 20, {}, 'LAB');
const quote = quoteStreamingNetworkPlan({ facilities: facilitiesOf(selection), regionPlans: selection.regionPlans || [] });
lab.canonical = { quote: () => quote } as any;
const region = regionsOf(lab).find(item => item.id === 'NORTH_AMERICA')!;
const report = regionReport(lab, network, [], region);
assert.equal(report.weekly, quote.regions.find(item => item.regionId === region.id)?.weeklyTotal);
assert.equal(report.once, quote.regions.find(item => item.regionId === region.id)?.dueNow);
const buildMarkup = renderToStaticMarkup(<StreamingBuildWizardExperience
  brand={{ name: 'Empire+', hue: 35, sat: 85, markId: 'FRAME_PLAY', typeId: 'GROTESK' } as any}
  inputs={{ absoluteWeek: 20, treasury: 1e9, catalogueSpend: 0, catalogueTitles: 1, originalsSpend: 0, originalsCount: 1, regions: ['NORTH_AMERICA'], homeCityId: 'TOR', audienceMul: 1, hasExplicitOpeningMarkets: true, premiereTitle: 'Test', markets: [{ id: 'CA', country: 'Canada', region: 'NORTH_AMERICA', audience: 1e6, annualGrowthPercent: 3, recommendedCityId: 'TOR', localizationNote: '' }] } as any}
  sel={selection} onChange={() => {}} onBack={() => {}} />).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
assert.match(buildMarkup, /1 rack · 3 compute/, 'Owned racks must not also be counted as rented cloud compute in the Build header.');
console.log('Streaming user flow repairs audit passed.');
