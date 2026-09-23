import assert from 'node:assert/strict';
import type { OwnedStreamingPricingConfiguration } from '../types';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import {
    calculateWorldStreamingCommercialRevenue,
    createAiStreamingCommercialConfiguration,
} from '../services/worldEconomy/worldStreamingCommercialEconomy';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { createWorldStreamingCustomerState } from '../services/worldEconomy/worldStreamingCustomers';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import {
    createWorldStreamingViewingState,
    getWorldStreamingPlayerViewingOutcome,
} from '../services/worldEconomy/worldStreamingViewing';

const pricing: OwnedStreamingPricingConfiguration = {
    streams: ['subs', 'ads', 'rentals'],
    plans: [{ id: 'STANDARD', name: 'Standard', monthly: 12, featureIds: ['hd'], ads: false }],
    annualDiscount: 15,
    introOffer: 0,
    ads: { minutesPerHour: 4, cpm: 20 },
    rentals: { rent: 6, buy: 20, windowWeeks: 6 },
    premium: { price: 30 },
    daypass: { price: 7 },
    sponsor: { perTitle: 0, titles: 0 },
    metered: { perHour: 1 },
    patron: { monthly: 9 },
};

const input = {
    paidViewingAccounts: 100_000,
    viewingAccounts: 150_000,
    nonSubscriberOpportunityAccounts: 80_000,
    hoursViewed: 600_000,
    adEligibleHours: 600_000,
    estimatedViewers: 220_000,
    completionRate: .78,
    repeatViewingRate: .14,
    isFreshMovie: false,
    isRentalEligible: true,
    isSponsorEligible: false,
    commerceCapabilityIndex: 74,
    reputationIndex: 80,
};

const run = () => {
    const modelRows = (['subs', 'ads', 'rentals', 'hybrid'] as const).map(model => {
        const streams: OwnedStreamingPricingConfiguration['streams'] = model === 'hybrid'
            ? ['subs', 'ads', 'rentals'] : [model];
        const configured = normalizeStreamingPricingConfiguration({
            ...pricing,
            streams,
            plans: model === 'subs' || model === 'hybrid' ? pricing.plans : [],
        });
        const revenue = calculateWorldStreamingCommercialRevenue({ ...input, pricing: configured });
        assert.ok(Object.values(revenue).every(value => Number.isFinite(value) && value >= 0));
        return {
            model,
            advertisingRevenue: revenue.advertisingRevenue,
            rentalRevenue: revenue.rentalRevenue,
            purchaseRevenue: revenue.purchaseRevenue,
            incrementalRevenue: revenue.totalIncrementalRevenue,
            commercialOperatingCost: revenue.commercialOperatingCost,
        };
    });
    assert.equal(modelRows[0].incrementalRevenue, 0, 'subscription revenue is settled in the separate subscription path');
    assert.ok(modelRows[1].advertisingRevenue > 0, 'fixed delivered ad hours can earn money');
    assert.ok(modelRows[2].rentalRevenue > 0 && modelRows[2].purchaseRevenue > 0);

    const adLoadRows = [0, 4, 8, 12].map(minutesPerHour => {
        const revenue = calculateWorldStreamingCommercialRevenue({
            ...input,
            pricing: { ...pricing, streams: ['ads'], ads: { minutesPerHour, cpm: 20 } },
        });
        return {
            minutesPerHour,
            impressions: revenue.advertisingImpressions,
            advertisingRevenue: revenue.advertisingRevenue,
            commercialOperatingCost: revenue.commercialOperatingCost,
        };
    });
    assert.equal(adLoadRows[0].advertisingRevenue, 0, 'zero ad minutes produces zero ad revenue');

    const cpmRows = [10, 20, 40].map(cpm => {
        const revenue = calculateWorldStreamingCommercialRevenue({
            ...input,
            pricing: { ...pricing, streams: ['ads'], ads: { minutesPerHour: 4, cpm } },
        });
        return { cpm, impressions: revenue.advertisingImpressions, advertisingRevenue: revenue.advertisingRevenue };
    });
    assert.equal(cpmRows[0].impressions, cpmRows[2].impressions,
        'current fill is unchanged by the player-entered CPM; C4 must revisit this balance gap');
    assert.ok(cpmRows[0].advertisingRevenue < cpmRows[2].advertisingRevenue);

    const player = createPlatformAiFixture();
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
    player.ownedStreamingPlatform.identity = {
        name: 'C0 Free', slug: 'c0-free', primaryColor: '#222222', secondaryColor: '#ffffff',
        logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '',
        dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
    };
    player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
    player.ownedStreamingPlatform.metrics.subscribers = 250_000;
    player.ownedStreamingPlatform.catalogProjectIds = ['c0-film-1', 'c0-film-2', 'c0-film-3'];
    player.world.projects = [{
        id: 'c0-film-1', title: 'C0 Film', genre: 'DRAMA', originalLanguageId: 'English',
        mediaType: 'MOVIE', targetAudience: 'MASS', studioId: 'c0-studio', budgetTier: 'MEDIUM',
        quality: 80, rating: 7.5, boxOffice: 50_000_000, year: player.age,
        weekReleased: player.currentWeek - 2, leadActorId: 'c0-actor', leadActorName: 'C0 Actor',
        directorId: 'c0-director', directorName: 'C0 Director', reviews: 'Baseline title.',
    }] as any;
    player.ownedStreamingPlatform.catalogLicenses = [{
        id: 'c0-license', sourceProjectId: 'c0-film-1', titleAtSigning: 'C0 Film',
        projectType: 'MOVIE', genre: 'DRAMA', licensorName: 'C0 Studio', territory: 'GLOBAL',
        countryIds: ['US', 'IN'], durationWeeks: 52, exclusivity: 'EXCLUSIVE',
        minimumGuarantee: 1_000_000, platformRevenueShare: 70, licensorRevenueShare: 30,
        signedAtAbsoluteWeek: week - 5, startsAtAbsoluteWeek: week - 4,
        expiresAtAbsoluteWeek: week + 48, status: 'ACTIVE',
    }];
    player.ownedStreamingPlatform.launchSlate = {
        entries: [{
            id: 'c0-slate', projectId: 'c0-film-1', title: 'C0 Film', source: 'LICENSED_WINDOW',
            projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 1,
            releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD',
        }],
        programmedAtAbsoluteWeek: week - 4, revision: 1,
    };
    player.ownedStreamingPlatform.launchCommit = {
        id: 'c0-launch', idempotencyKey: 'c0-launch:c0-free', committedAtAbsoluteWeek: week - 4,
        capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 88,
        forecastLikelyConcurrentStreams: 150_000, forecastHighConcurrentStreams: 300_000,
        protectedPeakConcurrentStreams: 600_000, launchHeadroomPercent: 50,
        initialSubscribers: 250_000, openingDemandIndex: 78, playbackSuccessRate: 99.5,
        outcomeTier: 'SMOOTH_OPENING', openingTitleCount: 1, openingOriginalTitle: 'C0 Film',
    };
    player.ownedStreamingPlatform.weeklyHistory = [{
        id: 'c0-previous-week', absoluteWeek: week - 1, subscribers: 250_000,
        netSubscriberMovement: 0, churnRate: .02, engagementRate: .6,
        averageRevenuePerUser: 0, cashRunwayWeeks: 100, technologyHealth: 90,
        causeMarkers: [], operations: { programWeek: 4 } as any,
    }];
    player.ownedStreamingPlatform.serviceConfiguration.pricing = normalizeStreamingPricingConfiguration({
        ...pricing, streams: ['ads'], plans: [],
    });
    const playerOffer = getWorldStreamingOffers(player, week).offers.find(offer => offer.isPlayer);
    assert.ok(playerOffer);
    const customers = createWorldStreamingCustomerState(player, week);
    const allocations = Object.values(customers.countries)
        .flatMap(country => country.cohorts.flatMap(cohort => cohort.planCells))
        .filter(cell => cell.platformId === 'PLAYER' && cell.paidAccounts > 0);
    const openAccessAccounts = allocations.filter(cell => cell.planId === 'OPEN_ACCESS')
        .reduce((sum, cell) => sum + cell.paidAccounts, 0);
    const adAccountsMatchedByCurrentViewing = allocations.reduce((sum, cell) => {
        const plan = player.ownedStreamingPlatform.serviceConfiguration.pricing.plans.find(item => item.id === cell.planId);
        return sum + (plan?.ads ? cell.paidAccounts : 0);
    }, 0);
    assert.equal(playerOffer.plans[0].id, 'OPEN_ACCESS');
    assert.ok(openAccessAccounts > 0, 'the ad-only player receives synthetic free-access customer accounts');
    assert.equal(adAccountsMatchedByCurrentViewing, 0,
        'current WE6 ad eligibility finds no saved plan matching synthetic OPEN_ACCESS');
    player.world.worldStreamingCustomers = customers;
    const viewing = getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(player, week));
    assert.ok(viewing && viewing.totalHoursViewed > 0, 'the ad-only baseline delivers a licensed title');
    assert.equal(viewing.revenue.advertisingRevenue, 0,
        'current ad-only live settlement misses delivered ad hours despite free-access viewers');

    const forecastPlayer = structuredClone(player);
    forecastPlayer.ownedStreamingPlatform.lifecycle = 'FOUNDING';
    forecastPlayer.ownedStreamingPlatform.launchCommit = null;
    forecastPlayer.ownedStreamingPlatform.weeklyHistory = [];
    const forecastRows = (['subs', 'ads', 'rentals'] as const).map(model => {
        const configured = normalizeStreamingPricingConfiguration({
            ...pricing,
            streams: [model],
            plans: model === 'subs' ? pricing.plans : [],
        });
        const forecast = forecastWorldStreamingLaunchPricing(forecastPlayer, configured, ['US', 'IN']);
        return {
            model,
            subscribers: forecast.subscribers,
            monthlySubscriptionRevenue: forecast.monthlySubscriptionRevenue,
            activeRivalCount: forecast.activeRivalCount,
        };
    });

    const aiOffers = getWorldStreamingOffers(createPlatformAiFixture(), 2_500).offers.filter(offer => !offer.isPlayer);
    const aiCoreModels = {
        total: aiOffers.length,
        withSubscriptions: aiOffers.filter(offer => offer.commercialConfiguration.streams.includes('subs')).length,
        withAds: aiOffers.filter(offer => offer.commercialConfiguration.streams.includes('ads')).length,
        withRentals: aiOffers.filter(offer => offer.commercialConfiguration.streams.includes('rentals')).length,
        adOnly: aiOffers.filter(offer => offer.commercialConfiguration.streams.length === 1
            && offer.commercialConfiguration.streams[0] === 'ads').length,
        rentalOnly: aiOffers.filter(offer => offer.commercialConfiguration.streams.length === 1
            && offer.commercialConfiguration.streams[0] === 'rentals').length,
    };
    const generatedAi = createAiStreamingCommercialConfiguration({
        platformId: 'C0_AI', kind: 'CORE_GLOBAL', technology: 88, brandPower: 92,
        cataloguePower: 90, prestige: 91, absoluteWeek: 2_500, foundedAtAbsoluteWeek: 1,
    });
    assert.ok(generatedAi.streams.includes('subs'));

    return {
        fixedInput: { adEligibleHours: input.adEligibleHours, viewingAccounts: input.viewingAccounts },
        modelRows,
        adLoadRows,
        cpmRows,
        adOnlyLiveAccounts: {
            openAccessAccounts, adAccountsMatchedByCurrentViewing,
            deliveredHours: viewing.totalHoursViewed,
            advertisingRevenue: viewing.revenue.advertisingRevenue,
        },
        forecastRows,
        aiCoreModels,
    };
};

const pricingBefore = JSON.stringify(pricing);
const inputBefore = JSON.stringify(input);
const first = run();
const second = run();
assert.deepEqual(second, first, 'C0 outputs must be deterministic');
assert.equal(JSON.stringify(pricing), pricingBefore, 'C0 must not mutate its shared pricing input');
assert.equal(JSON.stringify(input), inputBefore, 'C0 must not mutate its shared viewing input');
console.log(JSON.stringify(first, null, 2));
