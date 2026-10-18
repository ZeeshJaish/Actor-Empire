import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration, type Player } from '../types';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { normalizeWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { normalizeWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateStreamingAudienceChoice } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'pricing-p5-audit';
player.age = 40;
player.currentWeek = 12;
const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
const pricing: OwnedStreamingPricingConfiguration = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs'],
    plans: [{ id: 'ESSENTIAL', name: 'Essential', monthly: 7.99, featureIds: ['catalogue'], ads: false }],
    annualDiscount: 5,
    introOffer: 0,
};
const allCountries = Object.keys(normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek).countries).sort();
assert.ok(allCountries.length > 40, 'scope fixture must exercise a worldwide launch');
const forecast = forecastWorldStreamingLaunchPricing(player, pricing, allCountries);
assert.ok(forecast.countries.length > 40 && forecast.countries.length <= allCountries.length,
    'forecast should support a worldwide launch without inventing countries');
assert.ok(forecast.countries.every(country => allCountries.includes(country.countryId)),
    'forecast must not claim reach outside the requested player markets');
assert.equal(forecast.reachableHouseholds,
    forecast.countries.reduce((sum, country) => sum + country.reachableHouseholds, 0),
    'headline reachable households must reconcile to forecastable player markets');

const probe = structuredClone(player) as Player;
probe.ownedStreamingPlatform.lifecycle = 'ACTIVE';
probe.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'pricing-p5-audit', primaryColor: '#111111', secondaryColor: '#eeeeee',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '',
    dayOneMarketIds: ['US'], launchServerCityId: null, foundedAtAbsoluteWeek: absoluteWeek,
};
probe.ownedStreamingPlatform.serviceConfiguration.pricing = pricing;
const population = normalizeWorldPopulationState(probe.world.worldPopulation, absoluteWeek);
const audience = normalizeWorldAudienceEconomyState(probe.world.worldAudienceEconomy, population, absoluteWeek);
const participation = normalizeWorldAudienceParticipationState(probe.world.worldAudienceParticipation,
    population, audience, absoluteWeek);
const baseOffer = getWorldStreamingOffers(probe, absoluteWeek).offers.find(offer => offer.platformId === 'PLAYER');
assert.ok(baseOffer, 'the test entrant must have a player offer');
const metadataOnly = structuredClone(probe) as Player;
metadataOnly.ownedStreamingPlatform.catalogProjectIds = Array.from({ length: 30 }, (_, index) => `missing-rights-${index}`);
const metadataOffer = getWorldStreamingOffers(metadataOnly, absoluteWeek).offers.find(offer => offer.platformId === 'PLAYER');
assert.ok(metadataOffer, 'metadata-only fixture must still expose the offer');
assert.equal(metadataOffer.catalogueStrengthIndex, baseOffer.catalogueStrengthIndex,
    'unplayable catalogue IDs must not improve the attractiveness of the service');
const licensed = structuredClone(probe) as Player;
licensed.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US', 'IN'];
licensed.ownedStreamingPlatform.catalogLicenses = [createStreamingLicenseContract({
    id: 'p5-us-license', sourceProject: { id: 'p5-playable', title: 'Playable Film' },
    buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'P5 Studio', territory: 'DOMESTIC', countryIds: ['US'], durationWeeks: 52,
    exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
    signedAtAbsoluteWeek: absoluteWeek - 2, startsAtAbsoluteWeek: absoluteWeek - 1,
    origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
    windowType: 'PERMANENT',
    accessGrant: { schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
        purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
})];
const licensedOffer = getWorldStreamingOffers(licensed, absoluteWeek).offers.find(offer => offer.platformId === 'PLAYER');
assert.ok(licensedOffer, 'licensed fixture must expose the player offer');
assert.ok((licensedOffer.catalogueStrengthByCountry?.US || 0) > 0,
    'a playable, country-licensed title must improve the local catalogue score');
assert.equal(licensedOffer.catalogueStrengthByCountry?.IN, 0,
    'a US-only title must not improve the Indian catalogue score');
const unlicensedForecast = forecastWorldStreamingLaunchPricing(probe, pricing, ['US', 'IN']);
const licensedForecast = forecastWorldStreamingLaunchPricing(licensed, pricing, ['US', 'IN']);
assert.ok((licensedForecast.countries.find(country => country.countryId === 'US')?.accounts || 0)
    > (unlicensedForecast.countries.find(country => country.countryId === 'US')?.accounts || 0),
    'a playable title should improve paid launch demand in its licensed market');
assert.equal(licensedForecast.countries.find(country => country.countryId === 'IN')?.accounts,
    unlicensedForecast.countries.find(country => country.countryId === 'IN')?.accounts,
    'that title cannot raise paid launch demand outside its territory');
const cohort = audience.countries.US.cohorts.find(row => {
    const candidate = participation.countries.US.cohorts.find(item => item.cohortId === row.id);
    const reachable = (candidate?.streamingOnlyHouseholds || 0) + (candidate?.dualParticipantHouseholds || 0);
    return reachable > 0 && (candidate?.totalMonthlyStreamingBudget || 0) / reachable > pricing.plans[0].monthly;
});
assert.ok(cohort, 'test cohort must afford the paid plan');
const overlay = participation.countries.US.cohorts.find(row => row.cohortId === cohort.id);
assert.ok(overlay, 'the selected audience cohort has a participation overlay');
const entrant = allocateStreamingAudienceChoice('US', cohort, overlay, [{
    ...baseOffer, catalogueStrengthIndex: 25, catalogueStrengthByCountry: { US: 25 }, subscriptionCatalogueStrengthByCountry: { US: 25 }, maturityWeeks: 0,
}]);
const established = allocateStreamingAudienceChoice('US', cohort, overlay, [{
    ...baseOffer, catalogueStrengthIndex: 90, catalogueStrengthByCountry: { US: 90 }, subscriptionCatalogueStrengthByCountry: { US: 90 }, maturityWeeks: 104,
}]);
assert.ok(entrant.primarySubscriptions < established.primarySubscriptions,
    'a new, thin-catalogue monopoly cannot automatically capture the same paying audience as an established strong service');
assert.ok(entrant.outsideHouseholds > established.outsideHouseholds,
    'lower offer quality must preserve a real outside choice');
assert.equal(entrant.reachableHouseholds,
    entrant.primarySubscriptions + entrant.freeAdHouseholds + entrant.storeHouseholds + entrant.outsideHouseholds,
    'audience choice must not duplicate households across primary routes');
assert.ok(entrant.paidMonthlySpend <= entrant.paidMonthlyBudget + .01,
    'paid choices must stay inside the local cohort budget');
const affluent = audience.countries.US.cohorts.find(row => {
    const candidate = participation.countries.US.cohorts.find(item => item.cohortId === row.id);
    const reachable = (candidate?.streamingOnlyHouseholds || 0) + (candidate?.dualParticipantHouseholds || 0);
    return reachable > 0 && (candidate?.totalMonthlyStreamingBudget || 0) / reachable > 18;
});
assert.ok(affluent, 'tier test needs a cohort able to afford both plans');
const affluentOverlay = participation.countries.US.cohorts.find(row => row.cohortId === affluent.id);
assert.ok(affluentOverlay);
const identicalChoice = allocateStreamingAudienceChoice('US', affluent, affluentOverlay, [{
    ...baseOffer, catalogueStrengthIndex: 90, catalogueStrengthByCountry: { US: 90 }, subscriptionCatalogueStrengthByCountry: { US: 90 }, maturityWeeks: 104,
    plans: [baseOffer.plans[0], { ...baseOffer.plans[0], id: 'PREMIERE', name: 'Premiere' }],
}]);
const premiumChoice = allocateStreamingAudienceChoice('US', affluent, affluentOverlay, [{
    ...baseOffer, catalogueStrengthIndex: 90, catalogueStrengthByCountry: { US: 90 }, subscriptionCatalogueStrengthByCountry: { US: 90 }, maturityWeeks: 104,
    plans: [baseOffer.plans[0], { ...baseOffer.plans[0], id: 'PREMIERE', name: 'Premiere',
        monthlyPrice: 12.99, monthlyBillingPrice: 12.99, annualBillingMonthlyPrice: 12.34,
        effectiveMonthlyPrice: 12.7, appealIndex: 95 }],
}]);
assert.equal(identicalChoice.allocations.filter(row => row.kind === 'SUBSCRIPTION'
    && row.planId === 'PREMIERE').reduce((sum, row) => sum + row.households, 0), 0,
    'identical tiers must not receive an invented fixed premium allocation');
assert.ok(premiumChoice.allocations.some(row => row.kind === 'SUBSCRIPTION'
    && row.planId === 'PREMIERE' && row.households > 0),
    'a valuable higher tier can win an affordable cohort without a fixed premium share');

// The price-response comparisons require a playable catalogue; keep the earlier
// intentionally unlicensed probes empty for their territory/metadata checks.
const commercialPlayer = structuredClone(player) as Player;
addStreamingAuditCatalogueTitle(commercialPlayer, absoluteWeek, 'p5-commercial-film', ['SUBSCRIPTION', 'AD_SUPPORTED']);
const highPrice = forecastWorldStreamingLaunchPricing(commercialPlayer, {
    ...pricing, plans: pricing.plans.map(plan => ({ ...plan, monthly: 78 })),
}, ['IN']);
const entryPrice = forecastWorldStreamingLaunchPricing(commercialPlayer, pricing, ['IN']);
assert.ok(entryPrice.subscribers > highPrice.subscribers,
    'raising entry price must not automatically create more subscribers');
assert.ok(entryPrice.monthlySubscriptionRevenue > highPrice.monthlySubscriptionRevenue,
    'raising entry price must not automatically create more monthly-equivalent revenue');
assert.equal(entryPrice.subscribers, entryPrice.monthlySubscribers + entryPrice.annualSubscribers,
    'monthly and annual buyer cohorts reconcile without counting a household twice');
const free = forecastWorldStreamingLaunchPricing(commercialPlayer, {
    ...pricing, streams: ['ads'], plans: [], ads: { ...pricing.ads, minutesPerHour: 4 },
}, ['US']);
assert.equal(free.subscribers, 0, 'free entry does not produce paid subscriptions');
assert.equal(free.monthlySubscriptionRevenue, 0, 'free entry does not mint subscription cash');
assert.ok(free.freeAdHouseholds > 0 && free.estimatedWeeklyAdRevenueIfPlayable >= 0,
    'free entry has possible reach but only conditional, market-cleared ad receipts');

console.log('P5 pricing calibration audit passed.');
