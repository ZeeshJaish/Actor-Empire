import type {
    OwnedStreamingPricingConfiguration,
    Player,
    WorldStreamingPlanAllocation,
} from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import {
    firstYearStreamingPlanRevenuePerSubscriber,
    normalizeStreamingPricingConfiguration,
} from '../streamingPricingEconomy';
import {
    createWorldStreamingCompetitionState,
} from './worldStreamingCompetition';
import { getWorldStreamingOffers } from './worldStreamingOffers';

export interface WorldStreamingLaunchPricingForecast {
    reachableHouseholds: number;
    subscribers: number;
    monthlySubscriptionRevenue: number;
    firstYearSubscriptionRevenue: number;
    planAllocations: WorldStreamingPlanAllocation[];
    activeRivalCount: number;
    rivalMedianEntryPrice: number;
    countries: WorldStreamingLaunchPricingCountryForecast[];
}

export interface WorldStreamingLaunchPricingCountryForecast {
    countryId: string;
    reachableHouseholds: number;
    accounts: number;
    monthlySubscriptionRevenue: number;
}

export interface WorldStreamingBuildDemandForecast {
    low: number;
    likely: number;
    high: number;
    byMarket: Record<string, number>;
    reachableHouseholds: number;
    forecastAccounts: number;
}

const allocateDemandByCountry = (
    total: number,
    countries: WorldStreamingLaunchPricingCountryForecast[],
): Record<string, number> => {
    const accounts = countries.reduce((sum, country) => sum + country.accounts, 0);
    if (total <= 0 || accounts <= 0) {
        return Object.fromEntries(countries.map(country => [country.countryId, 0]));
    }
    const rows = countries.map(country => {
        const exact = total * country.accounts / accounts;
        return { countryId: country.countryId, exact, demand: Math.floor(exact) };
    });
    let remaining = Math.max(0, total - rows.reduce((sum, row) => sum + row.demand, 0));
    [...rows]
        .sort((left, right) => (right.exact - right.demand) - (left.exact - left.demand)
            || left.countryId.localeCompare(right.countryId))
        .forEach(row => {
            if (remaining <= 0) return;
            row.demand += 1;
            remaining -= 1;
        });
    return Object.fromEntries(rows.map(row => [row.countryId, row.demand]));
};

const median = (values: number[]): number => {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const forecastWorldStreamingLaunchPricing = (
    player: Player,
    proposedPricing: OwnedStreamingPricingConfiguration,
    proposedCountryIds: string[],
): WorldStreamingLaunchPricingForecast => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const pricing = normalizeStreamingPricingConfiguration(proposedPricing);
    const countryIds = [...new Set(proposedCountryIds.map(id => String(id || '').trim().toUpperCase()).filter(Boolean))].sort();
    const previewPlayer: Player = {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            lifecycle: 'ACTIVE',
            identity: platform.identity ? {
                ...platform.identity,
                dayOneMarketIds: countryIds,
            } : {
                name: 'Your platform',
                slug: 'player-platform',
                primaryColor: '#6d4aff',
                secondaryColor: '#111827',
                logoKey: 'FRAME_PLAY',
                brandPromiseId: 'BALANCED',
                publicManifesto: '',
                dayOneMarketIds: countryIds,
                launchServerCityId: null,
                foundedAtAbsoluteWeek: absoluteWeek,
            },
            marketOperations: [],
            serviceConfiguration: {
                ...platform.serviceConfiguration,
                source: 'PLAYER_ACTION',
                pricing,
                revision: platform.serviceConfiguration.revision + 1,
            },
            launchCommit: null,
        },
    };
    const registry = getWorldStreamingOffers(previewPlayer, absoluteWeek);
    const competition = createWorldStreamingCompetitionState(previewPlayer, absoluteWeek);
    const rows = countryIds.flatMap(countryId => {
        const country = competition.countries[countryId];
        return country?.platformAllocations.filter(row => row.platformId === 'PLAYER') || [];
    });
    const allocationsByPlan = new Map<string, WorldStreamingPlanAllocation>();
    pricing.plans.forEach(plan => allocationsByPlan.set(plan.id, {
        planId: plan.id,
        planName: plan.name,
        households: 0,
        effectiveMonthlyPrice: 0,
        monthlySubscriptionRevenue: 0,
    }));
    rows.flatMap(row => row.planAllocations).forEach(row => {
        const current = allocationsByPlan.get(row.planId) || {
            planId: row.planId,
            planName: row.planName,
            households: 0,
            effectiveMonthlyPrice: row.effectiveMonthlyPrice,
            monthlySubscriptionRevenue: 0,
        };
        current.households += row.households;
        current.monthlySubscriptionRevenue = Math.round((current.monthlySubscriptionRevenue + row.monthlySubscriptionRevenue) * 100) / 100;
        current.effectiveMonthlyPrice = current.households > 0
            ? Math.round(current.monthlySubscriptionRevenue / current.households * 100) / 100
            : row.effectiveMonthlyPrice;
        allocationsByPlan.set(row.planId, current);
    });
    const planAllocations = [...allocationsByPlan.values()];
    const priceByPlan = new Map(pricing.plans.map(plan => [plan.id, plan.monthly]));
    const firstYearSubscriptionRevenue = Math.round(planAllocations.reduce((sum, row) => (
        sum + row.households * firstYearStreamingPlanRevenuePerSubscriber(
            priceByPlan.get(row.planId) || 0,
            pricing.annualDiscount,
            pricing.introOffer,
        )
    ), 0) * 100) / 100;
    const eligibleRivals = registry.offers.filter(offer => (
        !offer.isPlayer && offer.activeCountryIds.some(countryId => countryIds.includes(countryId))
    ));
    const rivalEntryPrices = eligibleRivals.flatMap(offer => (
        offer.plans.length ? [Math.min(...offer.plans.map(plan => plan.effectiveMonthlyPrice))] : []
    ));
    const countries = countryIds.map(countryId => {
        const country = competition.countries[countryId];
        const playerRows = country?.platformAllocations.filter(row => row.platformId === 'PLAYER') || [];
        return {
            countryId,
            reachableHouseholds: country?.streamingReachableHouseholds || 0,
            accounts: playerRows.reduce((sum, row) => sum + row.households, 0),
            monthlySubscriptionRevenue: Math.round(playerRows.reduce((sum, row) => (
                sum + row.monthlySubscriptionRevenue
            ), 0) * 100) / 100,
        };
    });
    return {
        reachableHouseholds: countryIds.reduce((sum, countryId) => sum + (competition.countries[countryId]?.streamingReachableHouseholds || 0), 0),
        subscribers: rows.reduce((sum, row) => sum + row.households, 0),
        monthlySubscriptionRevenue: Math.round(rows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0) * 100) / 100,
        firstYearSubscriptionRevenue,
        planAllocations,
        activeRivalCount: eligibleRivals.length,
        rivalMedianEntryPrice: Math.round(median(rivalEntryPrices) * 100) / 100,
        countries,
    };
};

/**
 * Converts canonical country/cohort/rival account demand into an opening-night
 * concurrency range. These rates deliberately match the operating loop's
 * supported peak-activity envelope; campaign choices are applied later by the
 * Build room and therefore are not counted twice here.
 */
export const forecastWorldStreamingBuildDemand = (
    player: Player,
    proposedPricing: OwnedStreamingPricingConfiguration,
    proposedCountryIds: string[],
): WorldStreamingBuildDemandForecast => {
    const pricingForecast = forecastWorldStreamingLaunchPricing(
        player,
        proposedPricing,
        proposedCountryIds,
    );
    const low = Math.max(0, Math.round(pricingForecast.subscribers * 0.12));
    const likely = Math.max(low, Math.round(pricingForecast.subscribers * 0.24));
    const high = Math.max(likely, Math.round(pricingForecast.subscribers * 0.42));
    return {
        low,
        likely,
        high,
        byMarket: allocateDemandByCountry(likely, pricingForecast.countries),
        reachableHouseholds: pricingForecast.reachableHouseholds,
        forecastAccounts: pricingForecast.subscribers,
    };
};
