import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration, type Player } from '../types';
import {
    calculateStreamingFundingPressure,
    effectiveMonthlyStreamingPlanPrice,
    firstYearStreamingPlanRevenuePerSubscriber,
    getStreamingBlendedMonthlyPrice,
    getStreamingEntryPrice,
    normalizeStreamingPricingConfiguration,
} from '../services/streamingPricingEconomy';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { forecastPricing, type PricingSettings } from '../components/studio-finance/finance/launch';
import { PlanPriceEditorControl } from '../components/studio-finance/components/launch/StepPricing';

const basePricing: OwnedStreamingPricingConfiguration = {
    streams: ['subs', 'ads'],
    plans: [
        { id: 'BASIC', name: 'Essential', monthly: 7.99, featureIds: ['hd'], ads: true },
        { id: 'PREMIUM', name: 'Standard', monthly: 12.99, featureIds: ['hd', 'streams2', 'downloads'], ads: false },
        { id: 'FAMILY', name: 'Premiere', monthly: 17.99, featureIds: ['uhd', 'streams4', 'downloads', 'noads'], ads: false },
        { id: 'FAN', name: 'Fan', monthly: 22, featureIds: ['uhd', 'streams4', 'early', 'noads'], ads: false, colorId: 'emerald' },
    ],
    annualDiscount: 15,
    introOffer: 30,
    ads: { minutesPerHour: 4, cpm: 22 },
    rentals: { rent: 5.99, buy: 19.99, windowWeeks: 6 },
    premium: { price: 29.99 },
    daypass: { price: 7.99 },
    sponsor: { perTitle: 4_000_000, titles: 0 },
    metered: { perHour: 1 },
    patron: { monthly: 10 },
};

const normalized = normalizeStreamingPricingConfiguration({
    ...basePricing,
    plans: [
        { ...basePricing.plans[0], monthly: 0, ads: true },
        { ...basePricing.plans[1], monthly: 0, ads: false },
        { ...basePricing.plans[2], monthly: 78 },
        { ...basePricing.plans[3], monthly: 150 },
    ],
});
assert.equal(normalized.plans[0].monthly, 0, 'a genuinely ad-supported plan may be free');
assert.equal(normalized.plans[1].monthly, .99, 'a non-ad subscription cannot silently become free');
assert.equal(normalized.plans[2].monthly, 78, 'a deliberate $78 plan remains editable and testable');
assert.equal(normalized.plans[3].monthly, 100, 'prices above the supported game range are capped consistently');

const launchEffective = effectiveMonthlyStreamingPlanPrice(12, 20, 30, 0);
const matureEffective = effectiveMonthlyStreamingPlanPrice(12, 20, 30, 13);
assert.ok(launchEffective < matureEffective, 'the three-month introductory discount expires after 13 weeks');
const firstYearPerSubscriber = firstYearStreamingPlanRevenuePerSubscriber(12, 20, 30);
assert.ok(firstYearPerSubscriber > launchEffective * 12, 'first-year revenue restores the list price after the introductory period');
assert.ok(firstYearPerSubscriber < matureEffective * 12, 'first-year revenue still includes the introductory discount period');

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'pricing-world-integration';
player.age = 32;
player.currentWeek = 20;
player.ownedStreamingPlatform.lifecycle = 'FOUNDING';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Cinema worth staying home for.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
};
player.ownedStreamingPlatform.technologyLevels.ADVERTISING_COMMERCE = 20;

const normalForecast = forecastWorldStreamingLaunchPricing(player, basePricing, ['US', 'IN']);
const expensiveForecast = forecastWorldStreamingLaunchPricing(player, {
    ...basePricing,
    plans: basePricing.plans.map(plan => ({ ...plan, monthly: 78, ads: false })),
}, ['US', 'IN']);
const cheapForecast = forecastWorldStreamingLaunchPricing(player, {
    ...basePricing,
    plans: basePricing.plans.map((plan, index) => ({ ...plan, monthly: index === 0 ? .99 : plan.monthly })),
}, ['US', 'IN']);
const allCheapForecast = forecastWorldStreamingLaunchPricing(player, {
    ...basePricing,
    plans: basePricing.plans.map(plan => ({ ...plan, monthly: .99 })),
}, ['US', 'IN']);
assert.ok(normalForecast.activeRivalCount > 4, 'launch pricing competes against every eligible service in the chosen markets, not a fixed average or top four');
assert.ok(normalForecast.subscribers > expensiveForecast.subscribers, '$78-only pricing loses households in the canonical world economy');
assert.ok(cheapForecast.subscribers > expensiveForecast.subscribers, 'a viable low entry plan converts more households than an unaffordable offer');
assert.ok(allCheapForecast.subscribers > expensiveForecast.subscribers && allCheapForecast.monthlySubscriptionRevenue > 0, 'an all-cheap offer can win volume but does not create free subscription revenue');
assert.deepEqual(normalForecast.planAllocations.map(row => row.planId), basePricing.plans.map(plan => plan.id), 'all custom plans remain represented in the forecast, including plans with zero current demand');
normalForecast.planAllocations.filter(row => row.households > 0).forEach(row => {
    const plan = basePricing.plans.find(item => item.id === row.planId)!;
    assert.equal(row.effectiveMonthlyPrice, effectiveMonthlyStreamingPlanPrice(plan.monthly, basePricing.annualDiscount, basePricing.introOffer, 0), 'a pre-launch forecast starts the introductory window now');
});
const legacyLivePlayer = structuredClone(player) as Player;
legacyLivePlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
legacyLivePlayer.ownedStreamingPlatform.launchProgram.status = 'LAUNCHED';
legacyLivePlayer.ownedStreamingPlatform.serviceConfiguration.pricing = structuredClone(basePricing);
legacyLivePlayer.ownedStreamingPlatform.identity!.foundedAtAbsoluteWeek = Math.max(0, legacyLivePlayer.age * 52 + legacyLivePlayer.currentWeek - 30);
const legacyLiveOffer = getWorldStreamingOffers(legacyLivePlayer, legacyLivePlayer.age * 52 + legacyLivePlayer.currentWeek).offers.find(offer => offer.isPlayer)!;
assert.equal(legacyLiveOffer.plans[0].effectiveMonthlyPrice, effectiveMonthlyStreamingPlanPrice(basePricing.plans[0].monthly, basePricing.annualDiscount, basePricing.introOffer, 30), 'a migrated live platform without a launch receipt does not retain its introductory discount forever');

const launchPanelForecast = forecastPricing(
    basePricing as PricingSettings,
    1,
    { rivalAveragePrice: 999, reachRate: 1 },
    [],
    normalForecast,
);
assert.equal(launchPanelForecast.subscribers, normalForecast.subscribers, 'the wizard consumes canonical rival-aware subscriber demand');
assert.equal(launchPanelForecast.streams.find(stream => stream.id === 'subs')?.monthly, normalForecast.monthlySubscriptionRevenue, 'wizard subscription revenue reconciles with the world forecast');
assert.ok(Math.abs(launchPanelForecast.yearlyRevenue - launchPanelForecast.streams.filter(stream => stream.id !== 'subs').reduce((sum, stream) => sum + stream.monthly * 12, 0) - normalForecast.firstYearSubscriptionRevenue) < .01, 'the wizard models the 13-week introductory offer in first-year revenue');
const normalCommercialForecast = forecastPricing(
    { ...basePricing, streams: ['daypass', 'premium', 'rentals', 'metered', 'patron', 'sponsor'] } as PricingSettings,
    1_000_000,
    { rivalAveragePrice: 12, reachRate: .5 },
);
const hostileCommercialForecast = forecastPricing(
    {
        ...basePricing,
        streams: ['daypass', 'premium', 'rentals', 'metered', 'patron', 'sponsor'],
        rentals: { rent: 10_000, buy: 10_000, windowWeeks: 6 },
        premium: { price: 10_000 },
        daypass: { price: 10_000 },
        metered: { perHour: 10_000 },
        patron: { monthly: 10_000 },
    } as PricingSettings,
    1_000_000,
    { rivalAveragePrice: 12, reachRate: .5 },
);
assert.ok(hostileCommercialForecast.monthlyRevenue < normalCommercialForecast.monthlyRevenue,
    'the launch forecast must reject absurd transactional pricing rather than multiplying it into free money');

const saveResult = saveStreamingPricingPlan(player, {
    ...basePricing,
    plans: [
        { ...basePricing.plans[0], monthly: 0, ads: true },
        { ...basePricing.plans[1], monthly: 0, ads: false },
        { ...basePricing.plans[2], monthly: 100 },
        { ...basePricing.plans[3], monthly: 150 },
    ],
});
assert.equal(saveResult.changed, true, 'valid custom pricing saves');
assert.deepEqual(saveResult.player.ownedStreamingPlatform.serviceConfiguration.pricing.plans.map(plan => plan.monthly), [0, .99, 100, 100], 'saved plans use the same free, floor and ceiling rules as the forecast');
assert.equal(getStreamingEntryPrice(saveResult.player.ownedStreamingPlatform), 0, 'all-plan entry-price readers include the free ad tier');
assert.ok(getStreamingBlendedMonthlyPrice(saveResult.player.ownedStreamingPlatform) > 0, 'legacy economics use every configured plan rather than only three mirrored tiers');

const funding = calculateStreamingFundingPressure({ treasuryBefore: 0, operatingRevenue: 1_000_000, operatingCost: 4_000_000 });
assert.equal(funding.unfundedCost, 3_000_000, 'unfunded weekly obligations are not erased when treasury reaches zero');
assert.ok(funding.technologyHealthPenalty > 0 && funding.distressed, 'a player-owned platform faces operational pressure without an AI rescue cushion');

const priceControl = renderToStaticMarkup(React.createElement(PlanPriceEditorControl, {
    value: 13,
    minimum: .99,
    maximum: 100,
    onCommit: () => undefined,
}));
assert.match(priceControl, /type="number"/, 'the plan editor exposes direct numeric price entry');
assert.match(priceControl, /inputMode="decimal"/, 'the direct price field uses a mobile decimal keyboard');

console.log(`Pricing/world integration: ${normalForecast.subscribers.toLocaleString()} normal subscribers vs ${expensiveForecast.subscribers.toLocaleString()} at $78; ${normalForecast.activeRivalCount} rivals.`);
