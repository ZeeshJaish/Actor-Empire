import assert from 'node:assert/strict';
import {
    INITIAL_PLAYER,
    type OwnedStreamingPricingConfiguration,
    type Player,
} from '../types';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import * as worldPricingForecastModule from '../services/worldEconomy/worldStreamingPricingForecast';
import {
    derive,
    type BuildInputs,
    type BuildSel,
} from '../components/streaming-transplant/StreamingBuildoutExperience';
import { getSuggestedStreamingNetworkPlacements } from '../services/streamingInfrastructure';

const pricing: OwnedStreamingPricingConfiguration = {
    streams: ['subs', 'ads'],
    plans: [
        { id: 'BASIC', name: 'Essential', monthly: 7.99, featureIds: ['hd'], ads: true },
        { id: 'PREMIUM', name: 'Standard', monthly: 12.99, featureIds: ['hd', 'streams2'], ads: false },
        { id: 'FAMILY', name: 'Premiere', monthly: 17.99, featureIds: ['uhd', 'streams4'], ads: false },
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

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'build-world-integration';
player.age = 32;
player.currentWeek = 20;
player.ownedStreamingPlatform.lifecycle = 'FOUNDING';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Cinema worth staying home for.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
};

const forecast = forecastWorldStreamingLaunchPricing(player, pricing, ['US', 'IN']);
const countries = (forecast as typeof forecast & {
    countries?: Array<{ countryId: string; reachableHouseholds: number; accounts: number }>;
}).countries;

assert.equal(countries?.length, 2, 'the world launch forecast must expose one demand row per selected country');
assert.deepEqual(countries?.map(country => country.countryId), ['IN', 'US'], 'country evidence must be deterministic');
assert.equal(
    countries?.reduce((sum, country) => sum + country.accounts, 0),
    forecast.subscribers,
    'country account demand must reconcile exactly with the headline forecast',
);
assert.equal(
    countries?.reduce((sum, country) => sum + country.reachableHouseholds, 0),
    forecast.reachableHouseholds,
    'country reachable households must reconcile exactly with the headline forecast',
);

type BuildForecastFactory = (
    inputPlayer: Player,
    inputPricing: OwnedStreamingPricingConfiguration,
    countryIds: string[],
) => {
    low: number;
    likely: number;
    high: number;
    byMarket: Record<string, number>;
    reachableHouseholds: number;
    forecastAccounts: number;
};
const buildForecastFactory = (worldPricingForecastModule as unknown as {
    forecastWorldStreamingBuildDemand?: BuildForecastFactory;
}).forecastWorldStreamingBuildDemand;
assert.equal(typeof buildForecastFactory, 'function', 'World Economy must provide the canonical Build demand adapter');
if (!buildForecastFactory) throw new Error('World Economy Build demand adapter is unavailable.');

const canonicalBuildDemand = buildForecastFactory(player, pricing, ['US', 'IN']);
const expensiveBuildDemand = buildForecastFactory(player, {
    ...pricing,
    plans: pricing.plans.map(plan => ({ ...plan, monthly: 78, ads: false })),
}, ['US', 'IN']);
assert.ok(canonicalBuildDemand.low < canonicalBuildDemand.likely);
assert.ok(canonicalBuildDemand.likely < canonicalBuildDemand.high);
assert.ok(
    canonicalBuildDemand.likely > expensiveBuildDemand.likely,
    'an unaffordable launch must reduce the Build capacity forecast through the same world demand model',
);
assert.equal(
    Object.values(canonicalBuildDemand.byMarket).reduce((sum, demand) => sum + demand, 0),
    canonicalBuildDemand.likely,
    'country Build allocations must conserve the likely opening demand exactly',
);
assert.equal(canonicalBuildDemand.reachableHouseholds, forecast.reachableHouseholds);
assert.equal(canonicalBuildDemand.forecastAccounts, forecast.subscribers);
const suggestForDemand = getSuggestedStreamingNetworkPlacements as unknown as (
    marketIds: string[],
    audienceMultiplier: number,
    likelyOpeningDemand: number,
) => Array<{ racks: number }>;
const quietSuggestion = suggestForDemand(['US', 'IN'], 1, 10_000);
const crowdedSuggestion = suggestForDemand(['US', 'IN'], 1, 400_000);
assert.ok(
    crowdedSuggestion.reduce((sum, placement) => sum + placement.racks, 0)
        > quietSuggestion.reduce((sum, placement) => sum + placement.racks, 0),
    'the suggested physical topology must scale from canonical likely demand rather than static market audience',
);

const buildInputs = {
    treasury: 500_000_000,
    catalogueSpend: 0,
    catalogueTitles: 10,
    originalsSpend: 0,
    originalsCount: 0,
    premiereTitle: 'Opening Signal',
    regions: ['NORTH_AMERICA', 'ASIA'],
    coverageRegions: ['NORTH_AMERICA', 'ASIA'],
    markets: [
        {
            id: 'IN', country: 'India', region: 'ASIA', audience: 500_000_000,
            annualGrowthPercent: 5, recommendedCityId: 'BOM', localizationNote: 'Hindi support.',
        },
        {
            id: 'US', country: 'United States', region: 'NORTH_AMERICA', audience: 225_000_000,
            annualGrowthPercent: 3, recommendedCityId: 'LA', localizationNote: 'English support.',
        },
    ],
    homeCityId: null,
    audienceMul: 1,
    openingDemandForecast: {
        low: 120_000,
        likely: 240_000,
        high: 420_000,
        byMarket: { IN: 90_000, US: 150_000 },
    },
} as BuildInputs & {
    openingDemandForecast: {
        low: number;
        likely: number;
        high: number;
        byMarket: Record<string, number>;
    };
};
const selection: BuildSel = {
    placements: [],
    arch: 'HYBRID',
    doctrine: 'STANDARD',
    campaign: 'NONE',
};
const build = derive(selection, buildInputs);
assert.equal(build.demandTotal('QUIET'), 120_000, 'Build must preserve the world model quiet-night forecast');
assert.equal(build.demandTotal('LIKELY'), 240_000, 'Build must preserve the world model likely forecast');
assert.equal(build.demandTotal('SURGE'), 420_000, 'Build must preserve the world model surge forecast');
assert.equal(
    build.countryService.reduce((sum, country) => sum + country.demand, 0),
    240_000,
    'country Build demand must reconcile with the world-model likely total',
);
assert.equal(build.countryService.find(country => country.marketId === 'IN')?.demand, 90_000);
assert.equal(build.countryService.find(country => country.marketId === 'US')?.demand, 150_000);

const roundedCampaignBuild = derive(
    { ...selection, campaign: 'REGIONAL' },
    {
        ...buildInputs,
        openingDemandForecast: {
            low: 1,
            likely: 2,
            high: 3,
            byMarket: { IN: 1, US: 1 },
        },
    },
);
assert.equal(
    roundedCampaignBuild.countryService.reduce((sum, country) => sum + country.demand, 0),
    roundedCampaignBuild.demandTotal('LIKELY'),
    'campaign scaling must not create or lose streams while rounding country allocations',
);

console.log('Streaming Build and World Economy integration audit passed.');
