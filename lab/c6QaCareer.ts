import { createInitialOwnedStreamingPlatformState, type Player } from '../types';
import { createPlatformAiFixture } from '../scripts/helpers/platformAiFixture';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { migratePlacementsToStreamingFacilities } from '../services/streamingFacilities';
import { getStreamingLaunchDefinitionSignature } from '../services/streamingLaunchProgram';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';

/** Disposable, save-isolated game career for the C6 mobile launch walkthrough. */
export const createC6QaCareer = (stage: 'OPENING_NIGHT' | 'BUILD' | 'PRICING' = 'OPENING_NIGHT'): Player => {
    const player = createPlatformAiFixture();
    player.id = 'c6-isolated-phone-qa';
    player.name = 'C6 Phone QA';
    player.money = 1_000_000_000;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = player.ownedStreamingPlatform;
    platform.lifecycle = 'FOUNDING';
    platform.identity = {
        name: 'C6 Test+', slug: 'c6-test-plus', primaryColor: '#ff343b',
        secondaryColor: '#111827', logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED',
        publicManifesto: 'An isolated launch test.', foundedAtAbsoluteWeek: week - 8,
        dayOneMarketIds: ['US'], launchServerCityId: 'NYC',
    };
    platform.foundingProfile = {
        incorporationModel: 'FIXED_V7', founderCashCharged: 85_000_000,
        setupCostsConsumed: 70_000_000, openingTreasuryCash: 15_000_000,
        outsideCapitalRaisedAtIncorporation: 0, debtPrincipalAtIncorporation: 0,
        founderOwnershipPercentAtIncorporation: 100, founderWasCeoAtIncorporation: true,
        incorporatedAtAbsoluteWeek: week - 8,
    };
    platform.marketOperations = [{
        id: 'c6-market-us', idempotencyKey: 'c6-market-us', scope: 'COUNTRY', scopeId: 'US',
        countryId: 'US', regionId: 'NORTH_AMERICA', entryKind: 'OPENING', status: 'READY',
        plannedCosts: { rights: 0, compliance: 0, localization: 0, infrastructure: 0, other: 0, total: 0 },
        committedCosts: { rights: 0, compliance: 0, localization: 0, infrastructure: 0, other: 0, total: 0 },
        weeklyOperatingCost: 0, policySnapshot: null, plannedAtAbsoluteWeek: week - 8,
        committedAtAbsoluteWeek: week - 7, approvalReadyAtAbsoluteWeek: week - 5,
        activatedAtAbsoluteWeek: null, suspendedAtAbsoluteWeek: null, exitedAtAbsoluteWeek: null,
        source: 'PLAYER_ACTION',
    }];
    platform.serviceConfiguration.source = 'PLAYER_ACTION';
    platform.serviceConfiguration.soundIdentKey = 'PULSE';
    platform.serviceConfiguration.storefrontLayoutId = 'CINEMA';
    platform.serviceConfiguration.pricingApproach = 'PREMIUM';
    platform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        configureStreamingPricingOffer(configureStreamingPricingOffer(platform.serviceConfiguration.pricing,
            { kind: 'CORE', coreModel: 'SUBSCRIPTION' }),
            { kind: 'TOGGLE', offer: 'ADS', enabled: true }),
        { kind: 'TOGGLE', offer: 'STORE', enabled: true },
    );
    platform.serviceConfiguration.committedAtAbsoluteWeek = week - 7;
    platform.serviceConfiguration.revision = 1;
    player.world.projects = [{
        id: 'c6-qa-title', title: 'The First Signal', genre: 'DRAMA', originalLanguageId: 'English',
        mediaType: 'MOVIE', targetAudience: 'MASS', studioId: 'c6-qa-studio', budgetTier: 'MEDIUM',
        quality: 80, rating: 7.5, boxOffice: 40_000_000, year: player.age,
        weekReleased: player.currentWeek - 2, leadActorId: 'c6-actor', leadActorName: 'Test Actor',
        directorId: 'c6-director', directorName: 'Test Director', reviews: 'QA fixture.',
    }, {
        id: 'c6-qa-second', title: 'After the Signal', genre: 'COMEDY', originalLanguageId: 'English',
        mediaType: 'MOVIE', targetAudience: 'MASS', studioId: 'c6-qa-studio', budgetTier: 'MEDIUM',
        quality: 78, rating: 7.2, boxOffice: 30_000_000, year: player.age,
        weekReleased: player.currentWeek - 2, leadActorId: 'c6-actor', leadActorName: 'Test Actor',
        directorId: 'c6-director', directorName: 'Test Director', reviews: 'QA fixture.',
    }] as any;
    const license = createStreamingLicenseContract({
        id: 'c6-qa-license', sourceProject: { id: 'c6-qa-title', title: 'The First Signal' },
        buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
        licensorName: 'C6 QA Studio', territory: 'GLOBAL', durationWeeks: 52,
        exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
        signedAtAbsoluteWeek: week - 8, startsAtAbsoluteWeek: week - 7,
        origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
        windowType: 'PERMANENT',
    });
    license.accessGrant = { schemaVersion: 1, modes: ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL', 'PURCHASE'],
        earlyWindowWeeks: 0, purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT' };
    const secondLicense = { ...license, id: 'c6-qa-second-license', sourceProjectId: 'c6-qa-second',
        sourceProjectTitle: 'After the Signal' };
    platform.catalogLicenses = [license, secondLicense];
    platform.catalogProjectIds = ['c6-qa-title', 'c6-qa-second'];
    platform.starterCatalog = { packageId: 'BROAD_APPEAL', ownedProjectIds: [],
        licensedProjectIds: ['c6-qa-title', 'c6-qa-second'], establishedAtAbsoluteWeek: week - 7 };
    platform.originalCommissions = [{
        id: 'c6-qa-original-commission', scriptId: 'c6-qa-original-script',
        canonicalProjectId: 'c6-qa-original', title: 'Signal House', gapId: 'SERIES_RETENTION',
        projectType: 'SERIES', genre: 'MYSTERY', episodes: 8,
        producerStudioId: 'c6-qa-studio', producerStudioName: 'C6 QA Studio',
        commissionedByPlatformName: 'C6 Test+', productionBudgetCap: 20_000_000,
        productionFundingApplied: 20_000_000, status: 'GREENLIT',
        commissionedAtAbsoluteWeek: week - 8, greenlitAtAbsoluteWeek: week - 7,
    }];
    player.commitments = [{
        id: 'c6-qa-original', name: 'Signal House', type: 'JOB', energyCost: 0, income: 0,
        payoutType: 'LUMPSUM', projectPhase: 'AWAITING_RELEASE',
        projectDetails: { title: 'Signal House', type: 'SERIES', genre: 'MYSTERY' } as any,
    }];
    platform.launchSlate = { entries: [{ id: 'c6-qa-original-slate', projectId: 'c6-qa-original',
        title: 'Signal House', source: 'ORIGINAL', projectType: 'SERIES', genre: 'MYSTERY',
        launchWeek: 1, releasePattern: 'WEEKLY', marketingPlan: 'STANDARD' },
    { id: 'c6-qa-slate', projectId: 'c6-qa-title',
        title: 'The First Signal', source: 'LICENSED_WINDOW', projectType: 'MOVIE', genre: 'DRAMA',
        launchWeek: 1, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' },
    { id: 'c6-qa-second-slate', projectId: 'c6-qa-second',
        title: 'After the Signal', source: 'LICENSED_WINDOW', projectType: 'MOVIE', genre: 'COMEDY',
        launchWeek: 2, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' }],
        programmedAtAbsoluteWeek: week - 6, revision: 1 };
    platform.infrastructureSetup = {
        capacityPackageId: 'GROWTH', rolloutPace: 'STANDARD', storageCapacityHours: 40_000,
        reliabilityTarget: 99, weeklyOperatingCost: 100_000, staffRequired: 12,
        capitalInvested: 20_000_000, technicalDebt: 0, networkPlacements: [],
        facilities: migratePlacementsToStreamingFacilities([
            { cityId: 'NYC', racks: 40, role: 'CORE_ORIGIN' },
            { cityId: 'LA', racks: 40, role: 'CORE_ORIGIN' },
            { cityId: 'CHI', racks: 40, role: 'CORE_ORIGIN' },
        ]),
        readyAtAbsoluteWeek: week - 5, revision: 1, committedAtAbsoluteWeek: week - 7,
        loadTest: { configurationSignature: 'c6-qa-tested', forecastLowConcurrentStreams: 50_000,
            forecastLikelyConcurrentStreams: 100_000, forecastHighConcurrentStreams: 200_000,
            testedBurstCapacity: 2_000_000, headroomPercent: 90, status: 'PASS', driverKeys: [],
            completedAtAbsoluteWeek: week - 6 },
    };
    platform.capacity = { baselineConcurrentStreams: 1_000_000, burstConcurrentStreams: 2_000_000 };
    platform.treasuryCash = 200_000_000;
    platform.launchProgram.status = 'PLANNING';
    platform.launchProgram.lastBlueprintSignature = getStreamingLaunchDefinitionSignature(player);
    platform.launchProgram.blueprintSavedAtAbsoluteWeek = week - 5;
    if (stage === 'BUILD' || stage === 'PRICING') {
        platform.infrastructureSetup = null;
        platform.infrastructureSetupDraft = null;
        platform.pendingInfrastructureSetup = null;
        platform.capacity = { baselineConcurrentStreams: 0, burstConcurrentStreams: 0 };
    }
    if (stage === 'PRICING') {
        platform.serviceConfiguration.pricing = createInitialOwnedStreamingPlatformState(player.id).serviceConfiguration.pricing;
        platform.serviceConfiguration.pricingApproach = null;
        platform.launchProgram.lastBlueprintSignature = null;
        platform.launchProgram.blueprintSavedAtAbsoluteWeek = null;
    }
    return player;
};
