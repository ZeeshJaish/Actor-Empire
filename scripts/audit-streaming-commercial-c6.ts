import assert from 'node:assert/strict';
import type { Player, StreamingTitleAccessMode } from '../types';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { configureStreamingPricingOffer, projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { createWorldStreamingCustomerState, normalizeWorldStreamingCustomerState } from '../services/worldEconomy/worldStreamingCustomers';
import { normalizeWorldStreamingAudienceChoiceState, settleWorldStreamingAudienceEntitlements } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { createWorldStreamingViewingState, getWorldStreamingPlayerViewingOutcome } from '../services/worldEconomy/worldStreamingViewing';
import { createWorldStreamingPlatformEconomyState } from '../services/worldEconomy/worldStreamingPlatformEconomy';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { evaluatePlayerStreamingTitleRoute } from '../services/streamingContentAvailability';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { processGameWeek } from '../services/gameLoop';
import { migratePlacementsToStreamingFacilities } from '../services/streamingFacilities';
import { deriveStreamingNetworkCoverage } from '../services/streamingNetworkCoverage';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { loadVerifiedGameData, saveVerifiedGameData, type SaveGenerationStore,
    type StoredSaveGeneration } from '../services/saveGenerations';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { getStreamingLaunchReadiness } from '../services/streamingLaunch';
import { getStreamingBuildMarketAccess } from '../services/streamingBuildMarketAccess';
import { reconstructStreamingRegionPlans } from '../services/streamingRegionalNetworkPlan';
import { quoteStreamingNetworkPlan } from '../services/streamingNetworkQuote';
import { createDefaultStreamingInfrastructureDraft, getStreamingInfrastructureForecast } from '../services/streamingInfrastructure';
import { createCanonicalBuildData } from '../services/streamingCanonicalBuildData';
import { getStreamingOpeningProgrammeView } from '../services/streamingOpeningProgramme';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';

type Core = 'SUBSCRIPTION' | 'ADVERTISING' | 'STORE' | 'HYBRID';
const baseWeek = getAbsoluteWeek(40, 12);

/** One contract, one US title and the same world for each commercial posture. */
const careerFixture = (core: Core, modes: StreamingTitleAccessMode[]): Player => {
    const player = createPlatformAiFixture();
    const platform = player.ownedStreamingPlatform;
    platform.lifecycle = 'ACTIVE';
    platform.identity = {
        name: `C6 ${core}`, slug: `c6-${core.toLowerCase()}`,
        primaryColor: '#f33', secondaryColor: '#111', logoKey: 'FRAME_PLAY',
        brandPromiseId: 'BALANCED', publicManifesto: '', dayOneMarketIds: ['US'],
        launchServerCityId: null, foundedAtAbsoluteWeek: baseWeek - 8,
    };
    platform.serviceConfiguration.source = 'PLAYER_ACTION';
    let pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing, {
        kind: 'CORE', coreModel: core === 'HYBRID' ? 'SUBSCRIPTION' : core,
    });
    if (core === 'HYBRID') {
        pricing = configureStreamingPricingOffer(pricing, { kind: 'TOGGLE', offer: 'ADS', enabled: true });
        pricing = configureStreamingPricingOffer(pricing, { kind: 'TOGGLE', offer: 'STORE', enabled: true });
    }
    if (core === 'ADVERTISING') {
        pricing = configureStreamingPricingOffer(pricing, { kind: 'PASS', duration: 'ONE_HOUR', price: 2 });
        pricing = configureStreamingPricingOffer(pricing, { kind: 'PASS', duration: 'DAY', price: 5 });
    }
    platform.serviceConfiguration.pricing = pricing;
    platform.catalogProjectIds = ['c6-title'];
    player.world.projects = [{
        id: 'c6-title', title: 'C6 Title', genre: 'DRAMA', originalLanguageId: 'English',
        mediaType: 'MOVIE', targetAudience: 'MASS', studioId: 'c6-external',
        budgetTier: 'MEDIUM', quality: 80, rating: 7.5, boxOffice: 40_000_000,
        year: player.age, weekReleased: player.currentWeek - 2,
        leadActorId: 'actor', leadActorName: 'Actor', directorId: 'director',
        directorName: 'Director', reviews: 'C6 fixture.',
    }] as any;
    const license = createStreamingLicenseContract({
        id: 'c6-license', sourceProject: { id: 'c6-title', title: 'C6 Title' },
        buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
        licensorName: 'C6 External', territory: 'GLOBAL', durationWeeks: 52,
        exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
        signedAtAbsoluteWeek: baseWeek - 8, startsAtAbsoluteWeek: baseWeek - 7,
        origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
        windowType: 'PERMANENT',
    });
    license.accessGrant = { schemaVersion: 1, modes, earlyWindowWeeks: 0,
        purchaseFulfillment: modes.includes('PURCHASE') ? 'PERPETUAL' : 'NONE', source: 'EXPLICIT' };
    platform.catalogLicenses = [license];
    platform.launchSlate = { entries: [{ id: 'c6-slate', projectId: 'c6-title', title: 'C6 Title',
        source: 'LICENSED_WINDOW', projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 1,
        releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' }],
        programmedAtAbsoluteWeek: baseWeek - 7, revision: 1 };
    platform.launchCommit = { id: 'c6-launch', idempotencyKey: `c6-launch:${core}`,
        committedAtAbsoluteWeek: baseWeek - 7, capacityPlan: 'STANDARD', capacityPlanCost: 0,
        readinessScore: 85, forecastLikelyConcurrentStreams: 150_000,
        forecastHighConcurrentStreams: 300_000, protectedPeakConcurrentStreams: 600_000,
        launchHeadroomPercent: 50, initialSubscribers: core === 'ADVERTISING' || core === 'STORE' ? 0 : 250_000,
        openingDemandIndex: 78, playbackSuccessRate: 99.5, outcomeTier: 'SMOOTH_OPENING',
        openingTitleCount: 1, openingOriginalTitle: 'C6 Title' };
    platform.metrics.subscribers = platform.launchCommit.initialSubscribers;
    platform.capacity = { baselineConcurrentStreams: 1_000_000, burstConcurrentStreams: 2_000_000 };
    platform.infrastructureSetup = {
        capacityPackageId: 'GROWTH', rolloutPace: 'STANDARD', storageCapacityHours: 40_000,
        reliabilityTarget: 99, weeklyOperatingCost: 100_000, staffRequired: 12,
        capitalInvested: 20_000_000, technicalDebt: 0, networkPlacements: [],
        facilities: migratePlacementsToStreamingFacilities([{ cityId: 'NYC', racks: 40, role: 'CORE_ORIGIN' }]),
        readyAtAbsoluteWeek: baseWeek - 8, revision: 1,
        committedAtAbsoluteWeek: baseWeek - 8,
        loadTest: { configurationSignature: 'c6-commissioned', forecastLowConcurrentStreams: 50_000,
            forecastLikelyConcurrentStreams: 100_000, forecastHighConcurrentStreams: 200_000,
            testedBurstCapacity: 2_000_000, headroomPercent: 90, status: 'PASS', driverKeys: [],
            completedAtAbsoluteWeek: baseWeek - 8 },
    };
    platform.weeklyHistory = [{ id: 'c6-previous', absoluteWeek: baseWeek - 1,
        subscribers: platform.metrics.subscribers, netSubscriberMovement: 0,
        churnRate: .02, engagementRate: .6, averageRevenuePerUser: 0,
        cashRunwayWeeks: 100, technologyHealth: 90,
        causeMarkers: [], operations: { programWeek: 7 } as any }];
    platform.treasuryCash = 200_000_000;
    return player;
};

const scenarioModes: Record<Core, StreamingTitleAccessMode[]> = {
    SUBSCRIPTION: ['SUBSCRIPTION'],
    ADVERTISING: ['AD_SUPPORTED'],
    STORE: ['RENTAL', 'PURCHASE'],
    HYBRID: ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL', 'PURCHASE'],
};

const diagnostics: Array<Record<string, number | string>> = [];
const phoneQaReadiness = getStreamingLaunchReadiness(createC6QaCareer());
assert.ok(createC6QaCareer().ownedStreamingPlatform.foundingProfile,
    'the isolated career must enter headquarters, not the first-incorporation wall');
assert.ok(phoneQaReadiness.canLaunch,
    `the isolated phone fixture must start at a genuinely launch-ready commission boundary: ${JSON.stringify(phoneQaReadiness.items.filter(item => item.tone === 'BLOCKED'))}`);
const buildQaCareer = createC6QaCareer('BUILD');
assert.equal(buildQaCareer.ownedStreamingPlatform.infrastructureSetup, null,
    'the manual Build QA career must have no commissioned network');
assert.equal(buildQaCareer.ownedStreamingPlatform.infrastructureSetupDraft, null,
    'the manual Build QA career must have no preselected draft');
assert.equal(buildQaCareer.ownedStreamingPlatform.pendingInfrastructureSetup, null,
    'the manual Build QA career must have no hidden construction order');
assert.equal(buildQaCareer.ownedStreamingPlatform.capacity.baselineConcurrentStreams, 0,
    'the manual Build QA career must have no usable starting capacity');
assert.deepEqual(getStreamingBuildMarketAccess(buildQaCareer).countryIds, ['US'],
    'a filed opening market must make the empty Build editable');
assert.equal(getStreamingLaunchReadiness(buildQaCareer).canLaunch, false,
    'a network-free career must not accidentally be ready to launch');
const quotedFacilities = migratePlacementsToStreamingFacilities([{ cityId: 'NYC', racks: 3, role: 'CORE_ORIGIN' }]);
const quotedRegions = reconstructStreamingRegionPlans(quotedFacilities);
const quotedDraft = {
    ...createDefaultStreamingInfrastructureDraft(buildQaCareer),
    strategy: 'HYBRID' as const,
    facilities: quotedFacilities,
    regionPlans: quotedRegions,
    networkPlacements: [{ cityId: 'NYC', racks: 3, role: 'CORE_ORIGIN' as const }],
};
assert.equal(
    getStreamingInfrastructureForecast(buildQaCareer, quotedDraft).transactionCost,
    quoteStreamingNetworkPlan({ facilities: quotedFacilities, regionPlans: quotedRegions }).totals.dueNow,
    'the canonical Build quote must equal the infrastructure amount charged at commissioning',
);
assert.equal(
    getStreamingInfrastructureForecast(buildQaCareer, quotedDraft).weeklyOperatingCost,
    quoteStreamingNetworkPlan({ facilities: quotedFacilities, regionPlans: quotedRegions }).totals.weeklyTotal,
    'the canonical weekly operating quote must equal the committed infrastructure cost',
);
const cloudBuild = createCanonicalBuildData({
    source: 'CAREER',
    regionPlans: [{ regionId: 'NORTH_AMERICA', serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 3 },
        cloudProvider: 'MERIDIAN', cloudCompute: 20 }],
    facilities: [], openingCountryIds: ['US'], forecastConcurrentStreams: 1_000_000,
    absoluteWeek: baseWeek,
});
const cloudDraft = {
    ...createDefaultStreamingInfrastructureDraft(buildQaCareer),
    strategy: 'HYBRID' as const,
    regionPlans: cloudBuild.regionPlans,
    facilities: cloudBuild.facilities,
    networkPlacements: cloudBuild.placements,
};
const cloudForecast = getStreamingInfrastructureForecast(buildQaCareer, cloudDraft);
assert.equal(cloudForecast.transactionCost, cloudBuild.quote.totals.dueNow,
    'rented cloud capacity must not be billed as owned-rack capital at commission');
assert.equal(cloudForecast.weeklyOperatingCost, cloudBuild.quote.totals.weeklyTotal,
    'the cloud rental shown in Build must match the weekly operating commitment');
const cloudProgrammePlayer = createC6QaCareer();
cloudProgrammePlayer.ownedStreamingPlatform.infrastructureSetup = {
    ...cloudProgrammePlayer.ownedStreamingPlatform.infrastructureSetup!,
    facilities: cloudBuild.facilities,
    networkPlacements: cloudBuild.placements,
};
const reopenedCloud = normalizeOwnedStreamingPlatformState(
    cloudProgrammePlayer.ownedStreamingPlatform, cloudProgrammePlayer.id,
).infrastructureSetup!;
assert.equal(reopenedCloud.facilities.find(facility => facility.type === 'CLOUD_ALLOCATION')?.installedRacks, 20,
    'save normalization must preserve purchased cloud compute beyond the provider site footprint');
assert.equal(getStreamingOpeningProgrammeView(cloudProgrammePlayer).rackCount, 3,
    'the opening programme must count physical racks, not rented cloud compute as racks');
for (const core of Object.keys(scenarioModes) as Core[]) {
    const player = careerFixture(core, scenarioModes[core]);
    const customers = createWorldStreamingCustomerState(player, baseWeek);
    player.world.worldStreamingCustomers = customers;
    player.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, player, baseWeek);
    const viewing = createWorldStreamingViewingState(player, baseWeek);
    const outcome = getWorldStreamingPlayerViewingOutcome(viewing)!;
    const economy = createWorldStreamingPlatformEconomyState({ ...player,
        world: { ...player.world, worldStreamingViewing: viewing } }, baseWeek);
    const cash = economy.platforms.PLAYER!;
    assert.ok(outcome && cash, `${core}: the player must have a viewing and economy row`);
    if (core === 'ADVERTISING' || core === 'STORE') {
        assert.equal(customers.global.playerEndingPaidAccounts, 0,
            `${core}: free or transactional accounts cannot become paid subscribers`);
        assert.equal(cash.weeklySubscriptionRevenue, 0,
            `${core}: no recurring plan means no subscription receipts`);
    } else {
        assert.ok(customers.global.playerEndingPaidAccounts > 0,
            `${core}: paid membership needs a real subscriber cohort`);
        const paidCells = Object.values(customers.countries).flatMap(country => country.cohorts.flatMap(cohort => (
            cohort.planCells.filter(cell => cell.platformId === 'PLAYER').map(cell => ({ cell, path: cohort.billingPath }))
        )));
        assert.equal(paidCells.reduce((sum, row) => sum + row.cell.paidAccounts, 0),
            customers.global.playerEndingPaidAccounts,
            `${core}: monthly and annual billing cells must reconcile to paid subscribers`);
        assert.ok(paidCells.some(row => row.path === 'MONTHLY' && row.cell.paidAccounts > 0),
            `${core}: the fixture must exercise monthly buyers`);
        assert.ok(paidCells.some(row => row.path === 'ANNUAL' && row.cell.paidAccounts > 0),
            `${core}: the fixture must exercise annual buyers`);
    }
    assert.equal(cash.weeklyIncrementalRevenue, outcome.revenue.totalIncrementalRevenue,
        `${core}: transaction/ad gross must reach the shared platform economy`);
    assert.ok(Math.abs(cash.weeklyRevenue - cash.appliedWeeklyOperatingCost - cash.weeklyOperatingResult) < .011,
        `${core}: gross minus costs must equal operating result`);
    const countryGross = Object.values(viewing.countries).reduce((sum, country) => sum
        + (country.platformPerformance?.PLAYER?.revenue.totalIncrementalRevenue || 0), 0);
    const countryCommercialCost = Object.values(viewing.countries).reduce((sum, country) => sum
        + (country.platformPerformance?.PLAYER?.revenue.commercialOperatingCost || 0), 0);
    assert.equal(countryGross, outcome.revenue.totalIncrementalRevenue,
        `${core}: country commercial receipts must reconcile to platform gross`);
    assert.equal(countryCommercialCost, outcome.revenue.commercialOperatingCost,
        `${core}: country commercial costs must reconcile to platform cost`);
    if (core === 'ADVERTISING') {
        assert.ok(outcome.revenue.advertisingRevenue > 0 && outcome.revenue.dayPassRevenue > 0,
            'free-ad launch should support both ads and optional passes');
        assert.equal(outcome.revenue.rentalRevenue, 0, 'an ad-free pass must not rent a title');
    }
    if (core === 'STORE') assert.ok(outcome.revenue.rentalRevenue > 0 && outcome.revenue.purchaseRevenue > 0,
        'store-only launch needs rights-valid rent and buy sales');
    const withViewing = settleWorldStreamingAudienceEntitlements({ ...player, world: { ...player.world,
        worldStreamingViewing: viewing, worldStreamingPlatformEconomy: economy } }, baseWeek);
    if (core === 'STORE' || core === 'HYBRID') {
        assert.ok((withViewing.world.worldStreamingAudienceChoice?.entitlements || []).length > 0,
            `${core}: settled title-country store sales must create entitlement receipts`);
    }
    const saved = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(withViewing))));
    assert.deepEqual(JSON.parse(JSON.stringify(projectStreamingCommercialOffers(saved.ownedStreamingPlatform.serviceConfiguration.pricing))),
        JSON.parse(JSON.stringify(projectStreamingCommercialOffers(player.ownedStreamingPlatform.serviceConfiguration.pricing))),
        `${core}: save compaction and migration must retain the exact offer`);
    assert.deepEqual(saved.world.worldStreamingViewing?.platforms.PLAYER?.revenue,
        viewing.platforms.PLAYER?.revenue,
        `${core}: save compaction and migration must retain unsettled commercial receipts`);
    assert.deepEqual(saved.world.worldStreamingAudienceChoice?.entitlements,
        withViewing.world.worldStreamingAudienceChoice?.entitlements,
        `${core}: save compaction and migration must retain title-country entitlement receipts`);
    assert.deepEqual(saved.ownedStreamingPlatform.catalogLicenses[0]?.accessGrant,
        withViewing.ownedStreamingPlatform.catalogLicenses[0]?.accessGrant,
        `${core}: save compaction and migration must retain the signed title access grant`);
    assert.deepEqual(migratePlayerSave(JSON.parse(JSON.stringify(saved))).world.worldStreamingViewing?.platforms.PLAYER?.revenue,
        saved.world.worldStreamingViewing?.platforms.PLAYER?.revenue,
        `${core}: migration must be idempotent for the active week`);
    const settled = processOwnedStreamingPlatformWeek(saved);
    const repeated = processOwnedStreamingPlatformWeek(settled.player);
    assert.equal(repeated.player.ownedStreamingPlatform.treasuryCash,
        settled.player.ownedStreamingPlatform.treasuryCash,
        `${core}: replaying the same week cannot credit cash twice`);
    assert.deepEqual(repeated.player.ownedStreamingPlatform.processedWeekKeys,
        settled.player.ownedStreamingPlatform.processedWeekKeys,
        `${core}: replaying the same week cannot add a new processing key`);
    diagnostics.push({ core, paid: customers.global.playerEndingPaidAccounts,
        freeViewers: outcome.accessMix.freeViewingAccounts || 0,
        incrementalGross: outcome.revenue.totalIncrementalRevenue,
        operatingResult: cash.weeklyOperatingResult });
}

const denied = careerFixture('ADVERTISING', []);
denied.world.worldStreamingCustomers = createWorldStreamingCustomerState(denied, baseWeek);
denied.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, denied, baseWeek);
const deniedOutcome = getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(denied, baseWeek));
assert.equal(deniedOutcome?.revenue.advertisingRevenue || 0, 0,
    'a title whose agreement forbids ad-supported access cannot earn ads');
assert.equal(deniedOutcome?.revenue.dayPassRevenue || 0, 0,
    'a pass cannot be sold without entitled ad viewing');

const oldSave = careerFixture('SUBSCRIPTION', ['SUBSCRIPTION']);
oldSave.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers = undefined;
const oldMoney = oldSave.ownedStreamingPlatform.treasuryCash;
const oldPaid = oldSave.ownedStreamingPlatform.metrics.subscribers;
const migrated = migratePlayerSave(JSON.parse(JSON.stringify(oldSave)));
assert.equal(migrated.ownedStreamingPlatform.treasuryCash, oldMoney,
    'legacy pricing migration cannot rewrite company cash');
assert.equal(migrated.ownedStreamingPlatform.metrics.subscribers, oldPaid,
    'legacy pricing migration cannot replay customer history');
assert.ok(projectStreamingCommercialOffers(migrated.ownedStreamingPlatform.serviceConfiguration.pricing).subscriptions.length > 0,
    'a legacy paid offer must remain sellable after migration');

const aiWorld = careerFixture('HYBRID', scenarioModes.HYBRID);
const offers = getWorldStreamingOffers(aiWorld, baseWeek).offers;
const ai = offers.filter(offer => !offer.isPlayer);
assert.ok(ai.some(offer => !offer.commercialConfiguration.streams.includes('subs')),
    'rivals must be able to run a non-subscription core offer');
assert.ok(ai.every(offer => !offer.commercialConfiguration.streams.includes('subs')
    ? offer.plans.every(plan => plan.monthlyPrice === 0) : true),
    'an AI free/store account must not publish a paid recurring plan');
const aiViewing = createWorldStreamingViewingState(aiWorld, baseWeek);
const transactionTotal = (aiViewing.aiStoreTransactions || []).reduce((sum, row) => sum + row.revenue, 0);
const platformStoreTotal = Object.entries(aiViewing.platforms).filter(([id]) => id !== 'PLAYER')
    .reduce((sum, [, row]) => sum + row.revenue.rentalRevenue + row.revenue.purchaseRevenue, 0);
assert.ok((aiViewing.aiStoreTransactions || []).length > 0,
    'AI parity fixture must contain real rights-attributed store sales');
assert.equal(transactionTotal, platformStoreTotal,
    'AI title-contract sales must sum exactly to the AI platform store receipts');
const savedAi = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence({ ...aiWorld,
    world: { ...aiWorld.world, worldStreamingViewing: aiViewing } }))));
assert.deepEqual(savedAi.world.worldStreamingViewing?.aiStoreTransactions, aiViewing.aiStoreTransactions,
    'AI country/title/contract transactions survive a save round trip');

const early = careerFixture('SUBSCRIPTION', ['SUBSCRIPTION']);
early.ownedStreamingPlatform.launchSlate!.entries[0].launchWeek = 10;
const earlyPlanId = early.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].id;
early.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
    early.ownedStreamingPlatform.serviceConfiguration.pricing,
    { kind: 'BENEFIT', offer: 'PLAN', planId: earlyPlanId, premiumAccess: true, earlyAccessWeeks: 3 },
);
const withoutGrant = evaluatePlayerStreamingTitleRoute(early, 'c6-title', 'US', baseWeek,
    { kind: 'SUBSCRIPTION', planId: earlyPlanId });
assert.equal(withoutGrant.allowed, false, 'a plan benefit cannot outrun a zero-week rights grant');
early.ownedStreamingPlatform.catalogLicenses[0].accessGrant!.earlyWindowWeeks = 3;
const withGrant = evaluatePlayerStreamingTitleRoute(early, 'c6-title', 'US', baseWeek,
    { kind: 'SUBSCRIPTION', planId: earlyPlanId });
assert.equal(withGrant.allowed, true, 'eligible early access works when the title grant covers the window');

// A commissioned zero-capacity platform cannot deliver ad views or paid title
// streams. Pre-infrastructure saves with placeholder zero capacity remain playable.
const capacityRevenue = (core: 'ADVERTISING' | 'STORE', burstCapacity: number,
    withIncident = false, commissioned = true): number => {
    const player = careerFixture(core, scenarioModes[core]);
    player.ownedStreamingPlatform.capacity = {
        baselineConcurrentStreams: burstCapacity, burstConcurrentStreams: burstCapacity,
    };
    if (!commissioned) player.ownedStreamingPlatform.infrastructureSetup = null;
    if (withIncident) player.ownedStreamingPlatform.crisisSecurity.infrastructureOperations.incidents = [{
        id: 'c6-fibre-cut', idempotencyKey: 'c6-fibre-cut:key', type: 'FIBRE_CUT',
        severity: 'MAJOR', stage: 'DETECTED', title: 'Carrier failure', detail: 'C6 outage',
        cause: 'C6 outage', facilityId: 'c6-room', cityId: 'NYC',
        detectedAtAbsoluteWeek: baseWeek, affectedSubscribers: 100_000,
        capacityLossPercent: 40, conditionLossPercent: 8, responseAction: null,
        rerouteFacilityId: null, compensation: null, insuranceClaimed: false,
        responseCost: 0, insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: null,
        resolvedAtAbsoluteWeek: null, assistedHandled: false,
        publicReaction: 'Concern', subscriberReaction: 'Playback degraded', outcomeNote: null,
    }];
    player.world.worldStreamingCustomers = createWorldStreamingCustomerState(player, baseWeek);
    player.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, player, baseWeek);
    return getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(player, baseWeek))
        ?.revenue.totalIncrementalRevenue || 0;
};
console.log('C6 career/save matrix passed before delivery gate', diagnostics);
assert.deepEqual([capacityRevenue('ADVERTISING', 0), capacityRevenue('STORE', 0)], [0, 0],
    'zero stream capacity must not earn delivered ads, passes, rentals or purchases');
assert.ok(capacityRevenue('ADVERTISING', 0, false, false) > 0,
    'an older active save with only placeholder capacity must retain its pre-network behavior');
assert.equal(capacityRevenue('ADVERTISING', 0), capacityRevenue('ADVERTISING', 0),
    'replaying a commissioned outage must be deterministic');
const adNormal = capacityRevenue('ADVERTISING', 2_000_000);
const adThin = capacityRevenue('ADVERTISING', 20_000);
const adOutage = capacityRevenue('ADVERTISING', 20_000, true);
assert.ok(adNormal > adThin && adThin > adOutage && adOutage >= 0,
    'thin capacity and an unmitigated incident must progressively reduce delivered ad/pass receipts');
const storeNormal = capacityRevenue('STORE', 2_000_000);
const storeThin = capacityRevenue('STORE', 2_000);
console.log('C6 capacity receipts', { adNormal, adThin, adOutage, storeNormal, storeThin });
assert.ok(storeNormal > storeThin && storeThin > 0,
    'store transactions must require deliverable capacity but remain possible under a thin network');
console.log('C6 delivery gate passed');

// Country coverage must constrain the same delivered viewing that earns ads.
// A US room cannot monetize a launched UK catalogue merely because global
// concurrency is abundant; the UK route has no physical source.
const countryPlayer = careerFixture('ADVERTISING', scenarioModes.ADVERTISING);
const unopenedPlayer = careerFixture('ADVERTISING', scenarioModes.ADVERTISING);
unopenedPlayer.ownedStreamingPlatform.infrastructureSetup!.facilities!.push(
    ...migratePlacementsToStreamingFacilities([{ cityId: 'TOR', racks: 40, role: 'EDGE_CACHE' }]),
);
const unopenedFacilities = unopenedPlayer.ownedStreamingPlatform.infrastructureSetup!.facilities!;
const crossBorderSignal = deriveStreamingNetworkCoverage({ facilities: unopenedFacilities, openingCountryIds: ['US', 'CA'] });
assert.ok((crossBorderSignal.countries.find(row => row.countryId === 'CA')?.coveredShare || 0) > 0,
    'a Canadian node must provide real physical reach for the unopened-market check');
assert.ok(!getWorldStreamingOffers(unopenedPlayer, baseWeek).byCountry.CA?.includes('PLAYER'),
    'Canadian signal alone must not file a Canadian player offer');
unopenedPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(unopenedPlayer, baseWeek);
unopenedPlayer.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, unopenedPlayer, baseWeek);
const unopenedViewing = createWorldStreamingViewingState(unopenedPlayer, baseWeek);
assert.equal(unopenedViewing.countries.CA?.platformPerformance?.PLAYER?.revenue.totalIncrementalRevenue || 0, 0,
    'an unopened country must produce no player receipts despite physical coverage');
countryPlayer.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US', 'GB'];
const usRoom = countryPlayer.ownedStreamingPlatform.infrastructureSetup!.facilities![0];
const routeCoverage = deriveStreamingNetworkCoverage({ facilities: [usRoom], openingCountryIds: ['US', 'GB'] });
assert.ok((routeCoverage.countries.find(row => row.countryId === 'US')?.coveredShare || 0) > 0);
assert.equal(routeCoverage.countries.find(row => row.countryId === 'GB')?.coveredShare, 0);
countryPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(countryPlayer, baseWeek);
countryPlayer.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, countryPlayer, baseWeek);
const countryViewing = createWorldStreamingViewingState(countryPlayer, baseWeek);
const usDelivered = countryViewing.countries.US?.platformPerformance.PLAYER;
const gbDelivered = countryViewing.countries.GB?.platformPerformance.PLAYER;
assert.ok(countryViewing.countries.GB.accessibleAccounts > 0,
    'the UK must contain a real audience, or a dark-route test would be vacuous');
assert.ok(!getWorldStreamingOffers(countryPlayer, baseWeek).byCountry.GB?.includes('PLAYER'),
    'a dark route must be removed from the player offer before customer choice');
assert.ok(usDelivered && usDelivered.totalViewingAccounts > 0 && usDelivered.revenue.advertisingRevenue > 0,
    'the same launch must still deliver and monetize reachable US demand');
assert.equal(gbDelivered?.totalViewingAccounts || 0, 0,
    'a dark country route cannot produce delivered player viewing');
assert.equal(gbDelivered?.revenue.totalIncrementalRevenue || 0, 0,
    'a dark country route cannot earn ad or pass receipts');
const storeCountryPlayer = careerFixture('STORE', scenarioModes.STORE);
storeCountryPlayer.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US', 'GB'];
storeCountryPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(storeCountryPlayer, baseWeek);
storeCountryPlayer.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, storeCountryPlayer, baseWeek);
const storeCountryViewing = createWorldStreamingViewingState(storeCountryPlayer, baseWeek);
const usStore = storeCountryViewing.countries.US?.platformPerformance.PLAYER;
const gbStore = storeCountryViewing.countries.GB?.platformPerformance.PLAYER;
assert.ok(usStore && usStore.revenue.rentalRevenue + usStore.revenue.purchaseRevenue > 0,
    'a reachable market must still sell rights-valid titles');
assert.equal(storeCountryPlayer.world.worldStreamingAudienceChoice?.countries.GB.playerStoreHouseholds || 0, 0,
    'a dark-country store offer must not create a buyer pool');
assert.equal((gbStore?.revenue.rentalRevenue || 0) + (gbStore?.revenue.purchaseRevenue || 0), 0,
    'a dark country route cannot create rental or purchase receipts');
assert.equal(storeCountryViewing.platforms.PLAYER.revenue.totalIncrementalRevenue,
    usStore.revenue.totalIncrementalRevenue + (gbStore?.revenue.totalIncrementalRevenue || 0),
    'country receipts must reconcile to platform receipts after geographic gating');
const subscriptionCountryPlayer = careerFixture('SUBSCRIPTION', scenarioModes.SUBSCRIPTION);
subscriptionCountryPlayer.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US', 'GB'];
const subscriptionCountryCustomers = createWorldStreamingCustomerState(subscriptionCountryPlayer, baseWeek);
assert.equal(subscriptionCountryCustomers.countries.GB?.platformSummaries.find(row => row.platformId === 'PLAYER')?.monthlySubscriptionRevenue || 0, 0,
    'a dark country route cannot bill subscription households');
// Partial coverage must constrain who can subscribe, not discount the price
// paid by households who actually receive service. More US routes should
// increase the reachable subscriber pool under the same offer and seed.
const wideSubscriptionPlayer = careerFixture('SUBSCRIPTION', scenarioModes.SUBSCRIPTION);
wideSubscriptionPlayer.ownedStreamingPlatform.infrastructureSetup!.facilities = migratePlacementsToStreamingFacilities([
    { cityId: 'NYC', racks: 40, role: 'CORE_ORIGIN' },
    { cityId: 'LA', racks: 40, role: 'CORE_ORIGIN' },
    { cityId: 'CHI', racks: 40, role: 'CORE_ORIGIN' },
]);
const narrowCoverage = deriveStreamingNetworkCoverage({ facilities: [usRoom], openingCountryIds: ['US'] }).countries[0].coveredShare;
const wideCoverage = deriveStreamingNetworkCoverage({ facilities: wideSubscriptionPlayer.ownedStreamingPlatform.infrastructureSetup!.facilities, openingCountryIds: ['US'] }).countries[0].coveredShare;
assert.ok(wideCoverage > narrowCoverage && narrowCoverage > 0 && wideCoverage <= 1,
    'the test must compare genuinely partial and wider US network routes');
const narrowSubscriptions = createWorldStreamingCustomerState(careerFixture('SUBSCRIPTION', scenarioModes.SUBSCRIPTION), baseWeek)
    .countries.US.platformSummaries.find(row => row.platformId === 'PLAYER')!;
const wideSubscriptions = createWorldStreamingCustomerState(wideSubscriptionPlayer, baseWeek)
    .countries.US.platformSummaries.find(row => row.platformId === 'PLAYER')!;
assert.ok(wideSubscriptions.endingPaidAccounts > narrowSubscriptions.endingPaidAccounts,
    'more covered households must be able to subscribe under the same price and offer');
assert.ok(Math.abs(wideSubscriptions.monthlySubscriptionRevenue / wideSubscriptions.endingPaidAccounts
    - narrowSubscriptions.monthlySubscriptionRevenue / narrowSubscriptions.endingPaidAccounts) < .02,
    'geographic reach must not silently discount the price paid per subscriber');
const narrowViewingPlayer = careerFixture('SUBSCRIPTION', scenarioModes.SUBSCRIPTION);
narrowViewingPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(narrowViewingPlayer, baseWeek);
const wideViewingPlayer = wideSubscriptionPlayer;
wideViewingPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(wideViewingPlayer, baseWeek);
const narrowPaidViewing = createWorldStreamingViewingState(narrowViewingPlayer, baseWeek)
    .countries.US.platformPerformance.PLAYER.accessMix.paidViewingAccounts;
const widePaidViewing = createWorldStreamingViewingState(wideViewingPlayer, baseWeek)
    .countries.US.platformPerformance.PLAYER.accessMix.paidViewingAccounts;
assert.ok(Math.abs(narrowPaidViewing / narrowSubscriptions.endingPaidAccounts
    - widePaidViewing / wideSubscriptions.endingPaidAccounts) < .01,
    'already reach-qualified subscribers must not be geogated twice when they watch');
const routedSubscriptionPlayer = careerFixture('SUBSCRIPTION', scenarioModes.SUBSCRIPTION);
routedSubscriptionPlayer.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US', 'GB'];
routedSubscriptionPlayer.ownedStreamingPlatform.infrastructureSetup!.facilities = migratePlacementsToStreamingFacilities([
    { cityId: 'NYC', racks: 40, role: 'CORE_ORIGIN' },
    { cityId: 'LDN', racks: 40, role: 'CORE_ORIGIN' },
]);
const routedCustomers = createWorldStreamingCustomerState(routedSubscriptionPlayer, baseWeek);
assert.ok(routedCustomers.countries.GB.platformSummaries.find(row => row.platformId === 'PLAYER')!.endingPaidAccounts > 0);
const lostUkRoute = structuredClone(routedSubscriptionPlayer);
lostUkRoute.ownedStreamingPlatform.infrastructureSetup!.facilities = migratePlacementsToStreamingFacilities([
    { cityId: 'NYC', racks: 40, role: 'CORE_ORIGIN' },
]);
lostUkRoute.world.worldStreamingCustomers = routedCustomers;
const afterUkOutage = normalizeWorldStreamingCustomerState(routedCustomers, lostUkRoute, baseWeek + 1);
assert.equal(afterUkOutage.countries.GB.platformSummaries.find(row => row.platformId === 'PLAYER')?.monthlySubscriptionRevenue || 0, 0,
    'an existing subscriber in a newly dark country must not be billed for an unavailable service');

// Advance the actual Actor Empire week boundary from launch night, then reload
// the compacted career. This is not a direct WE6-only projection.
const auditFirstLiveWeek = async (): Promise<void> => {
    const launchNight = careerFixture('ADVERTISING', scenarioModes.ADVERTISING);
    launchNight.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek = baseWeek;
    launchNight.ownedStreamingPlatform.weeklyHistory = [];
    const firstLive = (await processGameWeek(structuredClone(launchNight))).player;
    assert.equal(getAbsoluteWeek(firstLive.age, firstLive.currentWeek), baseWeek + 1);
    assert.ok(firstLive.ownedStreamingPlatform.weeklyHistory.some(row => row.absoluteWeek === baseWeek + 1),
        'the first live week must create a real platform result');
    assert.ok(!firstLive.ownedStreamingPlatform.weeklyHistory.at(-1)?.operations?.nextWeekHook?.includes('approaching expiry'),
        'a perpetual catalogue licence must not be reported as the next expiry risk');
    assert.ok((firstLive.world.worldStreamingViewing?.countries.US?.platformPerformance.PLAYER?.revenue.advertisingRevenue || 0) > 0,
        'the full game loop must settle physically delivered ads in the covered market');
    const firstLiveReloaded = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(firstLive))));
    assert.deepEqual(firstLiveReloaded.world.worldStreamingViewing?.platforms.PLAYER?.revenue,
        firstLive.world.worldStreamingViewing?.platforms.PLAYER?.revenue,
        'the first live week must retain its exact settled receipts after save/reload');
    const records = new Map<string, unknown>();
    const store: SaveGenerationStore = {
        read: async key => structuredClone(records.get(key) ?? null),
        write: async (key, value) => { records.set(key, structuredClone(value)); },
        remove: async key => { records.delete(key); },
        promoteGeneration: async ({ keys }) => {
            const candidate = records.get(keys.candidate) as StoredSaveGeneration;
            assert.ok(candidate, 'the verified save candidate must be staged before promotion');
            records.set(keys.current, structuredClone(candidate.player));
            records.set(keys.integrity, structuredClone(candidate.manifest));
            records.delete(keys.candidate);
        },
        recoverGeneration: async () => { throw new Error('Recovery is not part of this journey'); },
        promoteGenerationBatch: async () => { throw new Error('Batch import is not part of this journey'); },
    };
    const prepared = prepareVerifiedPlayerForPersistence(firstLive, 'PROCESS_WEEK');
    await saveVerifiedGameData(store, 'c6-isolated-career', prepared.persistedPlayer, prepared.manifest);
    const loaded = await loadVerifiedGameData(store, 'c6-isolated-career');
    assert.equal(loaded.status, 'CURRENT', 'the first live week must reopen as a verified save generation');
    if (loaded.status !== 'CURRENT') return;
    assert.deepEqual(loaded.player.world.worldStreamingViewing?.platforms.PLAYER?.revenue,
        firstLive.world.worldStreamingViewing?.platforms.PLAYER?.revenue,
        'the signed save generation must retain exact first-week commercial receipts');
    assert.equal(loaded.player.ownedStreamingPlatform.weeklyHistory.filter(row => row.absoluteWeek === baseWeek + 1).length, 1,
        'the reopened career must contain one, not two, first-week operating results');
    console.log('C6 first-live-week signed-save journey passed');
};
auditFirstLiveWeek().catch(error => { console.error(error); process.exitCode = 1; });
