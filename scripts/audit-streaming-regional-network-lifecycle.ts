import assert from 'node:assert/strict';

import {
  INITIAL_PLAYER,
  createInitialOwnedStreamingPlatformState,
  type OwnedStreamingFacility,
  type OwnedStreamingInfrastructureSetupDraft,
  type OwnedStreamingLaunchRehearsalSnapshot,
  type OwnedStreamingRegionNetworkPlan,
  type Player,
  type StreamingLaunchMarketingForecastSnapshot,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
  commitStreamingInfrastructureSetup,
  createDefaultStreamingInfrastructureDraft,
  getStreamingInfrastructureForecast,
  runStreamingInfrastructureLoadTest,
  saveStreamingInfrastructureDraft,
  saveStreamingInfrastructureRehearsal,
} from '../services/streamingInfrastructure';
import {
  commissionStreamingOpeningProgramme,
  getStreamingOpeningCommissionQuote,
  getStreamingOpeningProgrammeView,
} from '../services/streamingOpeningProgramme';
import { getStreamingLaunchDefinitionSignature, getStreamingLaunchProgramView, saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { commitOwnedStreamingLaunch, getStreamingLaunchReadiness } from '../services/streamingLaunch';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { migratePlacementsToStreamingFacilities } from '../services/streamingFacilities';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { advanceStreamingMarketClearances, beginStreamingMarketClearance, getStreamingMarketClearanceView, resolveStreamingMarketRequirement, resumeStreamingMarketClearance, saveStreamingMarketPlan } from '../services/streamingMarkets';

const clone = <T,>(value: T): T => structuredClone(value);
const atAbsoluteWeek = (player: Player, absoluteWeek: number): Player => ({
  ...player,
  age: Math.floor(absoluteWeek / 52) + 1,
  currentWeek: absoluteWeek % 52 + 1,
});
const persisted = (player: Player): Player => {
  const serialized = JSON.parse(JSON.stringify(player)) as Player;
  return {
    ...serialized,
    ownedStreamingPlatform: normalizeOwnedStreamingPlatformState(
      serialized.ownedStreamingPlatform,
      serialized.id,
    ),
  };
};

const regionPlans: OwnedStreamingRegionNetworkPlan[] = [
  {
    regionId: 'NORTH_AMERICA',
    serverCounts: { SCOUT: 2, WORKHORSE: 2, TITAN: 1 },
    cloudProvider: 'NORTHWIND',
    cloudCompute: 4,
  },
  {
    regionId: 'EUROPE',
    serverCounts: { SCOUT: 1, WORKHORSE: 3, TITAN: 1 },
    cloudProvider: 'ATLAS',
    cloudCompute: 3,
  },
  {
    regionId: 'ASIA',
    serverCounts: { SCOUT: 2, WORKHORSE: 2, TITAN: 2 },
    cloudProvider: 'MERIDIAN',
    cloudCompute: 2,
  },
];

const facilities: OwnedStreamingFacility[] = [
  {
    id: 'phase6-la-cloud',
    cityId: 'LA',
    type: 'CLOUD_ALLOCATION',
    installedRacks: 4,
    role: 'CORE_ORIGIN',
    rackGroups: [
      { id: 'phase6-la-scout', name: 'Scout edge', rackCount: 2, duty: 'LOCAL_EDGE', serverTier: 'SCOUT' },
      { id: 'phase6-la-workhorse', name: 'Cloud origin', rackCount: 2, duty: 'CONTENT_ORIGIN', serverTier: 'WORKHORSE' },
    ],
    lease: {
      listingId: 'phase6-la-cloud-listing', providerName: 'Northwind Cloud', rackPositions: 4,
      depositCost: 1_200_000, setupCost: 800_000, weeklyRent: 180_000,
      electricityRatePerKwh: .16, taxRatePercent: 8, reliabilityPercent: 99.95,
      securityGrade: 'REINFORCED', fibreGrade: 'GLOBAL_BACKBONE', contractWeeks: 52,
      provisioningWeeks: 1, expansionRackPositions: 8, tenure: 'CLOUD', cloudProvider: 'NORTHWIND',
    },
  },
  {
    id: 'phase6-ldn-cage',
    cityId: 'LDN',
    type: 'PRIVATE_CAGE',
    installedRacks: 5,
    role: 'REGIONAL_HUB',
    rackGroups: [
      { id: 'phase6-ldn-workhorse', name: 'Regional cache', rackCount: 3, duty: 'REGIONAL_CACHE', serverTier: 'WORKHORSE' },
      { id: 'phase6-ldn-titan', name: 'Event core', rackCount: 2, duty: 'LIVE_EVENT', serverTier: 'TITAN' },
    ],
  },
  {
    id: 'phase6-bom-suite',
    cityId: 'BOM',
    type: 'PRIVATE_SUITE',
    installedRacks: 6,
    role: 'EDGE_CACHE',
    rackGroups: [
      { id: 'phase6-bom-scout', name: 'Local edge', rackCount: 2, duty: 'LOCAL_EDGE', serverTier: 'SCOUT' },
      { id: 'phase6-bom-workhorse', name: 'Platform services', rackCount: 2, duty: 'PLATFORM_SERVICES', serverTier: 'WORKHORSE' },
      { id: 'phase6-bom-titan', name: 'Encoding', rackCount: 2, duty: 'ENCODING', serverTier: 'TITAN' },
    ],
  },
  ...migratePlacementsToStreamingFacilities(
    ['NYC', 'CHI', 'DAL', 'MIA', 'ATL', 'SEA', 'SFO', 'DEL', 'CCU', 'BLR', 'HYD']
      .map(cityId => ({ cityId, racks: 4, role: 'REGIONAL_HUB' as const })),
  ),
];

const createReadyPlayer = (): { player: Player; draft: OwnedStreamingInfrastructureSetupDraft; marketing: StreamingLaunchMarketingForecastSnapshot } => {
  const playerId = 'phase6-regional-network-lifecycle';
  const initial = createInitialOwnedStreamingPlatformState(playerId);
  const base = clone(INITIAL_PLAYER) as Player;
  const countryIds = ['US', 'GB', 'IN'];
  const eligible: Player = {
    ...base, id: playerId, name: 'Phase Six Founder', age: 40, currentWeek: 1,
    money: 11_000_000_000,
    ownedStreamingPlatform: {
      ...initial, lifecycle: 'ELIGIBLE', milestoneKeys: ['streaming-launch-clearance'],
    },
  };
  const drafted = saveStreamingFoundingDraft(eligible, {
    ...createDefaultStreamingFoundingDraft(getAbsoluteWeek(40, 1)),
    currentStep: 2, name: 'Signal Atlas+',
  });
  const incorporated = incorporateOwnedStreamingPlatform(drafted);
  assert.equal(incorporated.changed, true, 'The journey must incorporate through the real founding transaction.');
  assert.equal(incorporated.player.ownedStreamingPlatform.treasuryCash, 0, 'Registration opens a zero-cash operating treasury.');
  const funded = contributeStreamingFounderCapital(incorporated.player, 10_000_000_000, 's6-journey-capital');
  assert.equal(funded.changed, true, 'The founder must inject working capital explicitly.');
  assert.equal(funded.player.ownedStreamingPlatform.treasuryCash, 10_000_000_000);
  assert.equal(funded.player.money, incorporated.player.money - 10_000_000_000);
  const energyBeforePlanning = funded.player.energy.current;
  const planned = saveStreamingMarketPlan(funded.player, countryIds);
  assert.equal(planned.changed, true, 'Opening markets must be selected explicitly.');
  assert.equal(planned.player.energy.current, energyBeforePlanning, 'Planning must not spend filing energy.');
  assert.equal(createDefaultStreamingInfrastructureDraft(planned.player).networkPlacements.length, 0,
    'The first Build drawing must still be empty after market selection.');
  const filed = beginStreamingMarketClearance(planned.player, countryIds);
  assert.equal(filed.reason, 'STARTED', 'Selected markets must enter real government clearance.');
  assert.equal(filed.player.energy.current, energyBeforePlanning - (filed.energyCost || 0),
    'The whole filing action must spend exactly its quoted energy once.');
  assert.equal(beginStreamingMarketClearance(filed.player, countryIds).changed, false,
    'Repeating the same filing must not spend energy or treasury again.');
  let clearancePlayer = filed.player;
  for (let week = getAbsoluteWeek(40, 1) + 1; week <= getAbsoluteWeek(40, 1) + 40; week += 1) {
    clearancePlayer = advanceStreamingMarketClearances(atAbsoluteWeek(clearancePlayer, week)).player;
    for (const operation of clearancePlayer.ownedStreamingPlatform.marketOperations) {
      const clearance = getStreamingMarketClearanceView(operation, week);
      if (clearance.actionRequired === 'PAY_REQUIREMENT') {
        clearancePlayer = resolveStreamingMarketRequirement(clearancePlayer, operation.id).player;
      } else if (clearance.actionRequired === 'REAPPLY' && (operation.clearance?.resumeAllowedAtAbsoluteWeek || 0) <= week) {
        clearancePlayer = resumeStreamingMarketClearance(clearancePlayer, operation.id).player;
      }
    }
    if (clearancePlayer.ownedStreamingPlatform.marketOperations.every(operation => operation.status === 'READY')) break;
  }
  assert.equal(clearancePlayer.ownedStreamingPlatform.marketOperations.every(operation => operation.status === 'READY'), true,
    'The selected and filed opening countries must actually clear before commission preparation.');
  const absoluteWeek = getAbsoluteWeek(clearancePlayer.age, clearancePlayer.currentWeek);
  const operations = clearancePlayer.ownedStreamingPlatform.marketOperations;
  let player: Player = {
    ...clearancePlayer,
    pastProjects: [
      { id: 'phase6-original', name: 'Signal Atlas', projectType: 'SERIES', genre: 'DRAMA' } as any,
      { id: 'phase6-library-a', name: 'Open Circuit', projectType: 'MOVIE', genre: 'THRILLER' } as any,
      { id: 'phase6-library-b', name: 'Night Relay', projectType: 'MOVIE', genre: 'COMEDY' } as any,
    ],
    ownedStreamingPlatform: {
      ...clearancePlayer.ownedStreamingPlatform,
      identity: {
        ...clearancePlayer.ownedStreamingPlatform.identity!, soundIdentKey: 'PULSE',
      },
      infrastructureStrategy: 'HYBRID',
      fibre: { generation: 2, level: 4 },
      marketOperations: operations,
      serviceConfiguration: {
        ...initial.serviceConfiguration,
        source: 'PLAYER_ACTION', soundIdentKey: 'PULSE', identPackageId: 'STANDARD', identDurationSeconds: 3,
        storefrontLayoutId: 'CINEMA', pricingApproach: 'PREMIUM', committedCost: 0,
        committedAtAbsoluteWeek: absoluteWeek, revision: 1,
        pricing: {
          ...initial.serviceConfiguration.pricing,
          streams: ['subs'],
          plans: [{ id: 'BASIC', name: 'Essential', monthly: 9.99, featureIds: ['noads', 'catalogue'], ads: false }],
        },
      },
      starterCatalog: {
        packageId: 'BROAD_APPEAL', ownedProjectIds: ['phase6-library-a', 'phase6-library-b'],
        licensedProjectIds: [], establishedAtAbsoluteWeek: absoluteWeek,
      },
      catalogProjectIds: ['phase6-original', 'phase6-library-a', 'phase6-library-b'],
      originalCommissions: [{
        id: 'phase6-original-commission', scriptId: 'phase6-script', canonicalProjectId: 'phase6-original',
        title: 'Signal Atlas', gapId: 'SERIES_RETENTION', projectType: 'SERIES', genre: 'DRAMA', episodes: 8,
        producerStudioId: 'phase6-studio', producerStudioName: 'Phase Six Studios',
        commissionedByPlatformName: 'Signal Atlas+', productionBudgetCap: 50_000_000,
        productionFundingApplied: 45_000_000, status: 'RELEASED',
        commissionedAtAbsoluteWeek: absoluteWeek - 8, greenlitAtAbsoluteWeek: absoluteWeek - 7,
      }],
      launchSlate: {
        revision: 1, programmedAtAbsoluteWeek: absoluteWeek,
        entries: [
          { id: 'phase6-slate-original', projectId: 'phase6-original', title: 'Signal Atlas', source: 'ORIGINAL', projectType: 'SERIES', genre: 'DRAMA', launchWeek: 1, releasePattern: 'WEEKLY', marketingPlan: 'EVENT' },
          { id: 'phase6-slate-a', projectId: 'phase6-library-a', title: 'Open Circuit', source: 'OWNED_LIBRARY', projectType: 'MOVIE', genre: 'THRILLER', launchWeek: 2, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' },
          { id: 'phase6-slate-b', projectId: 'phase6-library-b', title: 'Night Relay', source: 'OWNED_LIBRARY', projectType: 'MOVIE', genre: 'COMEDY', launchWeek: 4, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' },
        ],
      },
      launchProgram: { ...clearancePlayer.ownedStreamingPlatform.launchProgram, status: 'PLANNING' },
    },
  };
  const priced = saveStreamingPricingPlan(player, {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    annualDiscount: 15,
    introOffer: 20,
    introOfferPlanId: 'BASIC',
  });
  assert.equal(priced.changed, true, 'The opening discount must be saved through the canonical pricing action.');
  player = priced.player;
  const draft: OwnedStreamingInfrastructureSetupDraft = {
    currentStep: 4,
    strategy: 'HYBRID',
    capacityPackageId: 'PREMIERE',
    rolloutPace: 'STANDARD',
    subscriptionPrices: { BASIC: 9.99, PREMIUM: 15.99, FAMILY: 21.99 },
    networkPlacements: [
      { cityId: 'LA', racks: 4, role: 'CORE_ORIGIN' },
      { cityId: 'LDN', racks: 5, role: 'REGIONAL_HUB' },
      { cityId: 'BOM', racks: 6, role: 'EDGE_CACHE' },
      ...['NYC', 'CHI', 'DAL', 'MIA', 'ATL', 'SEA', 'SFO', 'DEL', 'CCU', 'BLR', 'HYD']
        .map(cityId => ({ cityId, racks: 4, role: 'REGIONAL_HUB' as const })),
    ],
    regionPlans,
    facilities,
    managementPolicy: {
      mode: 'HANDS_ON', priority: 'BALANCED', maximumBudget: 10_000_000_000,
      riskTolerance: 'MEDIUM', preferredCityIds: ['LA', 'LDN', 'BOM'],
      requireApprovalForExpensiveChanges: true, approvalThreshold: 100_000_000,
    },
    assistedPlanApproved: true,
    assistedPlanClass: 'PREMIERE',
    openingDemandForecast: { low: 800_000, likely: 1_200_000, high: 1_800_000 },
    lastLoadTestSignature: null,
    updatedAtAbsoluteWeek: absoluteWeek,
  };
  player = saveStreamingInfrastructureDraft(player, draft);
  const canonicalDraft = player.ownedStreamingPlatform.infrastructureSetupDraft!;
  const forecast = getStreamingInfrastructureForecast(player, canonicalDraft);
  const marketing: StreamingLaunchMarketingForecastSnapshot = {
    id: 'phase6-organic-forecast', version: 1, signature: 'phase6-organic-signature', effectiveBudget: 0,
    organicAwareness: .08, likelyAwarenessLift: 0, baselineConcurrentStreams: 1_200_000,
    saturationPercent: 0, efficiencyStatus: 'ORGANIC',
    acquiredAccounts: { low: 80_000, likely: 120_000, high: 180_000 },
    concurrentStreams: { low: 800_000, likely: 1_200_000, high: 1_800_000 },
    customerAcquisitionCost: null, confidenceScore: 82, confidence: 'HIGH', warnings: [],
    countryForecasts: operations.map(operation => ({
      countryId: operation.countryId!, countryName: operation.countryProfile!.country,
      allocatedAmount: 0, organicAwareness: .08, likelyAwarenessLift: 0,
      likelyAcquiredAccounts: 40_000, likelyConcurrentStreams: 400_000,
      customerAcquisitionCost: null, confidenceScore: 82, confidence: 'HIGH' as const,
    })),
  };
  const rehearsal: OwnedStreamingLaunchRehearsalSnapshot = {
    configurationSignature: forecast.configurationSignature,
    scenario: 'LIKELY', verdict: 'HELD', peakConcurrentStreams: 1_200_000,
    steadyCapacity: forecast.baselineConcurrentStreams, burstCapacity: forecast.burstConcurrentStreams,
    peakLoadPercent: 70, spareCapacityPercent: 30, failedPercent: 0,
    estimatedDowntimeMinutes: 0, catalogueAvailabilityPercent: 100,
    regionalSinglePointFailures: [], warningSummary: 'Every commissioned region held.',
    countries: [], facilities: [], completedAtAbsoluteWeek: absoluteWeek,
  };
  const brokenRehearsal: OwnedStreamingLaunchRehearsalSnapshot = {
    ...rehearsal,
    verdict: 'BROKE',
    failedPercent: 38,
    estimatedDowntimeMinutes: 47,
    warningSummary: 'The exact opening-night configuration dropped viewers under surge.',
  };
  const failedPlayer = saveStreamingInfrastructureRehearsal(player, canonicalDraft, brokenRehearsal);
  const failedQuote = getStreamingOpeningCommissionQuote(failedPlayer, canonicalDraft, marketing);
  assert.equal(failedQuote.ready, false, 'A failed rehearsal must block the exact configuration before any money moves.');
  assert.equal(
    failedQuote.blockers.some(blocker => blocker.toLowerCase().includes('rehearsal')),
    true,
    'The blocked commission quote must explain that rehearsal evidence failed.',
  );
  player = saveStreamingInfrastructureRehearsal(player, canonicalDraft, rehearsal);
  const signature = getStreamingLaunchDefinitionSignature(player);
  player = {
    ...player,
    ownedStreamingPlatform: {
      ...player.ownedStreamingPlatform,
      launchProgram: {
        ...player.ownedStreamingPlatform.launchProgram,
        lastBlueprintSignature: signature,
        blueprintSavedAtAbsoluteWeek: absoluteWeek,
      },
    },
  };
  return { player, draft: player.ownedStreamingPlatform.infrastructureSetupDraft!, marketing };
};

const prepared = createReadyPlayer();
assert.equal(prepared.player.ownedStreamingPlatform.foundingProfile?.incorporationModel, 'FIXED_V8_ZERO_TREASURY',
  'The commissioned-career fixture must begin with a real zero-treasury incorporation.');
assert.equal(prepared.player.ownedStreamingPlatform.finance.capitalActions.some(action =>
  action.type === 'FOUNDER_CONTRIBUTION' && action.amount === 10_000_000_000), true,
  'The same career must fund its company through the canonical founder-capital transaction.');
assert.equal(prepared.player.ownedStreamingPlatform.marketOperations.every(operation =>
  operation.committedAtAbsoluteWeek !== null && operation.clearance !== null), true,
  'The same opening markets must be filed and government-reviewed rather than hand-created ready records.');
assert.equal(prepared.player.ownedStreamingPlatform.serviceConfiguration.pricing.introOffer, 20,
  'The journey must save a real introductory price configuration before Build.');
assert.equal(prepared.player.ownedStreamingPlatform.serviceConfiguration.pricing.introOfferPlanId, 'BASIC',
  'The introductory discount must retain its selected plan across the Build draft.');
const partlyUnfiled = persisted(prepared.player);
const unfiledOperation = partlyUnfiled.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US')!;
unfiledOperation.status = 'PLANNED';
unfiledOperation.committedAtAbsoluteWeek = null;
unfiledOperation.clearance = null;
const unfiledQuote = getStreamingOpeningCommissionQuote(partlyUnfiled, prepared.draft, prepared.marketing);
assert.equal(unfiledQuote.ready, false, 'Commissioning must not file a merely planned market as a side effect.');
assert.equal(unfiledQuote.blockers.some(blocker => blocker.includes('File every selected opening market')), true);
const unfiledCommission = commissionStreamingOpeningProgramme(partlyUnfiled, {
  infrastructureDraft: prepared.draft,
  marketingForecast: prepared.marketing,
  openingCountryIds: ['US', 'GB', 'IN'],
  expectedLaunchDefinitionSignature: getStreamingLaunchDefinitionSignature(partlyUnfiled),
});
assert.equal(unfiledCommission.changed, false);
assert.equal(unfiledCommission.player.ownedStreamingPlatform.treasuryCash, partlyUnfiled.ownedStreamingPlatform.treasuryCash);
assert.equal(unfiledCommission.player.energy.current, partlyUnfiled.energy.current);
const thinDraft = {
  ...prepared.draft,
  facilities: prepared.draft.facilities?.slice(0, 1),
  networkPlacements: prepared.draft.networkPlacements.slice(0, 1),
};
const thinForecast = getStreamingInfrastructureForecast(prepared.player, thinDraft);
thinDraft.lastLaunchRehearsal = {
  ...prepared.draft.lastLaunchRehearsal!,
  configurationSignature: thinForecast.configurationSignature,
  verdict: 'HELD',
};
const thinQuote = getStreamingOpeningCommissionQuote(prepared.player, thinDraft, prepared.marketing);
assert.equal(thinQuote.ready, false, 'A passed routed-load rehearsal cannot commission uncovered opening markets.');
assert.equal(thinQuote.blockers.some(blocker => blocker.includes('geographic coverage')), true,
  'The canonical quote must name the separate coverage failure before money or energy moves.');
const thinCommission = commissionStreamingOpeningProgramme(prepared.player, {
  infrastructureDraft: thinDraft,
  marketingForecast: prepared.marketing,
  openingCountryIds: ['US', 'GB', 'IN'],
  expectedLaunchDefinitionSignature: getStreamingLaunchDefinitionSignature(prepared.player),
});
assert.equal(thinCommission.changed, false, 'The transaction cannot bypass the geographic commission gate.');
assert.equal(thinCommission.reason, 'NOT_READY');
assert.equal(thinCommission.player.ownedStreamingPlatform.treasuryCash,
  prepared.player.ownedStreamingPlatform.treasuryCash, 'A coverage failure cannot move treasury cash.');
assert.equal(thinCommission.player.energy.current, prepared.player.energy.current,
  'A coverage failure cannot spend filing energy.');
const defineTrack = getStreamingLaunchProgramView(prepared.player).tracks.find(track => track.id === 'DEFINE_LAUNCH');
assert.equal(defineTrack?.completedCount, defineTrack?.totalCount, 'The new-career acceptance path must finish every Define Launch milestone before Build commission.');
const draftReloaded = persisted(prepared.player);
assert.deepEqual(draftReloaded.ownedStreamingPlatform.infrastructureSetupDraft?.regionPlans, regionPlans, 'Draft regional intent must survive save/reload before commission.');
assert.equal(draftReloaded.ownedStreamingPlatform.fibre?.level, 4, 'Installed fibre must survive save/reload before commission.');

const quote = getStreamingOpeningCommissionQuote(draftReloaded, prepared.draft, prepared.marketing);
assert.equal(quote.ready, true, `Lifecycle fixture must be commissionable: ${quote.blockers.join(' | ')}`);
const treasuryBeforeCommission = draftReloaded.ownedStreamingPlatform.treasuryCash;
const commissioned = commissionStreamingOpeningProgramme(draftReloaded, {
  infrastructureDraft: prepared.draft,
  marketingForecast: prepared.marketing,
  openingCountryIds: ['US', 'GB', 'IN'],
  expectedLaunchDefinitionSignature: getStreamingLaunchDefinitionSignature(draftReloaded),
});
assert.equal(commissioned.reason, 'COMMISSIONED');
assert.equal(commissioned.changed, true);
assert.equal(
  commissioned.player.ownedStreamingPlatform.treasuryCash,
  treasuryBeforeCommission - quote.totalCashRequired,
  'Commission must deduct the disclosed due-now amount exactly once.',
);
assert.deepEqual(commissioned.player.ownedStreamingPlatform.infrastructureSetup?.regionPlans, regionPlans, 'Commission must freeze regional intent.');
assert.equal(commissioned.player.ownedStreamingPlatform.infrastructureSetup?.facilities?.length, facilities.length, 'Commission must freeze every physical and cloud facility.');
assert.equal(commissioned.player.ownedStreamingPlatform.infrastructureSetup?.loadTest.launchRehearsal?.verdict, 'HELD', 'Commission must retain exact rehearsal evidence.');
assert.equal((commissioned.player.ownedStreamingPlatform.openingProgrammeCommission as any)?.totalCashRequired, quote.totalCashRequired, 'Commission must freeze the accepted due-now quote with its signatures.');

const repeatedCommission = commissionStreamingOpeningProgramme(commissioned.player, {
  infrastructureDraft: prepared.draft,
  marketingForecast: prepared.marketing,
  openingCountryIds: ['US', 'GB', 'IN'],
  expectedLaunchDefinitionSignature: getStreamingLaunchDefinitionSignature(commissioned.player),
});
assert.equal(repeatedCommission.reason, 'ALREADY_COMMISSIONED');
assert.equal(repeatedCommission.changed, false);
assert.equal(repeatedCommission.player.ownedStreamingPlatform.treasuryCash, commissioned.player.ownedStreamingPlatform.treasuryCash, 'Duplicate commission must never charge again.');

let constructionPlayer = persisted(commissioned.player);
const setup = constructionPlayer.ownedStreamingPlatform.infrastructureSetup!;
assert.deepEqual(setup.regionPlans, regionPlans, 'Commissioned regional intent must survive immediate reload.');
assert.equal(setup.facilities?.flatMap(facility => facility.rackGroups || []).some(group => group.serverTier === 'SCOUT'), true);
assert.equal(setup.facilities?.flatMap(facility => facility.rackGroups || []).some(group => group.serverTier === 'WORKHORSE'), true);
assert.equal(setup.facilities?.flatMap(facility => facility.rackGroups || []).some(group => group.serverTier === 'TITAN'), true);
assert.equal(setup.facilities?.some(facility => facility.type === 'CLOUD_ALLOCATION'), true);

const executing = getStreamingOpeningProgrammeView(constructionPlayer);
assert.equal(executing.state, 'EXECUTING');
assert.equal(new Set(executing.workstreams.map(item => item.id)).size, executing.workstreams.length, 'Every commissioned workstream must appear exactly once.');
assert.equal(executing.workstreams.find(item => item.id === 'REHEARSAL')?.status, 'PASSED');

const halfwayWeek = setup.committedAtAbsoluteWeek + Math.max(1, Math.floor((setup.readyAtAbsoluteWeek - setup.committedAtAbsoluteWeek) / 2));
constructionPlayer = persisted(atAbsoluteWeek(constructionPlayer, halfwayWeek));
const halfway = getStreamingOpeningProgrammeView(constructionPlayer);
assert.equal(halfway.state, 'EXECUTING');
assert.equal(halfway.workstreams.find(item => item.id === 'INFRASTRUCTURE')?.remainingWeeks, setup.readyAtAbsoluteWeek - halfwayWeek);
assert.deepEqual(constructionPlayer.ownedStreamingPlatform.infrastructureSetup?.regionPlans, regionPlans, 'Mid-build reload must not re-derive the commissioned plan.');

const readyPlayer = persisted(atAbsoluteWeek(constructionPlayer, setup.readyAtAbsoluteWeek));
const readyView = getStreamingOpeningProgrammeView(readyPlayer);
assert.equal(readyView.state, 'READY_TO_OPEN');
assert.equal(getStreamingLaunchReadiness(readyPlayer).canLaunch, true, 'Opening Night must unlock only when the commissioned programme is ready.');
const launched = commitOwnedStreamingLaunch(readyPlayer, 'STANDARD');
assert.equal(launched.changed, true);
assert.equal(launched.player.ownedStreamingPlatform.lifecycle, 'ACTIVE');
assert.deepEqual(launched.player.ownedStreamingPlatform.infrastructureSetup?.regionPlans, regionPlans, 'Opening Night must keep the commissioned network unchanged.');

const liveWeek = atAbsoluteWeek(launched.player, setup.readyAtAbsoluteWeek + 1);
const firstLiveWeek = processOwnedStreamingPlatformWeek(liveWeek);
assert.equal(firstLiveWeek.processed, true);
assert(firstLiveWeek.snapshot, 'The first post-launch week must produce one operating snapshot.');
assert.equal(firstLiveWeek.snapshot.operations?.infrastructureCost, setup.weeklyOperatingCost, 'Weekly accounts must use the commissioned infrastructure cost.');
const replayedLiveWeek = processOwnedStreamingPlatformWeek(firstLiveWeek.player);
assert.equal(replayedLiveWeek.snapshot, null, 'The same committed week must not produce a second operating snapshot.');
assert.equal(replayedLiveWeek.player.ownedStreamingPlatform.treasuryCash, firstLiveWeek.player.ownedStreamingPlatform.treasuryCash, 'The same committed week must not bill twice.');

const liveSetupBeforeExpansion = clone(firstLiveWeek.player.ownedStreamingPlatform.infrastructureSetup!);
const activeStrategyBeforeExpansion = firstLiveWeek.player.ownedStreamingPlatform.infrastructureStrategy;
const expansionBase = createDefaultStreamingInfrastructureDraft(firstLiveWeek.player);
const expansionDraft: OwnedStreamingInfrastructureSetupDraft = {
  ...expansionBase,
  strategy: 'CLOUD_FIRST',
  regionPlans: expansionBase.regionPlans?.map(plan => plan.regionId === 'EUROPE'
    ? { ...plan, serverCounts: { ...plan.serverCounts, WORKHORSE: plan.serverCounts.WORKHORSE + 1 } }
    : plan),
  facilities: expansionBase.facilities?.map(facility => facility.id === 'phase6-ldn-cage'
    ? {
      ...facility,
      installedRacks: facility.installedRacks + 1,
      rackGroups: [...(facility.rackGroups || []), { id: 'phase6-ldn-expansion', name: 'Expansion cache', rackCount: 1, duty: 'REGIONAL_CACHE' as const, serverTier: 'WORKHORSE' as const }],
    }
    : facility),
  networkPlacements: expansionBase.networkPlacements.map(placement => placement.cityId === 'LDN'
    ? { ...placement, racks: placement.racks + 1 }
    : placement),
};
const savedExpansion = saveStreamingInfrastructureDraft(firstLiveWeek.player, expansionDraft);
const testedExpansion = runStreamingInfrastructureLoadTest(savedExpansion);
const treasuryBeforeExpansion = testedExpansion.player.ownedStreamingPlatform.treasuryCash;
const expansionCommit = commitStreamingInfrastructureSetup(testedExpansion.player);
assert.equal(expansionCommit.changed, true, 'A tested live expansion must become a construction change order.');
assert.deepEqual(expansionCommit.player.ownedStreamingPlatform.infrastructureSetup, liveSetupBeforeExpansion, 'Commissioning an expansion must not replace the operating network before construction completes.');
assert((expansionCommit.player.ownedStreamingPlatform as any).pendingInfrastructureSetup, 'A live expansion must persist as a separate pending revision.');
assert.equal(expansionCommit.player.ownedStreamingPlatform.infrastructureStrategy, activeStrategyBeforeExpansion, 'A pending change order must not alter the operating strategy before construction completes.');
assert.equal(expansionCommit.player.ownedStreamingPlatform.pendingInfrastructureSetup?.strategy, 'CLOUD_FIRST', 'The pending revision must freeze its new strategy.');
assert.equal(
  expansionCommit.player.ownedStreamingPlatform.treasuryCash,
  treasuryBeforeExpansion - expansionCommit.forecast.transactionCost,
  'A live change order must charge its disclosed transaction cost exactly once.',
);

const duplicateExpansion = commitStreamingInfrastructureSetup(
  expansionCommit.player,
  testedExpansion.player.ownedStreamingPlatform.infrastructureSetupDraft,
);
assert.equal(duplicateExpansion.changed, false, 'Retrying the same paid change order must be idempotent.');
assert.equal(duplicateExpansion.reason, 'ALREADY_CONFIGURED');
assert.equal(duplicateExpansion.player.ownedStreamingPlatform.treasuryCash, expansionCommit.player.ownedStreamingPlatform.treasuryCash, 'Retrying a change order must not charge twice.');

const expansionReloaded = persisted(expansionCommit.player);
const pendingExpansion = expansionReloaded.ownedStreamingPlatform.pendingInfrastructureSetup!;
assert(pendingExpansion, 'The pending revision must survive save/reload.');
assert.equal(expansionReloaded.ownedStreamingPlatform.infrastructureSetup?.revision, liveSetupBeforeExpansion.revision, 'Reload must keep the prior revision active during construction.');

const expansionReadyWeek = atAbsoluteWeek(expansionReloaded, pendingExpansion.readyAtAbsoluteWeek);
const completedExpansion = processOwnedStreamingPlatformWeek(expansionReadyWeek);
assert.equal(completedExpansion.processed, true, 'The weekly loop must complete a due infrastructure revision.');
assert.equal(completedExpansion.player.ownedStreamingPlatform.pendingInfrastructureSetup, null, 'Completion must clear the pending change order.');
assert.equal(completedExpansion.player.ownedStreamingPlatform.infrastructureSetup?.revision, pendingExpansion.revision, 'Completion must promote the exact paid revision.');
assert.equal(completedExpansion.player.ownedStreamingPlatform.infrastructureStrategy, 'CLOUD_FIRST', 'Completion must activate the pending revision strategy.');
assert.deepEqual(completedExpansion.player.ownedStreamingPlatform.infrastructureSetup?.regionPlans, pendingExpansion.regionPlans, 'Completion must preserve the commissioned regional plan exactly.');
assert.equal(completedExpansion.player.ownedStreamingPlatform.capacity.baselineConcurrentStreams, pendingExpansion.baselineConcurrentStreams, 'Operational capacity must switch only when construction completes.');
assert.equal(completedExpansion.snapshot?.operations?.infrastructureCost, pendingExpansion.weeklyOperatingCost, 'The completion week must bill the newly operational network once.');

const completedReload = persisted(completedExpansion.player);
const replayedCompletionWeek = processOwnedStreamingPlatformWeek(completedReload);
assert.equal(replayedCompletionWeek.snapshot, null, 'Reloading and retrying a completed week must not produce another bill.');
assert.equal(replayedCompletionWeek.player.ownedStreamingPlatform.treasuryCash, completedReload.ownedStreamingPlatform.treasuryCash, 'Reloading the completion week must not charge or bill again.');
assert.equal(
  replayedCompletionWeek.player.ownedStreamingPlatform.eventLedger.filter(entry => entry.idempotencyKey.startsWith('infrastructure-operational:')).length,
  1,
  'A completed revision must receive exactly one operational milestone.',
);

/* The second acceptance path starts from a deliberately old-shaped save: it
   has no regional plan and no rack-tier fields. The normalizer must restore a
   canonical draft, after which the same paid lifecycle must remain playable
   through commission, construction, launch, expansion and another live week. */
const legacyPlayer = clone(prepared.player) as Player;
legacyPlayer.id = 'phase8-migrated-career';
const legacyPlatform = clone(legacyPlayer.ownedStreamingPlatform) as any;
legacyPlatform.schemaVersion = 7;
delete legacyPlatform.infrastructureSetupDraft.regionPlans;
legacyPlatform.infrastructureSetupDraft.lastLaunchRehearsal = null;
legacyPlatform.infrastructureSetupDraft.facilities.forEach((facility: any) => {
  facility.rackGroups?.forEach((group: any) => delete group.serverTier);
});
legacyPlatform.launchProgram.lastBlueprintSignature = null;
let migratedPlayer: Player = {
  ...legacyPlayer,
  ownedStreamingPlatform: normalizeOwnedStreamingPlatformState(legacyPlatform, legacyPlayer.id),
};
let migratedDraft = migratedPlayer.ownedStreamingPlatform.infrastructureSetupDraft!;
assert(migratedDraft.regionPlans?.length, 'A migrated city-era save must derive canonical regional intent.');
assert.equal(
  migratedDraft.facilities?.flatMap(facility => facility.rackGroups || []).every(group => group.serverTier === 'WORKHORSE'),
  true,
  'Legacy untyped machines must migrate deterministically to Workhorse.',
);

const migratedForecast = getStreamingInfrastructureForecast(migratedPlayer, migratedDraft);
const migratedBroken: OwnedStreamingLaunchRehearsalSnapshot = {
  configurationSignature: migratedForecast.configurationSignature,
  scenario: 'SURGE', verdict: 'BROKE', peakConcurrentStreams: 1_800_000,
  steadyCapacity: migratedForecast.baselineConcurrentStreams, burstCapacity: migratedForecast.burstConcurrentStreams,
  peakLoadPercent: 138, spareCapacityPercent: 0, failedPercent: 31,
  estimatedDowntimeMinutes: 41, catalogueAvailabilityPercent: 100,
  regionalSinglePointFailures: ['EUROPE'], warningSummary: 'The migrated configuration failed surge rehearsal.',
  countries: [], facilities: [], completedAtAbsoluteWeek: getAbsoluteWeek(migratedPlayer.age, migratedPlayer.currentWeek),
};
migratedPlayer = saveStreamingInfrastructureRehearsal(migratedPlayer, migratedDraft, migratedBroken);
assert.equal(
  getStreamingOpeningCommissionQuote(migratedPlayer, migratedDraft, prepared.marketing).ready,
  false,
  'A migrated save must not bypass a failed rehearsal.',
);
const migratedHeld: OwnedStreamingLaunchRehearsalSnapshot = {
  ...migratedBroken,
  scenario: 'LIKELY', verdict: 'HELD', peakConcurrentStreams: 1_200_000,
  peakLoadPercent: 72, spareCapacityPercent: 28, failedPercent: 0,
  estimatedDowntimeMinutes: 0, regionalSinglePointFailures: [],
  warningSummary: 'The migrated configuration held after canonical review.',
};
migratedPlayer = saveStreamingInfrastructureRehearsal(migratedPlayer, migratedDraft, migratedHeld);
migratedPlayer = {
  ...migratedPlayer,
  ownedStreamingPlatform: {
    ...migratedPlayer.ownedStreamingPlatform,
    launchProgram: {
      ...migratedPlayer.ownedStreamingPlatform.launchProgram,
      lastBlueprintSignature: getStreamingLaunchDefinitionSignature(migratedPlayer),
      blueprintSavedAtAbsoluteWeek: getAbsoluteWeek(migratedPlayer.age, migratedPlayer.currentWeek),
    },
  },
};
migratedDraft = migratedPlayer.ownedStreamingPlatform.infrastructureSetupDraft!;
const migratedQuote = getStreamingOpeningCommissionQuote(migratedPlayer, migratedDraft, prepared.marketing);
assert.equal(migratedQuote.ready, true, `Migrated Money and readiness review must pass: ${migratedQuote.blockers.join(' | ')}`);
const migratedCommission = commissionStreamingOpeningProgramme(migratedPlayer, {
  infrastructureDraft: migratedDraft,
  marketingForecast: prepared.marketing,
  openingCountryIds: ['US', 'GB', 'IN'],
  expectedLaunchDefinitionSignature: getStreamingLaunchDefinitionSignature(migratedPlayer),
});
assert.equal(migratedCommission.changed, true, 'A normalized old save must commission through the canonical transaction.');
let migratedConstruction = persisted(migratedCommission.player);
const migratedSetup = migratedConstruction.ownedStreamingPlatform.infrastructureSetup!;
migratedConstruction = persisted(atAbsoluteWeek(migratedConstruction, migratedSetup.readyAtAbsoluteWeek));
assert.equal(getStreamingOpeningProgrammeView(migratedConstruction).state, 'READY_TO_OPEN');
const migratedLaunch = commitOwnedStreamingLaunch(migratedConstruction, 'STANDARD');
assert.equal(migratedLaunch.changed, true, 'A migrated career must unlock Opening Night after construction.');
let migratedLive = processOwnedStreamingPlatformWeek(atAbsoluteWeek(migratedLaunch.player, migratedSetup.readyAtAbsoluteWeek + 1));
assert.equal(migratedLive.processed, true, 'A migrated career must enter live weekly simulation.');

const migratedExpansionBase = createDefaultStreamingInfrastructureDraft(migratedLive.player);
const migratedExpansion: OwnedStreamingInfrastructureSetupDraft = {
  ...migratedExpansionBase,
  regionPlans: migratedExpansionBase.regionPlans?.map((plan, index) => index === 0
    ? { ...plan, serverCounts: { ...plan.serverCounts, WORKHORSE: plan.serverCounts.WORKHORSE + 1 } }
    : plan),
  facilities: migratedExpansionBase.facilities?.map((facility, index) => index === 0
    ? {
      ...facility,
      installedRacks: facility.installedRacks + 1,
      rackGroups: [...(facility.rackGroups || []), {
        id: `${facility.id}:phase8-expansion`, name: 'Migration expansion', rackCount: 1,
        duty: 'REGIONAL_CACHE' as const, serverTier: 'WORKHORSE' as const,
      }],
    }
    : facility),
  networkPlacements: migratedExpansionBase.networkPlacements.map((placement, index) => index === 0
    ? { ...placement, racks: placement.racks + 1 }
    : placement),
};
const migratedExpansionSaved = saveStreamingInfrastructureDraft(migratedLive.player, migratedExpansion);
const migratedExpansionTested = runStreamingInfrastructureLoadTest(migratedExpansionSaved);
const migratedExpansionCommit = commitStreamingInfrastructureSetup(migratedExpansionTested.player);
assert.equal(migratedExpansionCommit.changed, true, 'A migrated live career must accept a tested expansion.');
const migratedPending = migratedExpansionCommit.player.ownedStreamingPlatform.pendingInfrastructureSetup!;
assert(migratedPending, 'The migrated expansion must persist as a pending revision.');
const migratedExpansionComplete = processOwnedStreamingPlatformWeek(
  atAbsoluteWeek(persisted(migratedExpansionCommit.player), migratedPending.readyAtAbsoluteWeek),
);
assert.equal(migratedExpansionComplete.player.ownedStreamingPlatform.pendingInfrastructureSetup, null);
const migratedNextAbsoluteWeek = Math.max(
  migratedPending.readyAtAbsoluteWeek,
  migratedExpansionComplete.player.ownedStreamingPlatform.lastProcessedAbsoluteWeek ?? 0,
) + 1;
const migratedNextWeek = processOwnedStreamingPlatformWeek(
  atAbsoluteWeek(persisted(migratedExpansionComplete.player), migratedNextAbsoluteWeek),
);
assert.equal(
  migratedNextWeek.processed,
  true,
  `A migrated expanded career must advance another live week (ready ${migratedPending.readyAtAbsoluteWeek}, target ${migratedNextAbsoluteWeek}).`,
);
assert(migratedNextWeek.snapshot, 'The next migrated live week must emit an operating snapshot.');

console.log('Streaming regional network lifecycle and Phase 8 new/migrated career acceptance audit passed.');
