import assert from 'node:assert/strict';
import { alignStreamingBidderPremiereWeeks, buildReleaseStreamingBidderMarket } from '../services/releaseStreamingAuction';
import { createStreamingBiddingSession } from '../services/streamingBidding';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { INITIAL_PLAYER, type Player, type StreamingEcosystemOperator } from '../types';

const player = structuredClone(INITIAL_PLAYER) as Player;
const ecosystem = normalizeStreamingPlatformEcosystem(undefined, 1_578);
const template = Object.values(ecosystem.operators)[0];
const futureOperator: StreamingEcosystemOperator = {
    ...template,
    id: 'FUTURE_SCREEN',
    name: 'Future Screen',
    kind: 'DYNAMIC_FICTIONAL',
    corePlatformId: null,
    lifecycle: 'ACTIVE',
    cashMillions: 25_000,
    valuationBillions: 2_500,
    subscriberMillions: 1_200,
    technology: 94,
    cataloguePower: 88,
    localization: 91,
    brandPower: 96,
    prestige: 92,
    efficiency: 90,
    risk: 8,
    preferredGenres: ['DRAMA', 'THRILLER'],
    activeCountryIds: Object.keys(ecosystem.markets),
};
ecosystem.operators[futureOperator.id] = futureOperator;
player.world.streamingPlatformEcosystem = ecosystem;

const context = {
    projectId: 'release-project-1',
    title: 'Glass City',
    genre: 'DRAMA',
    packageScore: 82,
    absoluteWeek: 1_578,
    studioPlatformRelations: {},
};
const market = buildReleaseStreamingBidderMarket(player, context);
const replay = buildReleaseStreamingBidderMarket(player, context);

assert.ok(market.length >= 5 && market.length <= 8, `expected 5-8 eligible bidders, received ${market.length}`);
assert.deepEqual(replay, market, 'the same project and week must produce the same bidder market');
assert.ok(market.some(platform => platform.id === 'FUTURE_SCREEN'), 'a qualified future-created ecosystem company must be able to enter the auction');
assert.ok(market.some(platform => !['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'].includes(platform.id)), 'the bidder market must not be limited to the five legacy platforms');
assert.ok(market.every(platform => platform.cashAvailable > 0 && platform.acquisitionCeiling > 0 && platform.baseBid > 0));
assert.ok(market.every(platform => platform.acquisitionCeiling <= platform.cashAvailable));
assert.ok(market.every(platform => (platform.availablePremiereAbsoluteWeeks || []).length > 0));
assert.ok(market.every(platform => platform.availablePremiereAbsoluteWeek === platform.availablePremiereAbsoluteWeeks?.[0]));
assert.ok(market.every(platform => (platform.backendPreference ?? -1) >= 0.1 && (platform.backendPreference ?? 2) <= 0.8));
assert.ok(market.every(platform => (platform.sharedRightsPreference ?? -1) >= 0.05 && (platform.sharedRightsPreference ?? 2) <= 0.75));
assert.ok(new Set(market.map(platform => platform.backendPreference)).size > 1, 'bidder deal-structure preferences must vary by company');
assert.ok(new Set(market.map(platform => platform.sharedRightsPreference)).size > 1, 'bidder exclusivity preferences must vary by company');

const alignedSharedCalendar = alignStreamingBidderPremiereWeeks([
    { ...market[0], id: 'CAL_A', availablePremiereAbsoluteWeeks: [1_700, 1_702], availablePremiereAbsoluteWeek: 1_700 },
    { ...market[0], id: 'CAL_B', availablePremiereAbsoluteWeeks: [1_701, 1_702], availablePremiereAbsoluteWeek: 1_701 },
    { ...market[0], id: 'CAL_C', availablePremiereAbsoluteWeeks: [1_702, 1_703], availablePremiereAbsoluteWeek: 1_702 },
    { ...market[0], id: 'CAL_D', availablePremiereAbsoluteWeeks: [1_704], availablePremiereAbsoluteWeek: 1_704 },
]);
assert.deepEqual(
    alignedSharedCalendar.slice(0, 3).map(platform => platform.availablePremiereAbsoluteWeek),
    [1_702, 1_702, 1_702],
    'the room should coordinate the largest compatible bidder group around one shared premiere date',
);

const nextProjectMarket = buildReleaseStreamingBidderMarket(player, {
    ...context,
    projectId: 'release-project-2',
    title: 'Neon Summer',
    genre: 'COMEDY',
    absoluteWeek: 1_579,
});
assert.notDeepEqual(
    nextProjectMarket.map(platform => platform.id),
    market.map(platform => platform.id),
    'different projects and weeks must be able to attract a different bidder slate',
);
const delayedRightsMarket = buildReleaseStreamingBidderMarket(player, {
    ...context,
    projectId: 'post-theatrical-picture',
    earliestPremiereAbsoluteWeek: 1_590,
});
assert.ok(delayedRightsMarket.every(platform => (platform.availablePremiereAbsoluteWeek || 0) >= 1_590));

const datedSession = createStreamingBiddingSession({
    projectId: 'dated-picture',
    title: 'Dated Picture',
    sellerStudioId: 'studio-1',
    sellerStudioName: 'First Studio',
    absoluteWeek: context.absoluteWeek,
    projectType: 'MOVIE',
    genre: 'DRAMA',
    projectBudget: 40_000_000,
    packageScore: 72,
    platforms: market,
});
assert.ok(
    datedSession.offers.every(offer => offer.proposedPremiereAbsoluteWeek === market.find(platform => platform.id === offer.platformId)?.availablePremiereAbsoluteWeek),
    'every initial offer must carry the buyer calendar date into the contract room',
);
assert.equal(
    new Set(datedSession.offers.map(offer => offer.proposedPremiereAbsoluteWeek)).size,
    1,
    'eligible bidders should enter the room on a coordinated premiere date so shared licensing can produce co-streaming deals',
);

let lowBackendCount = 0;
let highBackendCount = 0;
let lowSharedCount = 0;
let highSharedCount = 0;
for (let index = 0; index < 40; index += 1) {
    const baseInput = {
        projectId: `preference-picture-${index}`,
        title: `Preference Picture ${index}`,
        sellerStudioId: 'studio-1',
        sellerStudioName: 'First Studio',
        absoluteWeek: 1_600 + index,
        projectType: 'MOVIE' as const,
        genre: 'DRAMA',
        projectBudget: 40_000_000,
        packageScore: 72,
    };
    const basePlatform = { ...market[0], id: 'PREFERENCE_TEST', name: 'Preference Test' };
    const low = createStreamingBiddingSession({ ...baseInput, platforms: [{ ...basePlatform, backendPreference: 0.1, sharedRightsPreference: 0.05 }] }).offers[0];
    const high = createStreamingBiddingSession({ ...baseInput, platforms: [{ ...basePlatform, backendPreference: 0.8, sharedRightsPreference: 0.75 }] }).offers[0];
    if (low.licensorRevenueShare > 0) lowBackendCount += 1;
    if (high.licensorRevenueShare > 0) highBackendCount += 1;
    if (low.exclusivity === 'NON_EXCLUSIVE') lowSharedCount += 1;
    if (high.exclusivity === 'NON_EXCLUSIVE') highSharedCount += 1;
}
assert.ok(highBackendCount > lowBackendCount + 12, `backend preference should materially change structures (${lowBackendCount} low vs ${highBackendCount} high)`);
assert.ok(highSharedCount > lowSharedCount + 12, `shared-rights preference should materially change structures (${lowSharedCount} low vs ${highSharedCount} high)`);

console.log('Release streaming auction market audit passed.');
