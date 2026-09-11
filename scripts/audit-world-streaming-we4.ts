import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import * as offerRegistry from '../services/worldEconomy/worldStreamingOffers';
import * as competitionEngine from '../services/worldEconomy/worldStreamingCompetition';
import { normalizeWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { normalizeWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { migratePlayerSave } from '../services/saveMigration';
import { forecastPricing, type PricingSettings } from '../components/studio-finance/finance/launch';

const getOffers = (offerRegistry as any).getWorldStreamingOffers;
assert.equal(typeof getOffers, 'function', 'WE4 exposes the canonical streaming offer registry');

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'we4-offer-audit';
player.age = 31;
player.currentWeek = 18;
player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Cinema worth staying home for.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
};
player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
player.ownedStreamingPlatform.serviceConfiguration.pricing = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs', 'ads'],
    annualDiscount: 20,
    introOffer: 15,
    plans: [
        { id: 'ESSENTIAL', name: 'Essential', monthly: 6, featureIds: ['hd'], ads: true, colorId: 'emerald' },
        { id: 'PREMIERE', name: 'Premiere', monthly: 17, featureIds: ['uhd', 'streams4', 'downloads', 'noads'], ads: false, colorId: 'magenta' },
    ],
};

const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
const before = JSON.stringify(player);
const offers = getOffers(player, absoluteWeek);
const repeated = getOffers(player, absoluteWeek);
const playerOffer = offers.offers.find((offer: any) => offer.isPlayer);

assert.ok(playerOffer, 'an active owned platform enters the WE4 offer registry');
assert.deepEqual(playerOffer.plans.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    featureIds: plan.featureIds,
    ads: plan.ads,
})), [
    { id: 'ESSENTIAL', name: 'Essential', monthlyPrice: 6, featureIds: ['hd'], ads: true },
    { id: 'PREMIERE', name: 'Premiere', monthlyPrice: 17, featureIds: ['uhd', 'streams4', 'downloads', 'noads'], ads: false },
], 'player offers preserve exact saved plan identity, price, features and ad status');
assert.equal(playerOffer.annualDiscountPercent, 20, 'player annual discount reaches the registry');
assert.equal(playerOffer.introOfferPercent, 15, 'player introductory discount reaches the registry');
assert.ok(playerOffer.activeCountryIds.includes('US') && playerOffer.activeCountryIds.includes('IN'), 'player offer uses active launch markets');
assert.deepEqual(offers, repeated, 'AI and player offers are deterministic at the same week');
assert.equal(JSON.stringify(player), before, 'reading the offer registry does not mutate the player');

const aiOffers = offers.offers.filter((offer: any) => !offer.isPlayer);
assert.ok(aiOffers.length >= 30, 'every seeded global and regional operator receives an offer without a top-four cap');
assert.ok(aiOffers.every((offer: any) => offer.plans.length >= 1 && offer.plans.length <= 3), 'AI operators expose bounded concrete plan choices');
assert.ok(aiOffers.every((offer: any) => offer.plans.every((plan: any) => plan.monthlyPrice > 0)), 'AI plan prices remain positive');
assert.ok(offers.byCountry.IN.includes('JIOHOTSTAR'), 'a regional operator competes in its actual market');
assert.ok(!offers.byCountry.US.includes('JIOHOTSTAR'), 'a regional operator is excluded outside its active markets');
assert.ok(offers.byCountry.US.includes('PLAYER') && offers.byCountry.IN.includes('PLAYER'), 'the player competes only in their active countries');

console.log(`WE4 offer registry: ${offers.offers.length} operators, ${aiOffers.length} AI competitors, exact player plans preserved.`);

const createCompetition = (competitionEngine as any).createWorldStreamingCompetitionState;
const normalizeCompetition = (competitionEngine as any).normalizeWorldStreamingCompetitionState;
const getPlayerOutcome = (competitionEngine as any).getWorldStreamingPlayerOutcome;
assert.equal(typeof createCompetition, 'function', 'WE4 creates canonical plan competition');
assert.equal(typeof normalizeCompetition, 'function', 'WE4 normalizes saved plan competition');
assert.equal(typeof getPlayerOutcome, 'function', 'WE4 exposes the owned-platform competition result');

const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, absoluteWeek);
player.world.worldPopulation = population;
player.world.worldAudienceEconomy = audience;
player.world.worldAudienceParticipation = participation;
const competitionBefore = JSON.stringify(player);
const competition = createCompetition(player, absoluteWeek);
const competitionRepeated = createCompetition(player, absoluteWeek);

assert.deepEqual(competition, competitionRepeated, 'identical WE1-WE3 and offer inputs produce deterministic competition');
assert.equal(JSON.stringify(player), competitionBefore, 'competition creation does not mutate the player');
assert.equal(competition.global.streamingReachableHouseholds, participation.global.streamingReachableHouseholds, 'WE4 uses WE3 as its only reachable-household ceiling');
assert.ok(competition.global.subscribingHouseholds > 0, 'some eligible households choose streaming');
assert.ok(competition.global.unclaimedHouseholds > 0, 'some eligible households still choose no streaming service');
assert.ok(competition.global.totalSubscriptions > competition.global.subscribingHouseholds, 'WE4 supports households holding multiple services');
assert.ok(competition.countries.IN.platformAllocations.length > 4, 'India competition includes every eligible regional and global operator, not a top-four cap');

Object.values(competition.countries).forEach((country: any) => {
    assert.equal(country.subscribingHouseholds + country.unclaimedHouseholds, country.streamingReachableHouseholds, `${country.countryId} subscribing and unclaimed homes reconcile`);
    assert.ok(country.totalMonthlySubscriptionSpend <= country.totalMonthlyStreamingBudget + .01, `${country.countryId} subscription spending stays inside WE3 budget`);
    assert.equal(country.totalSubscriptions, country.platformAllocations.reduce((sum: number, row: any) => sum + row.households, 0), `${country.countryId} platform allocations reconcile`);
    country.platformAllocations.forEach((row: any) => {
        assert.ok(offers.byCountry[country.countryId]?.includes(row.platformId), `${row.platformId} is actually active in ${country.countryId}`);
        assert.equal(row.households, row.planAllocations.reduce((sum: number, plan: any) => sum + plan.households, 0), `${row.platformId} plan households reconcile`);
        assert.ok(Math.abs(row.monthlySubscriptionRevenue - row.planAllocations.reduce((sum: number, plan: any) => sum + plan.monthlySubscriptionRevenue, 0)) < .011, `${row.platformId} plan revenue reconciles`);
    });
});

const playerOutcome = getPlayerOutcome(competition);
assert.ok(playerOutcome && playerOutcome.households > 0, 'the active player platform wins a finite share of demand');
assert.deepEqual(playerOutcome.planAllocations.map((row: any) => row.planId).sort(), ['ESSENTIAL', 'PREMIERE'], 'different cohorts can select both the value and expensive player plans');
assert.ok(Math.abs(playerOutcome.monthlySubscriptionRevenue - playerOutcome.planAllocations.reduce((sum: number, row: any) => sum + row.monthlySubscriptionRevenue, 0)) < .011, 'player exact-plan revenue reconciles');
assert.deepEqual(normalizeCompetition(competition, player, absoluteWeek), competition, 'same-week WE4 normalization is idempotent');

const corruptCompetition = structuredClone(competition);
corruptCompetition.countries.IN.totalMonthlySubscriptionSpend = corruptCompetition.countries.IN.totalMonthlyStreamingBudget + 1;
assert.deepEqual(normalizeCompetition(corruptCompetition, player, absoluteWeek), competition, 'malformed WE4 totals repair deterministically');

console.log(`WE4 competition: ${competition.global.subscribingHouseholds.toLocaleString()} subscribing homes, ${competition.global.totalSubscriptions.toLocaleString()} subscriptions, ${competition.global.unclaimedHouseholds.toLocaleString()} unclaimed homes.`);

const oldSave = structuredClone(player) as Player;
delete oldSave.world.worldStreamingCompetition;
oldSave.money = 987_654_321;
oldSave.ownedStreamingPlatform.metrics.subscribers = 456_789;
const migrated = migratePlayerSave(oldSave);
assert.ok(migrated.world.worldStreamingCompetition, 'old saves gain a canonical WE4 competition state');
assert.equal(migrated.money, oldSave.money, 'WE4 migration does not move player cash');
assert.equal(migrated.ownedStreamingPlatform.metrics.subscribers, oldSave.ownedStreamingPlatform.metrics.subscribers, 'WE4 migration does not rewrite existing subscribers');
assert.deepEqual(migratePlayerSave(migrated).world.worldStreamingCompetition, migrated.world.worldStreamingCompetition, 'repeated WE4 migration is idempotent');

const gameLoopSource = readFileSync(resolve(process.cwd(), 'services/gameLoop.ts'), 'utf8');
const competitionStage = gameLoopSource.indexOf("emitLoopStage('world_streaming_competition_start'");
const industryDoneStage = gameLoopSource.indexOf("emitLoopStage('streaming_industry_done'");
const ownedStreamingEconomy = gameLoopSource.indexOf('const ownedStreamingResult = processOwnedStreamingPlatformWeek');
assert.ok(industryDoneStage >= 0 && competitionStage > industryDoneStage && competitionStage < ownedStreamingEconomy, 'WE4 runs after AI industry progression and before owned streaming economics');

const weeklyLoopSource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
assert.match(weeklyLoopSource, /getWorldStreamingPlayerOutcome/, 'the owned streaming weekly loop consumes canonical WE4 demand');
assert.match(weeklyLoopSource, /worldCompetitionTargetSubscribers/, 'weekly movement records its WE4 subscriber target');
assert.match(weeklyLoopSource, /worldCompetitionPlanAllocations/, 'weekly results retain exact-plan allocation evidence');
assert.match(weeklyLoopSource, /world-catalogue-localization-fit/, 'weekly reporting explains catalogue and localization fit');
assert.match(weeklyLoopSource, /world-major-rival/, 'weekly reporting identifies major rival pressure');

const pricingSignals = audience.countries.US.cohorts.map(cohort => {
    const overlay = participation.countries.US.cohorts.find(item => item.cohortId === cohort.id)!;
    const reachable = overlay.streamingOnlyHouseholds + overlay.dualParticipantHouseholds;
    return {
        households: reachable,
        monthlyStreamingBudgetPerHousehold: overlay.totalMonthlyStreamingBudget / Math.max(1, reachable),
        priceSensitivityIndex: cohort.priceSensitivityIndex,
        entertainmentAppetiteIndex: cohort.entertainmentAppetiteIndex,
        piracyTendencyIndex: cohort.piracyTendencyIndex,
    };
});
const pricingSettings = player.ownedStreamingPlatform.serviceConfiguration.pricing as PricingSettings;
const weakPricing: PricingSettings = {
    ...pricingSettings,
    plans: pricingSettings.plans.map(plan => ({ ...plan, featureIds: [] })),
};
const forecastMarket = { rivalAveragePrice: 12, reachRate: .05 };
const strongForecast = forecastPricing(pricingSettings, 10_000_000, forecastMarket, pricingSignals);
const weakForecast = forecastPricing(weakPricing, 10_000_000, forecastMarket, pricingSignals);
assert.ok(strongForecast.subscribers > weakForecast.subscribers, 'pricing forecast uses cohort plan fit, not only entry price');
assert.ok(strongForecast.plans.every(row => row.subscribers > 0), 'cohort-backed forecast can preserve demand for both value and premium plans');

const futureWeek = absoluteWeek + 400 * 52;
const futurePlayer = structuredClone(player) as Player;
futurePlayer.world.worldPopulation = normalizeWorldPopulationState(futurePlayer.world.worldPopulation, futureWeek);
futurePlayer.world.worldAudienceEconomy = normalizeWorldAudienceEconomyState(
    futurePlayer.world.worldAudienceEconomy,
    futurePlayer.world.worldPopulation,
    futureWeek,
);
futurePlayer.world.worldAudienceParticipation = normalizeWorldAudienceParticipationState(
    futurePlayer.world.worldAudienceParticipation,
    futurePlayer.world.worldPopulation,
    futurePlayer.world.worldAudienceEconomy,
    futureWeek,
);
const futureCompetition = normalizeCompetition(competition, futurePlayer, futureWeek);
assert.equal(futureCompetition.lastProcessedAbsoluteWeek, futureWeek, 'WE4 projects directly across 400 years');
assert.equal(futureCompetition.global.streamingReachableHouseholds, futurePlayer.world.worldAudienceParticipation.global.streamingReachableHouseholds, '400-year demand stays under the future WE3 ceiling');
assert.ok(futureCompetition.snapshots.length <= 32, 'WE4 long-run snapshots remain bounded');
assert.deepEqual(normalizeCompetition(futureCompetition, futurePlayer, futureWeek), futureCompetition, '400-year destination reload is deterministic');
Object.values(futureCompetition.countries).forEach((country: any) => {
    assert.ok(country.totalMonthlySubscriptionSpend <= country.totalMonthlyStreamingBudget + .01, `${country.countryId} remains budget-safe after 400 years`);
});
const serializedBytes = Buffer.byteLength(JSON.stringify(futureCompetition));
const projectionStartedAt = performance.now();
for (let iteration = 0; iteration < 10; iteration += 1) {
    normalizeCompetition(competition, futurePlayer, futureWeek);
}
const projectionMs = performance.now() - projectionStartedAt;
assert.ok(serializedBytes < 2_000_000, `WE4 save state remains mobile-safe (${serializedBytes} bytes)`);
assert.ok(projectionMs < 2_000, `ten direct 400-year WE4 projections remain practical (${projectionMs.toFixed(1)}ms)`);
console.log(`WE4 long run: ${(serializedBytes / 1024).toFixed(1)} KiB state; ${projectionMs.toFixed(1)}ms for ten 400-year projections.`);
