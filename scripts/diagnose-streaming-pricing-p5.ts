import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration, type Player } from '../types';
import { normalizeWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { forecastPricing } from '../components/studio-finance/finance/launch';
import { normalizeWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateStreamingAudienceChoice } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { getAbsoluteWeek } from '../services/legacyLogic';

// Read-only matching fixture for the reported billion-scale monthly preview.
// No career slot or browser storage is opened by this script.
const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'p5-balance-diagnostic';
player.age = 40;
player.currentWeek = 12;
const week = getAbsoluteWeek(player.age, player.currentWeek);
const countryIds = Object.keys(normalizeWorldPopulationState(player.world.worldPopulation, week).countries).sort();
const pricing: OwnedStreamingPricingConfiguration = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs'],
    plans: [
        { id: 'BASIC', name: 'Essential', monthly: 7.99, featureIds: ['catalogue'], ads: false },
        { id: 'PREMIUM', name: 'Standard', monthly: 12.99, featureIds: ['hd', 'streams2', 'catalogue'], ads: false },
        { id: 'FAMILY', name: 'Premiere', monthly: 17.99, featureIds: ['uhd', 'streams4', 'downloads', 'catalogue'], ads: false },
    ],
    annualDiscount: 5,
    introOffer: 0,
};
for (const ids of [['US'], ['US', 'IN', 'GB', 'CA', 'AU', 'DE'], countryIds]) {
    const world = forecastWorldStreamingLaunchPricing(player, pricing, ids);
    const ui = forecastPricing(pricing, 0, { rivalAveragePrice: 12, reachRate: .3 }, [], world);
    const top = [...world.countries].sort((a, b) => b.monthlySubscriptionRevenue - a.monthlySubscriptionRevenue)
        .slice(0, 8).map(row => ({ country: row.countryId, reachable: row.reachableHouseholds,
            paid: row.accounts, monthlyEquivalent: Math.round(row.monthlySubscriptionRevenue) }));
    console.log(JSON.stringify({ week, markets: ids.length, reachable: world.reachableHouseholds,
        subscriptions: world.subscribers, monthly: world.monthlySubscribers, annual: world.annualSubscribers,
        subscriptionMonthlyEquivalent: Math.round(world.monthlySubscriptionRevenue),
        uiMonthlyGross: Math.round(ui.monthlyRevenue), uiFirstYearGross: Math.round(ui.yearlyRevenue),
        averagePerPaid: Math.round(world.monthlySubscriptionRevenue / Math.max(1, world.subscribers) * 100) / 100,
        rivals: world.activeRivalCount, top }, null, 2));
}
const probe: Player = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform,
    lifecycle: 'ACTIVE', identity: { name: 'Empire+', slug: 'p5-fixture', primaryColor: '#111111',
        secondaryColor: '#eeeeee', logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '',
        dayOneMarketIds: countryIds, launchServerCityId: null, foundedAtAbsoluteWeek: week },
    serviceConfiguration: { ...player.ownedStreamingPlatform.serviceConfiguration, pricing },
    marketOperations: [], launchCommit: null } };
const population = normalizeWorldPopulationState(probe.world.worldPopulation, week);
const audience = normalizeWorldAudienceEconomyState(probe.world.worldAudienceEconomy, population, week);
const participation = normalizeWorldAudienceParticipationState(probe.world.worldAudienceParticipation,
    population, audience, week);
const offers = getWorldStreamingOffers(probe, week);
console.log('PLAYER_OFFER_SCOPE', offers.offers.find(row => row.platformId === 'PLAYER')?.activeCountryIds.length,
    offers.offers.find(row => row.platformId === 'PLAYER')?.activeCountryIds.slice(0, 15));
for (const countryId of ['CN', 'US']) {
    const selected = (offers.byCountry[countryId] || []).map(id => offers.offers.find(row => row.platformId === id)!);
    const allocations = audience.countries[countryId].cohorts.map(cohort => {
        const overlay = participation.countries[countryId].cohorts.find(row => row.cohortId === cohort.id)!;
        const chosen = allocateStreamingAudienceChoice(countryId, cohort, overlay, selected);
        return { cohort: cohort.id, reachable: chosen.reachableHouseholds, primaryPaid: chosen.primarySubscriptions,
            totalPaidAccounts: chosen.allocations.filter(row => row.kind === 'SUBSCRIPTION').reduce((sum, row) => sum + row.households, 0),
            free: chosen.freeAdHouseholds, outside: chosen.outsideHouseholds,
            monthlyBudgetPerHome: cohort.monthlyEntertainmentBudgetPerHousehold,
            monthlyPaidBudget: chosen.paidMonthlyBudget, monthlyPaidSpend: chosen.paidMonthlySpend };
    });
    console.log(JSON.stringify({ countryId, offers: selected.map(row => ({ id: row.platformId,
        catalogue: row.catalogueStrengthIndex, marketing: row.marketingIndex, loyalty: row.loyaltyIndex,
        reputation: row.reputationIndex, maturity: row.maturityWeeks,
        plans: row.plans.map(plan => [plan.id, plan.monthlyBillingPrice, plan.appealIndex]) })),
        cohorts: allocations }, null, 2));
}

const measure = (label: string, subject: Player, offer: OwnedStreamingPricingConfiguration, ids: string[]) => {
    const row = forecastWorldStreamingLaunchPricing(subject, offer, ids);
    console.log('SCENARIO', JSON.stringify({ label, markets: row.countries.length,
        paid: row.subscribers, monthly: row.monthlySubscribers, annual: row.annualSubscribers,
        free: row.freeAdHouseholds, store: row.storeHouseholds,
        subscriptionMonthlyEquivalent: Math.round(row.monthlySubscriptionRevenue),
        weeklyConditionalAds: Math.round(row.estimatedWeeklyAdRevenueIfPlayable),
        weeklyConditionalStore: Math.round(row.estimatedWeeklyRentalRevenueIfPlayable
            + row.estimatedWeeklyPurchaseRevenueIfPlayable),
        rivalCount: row.activeRivalCount,
    }));
};
const established = structuredClone(player) as Player;
established.ownedStreamingPlatform.lifecycle = 'ACTIVE';
established.ownedStreamingPlatform.launchProgram.status = 'LAUNCHED';
established.ownedStreamingPlatform.identity = { ...probe.ownedStreamingPlatform.identity!,
    dayOneMarketIds: countryIds.slice(0, 40), foundedAtAbsoluteWeek: week - 104 };
established.ownedStreamingPlatform.catalogProjectIds = Array.from({ length: 30 }, (_, index) => `synthetic-title-${index}`);
measure('established-40-synthetic-catalogue', established, pricing, countryIds.slice(0, 40));
measure('one-market-high-price', player, { ...pricing,
    plans: pricing.plans.map(plan => ({ ...plan, monthly: 78 })) }, ['US']);
measure('one-market-free-low-ads', player, { ...pricing,
    streams: ['ads'], plans: [], ads: { ...pricing.ads, minutesPerHour: 2 } }, ['US']);
measure('one-market-free-high-ads', player, { ...pricing,
    streams: ['ads'], plans: [], ads: { ...pricing.ads, minutesPerHour: 10 } }, ['US']);
measure('one-market-hybrid', player, { ...pricing,
    streams: ['subs', 'ads', 'rentals'], ads: { ...pricing.ads, minutesPerHour: 4 } }, ['US']);
const licensed = structuredClone(established) as Player;
licensed.ownedStreamingPlatform.catalogProjectIds = [];
licensed.ownedStreamingPlatform.catalogLicenses = Array.from({ length: 30 }, (_, index) =>
    createStreamingLicenseContract({
        id: `p5-license-${index}`, sourceProject: { id: `p5-title-${index}`, title: `P5 Title ${index}` },
        buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
        licensorName: 'P5 Studio', territory: 'GLOBAL', durationWeeks: 156,
        exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
        signedAtAbsoluteWeek: week - 104, startsAtAbsoluteWeek: week - 103,
        origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
        windowType: 'PERMANENT', accessGrant: { schemaVersion: 1, modes: ['SUBSCRIPTION'],
            earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
    }));
const timedStart = performance.now();
measure('established-40-playable-licensed-catalogue', licensed, pricing, countryIds.slice(0, 40));
console.log('SCENARIO_TIME_MS', Math.round(performance.now() - timedStart));
