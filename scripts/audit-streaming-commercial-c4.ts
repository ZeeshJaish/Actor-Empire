import assert from 'node:assert/strict';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createWorldStreamingCustomerState, createOpeningWorldStreamingCustomerState } from '../services/worldEconomy/worldStreamingCustomers';
import { advanceWorldStreamingViewingToWeek, createWorldStreamingViewingState,
    getWorldStreamingPlayerViewingOutcome } from '../services/worldEconomy/worldStreamingViewing';
import { normalizeWorldStreamingAudienceChoiceState, recordPlayerStreamingAudienceEntitlement,
    settleWorldStreamingAudienceEntitlements } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { getStreamingCountryAdMarket, resolveStreamingAdMarket } from '../services/worldEconomy/worldStreamingAdMarket';
import { normalizeWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { normalizeWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { createWorldStreamingPlatformEconomyState } from '../services/worldEconomy/worldStreamingPlatformEconomy';
import { createStreamingStoreWallet, spendStreamingStoreWallet, calculateStreamingAdFreePassWeek, calculateStreamingStoreConversion } from '../services/worldEconomy/worldStreamingCommercialEconomy';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { calculateAiTitleStoreBuyerPool } from '../services/worldEconomy/worldStreamingAiCatalogue';
import { processGameWeek } from '../services/gameLoop';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';

assert.equal(calculateAiTitleStoreBuyerPool({ price: 8, monthlySubscriptionPrice: 5,
    subscriptionIncluded: false, freeAdIncluded: false,
    cohorts: [{ budget: 10, subscriptions: 10, freeAd: 4, store: 3 },
        { budget: 4, subscriptions: 20, freeAd: 12, store: 7 }] }), 7,
    'AI title sales may only approach households that can afford the price after plan spend');
assert.equal(calculateAiTitleStoreBuyerPool({ price: 8, monthlySubscriptionPrice: 5,
    subscriptionIncluded: true, freeAdIncluded: true,
    cohorts: [{ budget: 20, subscriptions: 10, freeAd: 4, store: 3 }] }), 3,
    'AI cannot rent an included title again to its subscription or free-access viewers');
assert.equal(calculateStreamingStoreConversion({ buyerPool: 1000, price: 5, kind: 'RENTAL' }), 135,
    'player, AI and forecast rentals must share one bounded purchase-intent curve');
assert.equal(calculateStreamingStoreConversion({ buyerPool: 1000, price: 18, kind: 'PURCHASE' }), 16,
    'player, AI and forecast purchases must share one bounded purchase-intent curve');

const wallet = createStreamingStoreWallet(10,43.30);
assert.equal(wallet.remainingCents,10000,'monthly budget is divided over 4.33 weeks');
assert.equal(spendStreamingStoreWallet(wallet,20,6),16);
assert.equal(spendStreamingStoreWallet(wallet,20,3),1,'purchase shares the already-used rental wallet');
assert.equal(wallet.remainingCents,100);
for(const amount of [Infinity,NaN,-10,1e300]) {
    const malformedWallet=createStreamingStoreWallet(amount,amount);
    assert.ok(Number.isSafeInteger(malformedWallet.remainingCents) && malformedWallet.remainingCents>=0);
    assert.ok(Number.isSafeInteger(spendStreamingStoreWallet(malformedWallet,amount,2)));
}
assert.equal(calculateStreamingStoreConversion({buyerPool:Infinity,price:1,kind:'RENTAL'}),0);
assert.ok(calculateStreamingStoreConversion({buyerPool:10000,price:5,kind:'RENTAL',quality:95})
    > calculateStreamingStoreConversion({buyerPool:10000,price:5,kind:'RENTAL',quality:20}));
assert.ok(calculateStreamingStoreConversion({buyerPool:10000,price:5,kind:'RENTAL',quality:95,weeksAvailable:1})
    > calculateStreamingStoreConversion({buyerPool:10000,price:5,kind:'RENTAL',quality:95,weeksAvailable:104}));

const base = {
    countryId: 'US', absoluteWeek: 728, eligibleHours: 600_000,
    minutesPerHour: 4, targetCpm: 20, advertiserDemandBudget: 100_000,
    marketReferenceCpm: 18, audienceQualityIndex: 75, brandSafetyIndex: 80,
};
const normal = resolveStreamingAdMarket(base);
assert.ok(normal.filledImpressions > 0 && normal.revenue > 0, 'delivered ad-eligible hours can earn ads');
assert.ok(normal.revenue <= base.advertiserDemandBudget, 'a platform cannot spend more than its assigned market demand');
assert.ok(normal.filledImpressions <= normal.availableImpressions, 'filled impressions cannot exceed inventory');
assert.deepEqual(resolveStreamingAdMarket(base), normal, 'country-week clearing is deterministic');

const highTarget = resolveStreamingAdMarket({ ...base, targetCpm: 50 });
assert.deepEqual(highTarget, normal, 'legacy saved target CPM must not set market fill, price, or revenue');

assert.equal(resolveStreamingAdMarket({ ...base, eligibleHours: 0 }).revenue, 0,
    'no eligible delivered viewing means no ad cash');
assert.equal(resolveStreamingAdMarket({ ...base, minutesPerHour: 0 }).revenue, 0,
    'a zero ad load means no ad cash');
assert.equal(resolveStreamingAdMarket({ ...base, advertiserDemandBudget: 0 }).revenue, 0,
    'no advertisers means no ad cash');
assert.equal(calculateStreamingAdFreePassWeek({ adViewingHouseholds: 1000, adEligibleHours: 0,
    oneHourPrice: 2, dayPrice: 5 }).dayRevenue, 0,
    'no delivered ad-eligible viewing means no ad-free pass charge');
assert.equal(calculateStreamingAdFreePassWeek({ adViewingHouseholds: 1000, adEligibleHours: 2000,
    oneHourPrice: 2, dayPrice: 5, oneHourEligibleHouseholds: 0, dayEligibleHouseholds: 0 }).dayRevenue, 0,
    'viewers without payment budget cannot buy an ad-free pass');
assert.notDeepEqual(resolveStreamingAdMarket({ ...base, countryId: 'IN', marketReferenceCpm: 7 }), normal,
    'one country must not silently inherit another market');
assert.ok(Object.values(resolveStreamingAdMarket({ ...base, targetCpm: Number.POSITIVE_INFINITY }))
    .filter(value => typeof value === 'number').every(value => Number.isFinite(value) && value >= 0),
    'malformed strategy input cannot create infinite or negative money');

const adPlayer = createPlatformAiFixture();
const week = getAbsoluteWeek(adPlayer.age, adPlayer.currentWeek);
adPlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
adPlayer.ownedStreamingPlatform.identity = {
    name: 'Free service', slug: 'free-service', primaryColor: '#111', secondaryColor: '#eee',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '',
    dayOneMarketIds: ['US'], launchServerCityId: null, foundedAtAbsoluteWeek: week - 5,
};
adPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['ads'];
adPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.plans = [];
adPlayer.ownedStreamingPlatform.metrics.subscribers = 250_000;
const customers = createWorldStreamingCustomerState(adPlayer, week);
assert.equal(customers.global.playerEndingPaidAccounts, 0,
    'a free-ad service cannot turn an old subscriber seed into paid accounts');
assert.equal(customers.global.playerMonthlySubscriptionRevenue, 0,
    'free access cannot settle subscription money');

adPlayer.ownedStreamingPlatform.catalogProjectIds = ['c4-film'];
adPlayer.world.projects = [{ id: 'c4-film', title: 'C4 Film', genre: 'DRAMA', originalLanguageId: 'English',
    mediaType: 'MOVIE', targetAudience: 'MASS', studioId: 'c4-studio', budgetTier: 'MEDIUM',
    quality: 80, rating: 7.5, boxOffice: 50_000_000, year: adPlayer.age,
    weekReleased: adPlayer.currentWeek - 2, leadActorId: 'actor', leadActorName: 'Actor',
    directorId: 'director', directorName: 'Director', reviews: 'C4 fixture.' }] as any;
const license = createStreamingLicenseContract({
    id: 'c4-license', sourceProject: { id: 'c4-film', title: 'C4 Film' },
    buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'C4 Studio', territory: 'GLOBAL', durationWeeks: 52,
    exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
    signedAtAbsoluteWeek: week - 5, startsAtAbsoluteWeek: week - 4,
    origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
    windowType: 'PERMANENT',
});
license.accessGrant = { schemaVersion: 1, modes: ['AD_SUPPORTED'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'NONE', source: 'EXPLICIT' };
adPlayer.ownedStreamingPlatform.catalogLicenses = [license];
adPlayer.ownedStreamingPlatform.launchSlate = { entries: [{ id: 'c4-slate', projectId: 'c4-film',
    title: 'C4 Film', source: 'LICENSED_WINDOW', projectType: 'MOVIE', genre: 'DRAMA',
    launchWeek: 1, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' }],
    programmedAtAbsoluteWeek: week - 4, revision: 1 };
adPlayer.ownedStreamingPlatform.launchCommit = { id: 'c4-launch', idempotencyKey: 'c4-launch:free',
    committedAtAbsoluteWeek: week - 4, capacityPlan: 'STANDARD', capacityPlanCost: 0,
    readinessScore: 88, forecastLikelyConcurrentStreams: 150_000,
    forecastHighConcurrentStreams: 300_000, protectedPeakConcurrentStreams: 600_000,
    launchHeadroomPercent: 50, initialSubscribers: 0, openingDemandIndex: 78,
    playbackSuccessRate: 99.5, outcomeTier: 'SMOOTH_OPENING', openingTitleCount: 1,
    openingOriginalTitle: 'C4 Film' };
adPlayer.ownedStreamingPlatform.weeklyHistory = [{ id: 'c4-previous', absoluteWeek: week - 1,
    subscribers: 0, netSubscriberMovement: 0, churnRate: .02, engagementRate: .6,
    averageRevenuePerUser: 0, cashRunwayWeeks: 100, technologyHealth: 90,
    causeMarkers: [], operations: { programWeek: 4 } as any }];
adPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(adPlayer, week);
adPlayer.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, adPlayer, week);
const establishedPlayer = structuredClone(adPlayer);
establishedPlayer.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek = week - 104;
establishedPlayer.ownedStreamingPlatform.identity!.foundedAtAbsoluteWeek = week - 104;
const earlyReach = adPlayer.world.worldStreamingAudienceChoice.countries.US.playerFreeAdHouseholds;
const establishedReach = normalizeWorldStreamingAudienceChoiceState(undefined, establishedPlayer, week)
    .countries.US.playerFreeAdHouseholds;
const heavyAdsPlayer = structuredClone(adPlayer);
heavyAdsPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.ads.minutesPerHour = 12;
const heavyReach = normalizeWorldStreamingAudienceChoiceState(undefined, heavyAdsPlayer, week)
    .countries.US.playerFreeAdHouseholds;
assert.ok(heavyReach < earlyReach,
    'an excessive saved ad frequency must lose some free-audience appeal');
assert.ok(earlyReach > 0 && earlyReach < establishedReach * .4,
    'a new free service must build awareness rather than instantly taking mature-platform reach');
const viewing = createWorldStreamingViewingState(adPlayer, week);
const alternateTargetPlayer = structuredClone(adPlayer);
alternateTargetPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.ads.cpm = 99;
assert.deepEqual(createWorldStreamingViewingState(alternateTargetPlayer, week), viewing,
    'changing only a legacy saved target CPM cannot change live player or AI receipts');
const worldPopulation = normalizeWorldPopulationState(adPlayer.world.worldPopulation, week);
const worldAudience = normalizeWorldAudienceEconomyState(adPlayer.world.worldAudienceEconomy, worldPopulation, week);
const worldParticipation = normalizeWorldAudienceParticipationState(adPlayer.world.worldAudienceParticipation,
    worldPopulation, worldAudience, week);
const usBudget = getStreamingCountryAdMarket(worldPopulation.countries.US, week,
    worldParticipation.countries.US.streamingReachableHouseholds).advertiserDemandBudget;
const usAdvertising = Object.values(viewing.countries.US.platformPerformance || {})
    .reduce((sum, row) => sum + row.revenue.advertisingRevenue, 0);
assert.ok(usAdvertising <= usBudget,
    'player and AI delivered advertising must share one finite US country-week demand budget');
const playerViewing = getWorldStreamingPlayerViewingOutcome(viewing);
assert.ok(playerViewing && playerViewing.accessMix.freeViewingAccounts! > 0,
    'free-ad households must view eligible titles without becoming paid accounts');
assert.equal(playerViewing.accessMix.paidViewingAccounts, 0,
    'free viewing cannot appear in the paid-viewing line');
assert.ok(playerViewing.revenue.advertisingRevenue > 0,
    'licensed, delivered ad-only viewing must earn country-cleared ad revenue');
const freeEconomy = createWorldStreamingPlatformEconomyState({ ...adPlayer,
    world: { ...adPlayer.world, worldStreamingViewing: viewing } }, week);
assert.equal(freeEconomy.platforms.PLAYER?.weeklyIncrementalRevenue,
    playerViewing.revenue.totalIncrementalRevenue,
    'free-only player viewing must reach the canonical weekly economy and treasury');
const weeklyAdRevenuePerFreeViewer = playerViewing.revenue.advertisingRevenue
    / playerViewing.accessMix.freeViewingAccounts!;
console.log('C4 balance diagnostic', { earlyReach, establishedReach,
    freeViewingAccounts: playerViewing.accessMix.freeViewingAccounts,
    hoursViewed: playerViewing.totalHoursViewed,
    adImpressions: playerViewing.revenue.advertisingImpressions,
    adStrategy: adPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.ads,
    adRevenue: playerViewing.revenue.advertisingRevenue, weeklyAdRevenuePerFreeViewer });
assert.ok(weeklyAdRevenuePerFreeViewer >= .03 && weeklyAdRevenuePerFreeViewer < .6,
    'ads should yield meaningful but clearly sub-subscription weekly revenue per active free viewer');
const paidPlayer = structuredClone(adPlayer);
paidPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs'];
paidPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.plans = [{
    id: 'essential', name: 'Essential', monthly: 7.99, featureIds: [], ads: false,
}];
paidPlayer.ownedStreamingPlatform.catalogLicenses[0].accessGrant = {
    schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'NONE', source: 'EXPLICIT',
};
paidPlayer.world.worldStreamingCustomers = createOpeningWorldStreamingCustomerState(adPlayer, paidPlayer, week);
paidPlayer.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, paidPlayer, week);
const paidMonthlyRevenue = paidPlayer.world.worldStreamingCustomers.global.playerMonthlySubscriptionRevenue;
const paidAccounts = paidPlayer.world.worldStreamingCustomers.global.playerEndingPaidAccounts;
assert.ok(paidAccounts > 0 && paidMonthlyRevenue / 4.33 / paidAccounts > weeklyAdRevenuePerFreeViewer * 5,
    'an active paid subscription earns materially more per account than free ad viewing');
assert.ok(earlyReach > paidAccounts,
    'the free offer must reach more households than the comparable launch subscription offer');
console.log('C4 paid comparison', { paidAccounts, weeklyPaidRevenue: Math.round(paidMonthlyRevenue / 4.33),
    weeklyPaidRevenuePerAccount: paidMonthlyRevenue / 4.33 / paidAccounts });
assert.deepEqual(createWorldStreamingViewingState(adPlayer, week), viewing,
    'same-week viewing and ad money must be reproducible');
const passPlayer = structuredClone(adPlayer);
passPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers = {
    schemaVersion: 1, coreModel: 'ADVERTISING', freeAdAccess: true,
    adFreePasses: { oneHourPrice: 2, dayPrice: 5 },
    benefits: { plans: {}, freeAds: { premiumAccess: false, earlyAccessWeeks: 0 },
        store: { premiumAccess: false, earlyAccessWeeks: 0 } },
};
const passState = createWorldStreamingViewingState(passPlayer, week);
const passViewing = getWorldStreamingPlayerViewingOutcome(passState);
assert.ok(passViewing && passViewing.revenue.dayPassTransactions > 0
    && passViewing.revenue.dayPassRevenue > 0,
    'optional one-hour and 24-hour ad-free passes must settle for entitled ad viewers');
assert.ok(passViewing.revenue.oneHourPassTransactions! > 0
    && passViewing.revenue.oneHourPassRevenue! > 0 && passViewing.revenue.adFreeCoveredHours! > 0,
    'the one-hour pass must settle independently from the 24-hour variant');
assert.equal(passViewing.revenue.totalIncrementalRevenue,
    passViewing.revenue.advertisingRevenue + passViewing.revenue.oneHourPassRevenue!
        + passViewing.revenue.dayPassRevenue,
    'pass and ad gross must reconcile without charging the same break twice');
assert.equal(passViewing.revenue.totalIncrementalRevenue,
    Object.values(passState.countries).reduce((sum, country) => sum
        + (country.platformPerformance?.PLAYER?.revenue.totalIncrementalRevenue || 0), 0),
    'country pass and ad revenue must add back to the player platform total');
assert.equal(passViewing.revenue.commercialOperatingCost,
    Object.values(passState.countries).reduce((sum, country) => sum
        + (country.platformPerformance?.PLAYER?.revenue.commercialOperatingCost || 0), 0),
    'country commercial costs must add back to the player platform total');
const migratedPassPlayer = structuredClone(passPlayer);
migratedPassPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['ads', 'daypass'];
const migratedPassViewing = getWorldStreamingPlayerViewingOutcome(
    createWorldStreamingViewingState(migratedPassPlayer, week));
assert.equal(migratedPassViewing?.revenue.dayPassRevenue, passViewing.revenue.dayPassRevenue,
    'the retired standalone day-pass switch must not double-charge a configured ad-free pass');
const livePassPlayer = { ...passPlayer, world: { ...passPlayer.world,
    worldStreamingViewing: passState } };
const settledPassWeek = processOwnedStreamingPlatformWeek(livePassPlayer);
assert.equal(settledPassWeek.snapshot?.operations?.worldViewingIncrementalRevenue,
    passViewing.revenue.totalIncrementalRevenue,
    'WE6 gross pass and ad receipts must reach the existing company-cash settlement');
assert.equal(settledPassWeek.snapshot?.operations?.worldViewingCommercialOperatingCost,
    passViewing.revenue.commercialOperatingCost,
    'WE6 commercial cost must reach the same company-cash settlement');
assert.equal(settledPassWeek.snapshot?.operations?.worldViewingTransactionRevenue,
    passViewing.revenue.dayPassRevenue + passViewing.revenue.oneHourPassRevenue!,
    'the player weekly brief must show both ad-free pass variants as transactions');
assert.equal(processOwnedStreamingPlatformWeek(settledPassWeek.player).player.ownedStreamingPlatform.treasuryCash,
    settledPassWeek.player.ownedStreamingPlatform.treasuryCash,
    'replaying the same platform week cannot credit pass or ad cash a second time');
console.log('C4 pass settlement', { oneHourPassTransactions: passViewing.revenue.oneHourPassTransactions,
    oneHourPassRevenue: passViewing.revenue.oneHourPassRevenue,
    dayPassTransactions: passViewing.revenue.dayPassTransactions,
    dayPassRevenue: passViewing.revenue.dayPassRevenue,
    adFreeCoveredHours: passViewing.revenue.adFreeCoveredHours,
    remainingAdRevenue: passViewing.revenue.advertisingRevenue });
assert.ok(passViewing.revenue.advertisingImpressions < playerViewing.revenue.advertisingImpressions,
    'pass-covered viewing must remove ad inventory instead of earning both ads and pass cash');
assert.equal(passViewing.revenue.rentalRevenue, 0,
    'an ad-free pass cannot grant a paid rental title');
const storePlayer = structuredClone(adPlayer);
storePlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['rentals'];
storePlayer.ownedStreamingPlatform.serviceConfiguration.pricing.rentals = {
    rent: 5, buy: 18, windowWeeks: 4,
};
storePlayer.ownedStreamingPlatform.catalogLicenses[0].accessGrant = {
    schemaVersion: 1, modes: ['RENTAL', 'PURCHASE'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT',
};
storePlayer.ownedStreamingPlatform.metrics.subscribers = 0;
storePlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(storePlayer, week);
storePlayer.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, storePlayer, week);
const storeState = createWorldStreamingViewingState(storePlayer, week);
const storeViewing = getWorldStreamingPlayerViewingOutcome(storeState);
assert.ok(storeViewing && storeViewing.revenue.rentalTransactions > 0
    && storeViewing.revenue.purchaseTransactions > 0,
    'a rental-only service must make rights-valid store sales without subscription customers');
assert.equal(storeViewing.revenue.attributedSubscriptionRevenue, 0,
    'store-only buyers never create subscription revenue');
const hybridPlayer = structuredClone(storePlayer);
hybridPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs', 'rentals'];
hybridPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.plans = [{
    id: 'standard', name: 'Standard', monthly: 6, featureIds: [], ads: false,
}];
// Keep C4 Film store-only; a second, explicitly granted title supports the
// membership whose subscribers can separately buy that excluded rental.
hybridPlayer.world.projects.push({ ...hybridPlayer.world.projects[0], id: 'c4-membership-film',
    title: 'C4 Membership Film' } as any);
hybridPlayer.ownedStreamingPlatform.catalogProjectIds.push('c4-membership-film');
hybridPlayer.ownedStreamingPlatform.catalogLicenses.push({ ...license, id: 'c4-membership-license',
    sourceProjectId: 'c4-membership-film',
    titleAtSigning: 'C4 Membership Film', accessGrant: { schemaVersion: 1,
        modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' } });
hybridPlayer.ownedStreamingPlatform.launchSlate!.entries.push({
    ...hybridPlayer.ownedStreamingPlatform.launchSlate!.entries[0],
    id: 'c4-membership-slate', projectId: 'c4-membership-film', title: 'C4 Membership Film',
});
hybridPlayer.ownedStreamingPlatform.metrics.subscribers = 250_000;
hybridPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(hybridPlayer, week);
hybridPlayer.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, hybridPlayer, week);
const hybridViewing = getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(hybridPlayer, week));
console.log('C4 hybrid diagnostic', {
    paid: hybridPlayer.world.worldStreamingCustomers.global.playerEndingPaidAccounts,
    stores: hybridPlayer.world.worldStreamingAudienceChoice.countries.US.playerStoreHouseholds,
    rentals: hybridViewing?.revenue.rentalTransactions,
});
assert.ok(hybridPlayer.world.worldStreamingCustomers.global.playerEndingPaidAccounts > 0,
    'hybrid fixture must include real paid subscribers');
assert.ok(hybridViewing && hybridViewing.revenue.rentalTransactions > 0,
    'subscribers can separately rent a title excluded from their membership grant');
const standaloneStoreBuyers = hybridPlayer.world.worldStreamingAudienceChoice.countries.US.playerStoreHouseholds;
assert.ok(hybridViewing.revenue.rentalTransactions
    > Math.round(standaloneStoreBuyers * .035 * Math.exp(-5 / 12)),
    'hybrid rental sales must include subscriber opportunities, not only store-led households');
const membersOnly = structuredClone(hybridPlayer);
membersOnly.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers = {
    ...membersOnly.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers!,
    storeEligibility: { kind: 'MEMBERSHIP_PLANS', planIds: ['standard'] },
};
membersOnly.world.worldStreamingCustomers = createWorldStreamingCustomerState(membersOnly, week);
membersOnly.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, membersOnly, week);
assert.equal(membersOnly.world.worldStreamingAudienceChoice.countries.US.playerStoreHouseholds, 0,
    'member-only rentals cannot attract standalone public store households');
const memberViewing = getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(membersOnly, week));
assert.ok((memberViewing?.revenue.rentalTransactions || 0) > 0,
    'eligible active Standard subscribers may rent a store-only title');
const memberState = createWorldStreamingViewingState(membersOnly, week);
assert.ok(memberState.commercialTransactions?.length,
    'member-only revenue must be backed by durable store transactions');
assert.ok(memberState.commercialTransactions!.every(row => row.buyerPlanId === 'standard'),
    'each member-only sale retains its actual plan at the transaction boundary');
memberState.commercialTransactions!.reduce((choice, transaction) =>
    recordPlayerStreamingAudienceEntitlement(choice, membersOnly, transaction),
membersOnly.world.worldStreamingAudienceChoice!);
assert.throws(() => recordPlayerStreamingAudienceEntitlement(membersOnly.world.worldStreamingAudienceChoice!,
    membersOnly, { ...memberState.commercialTransactions![0], transactionId: 'wrong-plan-sale',
        buyerPlanId: 'ESSENTIAL' }), /membership denied/,
    'an Essential sale cannot be justified by a pool of Standard members');
const expiredMembers = structuredClone(membersOnly);
expiredMembers.world.worldStreamingCustomers!.lastProcessedAbsoluteWeek = week - 1;
assert.throws(() => recordPlayerStreamingAudienceEntitlement(membersOnly.world.worldStreamingAudienceChoice!,
    expiredMembers, { ...memberState.commercialTransactions![0], transactionId: 'expired-member-sale' }),
    /membership denied/, 'an old customer snapshot cannot authorize a new-week transaction');
const membersBlocked = structuredClone(membersOnly);
membersBlocked.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers!.storeEligibility = {
    kind: 'MEMBERSHIP_PLANS', planIds: [],
};
membersBlocked.world.worldStreamingAudienceChoice = normalizeWorldStreamingAudienceChoiceState(undefined, membersBlocked, week);
const blockedViewing = getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(membersBlocked, week));
assert.equal(blockedViewing?.revenue.rentalTransactions || 0, 0,
    'a restricted store with no eligible plans cannot mint rental receipts');
assert.equal(blockedViewing?.revenue.purchaseTransactions || 0, 0,
    'a restricted store with no eligible plans cannot mint purchase receipts');
const blockedForecast = forecastWorldStreamingLaunchPricing(membersBlocked,
    membersBlocked.ownedStreamingPlatform.serviceConfiguration.pricing, ['US']);
assert.equal(blockedForecast.estimatedWeeklyRentalBuyersIfPlayable, 0,
    'the opening forecast must obey the same no-eligible-plan policy');
assert.equal(blockedForecast.estimatedWeeklyPurchaseBuyersIfPlayable, 0);
assert.ok(storeState.commercialTransactions?.length === 2,
    'one aggregate rental and one purchase are recorded for the sold title-country-week');
assert.equal(storeState.commercialTransactions?.filter(row => row.kind === 'RENTAL')
    .reduce((sum, row) => sum + row.households, 0), storeViewing.revenue.rentalTransactions,
    'settled rental cash must match the saved transaction count');
const acquired = storeState.commercialTransactions!.reduce((state, transaction) =>
    recordPlayerStreamingAudienceEntitlement(state, storePlayer, transaction),
storePlayer.world.worldStreamingAudienceChoice!);
assert.equal(acquired.entitlements.length, 2,
    'rental and durable-purchase ownership are persisted by the C3 ledger');
const restrictedAfterSale = structuredClone(storePlayer);
restrictedAfterSale.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers = {
    ...restrictedAfterSale.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers!,
    storeEligibility: { kind: 'MEMBERSHIP_PLANS', planIds: [] },
};
assert.equal(normalizeWorldStreamingAudienceChoiceState(acquired, restrictedAfterSale, week + 1).entitlements.length, 2,
    'changing new-sale eligibility cannot erase a prior purchase or unexpired rental');
assert.deepEqual(storeState.commercialTransactions!.reduce((state, transaction) =>
    recordPlayerStreamingAudienceEntitlement(state, storePlayer, transaction), acquired), acquired,
    'replaying the same weekly transactions cannot add ownership or cash twice');
const storeWeekPlayer = { ...storePlayer, world: { ...storePlayer.world, worldStreamingViewing: storeState } };
const settledStoreWeek = settleWorldStreamingAudienceEntitlements(storeWeekPlayer, week);
assert.equal(settledStoreWeek.world.worldStreamingAudienceChoice?.entitlements.length, 2,
    'the actual week boundary must persist every settled store entitlement');
assert.deepEqual(settleWorldStreamingAudienceEntitlements(settledStoreWeek, week), settledStoreWeek,
    'the actual week boundary must not double-settle transactions');
let compactPurchaseState = storePlayer.world.worldStreamingAudienceChoice!;
for (let index = 0; index < 1025; index += 1) {
    compactPurchaseState = recordPlayerStreamingAudienceEntitlement(compactPurchaseState, storePlayer, {
        transactionId: `c4-purchase-${index}`, countryId: 'US', titleId: 'c4-film', kind: 'PURCHASE',
        households: 1, purchasedAtAbsoluteWeek: week,
    });
}
assert.equal(compactPurchaseState.entitlements.length, 1,
    'durable purchases compact by title and country instead of exhausting a transaction-row cap');
assert.equal(compactPurchaseState.entitlements[0].households, 1025,
    'compaction preserves the number of purchasing households');
assert.deepEqual(recordPlayerStreamingAudienceEntitlement(compactPurchaseState, storePlayer, {
    transactionId: 'c4-purchase-1024', countryId: 'US', titleId: 'c4-film', kind: 'PURCHASE',
    households: 1, purchasedAtAbsoluteWeek: week,
}),compactPurchaseState,'compaction must retain replay protection for every transaction in this week');
const saturatedStore = structuredClone(storePlayer);
const storeAccessCountry = saturatedStore.world.worldStreamingAudienceChoice!.countries.US;
const storeAccess = storeAccessCountry.playerStoreHouseholds+(storeAccessCountry.playerSecondaryStoreHouseholds || 0);
saturatedStore.world.worldStreamingAudienceChoice!.entitlements = [{
    transactionId: 'c4-earlier-purchases', platformId: 'PLAYER', countryId: 'US', titleId: 'c4-film',
    kind: 'PURCHASE', households: storeAccess - 1, purchasedAtAbsoluteWeek: week - 1,
    expiresAtAbsoluteWeek: null,
}];
const saturatedViewing = getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(saturatedStore, week));
assert.ok((saturatedViewing?.revenue.purchaseTransactions || 0) <= 1,
    'existing permanent owners cannot be sold the same title again as new households');
const deniedStore = structuredClone(storePlayer);
deniedStore.ownedStreamingPlatform.catalogLicenses[0].accessGrant = {
    schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'NONE', source: 'EXPLICIT',
};
const deniedViewing = getWorldStreamingPlayerViewingOutcome(createWorldStreamingViewingState(deniedStore, week));
assert.equal(deniedViewing?.revenue.rentalRevenue || 0, 0,
    'a title without rental grant cannot produce rental cash');
assert.equal(deniedViewing?.revenue.purchaseRevenue || 0, 0,
    'a title without perpetual purchase grant cannot produce purchase cash');
const adForecast = forecastWorldStreamingLaunchPricing(adPlayer,
    adPlayer.ownedStreamingPlatform.serviceConfiguration.pricing, ['US']);
assert.deepEqual(forecastWorldStreamingLaunchPricing(alternateTargetPlayer,
    alternateTargetPlayer.ownedStreamingPlatform.serviceConfiguration.pricing, ['US']), adForecast,
    'changing only a legacy target CPM cannot change the opening ad forecast');
assert.equal(adForecast.subscribers, 0, 'ad-only forecast cannot call free viewers subscribers');
assert.ok(adForecast.freeAdHouseholds > 0 && adForecast.estimatedWeeklyAdRevenueIfPlayable > 0,
    'ad-only forecast uses audience choice and the shared country ad resolver');
const passForecast = forecastWorldStreamingLaunchPricing(passPlayer,
    passPlayer.ownedStreamingPlatform.serviceConfiguration.pricing, ['US']);
assert.ok(passForecast.estimatedWeeklyPassRevenueIfPlayable > 0,
    'ad-free pass forecast shares the live pass conversion and affordability resolver');
assert.ok(passForecast.estimatedWeeklyAdRevenueIfPlayable < adForecast.estimatedWeeklyAdRevenueIfPlayable,
    'pass-covered forecast hours cannot also be sold as ad inventory');
const storeForecast = forecastWorldStreamingLaunchPricing(storePlayer,
    storePlayer.ownedStreamingPlatform.serviceConfiguration.pricing, ['US']);
assert.ok(storeForecast.estimatedWeeklyRentalRevenueIfPlayable > 0
    && storeForecast.estimatedWeeklyPurchaseRevenueIfPlayable > 0,
    'a store-led proposal must show explicitly conditional rent and buy estimates');
assert.equal(adForecast.estimatedWeeklyRentalRevenueIfPlayable, 0,
    'a free-ad offer without store pricing cannot forecast rental cash');

const poorForecastPlayer=structuredClone(storePlayer),hitForecastPlayer=structuredClone(storePlayer);
(poorForecastPlayer.world.projects[0] as any).quality=20;
(hitForecastPlayer.world.projects[0] as any).quality=95;
const poorStoreForecast=forecastWorldStreamingLaunchPricing(poorForecastPlayer,poorForecastPlayer.ownedStreamingPlatform.serviceConfiguration.pricing,['US']);
const hitStoreForecast=forecastWorldStreamingLaunchPricing(hitForecastPlayer,hitForecastPlayer.ownedStreamingPlatform.serviceConfiguration.pricing,['US']);
assert.ok(hitStoreForecast.estimatedWeeklyRentalRevenueIfPlayable+hitStoreForecast.estimatedWeeklyPurchaseRevenueIfPlayable
    > poorStoreForecast.estimatedWeeklyRentalRevenueIfPlayable+poorStoreForecast.estimatedWeeklyPurchaseRevenueIfPlayable,
    'store preview must use known title quality in the same bounded conversion curve as settlement');
const staleForecastPlayer=structuredClone(hitForecastPlayer);
staleForecastPlayer.world.worldStreamingViewing=createWorldStreamingViewingState(staleForecastPlayer,week-1);
staleForecastPlayer.world.worldStreamingViewing.platforms.PLAYER.titlePerformance.forEach(title=>title.weeksAvailable=104);
const staleStoreForecast=forecastWorldStreamingLaunchPricing(staleForecastPlayer,staleForecastPlayer.ownedStreamingPlatform.serviceConfiguration.pricing,['US']);
assert.ok(staleStoreForecast.estimatedWeeklyRentalRevenueIfPlayable+staleStoreForecast.estimatedWeeklyPurchaseRevenueIfPlayable
    < hitStoreForecast.estimatedWeeklyRentalRevenueIfPlayable+hitStoreForecast.estimatedWeeklyPurchaseRevenueIfPlayable,
    'store preview ages known titles rather than silently assuming a fresh release');
const noStoreTitles=structuredClone(storePlayer);
noStoreTitles.ownedStreamingPlatform.catalogProjectIds=[];
noStoreTitles.ownedStreamingPlatform.catalogLicenses=[];
noStoreTitles.ownedStreamingPlatform.launchSlate!.entries=[];
const emptyStoreForecast=forecastWorldStreamingLaunchPricing(noStoreTitles,noStoreTitles.ownedStreamingPlatform.serviceConfiguration.pricing,['US']);
assert.equal(emptyStoreForecast.estimatedWeeklyRentalRevenueIfPlayable+emptyStoreForecast.estimatedWeeklyPurchaseRevenueIfPlayable,0,
    'an empty store cannot advertise weekly earnings from an invented title');

const aiOffers = getWorldStreamingOffers(createPlatformAiFixture(), 2500).offers.filter(offer => !offer.isPlayer);
const aiFixture = createPlatformAiFixture();
const aiViewing = createWorldStreamingViewingState(aiFixture, 2500);
console.log('C4 AI balance aggregate', {
    subscription: aiViewing.global.revenue.attributedSubscriptionRevenue,
    advertising: aiViewing.global.revenue.advertisingRevenue,
    rental: aiViewing.global.revenue.rentalRevenue,
    purchase: aiViewing.global.revenue.purchaseRevenue,
    incremental: aiViewing.global.revenue.totalIncrementalRevenue,
    titleTransactions: aiViewing.aiStoreTransactions?.length,
});
const aiRestricted = structuredClone(aiFixture);
aiRestricted.world.streamingRightsContracts = {
    'c4-ai-restricted': {
        ...createStreamingLicenseContract({ id: 'c4-ai-restricted',
            sourceProject: { id: 'c4-ai-title', title: 'AI Title', mediaType: 'MOVIE' },
            buyerPlatformId: 'APPLE_TV', platformContentPlanId: null, cataloguePackageId: null,
            licensorName: 'Studio', territory: 'MULTI_REGION', countryIds: ['US'], durationWeeks: 52,
            exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
            signedAtAbsoluteWeek: 2490, startsAtAbsoluteWeek: 2491,
            origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
            windowType: 'PERMANENT', accessGrant: { schemaVersion: 1,
                modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
        }),
    } as any,
};
const aiRestrictedViewing = createWorldStreamingViewingState(aiRestricted, 2500);
assert.equal(aiRestrictedViewing.platforms.APPLE_TV?.revenue.rentalRevenue, 0,
    'an AI platform with an authoritative title but no rental grant cannot earn rentals');
assert.equal(aiRestrictedViewing.platforms.APPLE_TV?.revenue.purchaseRevenue, 0,
    'an AI platform with an authoritative title but no purchase grant cannot earn purchases');
const aiTerritory = structuredClone(aiRestricted);
aiTerritory.world.streamingRightsContracts!['c4-ai-restricted'].accessGrant = {
    schemaVersion: 1, modes: ['RENTAL', 'PURCHASE'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT',
};
const aiTerritoryViewing = createWorldStreamingViewingState(aiTerritory, 2500);
assert.ok((aiTerritoryViewing.countries.US?.platformPerformance?.APPLE_TV?.revenue.rentalRevenue || 0) > 0,
    'AI can rent a title where its explicit country grant allows it');
assert.equal(aiTerritoryViewing.countries.IN?.platformPerformance?.APPLE_TV?.revenue.rentalRevenue || 0, 0,
    'an AI title cannot earn rental receipts outside its signed territory');
const aiTerminated = structuredClone(aiTerritory);
aiTerminated.world.streamingRightsContracts!['c4-ai-restricted'].status = 'TERMINATED';
assert.equal(createWorldStreamingViewingState(aiTerminated, 2500).platforms.APPLE_TV?.revenue.rentalRevenue || 0, 0,
    'terminating the only authored AI position must stop future title sales');
assert.ok(aiViewing.aiCatalogue?.some(title => title.platformId === 'APPLE_TV'),
    'an uncontracted legacy AI operator must receive a saved finite opening catalogue');
assert.ok(aiViewing.aiCatalogue?.some(title => title.platformId === 'APPLE_TV'
    && title.accessGrant.modes.includes('RENTAL')
    && !title.accessGrant.modes.includes('SUBSCRIPTION')),
    'legacy hybrid AI catalogues need at least one store-only title outside membership');
assert.deepEqual(createWorldStreamingViewingState(aiFixture, 2500).aiCatalogue, aiViewing.aiCatalogue,
    'legacy AI catalogue grants must not be rerolled on same-week replay');
assert.equal(aiViewing.aiStoreTransactions?.filter(row => row.platformId === 'APPLE_TV')
    .reduce((sum, row) => sum + row.revenue, 0),
    (aiViewing.platforms.APPLE_TV?.revenue.rentalRevenue || 0)
        + (aiViewing.platforms.APPLE_TV?.revenue.purchaseRevenue || 0),
    'AI store cash must reconcile to rights-checked title-country transactions');
for (const [platformId, summary] of Object.entries(aiViewing.platforms).filter(([id]) => id !== 'PLAYER')) {
    const receipts = (aiViewing.aiStoreTransactions || []).filter(row => row.platformId === platformId);
    assert.equal(receipts.filter(row => row.kind === 'RENTAL').reduce((sum, row) => sum + row.revenue, 0),
        summary.revenue.rentalRevenue, `${platformId} rentals must reconcile to saved titles`);
    assert.equal(receipts.filter(row => row.kind === 'PURCHASE').reduce((sum, row) => sum + row.revenue, 0),
        summary.revenue.purchaseRevenue, `${platformId} purchases must reconcile to saved titles`);
    assert.ok(receipts.every(row => row.households > 0 && row.contractId && row.titleId
        && row.purchasedAtAbsoluteWeek === 2500), `${platformId} receipts need a title, grant and week`);
}
const saturatedAi = structuredClone(aiViewing);
const appleUsTitles = saturatedAi.aiCatalogue!.filter(row => row.platformId === 'APPLE_TV'
    && row.countryIds.includes('US'));
saturatedAi.aiStoreEntitlements = [
    ...(saturatedAi.aiStoreEntitlements || []).filter(row => !(row.platformId === 'APPLE_TV'
        && row.countryId === 'US' && row.kind === 'PURCHASE')),
    ...appleUsTitles.map(row => ({ platformId: 'APPLE_TV', countryId: 'US', titleId: row.titleId,
        kind: 'PURCHASE' as const, households: 1_000_000_000, purchasedAtAbsoluteWeek: 2500,
        expiresAtAbsoluteWeek: null })),
];
const saturatedAiNext = advanceWorldStreamingViewingToWeek(saturatedAi, aiFixture, 2501);
assert.equal(saturatedAiNext.countries.US?.platformPerformance?.APPLE_TV?.revenue.purchaseRevenue || 0, 0,
    'AI cannot repeatedly sell permanently owned titles to the same aggregate audience');
assert.deepEqual(advanceWorldStreamingViewingToWeek(saturatedAiNext, aiFixture, 2501), saturatedAiNext,
    'AI weekly title transactions and ownership must be same-week idempotent');
const oldAiViewing = structuredClone(aiViewing);
delete oldAiViewing.aiCatalogue;
delete oldAiViewing.aiCatalogueSeededPlatformIds;
delete oldAiViewing.aiStoreEntitlements;
delete oldAiViewing.aiStoreTransactions;
assert.deepEqual(advanceWorldStreamingViewingToWeek(oldAiViewing, aiFixture, 2500), oldAiViewing,
    'loading a historical same-week WE6 snapshot must not rewrite already settled AI cash');
assert.ok(advanceWorldStreamingViewingToWeek(oldAiViewing, aiFixture, 2501).aiCatalogue?.length,
    'the next week of an old save receives a frozen opening catalogue without replaying history');
const aiSave = structuredClone(aiFixture);
aiSave.age = 49;
aiSave.currentWeek = 5;
assert.equal(getAbsoluteWeek(aiSave.age, aiSave.currentWeek), 2500);
aiSave.world.worldStreamingViewing = createWorldStreamingViewingState(aiSave, 2500);
const aiSaved = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(aiSave))));
assert.deepEqual(aiSaved.world.worldStreamingViewing?.aiCatalogue,
    aiSave.world.worldStreamingViewing.aiCatalogue,
    'save compaction and migration must preserve frozen AI opening-title grants');
assert.deepEqual(aiSaved.world.worldStreamingViewing?.aiStoreEntitlements,
    aiSave.world.worldStreamingViewing.aiStoreEntitlements,
    'save compaction and migration must preserve durable AI purchase ownership');

const freeFullWeek = await processGameWeek(structuredClone(adPlayer));
assert.ok((freeFullWeek.player.world.worldStreamingViewing?.platforms.PLAYER?.revenue.advertisingRevenue || 0) > 0,
    'a full game week must carry a playable free-ad service through viewing');
const storeFullWeek = await processGameWeek(structuredClone(storePlayer));
assert.ok((storeFullWeek.player.world.worldStreamingViewing?.platforms.PLAYER?.revenue.rentalRevenue || 0) > 0,
    'a full game week must carry rights-valid store sales through viewing');
assert.ok((storeFullWeek.player.world.worldStreamingAudienceChoice?.entitlements.length || 0) > 0,
    'a full game week must persist store ownership after settlement');
const hybridFullWeek = await processGameWeek(structuredClone(hybridPlayer));
assert.ok((hybridFullWeek.player.world.worldStreamingViewing?.platforms.PLAYER?.revenue.rentalRevenue || 0) > 0
    && (hybridFullWeek.player.world.worldStreamingPlatformEconomy?.platforms.PLAYER?.weeklySubscriptionRevenue || 0) > 0,
    'a full hybrid week must carry store and paid subscription receipts together');
console.log('C4 AI store diagnostic', aiOffers.filter(offer => offer.commercialConfiguration.streams.includes('rentals'))
    .slice(0, 4).map(offer => ({ platformId: offer.platformId,
        rentalRevenue: aiViewing.platforms[offer.platformId]?.revenue.rentalRevenue,
        purchases: aiViewing.platforms[offer.platformId]?.revenue.purchaseRevenue })));
assert.ok(aiOffers.some(offer => offer.commercialConfiguration.streams.includes('ads')
    && !offer.commercialConfiguration.streams.includes('subs')),
    'AI competitors must be able to launch without a paid subscription');
assert.ok(aiOffers.some(offer => offer.commercialConfiguration.streams.includes('rentals')
    && !offer.commercialConfiguration.streams.includes('subs')),
    'AI competitors must be able to use store-led offers');
assert.ok(aiOffers.filter(offer => !offer.commercialConfiguration.streams.includes('subs'))
    .every(offer => offer.plans.every(plan => plan.monthlyPrice === 0)),
    'non-subscription AI offers cannot expose paid plan rows');

console.log('C4 ad-market invariants passed.');
