import assert from 'node:assert/strict';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { evaluatePlayerStreamingTitleRoute } from '../services/streamingContentAvailability';
import { evaluateStreamingTitlePlayback } from '../services/streamingTitleAccess';
import { projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';
import { resolveStreamingProductionReadiness } from '../services/streamingProductionReadiness';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { createAiTitleAccessResolver } from '../services/worldEconomy/worldStreamingAiCatalogue';
import { createWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { createWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { createWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { readCinemaStreamingAlternatives } from '../services/boxOffice/boxOfficeAlternativeAdapters';
import { cinemaStreamingLanguageReady } from '../services/boxOffice/boxOfficeStreamingAudience';
import { makeCinemaSettledTitle } from '../services/boxOffice/boxOfficeMigration';
import { CINEMA_MARKET_TUNING_VERSION } from '../services/boxOffice/boxOfficeProfiles';
import type { CinemaExposureCohort } from '../services/boxOffice/boxOfficeTypes';
import type { WorldAudienceCohortState, WorldStreamingCustomerState } from '../types';

let passed = 0, failed = 0;
const test = (name: string, run: () => void) => {
    try { run(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}: ${(error as Error).message}`); }
};

/** Authored, already committed subscription proof; no customer/viewing settlement is run. */
const priorCustomers = (raw: WorldAudienceCohortState, week: number, planId: string, platformId = 'PLAYER'): WorldStreamingCustomerState => {
    const households = Math.min(50_000, raw.households);
    const price = planId === 'PREMIERE' ? 16 : 8;
    const revenue = households * price;
    const playerHouseholds = platformId === 'PLAYER' ? households : 0;
    const platformName = platformId === 'PLAYER' ? 'C6 Test+' : platformId;
    const movement = { joins: 0, cancellations: 0, reactivations: 0, upgrades: 0, downgrades: 0, switchIns: 0, switchOuts: 0 };
    const access = { externalSharedHouseholds: 0, sharedActiveViewers: 0, piracyReach: 0, accessLoadAccounts: households };
    const totals = {
        startingPaidAccounts: households, endingPaidAccounts: households, payingHouseholds: households,
        profiles: households, activeViewers: 0, ...movement, ...access, monthlySubscriptionRevenue: revenue,
    };
    const plan = { planId, planName: planId, paidAccounts: households, effectiveMonthlyPrice: price, monthlySubscriptionRevenue: revenue };
    return {
        schemaVersion: 2, initializedAtAbsoluteWeek: week - 1, lastProcessedAbsoluteWeek: week - 1,
        sourceFingerprint: `authored-route-proof:${planId}`,
        playerAccessPolicy: { sharingPosture: 'BALANCED', enforcementInvestment: 'STANDARD', source: 'LEADERSHIP_DEFAULT', updatedAtAbsoluteWeek: week - 1 },
        countries: { US: {
            countryId: 'US', reachableHouseholds: raw.households, ...totals,
            cohorts: [{
                cohortId: raw.id, billingPath: 'MONTHLY', reachableHouseholds: raw.households,
                payingHouseholds: households, profiles: households, activeViewers: 0, ...access,
                planCells: [{
                    platformId, platformName, ...plan, primaryHouseholds: households,
                    tenureNewAccounts: 0, tenureEstablishedAccounts: households, tenureLoyalAccounts: 0, ...access,
                }], lapsedCells: [],
            }],
            platformSummaries: [{
                platformId, platformName, ...totals, planAllocations: [plan], strongestReasonId: 'OTHER',
            }],
        } },
        global: {
            reachableHouseholds: raw.households, ...totals,
            playerStartingPaidAccounts: playerHouseholds, playerEndingPaidAccounts: playerHouseholds, playerPayingHouseholds: playerHouseholds,
            playerJoins: 0, playerCancellations: 0, playerReactivations: 0, playerUpgrades: 0, playerDowngrades: 0,
            playerSwitchIns: 0, playerSwitchOuts: 0, playerExternalSharedHouseholds: 0, playerSharedActiveViewers: 0,
            playerPiracyReach: 0, playerAccessLoadAccounts: playerHouseholds, playerMonthlySubscriptionRevenue: platformId === 'PLAYER' ? revenue : 0,
            playerPlanAllocations: platformId === 'PLAYER' ? [plan] : [], playerOfferPresent: true, countryCount: 1, platformCount: 1,
        }, recentMovements: [], snapshots: [],
    };
};

const fixture = (planId = 'ESSENTIAL') => {
    const player = createC6QaCareer();
    const week = getAbsoluteWeek(player.age, player.currentWeek) + 1;
    const platform = player.ownedStreamingPlatform;
    platform.lifecycle = 'ACTIVE';
    platform.marketOperations.forEach(operation => { operation.status = 'ACTIVE'; });
    // The established C6 service uses its legacy capacity and measured service fallback.
    platform.infrastructureSetup = null;
    platform.metrics.technologyHealth = 95;
    platform.weeklyHistory = [];
    platform.identity!.foundedAtAbsoluteWeek = week - 104;
    platform.launchCommit = {
        id: 'alternative-route-launch', idempotencyKey: 'alternative-route-launch', committedAtAbsoluteWeek: week - 52,
        capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 95,
        forecastLikelyConcurrentStreams: 100_000, forecastHighConcurrentStreams: 200_000,
        protectedPeakConcurrentStreams: 1_000_000, launchHeadroomPercent: 80, initialSubscribers: 50_000,
        openingDemandIndex: 80, playbackSuccessRate: 99, outcomeTier: 'SMOOTH_OPENING',
        openingTitleCount: 1, openingOriginalTitle: 'The First Signal',
    };
    platform.launchProgram.status = 'LAUNCHED';
    platform.originalCommissions = [];
    player.commitments = [];
    const license = platform.catalogLicenses.find(row => row.sourceProjectId === 'c6-qa-title')!;
    platform.catalogLicenses = [license];
    platform.catalogProjectIds = [license.sourceProjectId];
    platform.launchSlate!.entries = platform.launchSlate!.entries.filter(row => row.projectId === license.sourceProjectId);
    license.accessGrant = { schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' };
    const pricing = platform.serviceConfiguration.pricing;
    pricing.streams = ['subs', 'rentals'];
    pricing.plans = [
        { id: 'ESSENTIAL', name: 'Essential', monthly: 8, featureIds: ['catalogue'], ads: false },
        { id: 'PREMIERE', name: 'Premiere', monthly: 16, featureIds: ['catalogue', 'early'], ads: false },
    ];
    pricing.commercialOffers = {
        schemaVersion: 1, coreModel: 'SUBSCRIPTION', freeAdAccess: false,
        adFreePasses: { oneHourPrice: null, dayPrice: null },
        benefits: {
            plans: {}, freeAds: { premiumAccess: false, earlyAccessWeeks: 0 },
            store: { premiumAccess: false, earlyAccessWeeks: 0 },
        },
    };
    const population = createWorldPopulationState(week);
    const audience = createWorldAudienceEconomyState(population, week);
    const participation = createWorldAudienceParticipationState(population, audience, week);
    player.world.worldPopulation = population;
    player.world.worldAudienceEconomy = audience;
    player.world.worldAudienceParticipation = participation;
    const overlay = participation.countries.US.cohorts.find(row => row.dualParticipantHouseholds > 50_000)!;
    const raw = audience.countries.US.cohorts.find(row => row.id === overlay.cohortId)!;
    const cohort: CinemaExposureCohort = {
        id: `US:${raw.id}`, countryId: 'US', people: raw.people,
        market: {
            eligiblePeople: Math.floor((overlay.cinemaOnlyHouseholds + overlay.dualParticipantHouseholds) * raw.people / raw.households),
            monthlyCinemaBudgetCents: overlay.totalMonthlyCinemaBudget * 100, weeklyLeisureMinutes: raw.people * 180,
            interest: overlay.cinemaInterestIndex, priceSensitivity: raw.priceSensitivityIndex,
            persona: raw.primaryPersonaId, languages: [...population.countries.US.languages], travelMinutes: 30,
        },
    };
    player.world.worldStreamingCustomers = priorCustomers(raw, week, planId);
    player.world.worldStreamingViewing = undefined;
    player.world.worldStreamingAudienceChoice = undefined;
    return { player, week, cohort, raw, license, titleId: license.sourceProjectId };
};

const playerOffer = (input: ReturnType<typeof fixture>) => {
    const offer = getWorldStreamingOffers(input.player, input.week).offers.find(row => row.platformId === 'PLAYER');
    assert.ok(offer, 'the active US platform must publish a real commercial offer');
    return offer;
};
const platformAlternatives = (input: ReturnType<typeof fixture>, platformId: string) => {
    const before = structuredClone(input.player);
    const alternatives = readCinemaStreamingAlternatives(input.player, input.week, [input.cohort])
        .filter(row => row.platformId === platformId);
    assert.deepEqual(input.player, before, 'the projection must not settle or mutate the authored world');
    return alternatives;
};
const playerAlternatives = (input: ReturnType<typeof fixture>) => platformAlternatives(input, 'PLAYER');

test('subscribers cannot use a rental-only catalogue without a store entitlement', () => {
    const input = fixture();
    input.license.accessGrant = {
        schemaVersion: 1, modes: ['RENTAL', 'PURCHASE'], earlyWindowWeeks: 0,
        purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT',
    };
    const offer = playerOffer(input);
    assert.ok(offer.storeCatalogueStrengthByCountry!.US > 0, 'the title is offered in the real US store');
    assert.equal(offer.subscriptionCatalogueStrengthByCountry!.US, 0);
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week,
        { kind: 'SUBSCRIPTION', planId: 'ESSENTIAL' }).allowed, false);
    assert.equal(playerAlternatives(input).length, 0, 'a subscription cannot fund transaction-only playback');
});

const premiumWindow = (input: ReturnType<typeof fixture>) => {
    // Canonical early access is the existing plan-specific subscription permission.
    // The ordinary general-release date remains two weeks away.
    const template = createC6QaCareer().ownedStreamingPlatform.originalCommissions[0];
    input.player.ownedStreamingPlatform.originalCommissions = [{
        ...template, canonicalProjectId: input.titleId, title: 'The First Signal', status: 'DELIVERED',
        releasePlan: { scope: 'GLOBAL', releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD',
            premiereAtAbsoluteWeek: input.week + 2, authorizedAtAbsoluteWeek: input.week - 1 },
    }];
    input.license.accessGrant = {
        schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 2, purchaseFulfillment: 'NONE', source: 'EXPLICIT',
    };
    input.player.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs'];
    input.player.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers!.benefits.plans.PREMIERE = {
        premiumAccess: true, earlyAccessWeeks: 2,
    };
};

test('an Essential subscription cannot borrow the unsubscribed premium early-access plan', () => {
    const input = fixture();
    premiumWindow(input);
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week,
        { kind: 'SUBSCRIPTION', planId: 'ESSENTIAL' }).allowed, false);
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week,
        { kind: 'SUBSCRIPTION', planId: 'PREMIERE' }).allowed, true);
    assert.ok(playerOffer(input).subscriptionCatalogueStrengthByCountry!.US > 0);
    assert.equal(playerAlternatives(input).length, 0, 'the committed customer plan must have actual title access');
});

test('a currently subscribed valid plan supplies a positive home alternative', () => {
    const input = fixture('PREMIERE');
    premiumWindow(input);
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week,
        { kind: 'SUBSCRIPTION', planId: 'PREMIERE' }).allowed, true);
    const alternatives = playerAlternatives(input);
    assert.equal(alternatives.length, 1);
    assert.ok(alternatives[0].accessiblePeople > 0 && alternatives[0].catalogueStrength > 0);
});

test('expired title rights cannot support an existing subscription alternative', () => {
    const input = fixture();
    input.license.expiresAtAbsoluteWeek = input.week;
    input.license.status = 'EXPIRED';
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week,
        { kind: 'SUBSCRIPTION', planId: 'ESSENTIAL' }).allowed, false);
    assert.equal(playerAlternatives(input).length, 0);
});

test('foreign title rights cannot support a local existing subscription alternative', () => {
    const input = fixture();
    input.license.territory = 'MULTI_REGION';
    input.license.countryIds = ['JP'];
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week,
        { kind: 'SUBSCRIPTION', planId: 'ESSENTIAL' }).allowed, false);
    assert.equal(playerAlternatives(input).length, 0);
});

const storeEntitlement = (input: ReturnType<typeof fixture>, kind: 'RENTAL' | 'PURCHASE', purchasedAt: number, expiresAt: number | null) => {
    input.player.world.worldStreamingAudienceChoice = {
        schemaVersion: 1, initializedAtAbsoluteWeek: input.week, lastProcessedAbsoluteWeek: input.week,
        sourceFingerprint: `authored-store-proof:${kind}:${purchasedAt}`, countries: {}, platforms: {},
        global: {
            reachableHouseholds: 0, primarySubscriptions: 0, monthlySubscriptions: 0, annualSubscriptions: 0,
            secondarySubscriptions: 0, freeAdHouseholds: 0, storeHouseholds: 0, outsideHouseholds: 0,
            paidMonthlyBudget: 0, paidMonthlySpend: 0, settledRevenue: 0, countryCount: 0,
        },
        entitlements: [{
            transactionId: `authored-store-proof:${kind}:${purchasedAt}`, platformId: 'PLAYER', countryId: 'US', titleId: input.titleId,
            kind, households: 50_000, purchasedAtAbsoluteWeek: purchasedAt, expiresAtAbsoluteWeek: expiresAt,
        }],
    };
};

const canonicalStorePlayback = (input: ReturnType<typeof fixture>, kind: 'RENTAL' | 'PURCHASE', purchasedAt: number) => {
    const license = input.license;
    const platform = input.player.ownedStreamingPlatform;
    return evaluateStreamingTitlePlayback({
        titleId: input.titleId, countryId: 'US', absoluteWeek: input.week, productionReadyAtAbsoluteWeek: 0,
        generalReleaseAtAbsoluteWeek: platform.launchCommit!.committedAtAbsoluteWeek + platform.launchSlate!.entries[0].launchWeek - 1,
        marketActive: true, offer: projectStreamingCommercialOffers(platform.serviceConfiguration.pricing),
        route: kind === 'RENTAL' ? { kind: 'RENTAL' } : { kind: 'PURCHASE' },
        position: {
            contractId: license.id, territory: license.territory, countryIds: license.countryIds || [],
            startsAtAbsoluteWeek: license.startsAtAbsoluteWeek, expiresAtAbsoluteWeek: license.expiresAtAbsoluteWeek,
            status: license.status, accessGrant: license.accessGrant!,
        },
        viewerProof: kind === 'RENTAL'
            ? { kind: 'RENTAL', purchasedAtAbsoluteWeek: purchasedAt }
            : { kind: 'PURCHASE', purchasedAtAbsoluteWeek: purchasedAt },
    });
};

test('a future store purchase cannot be backdated into committed home access', () => {
    const input = fixture();
    input.license.accessGrant = {
        schemaVersion: 1, modes: ['RENTAL'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT',
    };
    storeEntitlement(input, 'RENTAL', input.week + 1, input.week + 7);
    assert.equal(playerAlternatives(input).length, 0, 'future transactions are not prior committed access');
});

test('a vested perpetual purchase remains a home alternative after its title license expires', () => {
    const input = fixture();
    input.license.accessGrant = {
        schemaVersion: 1, modes: ['PURCHASE'], earlyWindowWeeks: 0, purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT',
    };
    input.license.expiresAtAbsoluteWeek = input.week - 1;
    input.license.status = 'EXPIRED';
    const purchasedAt = input.week - 3;
    storeEntitlement(input, 'PURCHASE', purchasedAt, null);
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week, { kind: 'PURCHASE' }).allowed, false);
    assert.equal(canonicalStorePlayback(input, 'PURCHASE', purchasedAt).allowed, true, 'canonical playback preserves a purchase made within its valid rights window');
    const alternatives = playerAlternatives(input);
    assert.equal(alternatives.length, 1, 'existing paid ownership must not require a new sale');
    assert.ok(alternatives[0].accessiblePeople > 0 && alternatives[0].catalogueStrength > 0);
    assert.equal(alternatives[0].evidenceWeek, purchasedAt);
});

test('a paid rental remains a home alternative during its final valid week', () => {
    const input = fixture();
    input.license.accessGrant = {
        schemaVersion: 1, modes: ['RENTAL'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT',
    };
    input.player.ownedStreamingPlatform.serviceConfiguration.pricing.rentals.windowWeeks = 6;
    input.license.expiresAtAbsoluteWeek = input.week + 1;
    const purchasedAt = input.week - 5;
    storeEntitlement(input, 'RENTAL', purchasedAt, input.week + 1);
    assert.equal(evaluatePlayerStreamingTitleRoute(input.player, input.titleId, 'US', input.week, { kind: 'RENTAL' }).allowed, false);
    assert.equal(canonicalStorePlayback(input, 'RENTAL', purchasedAt).allowed, true, 'the remaining paid rental window still fits inside the license');
    const alternatives = playerAlternatives(input);
    assert.equal(alternatives.length, 1, 'existing rental playback must not require a second full rental window');
    assert.ok(alternatives[0].accessiblePeople > 0 && alternatives[0].catalogueStrength > 0);
    assert.equal(alternatives[0].evidenceWeek, purchasedAt);
});

test('a legacy purchased title keeps vested access when no launch slate was saved', () => {
    const input = fixture();
    input.license.accessGrant = {
        schemaVersion: 1, modes: ['PURCHASE'], earlyWindowWeeks: 0, purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT',
    };
    input.license.expiresAtAbsoluteWeek = input.week - 1;
    input.license.status = 'EXPIRED';
    const purchasedAt = input.week - 3;
    storeEntitlement(input, 'PURCHASE', purchasedAt, null);
    assert.equal(canonicalStorePlayback(input, 'PURCHASE', purchasedAt).allowed, true);
    assert.equal(playerAlternatives(input).length, 1, 'the paid position is valid before removing optional legacy slate metadata');
    input.player.ownedStreamingPlatform.launchSlate!.entries = [];
    assert.equal(playerAlternatives(input).length, 1, 'a missing legacy slate must not move release time after an already-paid purchase');
});

const aiFixture = () => {
    const input = fixture();
    const signed = registerProductionStreamingRightsContract(input.player, {
        sourceProjectId: input.titleId, title: 'The First Signal', projectType: 'MOVIE', genre: 'DRAMA',
        buyerPlatformId: 'NETFLIX', sellerStudioId: 'c6-qa-studio', sellerStudioName: 'C6 QA Studio',
        sellerPartyType: 'NPC_STUDIO', minimumGuarantee: 1_000, platformRevenueShare: 100,
        signedAtAbsoluteWeek: input.week - 6, startsAtAbsoluteWeek: input.week - 5, durationWeeks: 52,
        territory: 'MULTI_REGION', countryIds: ['US'], exclusivity: 'NON_EXCLUSIVE',
    });
    assert.ok(signed.contract, 'the real production-rights adapter must author a valid NPC position');
    input.player = signed.player;
    const offer = getWorldStreamingOffers(input.player, input.week).offers.find(row => row.platformId === 'NETFLIX')!;
    assert.ok(offer, 'the NPC platform must publish a current US offer');
    const plan = offer.plans.find(row => row.monthlyPrice > 0)!;
    assert.ok(plan);
    input.player.world.worldStreamingCustomers = priorCustomers(input.raw, input.week, plan.id, offer.platformId);
    input.player.world.cinemaMarket = {
        schemaVersion: 1, tuningVersion: CINEMA_MARKET_TUNING_VERSION, clockEpoch: 0,
        activationWeek: input.week, lastProcessedAbsoluteWeek: input.week - 1,
        market: { schemaVersion: 1, tuningVersion: CINEMA_MARKET_TUNING_VERSION, lastProcessedAbsoluteWeek: input.week - 1,
            titles: [], affinities: [], runs: [] },
        titles: { [input.titleId]: makeCinemaSettledTitle(input.titleId, 'c6-qa-studio', 'UNSETTLED_WEEKLY', input.week) },
        weeks: [],
    };
    const route = { kind: 'SUBSCRIPTION' as const, planId: plan.id };
    const rawAccess = () => createAiTitleAccessResolver(input.player, offer, [])('US', input.week, route)
        .some(row => row.titleId === input.titleId);
    assert.equal(rawAccess(), true, 'signed route permission is the control before cinema delivery/language gates');
    assert.equal(platformAlternatives(input, offer.platformId).length, 1, 'the delivered English control is playable');
    return { input, offer, rawAccess };
};

test('an unfinished cinema-linked NPC title cannot become a playable alternative from signed rights alone', () => {
    const { input, offer, rawAccess } = aiFixture();
    const commitment = createC6QaCareer().commitments[0];
    input.player.commitments = [{ ...commitment, id: input.titleId, projectPhase: 'PRODUCTION' }];
    assert.equal(rawAccess(), true);
    assert.equal(resolveStreamingProductionReadiness(input.player, input.titleId).ready, false);
    assert.equal(platformAlternatives(input, offer.platformId).length, 0);
});

test('unsupported cinema-title language cannot become a local NPC playback alternative', () => {
    const { input, offer, rawAccess } = aiFixture();
    input.player.world.worldPopulation!.countries.US.languages = ['japanese'];
    assert.equal(rawAccess(), true);
    assert.equal(resolveStreamingProductionReadiness(input.player, input.titleId).ready, true);
    assert.equal(cinemaStreamingLanguageReady(input.player, input.titleId, 'US', offer.platformId, input.week), false);
    assert.equal(platformAlternatives(input, offer.platformId).length, 0);
});

console.log(`Alternative routes audit: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
