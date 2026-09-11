import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createWorldStreamingCompetitionState } from '../services/worldEconomy/worldStreamingCompetition';
import {
    advanceWorldStreamingCustomersToWeek,
    createWorldStreamingCustomerState,
    getWorldStreamingPlayerCustomerOutcome,
} from '../services/worldEconomy/worldStreamingCustomers';
import * as viewingEngine from '../services/worldEconomy/worldStreamingViewing';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { migratePlayerSave } from '../services/saveMigration';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';

const createViewing = (viewingEngine as any).createWorldStreamingViewingState;
const normalizeViewing = (viewingEngine as any).normalizeWorldStreamingViewingState;
const advanceViewing = (viewingEngine as any).advanceWorldStreamingViewingToWeek;
const getPlayerOutcome = (viewingEngine as any).getWorldStreamingPlayerViewingOutcome;

assert.equal(typeof createViewing, 'function', 'WE6 exposes a canonical viewing-state constructor');
assert.equal(typeof normalizeViewing, 'function', 'WE6 exposes deterministic viewing normalization');
assert.equal(typeof advanceViewing, 'function', 'WE6 exposes weekly viewing progression');
assert.equal(typeof getPlayerOutcome, 'function', 'WE6 exposes the player-platform viewing outcome');

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'we6-viewing-audit';
player.age = 32;
player.currentWeek = 9;
player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Every screen deserves a great story.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
};
player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
player.ownedStreamingPlatform.serviceConfiguration.pricing = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs', 'ads', 'rentals', 'premium', 'sponsor'],
    plans: [
        { id: 'ESSENTIAL', name: 'Essential', monthly: 7, featureIds: ['hd'], ads: true, colorId: 'emerald' },
        { id: 'PREMIERE', name: 'Premiere', monthly: 18, featureIds: ['uhd', 'streams4', 'downloads', 'noads'], ads: false, colorId: 'magenta' },
    ],
    sponsor: { perTitle: 3_000_000, titles: 1 },
};
player.ownedStreamingPlatform.metrics.subscribers = 250_000;

const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
player.ownedStreamingPlatform.launchCommit = {
    id: 'we6-launch', idempotencyKey: 'we6-launch:empire-plus', committedAtAbsoluteWeek: absoluteWeek - 4,
    capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 88,
    forecastLikelyConcurrentStreams: 150_000, forecastHighConcurrentStreams: 300_000,
    protectedPeakConcurrentStreams: 600_000, launchHeadroomPercent: 50, initialSubscribers: 250_000,
    openingDemandIndex: 78, playbackSuccessRate: 99.5, outcomeTier: 'SMOOTH_OPENING',
    openingTitleCount: 3, openingOriginalTitle: 'City of Monsoon',
};
player.world.projects = [
    {
        id: 'hindi-heart', title: 'City of Monsoon', genre: 'DRAMA', originalLanguageId: 'Hindi', mediaType: 'MOVIE',
        targetAudience: 'MASS', studioId: 'empire-studios', budgetTier: 'HIGH', quality: 91, rating: 8.4,
        boxOffice: 180_000_000, year: player.age, weekReleased: player.currentWeek - 2,
        leadActorId: 'star-local', leadActorName: 'Aarav Shah', directorId: 'director-local', directorName: 'Mira Rao',
        reviews: 'A culturally precise audience favorite.', isFamous: true,
    },
    {
        id: 'imported-action', title: 'Cold Detonation', genre: 'ACTION', originalLanguageId: 'English', mediaType: 'MOVIE',
        targetAudience: 'MASS', studioId: 'empire-studios', budgetTier: 'HIGH', quality: 42, rating: 5.1,
        boxOffice: 40_000_000, year: player.age, weekReleased: player.currentWeek - 2,
        leadActorId: 'star-import', leadActorName: 'John Stone', directorId: 'director-import', directorName: 'Max Ford',
        reviews: 'A loud but shallow import.',
    },
    {
        id: 'us-window-only', title: 'Liberty Signal', genre: 'THRILLER', originalLanguageId: 'English', mediaType: 'SERIES',
        targetAudience: 'ADULT', studioId: 'harbor-pictures', budgetTier: 'MEDIUM', quality: 78, rating: 7.7,
        boxOffice: 0, year: player.age, weekReleased: player.currentWeek - 1,
        leadActorId: 'star-signal', leadActorName: 'June West', directorId: 'director-signal', directorName: 'Rae Cole',
        reviews: 'A tightly plotted thriller.',
    },
] as any;
player.ownedStreamingPlatform.originalCommissions = [
    {
        id: 'commission-hindi-heart', scriptId: 'script-hindi-heart', canonicalProjectId: 'hindi-heart',
        title: 'City of Monsoon', gapId: 'LOCAL_BREAKOUT', projectType: 'MOVIE', genre: 'DRAMA', episodes: 1,
        producerStudioId: 'empire-studios', producerStudioName: 'Empire Studios', commissionedByPlatformName: 'Empire+',
        productionBudgetCap: 80_000_000, productionFundingApplied: 80_000_000, status: 'RELEASED',
        commissionedAtAbsoluteWeek: absoluteWeek - 20, greenlitAtAbsoluteWeek: absoluteWeek - 18,
    },
    {
        id: 'commission-imported-action', scriptId: 'script-imported-action', canonicalProjectId: 'imported-action',
        title: 'Cold Detonation', gapId: 'EVENT_MOVIE', projectType: 'MOVIE', genre: 'ACTION', episodes: 1,
        producerStudioId: 'empire-studios', producerStudioName: 'Empire Studios', commissionedByPlatformName: 'Empire+',
        productionBudgetCap: 90_000_000, productionFundingApplied: 90_000_000, status: 'RELEASED',
        commissionedAtAbsoluteWeek: absoluteWeek - 20, greenlitAtAbsoluteWeek: absoluteWeek - 18,
    },
] as any;
player.ownedStreamingPlatform.catalogLicenses = [{
    id: 'license-us-window', sourceProjectId: 'us-window-only', titleAtSigning: 'Liberty Signal',
    projectType: 'SERIES', genre: 'THRILLER', licensorName: 'Harbor Pictures', territory: 'DOMESTIC',
    countryIds: ['US'], durationWeeks: 52, exclusivity: 'EXCLUSIVE', minimumGuarantee: 12_000_000,
    platformRevenueShare: 70, licensorRevenueShare: 30, signedAtAbsoluteWeek: absoluteWeek - 5,
    startsAtAbsoluteWeek: absoluteWeek - 1, expiresAtAbsoluteWeek: absoluteWeek + 51, status: 'ACTIVE',
}];
player.ownedStreamingPlatform.catalogProjectIds = ['hindi-heart', 'imported-action', 'us-window-only'];
player.ownedStreamingPlatform.launchSlate = {
    entries: [
        { id: 'slate-hindi-heart', projectId: 'hindi-heart', title: 'City of Monsoon', source: 'ORIGINAL', projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 4, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'EVENT' },
        { id: 'slate-imported-action', projectId: 'imported-action', title: 'Cold Detonation', source: 'ORIGINAL', projectType: 'MOVIE', genre: 'ACTION', launchWeek: 4, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' },
        { id: 'slate-us-window', projectId: 'us-window-only', title: 'Liberty Signal', source: 'LICENSED_WINDOW', projectType: 'SERIES', genre: 'THRILLER', launchWeek: 4, releasePattern: 'WEEKLY', marketingPlan: 'STANDARD' },
    ],
    programmedAtAbsoluteWeek: absoluteWeek - 3,
    revision: 1,
};
player.ownedStreamingPlatform.weeklyHistory = [{
    id: 'we6-previous-week', absoluteWeek: absoluteWeek - 1, subscribers: 250_000, netSubscriberMovement: 0,
    churnRate: .02, engagementRate: .6, averageRevenuePerUser: 10, cashRunwayWeeks: 100,
    technologyHealth: 90, causeMarkers: [], operations: {
        programWeek: 4,
        headline: 'The opening catalogue found its audience.',
        summary: 'A stable opening week.',
        nextWeekHook: 'More audience evidence arrives next week.',
    } as any,
}];
player.world.worldStreamingCompetition = createWorldStreamingCompetitionState(player, absoluteWeek);
player.world.worldStreamingCustomers = createWorldStreamingCustomerState(player, absoluteWeek);
const before = JSON.stringify(player);
const state = createViewing(player, absoluteWeek);
const repeated = createViewing(player, absoluteWeek);

const openingOwnedPlayer = structuredClone(player) as Player;
openingOwnedPlayer.businesses = [{
    id: 'empire-studios', name: 'Empire Studios', type: 'PRODUCTION_HOUSE', subtype: 'MAJOR_STUDIO',
    logo: 'ES', color: '#6d4aff', foundedWeek: 1, balance: 100_000_000, isActive: true,
    config: {} as any, stats: {} as any, staff: [], products: [], hiringPool: [], lastHiringRefreshWeek: 0, history: [],
}];
openingOwnedPlayer.pastProjects = [{
    id: 'owned-opening-title', name: 'Empire Archive', studioId: 'empire-studios', projectType: 'MOVIE',
    genre: 'DRAMA', rating: 7.8, imdbRating: 7.8, gross: 90_000_000, year: 31, releaseYear: 31,
} as any];
openingOwnedPlayer.ownedStreamingPlatform.catalogProjectIds.push('owned-opening-title');
openingOwnedPlayer.ownedStreamingPlatform.launchSlate!.entries.push({
    id: 'owned-opening-slate', projectId: 'owned-opening-title', title: 'Empire Archive', source: 'OWNED_LIBRARY',
    projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 4, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD',
});
openingOwnedPlayer.ownedStreamingPlatform.weeklyHistory = [];
assert.equal(
    getStreamingContentAvailability(openingOwnedPlayer, 'owned-opening-title').status,
    'LIVE',
    'an owned opening-slate title becomes live from the current absolute program week even before the weekly report is written',
);

assert.deepEqual(state, repeated, 'identical canonical inputs create identical WE6 state');
assert.equal(JSON.stringify(player), before, 'WE6 construction does not mutate the player');
assert.equal(state.schemaVersion, 1, 'WE6 stores a versioned canonical state');
assert.equal(state.lastProcessedAbsoluteWeek, absoluteWeek, 'WE6 commits the requested absolute week');
assert.ok(Number.isFinite(state.global.totalViewingAccounts), 'WE6 global viewing total is finite');
assert.ok(Number.isFinite(state.global.totalHoursViewed), 'WE6 global watch-hour total is finite');
assert.ok(state.snapshots.length <= 52, 'WE6 snapshots are bounded');
assert.equal(normalizeViewing(state, player, absoluteWeek), state, 'same-week normalization preserves immutable state identity');
assert.equal(advanceViewing(state, player, absoluteWeek), state, 'same-week advancement cannot reroll viewing');

const outcome = getPlayerOutcome(state);
assert.ok(outcome, 'an active player platform receives a canonical WE6 outcome');
assert.equal(outcome.platformId, 'PLAYER', 'the first WE6 consumer uses the stable player platform ID');
assert.ok(outcome.totalViewingAccounts > 0, 'eligible live titles receive canonical viewing');
assert.ok(outcome.totalViewingAccounts <= player.world.worldStreamingCustomers.global.playerAccessLoadAccounts, 'viewing cannot exceed the player access pool');
assert.equal(
    outcome.titlePerformance.reduce((sum: number, title: any) => sum + title.viewingAccounts, 0),
    outcome.totalViewingAccounts,
    'title viewing reconciles to the platform total',
);
assert.equal(
    outcome.accessMix.paidViewingAccounts + outcome.accessMix.sharedViewingAccounts,
    outcome.totalViewingAccounts,
    'legitimate paid and shared paths reconcile to platform viewing accounts',
);
assert.ok(outcome.accessMix.piracyViewingAccounts >= 0, 'pirated viewing remains a distinct non-paying path');
assert.ok(outcome.unmetDemandAccounts > 0, 'the allocator preserves an explicit no-watch or unmet-demand option');
assert.ok(state.countries.IN, 'WE6 materializes a player country with customer access');
assert.ok(
    !state.countries.IN.titlePerformance.some((title: any) => title.projectId === 'us-window-only'),
    'a US-only license receives no legitimate India viewing',
);
assert.ok(
    state.countries.US.titlePerformance.some((title: any) => title.projectId === 'us-window-only'),
    'a US-only license remains eligible inside its contracted country',
);
const localIndia = outcome.titlePerformance.find((title: any) => title.projectId === 'hindi-heart')
    ?.countryPerformance.find((country: any) => country.countryId === 'IN');
const importIndia = outcome.titlePerformance.find((title: any) => title.projectId === 'imported-action')
    ?.countryPerformance.find((country: any) => country.countryId === 'IN');
assert.ok(localIndia && importIndia && localIndia.viewingAccounts > importIndia.viewingAccounts, 'strong local-language quality can beat a weak imported title in its home market');
outcome.titlePerformance.forEach((title: any) => {
    assert.ok(title.completionRate >= 0 && title.completionRate <= 1, 'completion remains a valid rate');
    assert.ok(title.repeatViewingRate >= 0 && title.repeatViewingRate <= 1, 'repeat viewing remains a valid rate');
    assert.equal(Math.round((title.completionRate + title.abandonmentRate) * 10_000), 10_000, 'completion and abandonment reconcile');
    assert.equal(
        Object.values(title.discoveryMix).reduce((sum: number, value: any) => sum + value, 0),
        100,
        'title discovery shares reconcile to 100 percent',
    );
});

const canonicalWeeklySubscriptionRevenue = Math.round(
    player.world.worldStreamingCustomers.global.playerMonthlySubscriptionRevenue / 4.33,
);
assert.equal(
    outcome.titlePerformance.reduce((sum: number, title: any) => sum + title.revenue.attributedSubscriptionRevenue, 0),
    canonicalWeeklySubscriptionRevenue,
    'WE6 attributes the canonical WE5 weekly subscription revenue exactly once',
);
assert.equal(outcome.revenue.attributedSubscriptionRevenue, canonicalWeeklySubscriptionRevenue, 'platform subscription attribution reconciles to its titles');
assert.ok(outcome.revenue.advertisingImpressions > 0 && outcome.revenue.advertisingRevenue > 0, 'ad-supported viewing creates impressions and advertising cash');
assert.ok(outcome.revenue.premiumTransactions > 0 && outcome.revenue.premiumRevenue > 0, 'eligible fresh premieres can create premium transactions');
assert.ok(outcome.revenue.rentalTransactions > 0 && outcome.revenue.rentalRevenue > 0, 'eligible title demand can create rentals');
assert.ok(outcome.revenue.purchaseTransactions > 0 && outcome.revenue.purchaseRevenue > 0, 'eligible title demand can create purchases');
assert.ok(outcome.revenue.sponsorshipImpressions > 0 && outcome.revenue.sponsorshipRevenue > 0, 'configured sponsored titles earn against delivered exposure');
assert.ok(outcome.revenue.sponsorshipRevenue <= player.ownedStreamingPlatform.serviceConfiguration.pricing.sponsor.perTitle / 52, 'weekly sponsorship earnings remain capped by the configured annual contract');
assert.equal(
    outcome.revenue.totalIncrementalRevenue,
    outcome.revenue.advertisingRevenue + outcome.revenue.premiumRevenue + outcome.revenue.rentalRevenue
        + outcome.revenue.purchaseRevenue + outcome.revenue.sponsorshipRevenue,
    'incremental commercial revenue reconciles without subscription attribution',
);
const subscriptionsOnly = structuredClone(player) as Player;
subscriptionsOnly.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs'];
const subscriptionsOnlyState = createViewing(subscriptionsOnly, absoluteWeek);
const subscriptionsOnlyOutcome = getPlayerOutcome(subscriptionsOnlyState);
assert.ok(subscriptionsOnlyOutcome, 'subscriptions-only player remains viewable');
assert.equal(subscriptionsOnlyOutcome.revenue.totalIncrementalRevenue, 0, 'disabled commercial streams create no incremental revenue');
assert.equal(subscriptionsOnlyOutcome.revenue.advertisingImpressions, 0, 'disabled advertising creates no impressions');

const weeklyInput = structuredClone(player) as Player;
weeklyInput.world.worldStreamingViewing = state;
const weeklyResult = processOwnedStreamingPlatformWeek(weeklyInput);
const weeklyOperations = weeklyResult.snapshot?.operations;
assert.ok(weeklyResult.processed && weeklyOperations, 'the owned streaming week consumes a committed WE6 outcome');
assert.equal(weeklyOperations?.worldViewingAccounts, outcome.totalViewingAccounts, 'weekly operations retain exact WE6 viewing accounts');
assert.equal(weeklyOperations?.worldViewingHours, outcome.totalHoursViewed, 'weekly operations retain exact WE6 hours');
assert.equal(weeklyOperations?.worldViewingUnmetDemandAccounts, outcome.unmetDemandAccounts, 'weekly operations retain explicit unmet demand');
assert.equal(weeklyOperations?.worldViewingIncrementalRevenue, outcome.revenue.totalIncrementalRevenue, 'weekly cash settlement consumes WE6 incremental revenue once');
assert.equal(weeklyOperations?.worldViewingAdvertisingRevenue, outcome.revenue.advertisingRevenue, 'weekly operations retain advertising revenue evidence');
assert.equal(weeklyOperations?.worldViewingTransactionRevenue,
    outcome.revenue.premiumRevenue + outcome.revenue.rentalRevenue + outcome.revenue.purchaseRevenue,
    'weekly operations retain transaction revenue evidence');
assert.equal(weeklyOperations?.worldViewingSponsorshipRevenue, outcome.revenue.sponsorshipRevenue, 'weekly operations retain sponsorship revenue evidence');
assert.equal(weeklyOperations?.subscriptionRevenue, canonicalWeeklySubscriptionRevenue, 'WE5 subscription cash remains the single canonical subscription amount');
assert.equal(
    weeklyOperations?.titlePerformance?.reduce((sum: number, title: any) => sum + title.hoursViewed, 0),
    outcome.totalHoursViewed,
    'weekly title telemetry uses canonical WE6 hours rather than the legacy flat allocator',
);

const oldSave = structuredClone(player) as Player;
delete oldSave.world.worldStreamingViewing;
oldSave.money = 812_345_678;
oldSave.ownedStreamingPlatform.treasuryCash = 234_567_890;
const migrated = migratePlayerSave(oldSave);
assert.ok(migrated.world.worldStreamingViewing, 'old saves gain canonical WE6 viewing state');
assert.equal(migrated.money, oldSave.money, 'WE6 migration does not move player cash');
assert.equal(migrated.ownedStreamingPlatform.treasuryCash, oldSave.ownedStreamingPlatform.treasuryCash, 'WE6 migration does not move streaming treasury');
assert.deepEqual(migratePlayerSave(migrated).world.worldStreamingViewing, migrated.world.worldStreamingViewing, 'repeated WE6 migration is idempotent');

const gameLoopSource = readFileSync(resolve(process.cwd(), 'services/gameLoop.ts'), 'utf8');
const customerStage = gameLoopSource.indexOf("emitLoopStage('world_streaming_customers_done'");
const viewingStage = gameLoopSource.indexOf("emitLoopStage('world_streaming_viewing_start'");
const ownedStreamingStage = gameLoopSource.indexOf('const ownedStreamingResult = processOwnedStreamingPlatformWeek');
assert.ok(customerStage >= 0 && viewingStage > customerStage && viewingStage < ownedStreamingStage, 'WE6 advances after WE5 and before owned streaming settlement');

const corrupt = structuredClone(state) as any;
corrupt.platforms.PLAYER.titlePerformance[0].viewingAccounts = -50;
corrupt.platforms.PLAYER.titlePerformance[0].revenue.advertisingRevenue = Number.NaN;
const repaired = normalizeViewing(corrupt, player, absoluteWeek);
assert.ok(repaired.platforms.PLAYER.titlePerformance.every((title: any) => title.viewingAccounts >= 0), 'malformed title viewing rebuilds without negative audience');
assert.ok(repaired.platforms.PLAYER.titlePerformance.every((title: any) => Number.isFinite(title.revenue.advertisingRevenue)), 'malformed title revenue rebuilds to finite cash');
const reloadedSameWeek = normalizeViewing(JSON.parse(JSON.stringify(state)), player, absoluteWeek);
assert.deepEqual(reloadedSameWeek, state, 'same-week JSON save/reload preserves the immutable WE6 outcome');

const runLongHorizon = () => {
    const horizonPlayer = structuredClone(player) as Player;
    let horizonCustomers = createWorldStreamingCustomerState(horizonPlayer, absoluteWeek);
    horizonPlayer.world.worldStreamingCustomers = horizonCustomers;
    let horizonViewing = createViewing(horizonPlayer, absoluteWeek);
    for (let year = 1; year <= 400; year += 1) {
        const horizonWeek = absoluteWeek + year * 52;
        horizonPlayer.world.worldStreamingCompetition = createWorldStreamingCompetitionState(horizonPlayer, horizonWeek);
        horizonCustomers = advanceWorldStreamingCustomersToWeek(horizonCustomers, horizonPlayer, horizonWeek);
        horizonPlayer.world.worldStreamingCustomers = horizonCustomers;
        horizonPlayer.ownedStreamingPlatform.metrics.subscribers = getWorldStreamingPlayerCustomerOutcome(horizonCustomers)?.endingPaidAccounts || 0;
        horizonViewing = advanceViewing(horizonViewing, horizonPlayer, horizonWeek);
        horizonPlayer.world.worldStreamingViewing = horizonViewing;
        if (year % 25 === 0) {
            const reloaded = normalizeViewing(JSON.parse(JSON.stringify(horizonViewing)), horizonPlayer, horizonWeek);
            assert.deepEqual(reloaded, horizonViewing, `year ${year} save/reload does not reroll WE6`);
            horizonViewing = reloaded;
        }
    }
    return horizonViewing;
};
const longRunStartedAt = performance.now();
const longRun = runLongHorizon();
const longRunMs = performance.now() - longRunStartedAt;
const serializedBytes = Buffer.byteLength(JSON.stringify(longRun));
assert.equal(longRun.lastProcessedAbsoluteWeek, absoluteWeek + 20_800, 'WE6 reaches a 400-year / 20,800-week horizon');
assert.ok(longRun.snapshots.length <= 52, '400-year WE6 history remains bounded');
assert.ok(serializedBytes < 2_000_000, 'WE6 viewing state remains below the explicit 2 MB mobile-save ceiling');
assert.ok(Number.isFinite(longRun.global.totalViewingAccounts) && longRun.global.totalViewingAccounts >= 0, '400-year viewing remains finite and non-negative');
assert.ok(Number.isFinite(longRun.global.revenue.totalIncrementalRevenue) && longRun.global.revenue.totalIncrementalRevenue >= 0, '400-year incremental revenue remains finite and non-negative');

console.log(`WE6 seed: ${state.global.totalViewingAccounts.toLocaleString()} viewing accounts and ${state.global.totalHoursViewed.toLocaleString()} hours.`);
console.log(`WE6 400-year horizon: ${(serializedBytes / 1024).toFixed(1)} KiB state; ${longRunMs.toFixed(1)}ms across 400 annual checkpoints.`);
