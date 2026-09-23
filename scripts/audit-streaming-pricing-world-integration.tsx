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
    streamingBillingPathPrice,
} from '../services/streamingPricingEconomy';
import { forecastWorldStreamingBuildDemand, forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { createWorldStreamingCustomerState } from '../services/worldEconomy/worldStreamingCustomers';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { saveOwnedStreamingLaunchMarketingDraft } from '../services/streamingLaunchMarketingLifecycle';
import { forecastPricing, type PricingSettings } from '../components/studio-finance/finance/launch';
import { PlanPriceEditorControl, PlanPricePaths } from '../components/studio-finance/components/launch/StepPricing';

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
const targetedPricing: OwnedStreamingPricingConfiguration = {
    ...basePricing,
    annualDiscount: 0,
    introOffer: 50,
    introOfferPlanId: 'FAMILY',
};
const targetedForecast = forecastWorldStreamingLaunchPricing(player, targetedPricing, ['US', 'IN']);
const deepPromotionForecast = forecastWorldStreamingLaunchPricing(player, { ...targetedPricing, introOffer: 90 }, ['US', 'IN']);
const noPromotionForecast = forecastWorldStreamingLaunchPricing(player, { ...targetedPricing, introOffer: 0 }, ['US', 'IN']);
assert.ok(
    (deepPromotionForecast.planAllocations.find(row => row.planId === 'FAMILY')?.households || 0)
        > (noPromotionForecast.planAllocations.find(row => row.planId === 'FAMILY')?.households || 0),
    'an enabled Premiere promotion changes eligible cohort allocation rather than only the card price',
);
assert.equal(normalForecast.planAllocations.reduce((sum, row) => sum + row.households, 0), normalForecast.subscribers,
    'plan allocations reconcile to total subscribers');
assert.ok(targetedForecast.planAllocations.some(row => row.planId !== 'FAMILY' && row.households > 0),
    'the targeted scenario includes untargeted subscribers so it can detect cross-plan discount leakage');
const expectedTargetedFirstYear = targetedForecast.planAllocations.reduce((sum, row) => {
    const list = targetedPricing.plans.find(plan => plan.id === row.planId)!.monthly;
    return sum + row.monthlyHouseholds * (row.planId === 'FAMILY' ? 188.88 : 12 * list)
        + row.annualHouseholds * 12 * list;
}, 0);
assert.ok(Math.abs(targetedForecast.firstYearSubscriptionRevenue - expectedTargetedFirstYear) < .02,
    'a Premiere-only intro discount must not reduce untargeted plans in the first-year world forecast');
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
const normalBuildDemand = forecastWorldStreamingBuildDemand(player, basePricing, ['US', 'IN']);
const expensiveBuildDemand = forecastWorldStreamingBuildDemand(player, {
    ...basePricing,
    plans: basePricing.plans.map(plan => ({ ...plan, monthly: 78, ads: false })),
}, ['US', 'IN']);
assert.equal(normalBuildDemand.forecastAccounts, normalForecast.subscribers,
    'Build forecasts the same subscriber base as Define the Launch');
assert.equal(Object.values(normalBuildDemand.byMarket).reduce((sum, count) => sum + count, 0), normalBuildDemand.likely,
    'Build country demand reconciles to its likely total');
assert.ok(normalBuildDemand.likely > expensiveBuildDemand.likely,
    'Build opening demand reacts to the canonical offer becoming unaffordable');
const marketingDraftPlayer = saveOwnedStreamingLaunchMarketingDraft(player, { budgetCeiling: 50_000_000 }).player;
assert.equal(marketingDraftPlayer.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash,
    'editing a marketing draft does not spend company treasury');
assert.deepEqual(forecastWorldStreamingBuildDemand(marketingDraftPlayer, basePricing, ['US', 'IN']), normalBuildDemand,
    'a marketing draft does not secretly modify pre-campaign canonical demand');
assert.deepEqual(normalForecast.planAllocations.map(row => row.planId), basePricing.plans.map(plan => plan.id), 'all custom plans remain represented in the forecast, including plans with zero current demand');
normalForecast.planAllocations.filter(row => row.households > 0).forEach(row => {
    assert.equal(row.monthlyHouseholds + row.annualHouseholds, row.households,
        'a pre-launch plan has an exact monthly/annual buyer breakdown');
    assert.equal(row.effectiveMonthlyPrice, Math.round(row.monthlySubscriptionRevenue / row.households * 100) / 100,
        'the displayed opening average comes from the actual path-specific subscribers');
});
const legacyLivePlayer = structuredClone(player) as Player;
legacyLivePlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
legacyLivePlayer.ownedStreamingPlatform.launchProgram.status = 'LAUNCHED';
legacyLivePlayer.ownedStreamingPlatform.serviceConfiguration.pricing = structuredClone(basePricing);
legacyLivePlayer.ownedStreamingPlatform.identity!.foundedAtAbsoluteWeek = Math.max(0, legacyLivePlayer.age * 52 + legacyLivePlayer.currentWeek - 30);
const legacyLiveOffer = getWorldStreamingOffers(legacyLivePlayer, legacyLivePlayer.age * 52 + legacyLivePlayer.currentWeek).offers.find(offer => offer.isPlayer)!;
assert.equal(legacyLiveOffer.plans[0].effectiveMonthlyPrice, effectiveMonthlyStreamingPlanPrice(basePricing.plans[0].monthly, basePricing.annualDiscount, basePricing.introOffer, 30), 'a migrated live platform without a launch receipt does not retain its introductory discount forever');
const liveIntroPlayer = structuredClone(legacyLivePlayer) as Player;
liveIntroPlayer.ownedStreamingPlatform.identity!.foundedAtAbsoluteWeek = liveIntroPlayer.age * 52 + liveIntroPlayer.currentWeek;
liveIntroPlayer.ownedStreamingPlatform.serviceConfiguration.pricing = targetedPricing;
liveIntroPlayer.ownedStreamingPlatform.metrics.subscribers = 100_000;
const liveWeek = liveIntroPlayer.age * 52 + liveIntroPlayer.currentWeek;
const liveIntroOffer = getWorldStreamingOffers(liveIntroPlayer, liveWeek).offers.find(offer => offer.isPlayer)!;
const liveCustomers = createWorldStreamingCustomerState(liveIntroPlayer, liveWeek);
const livePlayerCells = Object.values(liveCustomers.countries)
    .flatMap(country => country.cohorts.flatMap(cohort => cohort.planCells.map(cell => ({ cell, billingPath: cohort.billingPath }))))
    .filter(row => row.cell.platformId === 'PLAYER' && row.cell.paidAccounts > 0);
assert.ok(livePlayerCells.length > 0, 'weekly customer pricing is tested on actual player accounts');
livePlayerCells.forEach(({ cell, billingPath }) => {
    const plan = liveIntroOffer.plans.find(item => item.id === cell.planId)!;
    assert.equal(cell.effectiveMonthlyPrice, billingPath === 'MONTHLY' ? plan.monthlyBillingPrice : plan.annualBillingMonthlyPrice,
        'weekly customer cells use their actual monthly or annual opening price');
    assert.ok(Math.abs(cell.monthlySubscriptionRevenue - Math.round(cell.paidAccounts * cell.effectiveMonthlyPrice * 100) / 100) < .011,
        'weekly customer subscription revenue is settled from those actual offer prices');
});
const aiOffers = getWorldStreamingOffers(player, player.age * 52 + player.currentWeek).offers.filter(offer => !offer.isPlayer);
const aiEcosystem = normalizeStreamingPlatformEcosystem(player.world.streamingPlatformEcosystem, player.age * 52 + player.currentWeek);
assert.ok(aiOffers.length > 0, 'the AI parity scenario includes actual rival offers');
assert.ok(aiOffers.some(offer => offer.plans.length > 1 && offer.commercialConfiguration.introOfferPlanId),
    'some multi-plan rivals target an introductory offer at one plan');
assert.ok(aiOffers.some(offer => offer.plans.length > 1 && !offer.commercialConfiguration.introOfferPlanId),
    'other multi-plan rivals retain a broad introductory offer');
aiOffers.forEach(offer => {
    assert.equal(offer.annualDiscountPercent, offer.commercialConfiguration.annualDiscount,
        `${offer.platformId} must publish the annual discount used by its commercial configuration`);
    assert.equal(offer.introOfferPercent, offer.commercialConfiguration.introOffer,
        `${offer.platformId} must publish the intro discount used by its commercial configuration`);
    offer.plans.forEach(plan => {
        const operator = Object.values(aiEcosystem.operators).find(item => item.id === offer.platformId)!;
        const introApplies = !offer.commercialConfiguration.introOfferPlanId
            || offer.commercialConfiguration.introOfferPlanId === plan.id;
        const weeksSinceStart = player.age * 52 + player.currentWeek - operator.foundedAtAbsoluteWeek;
        assert.equal(plan.effectiveMonthlyPrice, effectiveMonthlyStreamingPlanPrice(
            plan.monthlyPrice,
            offer.commercialConfiguration.annualDiscount,
            offer.commercialConfiguration.introOffer,
            weeksSinceStart,
            introApplies,
        ), `${offer.platformId}/${plan.id} must be priced from its published strategy`);
        assert.equal(plan.monthlyBillingPrice, streamingBillingPathPrice(
            plan.monthlyPrice, offer.commercialConfiguration.annualDiscount,
            offer.commercialConfiguration.introOffer, weeksSinceStart, 'MONTHLY', introApplies,
        ), `${offer.platformId}/${plan.id} must offer the actual monthly path price`);
        assert.equal(plan.annualBillingMonthlyPrice, streamingBillingPathPrice(
            plan.monthlyPrice, offer.commercialConfiguration.annualDiscount,
            offer.commercialConfiguration.introOffer, weeksSinceStart, 'ANNUAL', introApplies,
        ), `${offer.platformId}/${plan.id} must offer the actual annual path price`);
    });
});
const promotionalPlayer = structuredClone(player) as Player;
promotionalPlayer.world.streamingPlatformEcosystem = structuredClone(aiEcosystem);
const promotionalWeek = player.age * 52 + player.currentWeek;
Object.values(promotionalPlayer.world.streamingPlatformEcosystem.operators).forEach(operator => {
    operator.foundedAtAbsoluteWeek = promotionalWeek;
});
const promotionalOffers = getWorldStreamingOffers(promotionalPlayer, promotionalWeek).offers.filter(offer => !offer.isPlayer);
const expiredOffers = getWorldStreamingOffers(promotionalPlayer, promotionalWeek + 13).offers.filter(offer => !offer.isPlayer);
promotionalOffers.forEach(offer => {
    const expired = expiredOffers.find(row => row.platformId === offer.platformId)!;
    offer.plans.filter(plan => plan.monthlyPrice > 0).forEach(plan => {
        const maturePrice = expired.plans.find(row => row.id === plan.id)!.effectiveMonthlyPrice;
        const matureMonthlyPrice = expired.plans.find(row => row.id === plan.id)!.monthlyBillingPrice;
        if (offer.commercialConfiguration.introOfferPlanId && offer.commercialConfiguration.introOfferPlanId !== plan.id) {
            assert.equal(plan.effectiveMonthlyPrice, maturePrice,
                `${offer.platformId}/${plan.id} is not discounted by an intro aimed at a different plan`);
        } else {
            assert.ok(plan.effectiveMonthlyPrice < maturePrice,
                `${offer.platformId}/${plan.id} loses its applicable introductory discount after week 13`);
            assert.ok(plan.monthlyBillingPrice < matureMonthlyPrice,
                `${offer.platformId}/${plan.id} monthly billed buyers lose the introductory discount after week 13`);
        }
    });
});

const launchPanelForecast = forecastPricing(
    basePricing as PricingSettings,
    1,
    { rivalAveragePrice: 999, reachRate: 1 },
    [],
    normalForecast,
);
assert.equal(launchPanelForecast.subscribers, normalForecast.subscribers, 'the wizard consumes canonical rival-aware subscriber demand');
assert.ok(Math.abs((launchPanelForecast.streams.find(stream => stream.id === 'subs')?.monthly || 0)
    - normalForecast.monthlySubscriptionRevenue) < .01, 'wizard subscription revenue reconciles with the world forecast');
assert.ok(Math.abs(launchPanelForecast.yearlyRevenue - launchPanelForecast.streams.filter(stream => stream.id !== 'subs').reduce((sum, stream) => sum + stream.monthly * 12, 0) - normalForecast.firstYearSubscriptionRevenue) < .01, 'the wizard models the 13-week introductory offer in first-year revenue');
const localCohort = [{
    households: 100_000,
    monthlyStreamingBudgetPerHousehold: 9,
    priceSensitivityIndex: 70,
    entertainmentAppetiteIndex: 65,
    piracyTendencyIndex: 20,
}];
const localMarket = { rivalAveragePrice: 12, reachRate: .3 };
const localPricing: PricingSettings = {
    ...basePricing,
    streams: ['subs'],
    plans: [basePricing.plans[0], basePricing.plans[1]],
    annualDiscount: 0,
    introOffer: 50,
    introOfferPlanId: 'PREMIUM',
};
const localWithIntro = forecastPricing(localPricing, 100_000, localMarket, localCohort);
const localWithoutIntro = forecastPricing({ ...localPricing, introOffer: 0 }, 100_000, localMarket, localCohort);
assert.equal(localWithoutIntro.plans.find(row => row.plan.id === 'PREMIUM')?.subscribers, 0,
    'an Off intro offer does not change plan eligibility');
assert.ok((localWithIntro.plans.find(row => row.plan.id === 'PREMIUM')?.subscribers || 0) > 0,
    'the local fallback admits a plan made affordable by its targeted intro offer');
const monthlyOnlyLocal = forecastPricing({
    ...basePricing, streams: ['subs'], plans: [basePricing.plans[2]],
    annualDiscount: 0, introOffer: 50, introOfferPlanId: 'FAMILY',
}, 100_000, localMarket, localCohort);
assert.ok(monthlyOnlyLocal.subscribers > 0,
    'local fallback admits monthly buyers at $8.99 even when the $11.96 blend exceeds the $9 budget');
assert.equal(monthlyOnlyLocal.plans[0].revenuePerSubscriber, 8.99,
    'annual buyers who cannot afford the path do not dilute actual monthly customer revenue');
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
const targetedPricePaths = renderToStaticMarkup(React.createElement(PlanPricePaths, {
    plan: targetedPricing.plans[2],
    settings: targetedPricing as PricingSettings,
    share: 0,
    cohorts: localCohort,
}));
assert.match(targetedPricePaths, /List price.*\$17\.99/s, 'the plan explains the price the player entered');
assert.match(targetedPricePaths, /First three months.*\$8\.99/s, 'the plan explains its targeted monthly promo price');
assert.match(targetedPricePaths, /Pay yearly.*\$17\.99/s, 'the plan keeps the annual path distinct when its discount is Off');
assert.match(targetedPricePaths, /Opening blend.*\$11\.96/s, 'the plan explains the blended opening price');
assert.match(targetedPricePaths, /Year one.*\$197\.79/s, 'the plan explains the first-year per-subscriber result');
assert.match(targetedPricePaths, /0% projected share/, 'the breakdown ties the price path to its projected subscriber share');
assert.match(targetedPricePaths, /Monthly path: 100% affordable\. Annual path: 0% affordable/,
    'the plan explains that the monthly promotion is affordable even when the annual path is not');
const untargetedPricePaths = renderToStaticMarkup(React.createElement(PlanPricePaths, {
    plan: targetedPricing.plans[0], settings: targetedPricing as PricingSettings, share: 100, cohorts: localCohort,
}));
assert.match(untargetedPricePaths, /First three months.*\$7\.99.*not targeted/s,
    'the untargeted Essential plan does not claim the Premiere promotion');
assert.match(untargetedPricePaths, /Monthly path: 100% affordable\. Annual path: 100% affordable/,
    'the comparison plan shows both billing paths as affordable');
const freePricePaths = renderToStaticMarkup(React.createElement(PlanPricePaths, {
    plan: { ...basePricing.plans[0], monthly: 0, ads: true },
    settings: { ...basePricing, introOffer: 50, introOfferPlanId: 'BASIC' } as PricingSettings,
    share: 12,
    cohorts: localCohort,
}));
assert.match(freePricePaths, /Free ad-supported access/,
    'a free advertising tier is explained as free, not as a yearly bill with a discount');
assert.doesNotMatch(freePricePaths, /billed yearly/,
    'the free tier is never presented as an annual-billing product');

console.log(`Pricing/world integration: ${normalForecast.subscribers.toLocaleString()} normal subscribers, $${normalForecast.monthlySubscriptionRevenue.toFixed(2)}/mo and $${normalForecast.firstYearSubscriptionRevenue.toFixed(2)} first-year subscription revenue; ${expensiveForecast.subscribers.toLocaleString()} at $78; ${normalForecast.activeRivalCount} rivals; ${aiOffers.filter(offer => offer.commercialConfiguration.introOfferPlanId).length}/${aiOffers.length} AI offers target one plan.`);
