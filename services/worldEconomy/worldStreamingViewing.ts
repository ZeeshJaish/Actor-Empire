import type {
    OwnedStreamingSlateEntry,
    Player,
    WorldStreamingAiCatalogueTitle,
    WorldStreamingAiStoreEntitlement,
    WorldStreamingAiStoreTransaction,
    WorldAudienceCohortState,
    WorldStreamingCustomerCohortState,
    WorldStreamingCustomerPlatformSummary,
    WorldStreamingViewingCountryState,
    WorldStreamingViewingCountryPlatformSummary,
    WorldStreamingViewingCountryTitleState,
    WorldStreamingViewingDiscoveryMix,
    WorldStreamingViewingAccessMix,
    WorldStreamingViewingGlobalSummary,
    WorldStreamingViewingPlatformSummary,
    WorldStreamingViewingRevenue,
    WorldStreamingViewingSnapshot,
    WorldStreamingViewingState,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { getStreamingInfrastructureOperationsEffects } from '../streamingInfrastructureOperations';
import { deriveStreamingNetworkCoverage } from '../streamingNetworkCoverage';
import { PEAK_CONCURRENCY_SHARE } from '../streamingNetworkReach';
import { evaluatePlayerStreamingTitleRoute } from '../streamingContentAvailability';
import type { StreamingTitleAccessRoute } from '../streamingTitleAccess';
import { normalizeStreamingLanguageId, resolveStreamingGlobalLocalizationCapability } from '../streamingLocalizationCapabilities';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { resolveHistoricalCatalogueTitle } from '../historicalCatalogue';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldAudienceParticipation';
import { normalizeWorldPopulationState } from './worldPopulation';
import {
    getWorldStreamingPlayerCustomerOutcome,
    normalizeWorldStreamingCustomerState,
} from './worldStreamingCustomers';
import { getWorldStreamingOffers } from './worldStreamingOffers';
import { allocateStreamingAudienceChoice } from './worldStreamingAudienceChoice';
import { calculateStreamingAdFreePassWeek, calculateStreamingStoreConversion,
    calculateWorldStreamingCommercialRevenue } from './worldStreamingCommercialEconomy';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import { clearStreamingAdMarket, getStreamingCountryAdMarket,
    type StreamingAdMarketOutcome, type StreamingAdMarketSupply } from './worldStreamingAdMarket';
import { calculateAiTitleStoreBuyerPool, createAiTitleAccessResolver,
    seedLegacyAiCatalogue } from './worldStreamingAiCatalogue';

export const WORLD_STREAMING_VIEWING_SCHEMA_VERSION = 2 as const;
const MAX_SNAPSHOTS = 52;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

export const resolvePlayerStreamingCommerceCapabilityIndex = (value: number): number => (
    clamp(value, 0, 100)
);
const round2 = (value: number): number => Math.round(value * 100) / 100;
const roundRate = (value: number): number => Math.round(clamp(value, 0, 1) * 10_000) / 10_000;

export const createStreamingTitleRouteCache = <T,>(
    evaluate: (projectId: string, countryId: string, route: StreamingTitleAccessRoute) => T,
): ((projectId: string, countryId: string, route: StreamingTitleAccessRoute) => T) => {
    const decisions = new Map<string, T>();
    return (projectId, countryId, route) => {
        const routeKey = route.kind === 'SUBSCRIPTION'
            ? `${route.kind}:${route.planId}`
            : route.kind;
        const key = JSON.stringify([projectId, countryId, routeKey]);
        if (decisions.has(key)) return decisions.get(key)!;
        const decision = evaluate(projectId, countryId, route);
        decisions.set(key, decision);
        return decision;
    };
};

const hasOnlyFiniteNonNegativeNumbers = (value: unknown): boolean => {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
    if (Array.isArray(value)) return value.every(hasOnlyFiniteNonNegativeNumbers);
    if (value && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).every(hasOnlyFiniteNonNegativeNumbers);
    }
    return true;
};

const isValidViewingState = (input: WorldStreamingViewingState | undefined, absoluteWeek: number): boolean => {
    if (!input
        || input.schemaVersion !== WORLD_STREAMING_VIEWING_SCHEMA_VERSION
        || input.lastProcessedAbsoluteWeek !== absoluteWeek
        || typeof input.sourceFingerprint !== 'string'
        || !input.global
        || !input.countries
        || !input.platforms
        || !Array.isArray(input.snapshots)
        || (input.commercialTransactions !== undefined && (!Array.isArray(input.commercialTransactions)
            || input.commercialTransactions.some(row => !row.transactionId || !row.countryId || !row.titleId
                || !Number.isSafeInteger(row.households) || row.households <= 0
                || row.purchasedAtAbsoluteWeek !== absoluteWeek)))
        || (input.aiCatalogue !== undefined && (!Array.isArray(input.aiCatalogue)
            || input.aiCatalogue.some(title => !title.platformId || !title.titleId || !title.contractId
                || !Array.isArray(title.countryIds) || !title.accessGrant)))
        || (input.aiCatalogueSeededPlatformIds !== undefined && !Array.isArray(input.aiCatalogueSeededPlatformIds))
        || (input.aiStoreEntitlements !== undefined && (!Array.isArray(input.aiStoreEntitlements)
            || input.aiStoreEntitlements.some(row => !row.platformId || !row.countryId || !row.titleId
                || !Number.isSafeInteger(row.households) || row.households <= 0
                || (row.kind !== 'RENTAL' && row.kind !== 'PURCHASE'))))
        || (input.aiStoreTransactions !== undefined && (!Array.isArray(input.aiStoreTransactions)
            || input.aiStoreTransactions.some(row => !row.transactionId || !row.platformId
                || !row.countryId || !row.titleId || !row.contractId
                || !Number.isSafeInteger(row.households) || row.households <= 0
                || row.purchasedAtAbsoluteWeek !== absoluteWeek)))
        || input.snapshots.length > MAX_SNAPSHOTS
        || !hasOnlyFiniteNonNegativeNumbers(input)) return false;
    return Object.values(input.platforms).every(platform => (
        Array.isArray(platform.titlePerformance)
        && platform.titlePerformance.every(title => {
            const discoveryTotal = Object.values(title.discoveryMix).reduce((sum, value) => sum + value, 0);
            return Math.round(discoveryTotal) === 100
                && title.completionRate >= 0 && title.completionRate <= 1
                && title.repeatViewingRate >= 0 && title.repeatViewingRate <= 1
                && title.abandonmentRate >= 0 && title.abandonmentRate <= 1;
        })
    ));
};

const distributeInteger = (total: number, weights: number[]): number[] => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    if (!weights.length) return [];
    const safeWeights = weights.map(value => Math.max(0, Number(value) || 0));
    const weightTotal = safeWeights.reduce((sum, value) => sum + value, 0);
    if (!safeTotal || weightTotal <= 0) return weights.map(() => 0);
    const exact = safeWeights.map((weight, index) => ({ index, value: safeTotal * weight / weightTotal }));
    const result = exact.map(item => Math.floor(item.value));
    let remaining = safeTotal - result.reduce((sum, value) => sum + value, 0);
    exact.slice().sort((left, right) => (
        (right.value - Math.floor(right.value)) - (left.value - Math.floor(left.value)) || left.index - right.index
    )).forEach(item => {
        if (remaining <= 0) return;
        result[item.index] += 1;
        remaining -= 1;
    });
    return result;
};

const emptyAccessMix = (): WorldStreamingViewingAccessMix => ({
    paidViewingAccounts: 0,
    freeViewingAccounts: 0,
    storeViewingAccounts: 0,
    sharedViewingAccounts: 0,
    piracyViewingAccounts: 0,
});

const emptyRevenue = (): WorldStreamingViewingRevenue => ({
    attributedSubscriptionRevenue: 0,
    advertisingImpressions: 0,
    advertisingRevenue: 0,
    premiumTransactions: 0,
    premiumRevenue: 0,
    rentalTransactions: 0,
    rentalRevenue: 0,
    purchaseTransactions: 0,
    purchaseRevenue: 0,
    dayPassTransactions: 0,
    dayPassRevenue: 0,
    oneHourPassTransactions: 0,
    oneHourPassRevenue: 0,
    adFreeCoveredHours: 0,
    meteredAccounts: 0,
    meteredHours: 0,
    meteredRevenue: 0,
    patronAccounts: 0,
    patronRevenue: 0,
    sponsorshipImpressions: 0,
    sponsorshipRevenue: 0,
    totalIncrementalRevenue: 0,
    commercialOperatingCost: 0,
});

const sumRevenue = (rows: WorldStreamingViewingRevenue[]): WorldStreamingViewingRevenue => {
    const result = emptyRevenue();
    rows.forEach(row => {
        result.attributedSubscriptionRevenue += row.attributedSubscriptionRevenue;
        result.advertisingImpressions += row.advertisingImpressions;
        result.advertisingRevenue += row.advertisingRevenue;
        result.premiumTransactions += row.premiumTransactions;
        result.premiumRevenue += row.premiumRevenue;
        result.rentalTransactions += row.rentalTransactions;
        result.rentalRevenue += row.rentalRevenue;
        result.purchaseTransactions += row.purchaseTransactions;
        result.purchaseRevenue += row.purchaseRevenue;
        result.dayPassTransactions += row.dayPassTransactions;
        result.dayPassRevenue += row.dayPassRevenue;
        result.oneHourPassTransactions = (result.oneHourPassTransactions || 0) + (row.oneHourPassTransactions || 0);
        result.oneHourPassRevenue = (result.oneHourPassRevenue || 0) + (row.oneHourPassRevenue || 0);
        result.adFreeCoveredHours = (result.adFreeCoveredHours || 0) + (row.adFreeCoveredHours || 0);
        result.meteredAccounts += row.meteredAccounts;
        result.meteredHours += row.meteredHours;
        result.meteredRevenue += row.meteredRevenue;
        result.patronAccounts += row.patronAccounts;
        result.patronRevenue += row.patronRevenue;
        result.sponsorshipImpressions += row.sponsorshipImpressions;
        result.sponsorshipRevenue += row.sponsorshipRevenue;
        result.totalIncrementalRevenue += row.totalIncrementalRevenue;
        result.commercialOperatingCost += row.commercialOperatingCost;
    });
    return result;
};

const emptyGlobal = (): WorldStreamingViewingGlobalSummary => ({
    totalViewingAccounts: 0,
    estimatedViewers: 0,
    totalStarts: 0,
    totalHoursViewed: 0,
    unmetDemandAccounts: 0,
    accessMix: emptyAccessMix(),
    revenue: emptyRevenue(),
    platformCount: 0,
    countryCount: 0,
    titleCount: 0,
});

interface RivalViewingProjection {
    platforms: Record<string, WorldStreamingViewingPlatformSummary>;
    countries: Record<string, Record<string, WorldStreamingViewingCountryPlatformSummary>>;
    adEligibleHours: Record<string, Record<string, number>>;
    aiStoreEntitlements: WorldStreamingAiStoreEntitlement[];
    aiStoreTransactions: WorldStreamingAiStoreTransaction[];
}

interface CountryChoiceCount { subscriptions: number; freeAd: number; store: number; adSubscriptions: number;
    storeEligibleSubscriptions: number }
interface CountryChoiceProjection {
    platforms: Record<string, CountryChoiceCount>;
    cohorts: Record<string, Record<string, CountryChoiceCount>>;
}

const choiceZero = (): CountryChoiceCount => ({ subscriptions: 0, freeAd: 0, store: 0,
    adSubscriptions: 0, storeEligibleSubscriptions: 0 });

type WorldStreamingOfferRegistry = ReturnType<typeof getWorldStreamingOffers>;

const projectCountryChoices = (
    player: Player,
    absoluteWeek: number,
    registry: WorldStreamingOfferRegistry,
): Record<string, CountryChoiceProjection> => {
    const offerMap = new Map(registry.offers.map(offer => [offer.platformId, offer]));
    const commercialByPlatform = new Map(registry.offers.map(offer => [
        offer.platformId,
        projectStreamingCommercialOffers(offer.commercialConfiguration),
    ]));
    const result: Record<string, CountryChoiceProjection> = {};
    Object.entries(player.world.worldAudienceEconomy?.countries || {}).forEach(([countryId, country]) => {
        const offers = (registry.byCountry[countryId] || []).map(id => offerMap.get(id)).filter((offer): offer is NonNullable<typeof offer> => Boolean(offer));
        const projected: CountryChoiceProjection = { platforms: {}, cohorts: {} };
        country.cohorts.forEach(cohort => {
            const participation = player.world.worldAudienceParticipation?.countries[countryId]?.cohorts
                .find(row => row.cohortId === cohort.id);
            if (!participation) return;
            const allocation = allocateStreamingAudienceChoice(countryId, cohort, participation, offers);
            const cohortRows = projected.cohorts[cohort.id] ||= {};
            allocation.allocations.forEach(row => {
                const aggregate = projected.platforms[row.platformId] ||= choiceZero();
                const local = cohortRows[row.platformId] ||= choiceZero();
                const key = row.kind === 'SUBSCRIPTION' ? 'subscriptions' : row.kind === 'FREE_AD' ? 'freeAd' : 'store';
                aggregate[key] += row.households;
                local[key] += row.households;
                if (row.kind === 'SUBSCRIPTION' && offerMap.get(row.platformId)?.plans
                    .some(plan => plan.id === row.planId && plan.ads)) {
                    aggregate.adSubscriptions += row.households;
                    local.adSubscriptions += row.households;
                }
                if (row.kind === 'SUBSCRIPTION' && offerMap.get(row.platformId)
                    && commercialByPlatform.get(row.platformId)?.storeOffer?.eligibility.planIds.includes(row.planId || '')) {
                    aggregate.storeEligibleSubscriptions += row.households;
                    local.storeEligibleSubscriptions += row.households;
                }
            });
        });
        result[countryId] = projected;
    });
    return result;
};

const projectRivalViewing = (
    player: Player,
    absoluteWeek: number,
    customers: ReturnType<typeof normalizeWorldStreamingCustomerState>,
    choices: Record<string, CountryChoiceProjection>,
    aiCatalogue: WorldStreamingAiCatalogueTitle[],
    priorEntitlements: WorldStreamingAiStoreEntitlement[],
    offerRegistry: WorldStreamingOfferRegistry,
): RivalViewingProjection => {
    const offers = new Map(offerRegistry.offers.map(offer => [offer.platformId, offer]));
    const countries: RivalViewingProjection['countries'] = {};
    const adEligibleHours: RivalViewingProjection['adEligibleHours'] = {};
    const rowsByPlatform = new Map<string, WorldStreamingViewingCountryPlatformSummary[]>();
    const entitlementMap = new Map<string, WorldStreamingAiStoreEntitlement>();
    const aiStoreTransactions: WorldStreamingAiStoreTransaction[] = [];
    const titleResolvers = new Map([...offers.values()].filter(offer => !offer.isPlayer).map(offer => [
        offer.platformId, createAiTitleAccessResolver(player, offer, aiCatalogue),
    ]));
    priorEntitlements.filter(item => item.kind === 'PURCHASE' || (item.expiresAtAbsoluteWeek || 0) > absoluteWeek)
        .forEach(item => entitlementMap.set(`${item.platformId}:${item.countryId}:${item.titleId}:${item.kind}`, { ...item }));

    Object.values(customers.countries).forEach(country => {
        const platformRows: Record<string, WorldStreamingViewingCountryPlatformSummary> = {};
        [...offers.values()].filter(offer => !offer.isPlayer && offer.activeCountryIds.includes(country.countryId))
            .forEach(offer => {
            const customer: WorldStreamingCustomerPlatformSummary | undefined = country.platformSummaries
                .find(row => row.platformId === offer.platformId);
            const choice = choices[country.countryId]?.platforms[offer.platformId] || choiceZero();
            if (!customer && !choice.freeAd && !choice.store) return;
            const playable = titleResolvers.get(offer.platformId)!;
            const paidPlanId = offer.plans.find(plan => plan.monthlyPrice > 0)?.id;
            const subscriptionTitles = paidPlanId
                ? playable(country.countryId, absoluteWeek, { kind: 'SUBSCRIPTION', planId: paidPlanId }) : [];
            const freeTitles = playable(country.countryId, absoluteWeek, { kind: 'AD_SUPPORTED' });
            const rentalTitles = playable(country.countryId, absoluteWeek, { kind: 'RENTAL' });
            const purchaseTitles = playable(country.countryId, absoluteWeek, { kind: 'PURCHASE' });
            const subscriptionTitleIds = new Set(subscriptionTitles.map(title => title.titleId));
            const freeTitleIds = new Set(freeTitles.map(title => title.titleId));
            const buyerCohorts = (player.world.worldAudienceEconomy?.countries[country.countryId]?.cohorts || [])
                .map(cohort => {
                    const picked = choices[country.countryId]?.cohorts[cohort.id]?.[offer.platformId];
                    return {
                        budget: cohort.monthlyEntertainmentBudgetPerHousehold,
                        subscriptions: picked?.subscriptions || 0,
                        freeAd: picked?.freeAd || 0,
                        store: picked?.store || 0,
                        eligibleSubscriptions: picked?.storeEligibleSubscriptions || 0,
                    };
                });
            const valueStrength = offer.catalogueStrengthIndex * .34
                + offer.localizationStrengthIndex * .18
                + offer.reliabilityIndex * .18
                + offer.reputationIndex * .12
                + offer.marketingIndex * .1
                + offer.loyaltyIndex * .08;
            const engagementRate = clamp(.22 + valueStrength / 175, .24, .86);
            const paidViewingAccounts = subscriptionTitles.length
                ? Math.min(customer?.endingPaidAccounts || 0, Math.round((customer?.endingPaidAccounts || 0) * engagementRate)) : 0;
            const freeViewingAccounts = freeTitles.length
                ? Math.min(choice.freeAd, Math.round(choice.freeAd * engagementRate)) : 0;
            const sharedViewingAccounts = subscriptionTitles.length || freeTitles.length
                ? Math.min(customer?.sharedActiveViewers || 0, Math.round((customer?.sharedActiveViewers || 0) * clamp(engagementRate * 1.04, 0, .9))) : 0;
            const piracyViewingAccounts = Math.min(customer?.piracyReach || 0, Math.round((customer?.piracyReach || 0) * clamp(.18 + offer.catalogueStrengthIndex / 250, .15, .58)));
            const totalViewingAccounts = paidViewingAccounts + freeViewingAccounts + sharedViewingAccounts;
            const totalStarts = Math.round(totalViewingAccounts * (1.08 + offer.catalogueStrengthIndex / 300));
            const totalHoursViewed = Math.round(totalStarts * (1.2 + offer.catalogueStrengthIndex / 125));
            const estimatedViewers = Math.max(totalViewingAccounts, Math.round(totalViewingAccounts * 1.42));
            const adSupportedAccounts = (customer?.planAllocations || []).reduce((sum, allocation) => (
                sum + (offer.plans.find(plan => plan.id === allocation.planId)?.ads ? allocation.paidAccounts : 0)
            ), 0);
            const adShare = totalViewingAccounts > 0
                ? clamp((freeViewingAccounts + paidViewingAccounts * adSupportedAccounts
                    / Math.max(1, customer?.endingPaidAccounts || 0)) / totalViewingAccounts, 0, 1) : 0;
            (adEligibleHours[country.countryId] ||= {})[offer.platformId] =
                offer.commercialConfiguration.streams.includes('ads') ? totalHoursViewed * adShare : 0;
            const commercialPricing = {
                ...offer.commercialConfiguration,
                sponsor: {
                    ...offer.commercialConfiguration.sponsor,
                    perTitle: offer.commercialConfiguration.sponsor.perTitle / Math.max(1, offer.activeCountryIds.length),
                },
            };
            const commercialOffers = projectStreamingCommercialOffers(commercialPricing);
            const commercial = calculateWorldStreamingCommercialRevenue({
                pricing: commercialPricing,
                paidViewingAccounts,
                viewingAccounts: totalViewingAccounts,
                nonSubscriberOpportunityAccounts: choice.store,
                hoursViewed: totalHoursViewed,
                // Country advertising is cleared once after both player and
                // rival eligible viewing have been measured.
                adEligibleHours: 0,
                estimatedViewers,
                completionRate: clamp(.48 + valueStrength / 250, .35, .9),
                repeatViewingRate: clamp(.04 + offer.catalogueStrengthIndex / 750, .03, .24),
                isFreshMovie: offer.catalogueStrengthIndex >= 45,
                isRentalEligible: false,
                isPurchaseEligible: false,
                isSponsorEligible: commercialPricing.sponsor.titles > 0,
                commerceCapabilityIndex: clamp(offer.reliabilityIndex * .55 + offer.marketingIndex * .45, 0, 100),
                reputationIndex: offer.reputationIndex,
            });
            const settleStore = (kind: 'RENTAL' | 'PURCHASE', titles: typeof rentalTitles): number => {
                if (!titles.length) return 0;
                const price = kind === 'RENTAL' ? commercialPricing.rentals.rent : commercialPricing.rentals.buy;
                const eligiblePools = titles.map(title => calculateAiTitleStoreBuyerPool({ price,
                    storeEligibility: commercialOffers.storeOffer?.eligibility,
                    monthlySubscriptionPrice: (customer?.monthlySubscriptionRevenue || 0)
                        / Math.max(1, customer?.endingPaidAccounts || 0),
                    subscriptionIncluded: subscriptionTitleIds.has(title.titleId),
                    freeAdIncluded: freeTitleIds.has(title.titleId),
                    cohorts: buyerCohorts,
                }));
                const buyerPool = Math.max(0, ...eligiblePools);
                const wanted = calculateStreamingStoreConversion({ buyerPool, price, kind });
                const allocations = distributeInteger(wanted, eligiblePools);
                let settled = 0;
                titles.forEach((title, index) => {
                    const key = `${offer.platformId}:${country.countryId}:${title.titleId}:${kind}`;
                    const owned = entitlementMap.get(key)?.households || 0;
                    const purchaseOwners = entitlementMap.get(`${offer.platformId}:${country.countryId}:${title.titleId}:PURCHASE`)?.households || 0;
                    const opportunity = eligiblePools[index];
                    const units = Math.min(allocations[index], Math.max(0, opportunity - (kind === 'PURCHASE' ? owned : owned + purchaseOwners)));
                    if (units <= 0) return;
                    settled += units;
                    aiStoreTransactions.push({ transactionId: createDeterministicId('ai-store-sale',
                        absoluteWeek, offer.platformId, country.countryId, title.titleId, kind),
                        platformId: offer.platformId, countryId: country.countryId,
                        titleId: title.titleId, contractId: title.contractId, kind,
                        households: units,
                        revenue: Math.round(units * (kind === 'RENTAL'
                            ? commercialPricing.rentals.rent : commercialPricing.rentals.buy)),
                        purchasedAtAbsoluteWeek: absoluteWeek });
                    entitlementMap.set(key, { platformId: offer.platformId, countryId: country.countryId,
                        titleId: title.titleId, kind, households: owned + units,
                        purchasedAtAbsoluteWeek: absoluteWeek,
                        expiresAtAbsoluteWeek: kind === 'PURCHASE' ? null
                            : absoluteWeek + commercialPricing.rentals.windowWeeks });
                });
                return settled;
            };
            const oldStoreRevenue = commercial.rentalRevenue + commercial.purchaseRevenue;
            const transactionStart = aiStoreTransactions.length;
            commercial.rentalTransactions = settleStore('RENTAL', rentalTitles);
            commercial.purchaseTransactions = settleStore('PURCHASE', purchaseTitles);
            const settledTransactions = aiStoreTransactions.slice(transactionStart);
            commercial.rentalRevenue = settledTransactions.filter(row => row.kind === 'RENTAL')
                .reduce((sum, row) => sum + row.revenue, 0);
            commercial.purchaseRevenue = settledTransactions.filter(row => row.kind === 'PURCHASE')
                .reduce((sum, row) => sum + row.revenue, 0);
            commercial.totalIncrementalRevenue += commercial.rentalRevenue + commercial.purchaseRevenue - oldStoreRevenue;
            commercial.commercialOperatingCost = Math.round(commercial.advertisingRevenue * .12
                + (commercial.premiumRevenue + commercial.rentalRevenue + commercial.purchaseRevenue
                    + commercial.dayPassRevenue + commercial.meteredRevenue) * .035
                + commercial.patronRevenue * .06 + commercial.sponsorshipRevenue * .05);
            const revenue: WorldStreamingViewingRevenue = {
                ...commercial,
                attributedSubscriptionRevenue: Math.max(0, Math.round((customer?.monthlySubscriptionRevenue || 0) / 4.33)),
            };
            const row: WorldStreamingViewingCountryPlatformSummary = {
                platformId: offer.platformId,
                platformName: offer.name,
                totalViewingAccounts,
                estimatedViewers,
                totalStarts,
                totalHoursViewed,
                unmetDemandAccounts: Math.max(0, (customer?.accessLoadAccounts || 0) + choice.freeAd - totalViewingAccounts),
                accessMix: { paidViewingAccounts, freeViewingAccounts, sharedViewingAccounts, piracyViewingAccounts },
                revenue,
            };
            platformRows[offer.platformId] = row;
            rowsByPlatform.set(offer.platformId, [...(rowsByPlatform.get(offer.platformId) || []), row]);
        });
        countries[country.countryId] = platformRows;
    });

    const platforms = Object.fromEntries([...rowsByPlatform.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([platformId, rows]) => {
            const totalViewingAccounts = rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0);
            const accessMix = rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
                paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
                freeViewingAccounts: (sum.freeViewingAccounts || 0) + (row.accessMix.freeViewingAccounts || 0),
                storeViewingAccounts: (sum.storeViewingAccounts || 0) + (row.accessMix.storeViewingAccounts || 0),
                sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
                piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
            }), emptyAccessMix());
            const summary: WorldStreamingViewingPlatformSummary = {
                platformId,
                platformName: rows[0]?.platformName || platformId,
                totalViewingAccounts,
                estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
                totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
                totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
                averageCompletionRate: roundRate(.48 + (offers.get(platformId)?.catalogueStrengthIndex || 50) / 250),
                averageRepeatViewingRate: roundRate(.05 + (offers.get(platformId)?.loyaltyIndex || 50) / 700),
                unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
                accessMix,
                revenue: sumRevenue(rows.map(row => row.revenue)),
                streamLoadAccounts: totalViewingAccounts,
                titlePerformance: [],
            };
            return [platformId, summary];
        }));
    return { platforms, countries, adEligibleHours, aiStoreTransactions: aiStoreTransactions.sort((left, right) =>
        left.transactionId.localeCompare(right.transactionId)), aiStoreEntitlements: [...entitlementMap.values()]
        .sort((left, right) => `${left.platformId}:${left.countryId}:${left.titleId}:${left.kind}`
            .localeCompare(`${right.platformId}:${right.countryId}:${right.titleId}:${right.kind}`)) };
};

/** One clearing point for the actual delivered country-week supply. Rival
    projection and player title delivery are built separately, then participate
    in this same budget before any ad receipt enters the saved viewing state. */
const clearDeliveredStreamingAds = (
    player: Player,
    absoluteWeek: number,
    rivals: RivalViewingProjection,
    playerSupplies: Array<StreamingAdMarketSupply & { countryId: string }>,
    offerRegistry: WorldStreamingOfferRegistry,
): Map<string, StreamingAdMarketOutcome> => {
    const offers = new Map(offerRegistry.offers.map(offer => [offer.platformId, offer]));
    const playerOutcomes = new Map<string, StreamingAdMarketOutcome>();
    const countryIds = new Set([...Object.keys(rivals.countries), ...playerSupplies.map(row => row.countryId)]);
    [...countryIds].sort().forEach(countryId => {
        const populationCountry = player.world.worldPopulation?.countries[countryId];
        const countryMarket = populationCountry && getStreamingCountryAdMarket(populationCountry, absoluteWeek,
            player.world.worldAudienceParticipation?.countries[countryId]?.streamingReachableHouseholds || 0);
        const rivalSupplies: StreamingAdMarketSupply[] = Object.keys(rivals.countries[countryId] || {}).sort().flatMap(platformId => {
            const offer = offers.get(platformId);
            if (!offer?.commercialConfiguration.streams.includes('ads')) return [];
            return [{ platformId,
                eligibleHours: rivals.adEligibleHours[countryId]?.[platformId] || 0,
                minutesPerHour: offer.commercialConfiguration.ads.minutesPerHour,
                audienceQualityIndex: clamp(offer.reliabilityIndex * .55 + offer.marketingIndex * .45, 0, 100),
                brandSafetyIndex: offer.reputationIndex }];
        });
        const playerSupply = playerSupplies.find(row => row.countryId === countryId);
        const cleared = clearStreamingAdMarket({ countryId, absoluteWeek,
            advertiserDemandBudget: countryMarket?.advertiserDemandBudget || 0,
            marketReferenceCpm: countryMarket?.marketReferenceCpm || 0,
            suppliers: [...rivalSupplies, ...(playerSupply ? [playerSupply] : [])] });
        if (playerSupply) playerOutcomes.set(countryId, cleared.byPlatform.PLAYER);
        Object.entries(rivals.countries[countryId] || {}).forEach(([platformId, row]) => {
            const outcome = cleared.byPlatform[platformId];
            if (!outcome) return;
            row.revenue.advertisingImpressions = outcome.filledImpressions;
            row.revenue.advertisingRevenue = outcome.revenue;
            row.revenue.totalIncrementalRevenue += outcome.revenue;
            row.revenue.commercialOperatingCost += Math.round(outcome.revenue * .12);
        });
    });
    Object.entries(rivals.platforms).forEach(([platformId, platform]) => {
        platform.revenue = sumRevenue(Object.values(rivals.countries)
            .flatMap(country => country[platformId] ? [country[platformId].revenue] : []));
    });
    return playerOutcomes;
};

const summarizeAllPlatforms = (
    platforms: Record<string, WorldStreamingViewingPlatformSummary>,
    countryCount: number,
): WorldStreamingViewingGlobalSummary => {
    const rows = Object.values(platforms);
    return {
        totalViewingAccounts: rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0),
        estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
        totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
        totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
        unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
        accessMix: rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
            paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
            freeViewingAccounts: (sum.freeViewingAccounts || 0) + (row.accessMix.freeViewingAccounts || 0),
            storeViewingAccounts: (sum.storeViewingAccounts || 0) + (row.accessMix.storeViewingAccounts || 0),
            sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
            piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
        }), emptyAccessMix()),
        revenue: sumRevenue(rows.map(row => row.revenue)),
        platformCount: rows.length,
        countryCount,
        titleCount: rows.reduce((sum, row) => sum + row.titlePerformance.length, 0),
    };
};

const PERSONA_GENRE_AFFINITY: Record<string, string[]> = {
    FAMILY_HOUSEHOLDS: ['ANIMATION', 'ADVENTURE', 'COMEDY', 'FANTASY'],
    VALUE_SEEKERS: ['ACTION', 'COMEDY', 'CRIME', 'THRILLER'],
    FANDOM_LOYALISTS: ['SUPERHERO', 'SCI_FI', 'FANTASY', 'ACTION'],
    PRESTIGE_EXPLORERS: ['DRAMA', 'BIOPIC', 'DOCUMENTARY', 'MYSTERY'],
    LOCAL_FIRST: ['DRAMA', 'ROMANCE', 'COMEDY', 'CRIME'],
    HABIT_STREAMERS: ['MYSTERY', 'CRIME', 'COMEDY', 'DRAMA'],
};

interface ViewingCandidate {
    entry: OwnedStreamingSlateEntry;
    quality: number;
    rating: number;
    originalLanguageId: string;
    isFamous: boolean;
    hasUniverse: boolean;
    runtimeHours: number;
    weeksAvailable: number;
    ownedLibrary: boolean;
}

export const resolveStreamingViewingProjectFacts = (player: Player, entry: OwnedStreamingSlateEntry, programWeek: number): ViewingCandidate => {
    const raw = (player.world.projects || []).find(project => String(project.id) === entry.projectId) as any
        || (player.pastProjects || []).find(project => String(project.id) === entry.projectId) as any
        || resolveHistoricalCatalogueTitle(player, entry.projectId)
        || {};
    const runtimeRaw = (player.pastProjects || []).find(project => String(project.id) === entry.projectId) as any
        || (player.world.projects || []).find(project => String(project.id) === entry.projectId) as any
        || {};
    const commission = player.ownedStreamingPlatform.originalCommissions
        .find(item => item.canonicalProjectId === entry.projectId);
    const runtimeMinutes = Number(runtimeRaw.runtimeMinutes || runtimeRaw.projectDetails?.runtimeMinutes || 0);
    const episodeMinutes = Number(runtimeRaw.episodeRuntimeMinutes
        || runtimeRaw.projectDetails?.episodeRuntimeMinutes || 0);
    const episodes = Number(runtimeRaw.episodes || commission?.episodes || 8);
    const runtimeHours = runtimeMinutes > 0
        ? runtimeMinutes / 60
        : entry.projectType === 'SERIES'
            ? Math.max(1, episodes) * (episodeMinutes || 45) / 60
            : 2;
    const rawQuality = Number(raw.quality ?? raw.finalQuality);
    const rawRating = Number(raw.rating ?? raw.imdbRating);
    const quality = clamp(
        Number.isFinite(rawQuality) ? rawQuality : Number.isFinite(rawRating) ? rawRating * 10 : 60,
        0,
        100,
    );
    const rating = clamp(Number.isFinite(rawRating) ? rawRating : quality / 10, 0, 10);
    return {
        entry,
        quality,
        rating,
        originalLanguageId: normalizeStreamingLanguageId(raw.originalLanguageId || raw.language || 'english'),
        isFamous: Boolean(raw.isFamous || Number(raw.boxOffice || raw.gross || 0) >= 150_000_000),
        hasUniverse: Boolean(raw.universeId || raw.franchiseId),
        runtimeHours: Math.max(.25, runtimeHours),
        weeksAvailable: Math.max(1, programWeek - entry.launchWeek + 1),
        ownedLibrary: entry.source === 'OWNED_LIBRARY',
    };
};

const getProgramWeek = (player: Player, absoluteWeek: number): number => {
    const launchWeek = player.ownedStreamingPlatform.launchCommit?.committedAtAbsoluteWeek;
    if (Number.isFinite(launchWeek)) return Math.max(1, absoluteWeek - Number(launchWeek) + 1);
    return Math.max(1, Number(player.ownedStreamingPlatform.weeklyHistory.at(-1)?.operations?.programWeek || 0) + 1);
};

const resolveLanguageFit = (
    candidate: ViewingCandidate,
    countryLanguages: string[],
    cohort: WorldAudienceCohortState,
    localization: ReturnType<typeof resolveStreamingGlobalLocalizationCapability>,
): number => {
    const normalizedCountryLanguages = countryLanguages.map(normalizeStreamingLanguageId);
    if (normalizedCountryLanguages.includes(candidate.originalLanguageId)) {
        return 1.05 + cohort.localLanguageAffinityIndex / 260;
    }
    const coveredLanguage = normalizedCountryLanguages.some(language => localization.activeLanguageIds.includes(language));
    if (!coveredLanguage) return .42 - cohort.localLanguageAffinityIndex / 500;
    return clamp(.58 + localization.subtitleLevel * .08 + localization.dubbingLevel * .115, .55, 1.02);
};

const scoreCandidate = (
    player: Player,
    candidate: ViewingCandidate,
    countryId: string,
    cohort: WorldAudienceCohortState,
    absoluteWeek: number,
): { score: number; languageFit: number } => {
    const platform = player.ownedStreamingPlatform;
    const population = player.world.worldPopulation!.countries[countryId];
    const localization = resolveStreamingGlobalLocalizationCapability(platform);
    const languageFit = resolveLanguageFit(candidate, population.languages, cohort, localization);
    const affinityGenres = PERSONA_GENRE_AFFINITY[cohort.primaryPersonaId] || [];
    const genreFit = affinityGenres.includes(candidate.entry.genre) ? 1.22 : .88;
    const qualityFit = .45 + candidate.quality / 100;
    const prestigeFit = candidate.rating >= 7.5 && cohort.primaryPersonaId === 'PRESTIGE_EXPLORERS' ? 1.22 : 1;
    const fandomFit = candidate.hasUniverse && cohort.primaryPersonaId === 'FANDOM_LOYALISTS' ? 1.32 : candidate.isFamous ? 1.08 : 1;
    const marketingFit = candidate.entry.marketingPlan === 'EVENT' ? 1.22 : candidate.entry.marketingPlan === 'STANDARD' ? 1.1 : 1;
    const freshness = clamp(1.28 - Math.max(0, candidate.weeksAvailable - 1) * .055, .58, 1.28);
    const weeklyLift = candidate.entry.releasePattern === 'WEEKLY' && candidate.weeksAvailable <= 8 ? 1.14 : 1;
    const recommendationLevel = clamp(platform.technologyLevels.DATA_RECOMMENDATIONS || 0, 0, 10);
    const recommendationFit = 1 + recommendationLevel * .018;
    const growthAction = platform.growthActions.find(action => action.status === 'LOCKED'
        && action.targetAbsoluteWeek === absoluteWeek && action.projectId === candidate.entry.projectId);
    const growthFit = growthAction ? 1.28 : 1;
    const reliability = clamp((platform.infrastructureSetup?.reliabilityTarget || platform.metrics.technologyHealth || 75) / 100, .65, 1);
    const rng = createDeterministicRng(`${platform.simulationSeed}:we6-score:${absoluteWeek}:${countryId}:${cohort.id}:${candidate.entry.projectId}`);
    const variance = .94 + rng() * .12;
    return {
        score: Math.max(.01, qualityFit * genreFit * languageFit * prestigeFit * fandomFit * marketingFit
            * freshness * weeklyLift * recommendationFit * growthFit * reliability * variance),
        languageFit,
    };
};

const titleDiscoveryMix = (
    candidate: ViewingCandidate,
    recommendationLevel: number,
    hasGrowthAction: boolean,
): WorldStreamingViewingDiscoveryMix => {
    const allocation = distributeInteger(100, [
        24 + (candidate.weeksAvailable === 1 ? 16 : 0) + (candidate.entry.marketingPlan === 'EVENT' ? 8 : 0),
        27 + recommendationLevel * 2 + candidate.weeksAvailable,
        12 + candidate.rating,
        12 + (candidate.hasUniverse || candidate.isFamous ? 9 : 0),
        8 + (candidate.entry.marketingPlan === 'EVENT' ? 14 : candidate.entry.marketingPlan === 'STANDARD' ? 7 : 2) + (hasGrowthAction ? 10 : 0),
        7 + (candidate.isFamous ? 5 : 0),
    ]);
    return {
        homepagePercent: allocation[0],
        recommendationsPercent: allocation[1],
        searchPercent: allocation[2],
        directPercent: allocation[3],
        marketingPercent: allocation[4],
        externalBuzzPercent: allocation[5],
    };
};

const buildViewingState = (
    player: Player,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldStreamingViewingSnapshot[],
    priorState?: WorldStreamingViewingState,
    diagnostics: { onStage?: (stage: string) => void; preparedWorld?: boolean } = {},
): WorldStreamingViewingState => {
    const markStage = (stage: string) => diagnostics.onStage?.(stage);
    const population = diagnostics.preparedWorld
        ? player.world.worldPopulation!
        : normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = diagnostics.preparedWorld
        ? player.world.worldAudienceEconomy!
        : normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = diagnostics.preparedWorld
        ? player.world.worldAudienceParticipation!
        : normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation,
            population, audience, absoluteWeek);
    const preparedPlayer: Player = diagnostics.preparedWorld ? player : {
        ...player,
        world: { ...player.world, worldPopulation: population, worldAudienceEconomy: audience,
            worldAudienceParticipation: participation },
    };
    markStage('audience_ready');
    const customers = normalizeWorldStreamingCustomerState(preparedPlayer.world.worldStreamingCustomers, preparedPlayer, absoluteWeek);
    markStage('customers_ready');
    const offerRegistry = getWorldStreamingOffers(preparedPlayer, absoluteWeek);
    const choices = projectCountryChoices(preparedPlayer, absoluteWeek, offerRegistry);
    markStage('choices_ready');
    const aiCatalogue = seedLegacyAiCatalogue(preparedPlayer,
        offerRegistry.offers, absoluteWeek,
        priorState?.aiCatalogue || [], priorState?.aiCatalogueSeededPlatformIds || []);
    markStage('ai_catalogue_ready');
    const rivalViewing = projectRivalViewing(preparedPlayer, absoluteWeek, customers, choices,
        aiCatalogue.titles, priorState?.aiStoreEntitlements || [], offerRegistry);
    markStage('rival_viewing_ready');
    const playerCustomers = getWorldStreamingPlayerCustomerOutcome(customers);
    const platform = normalizeOwnedStreamingPlatformState(preparedPlayer.ownedStreamingPlatform, preparedPlayer.id);
    const playerActive = platform.lifecycle === 'ACTIVE' && Boolean(platform.identity) && Boolean(playerCustomers);
    if (!playerActive || !playerCustomers) {
        clearDeliveredStreamingAds(preparedPlayer, absoluteWeek, rivalViewing, [], offerRegistry);
        const platforms = rivalViewing.platforms;
        const global = summarizeAllPlatforms(platforms, Object.keys(customers.countries).length);
        const countries: Record<string, WorldStreamingViewingCountryState> = Object.fromEntries(
            Object.entries(rivalViewing.countries).map(([countryId, platformPerformance]) => {
                const rows = Object.values(platformPerformance);
                return [countryId, {
                    countryId,
                    accessibleAccounts: (customers.countries[countryId]?.platformSummaries.reduce((sum, row) => sum + row.accessLoadAccounts, 0) || 0)
                        + Object.values(choices[countryId]?.platforms || {}).reduce((sum, row) => sum + row.freeAd + row.store, 0),
                    totalViewingAccounts: rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0),
                    estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
                    totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
                    totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
                    unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
                    accessMix: rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
                        paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
                        freeViewingAccounts: (sum.freeViewingAccounts || 0) + (row.accessMix.freeViewingAccounts || 0),
                        storeViewingAccounts: (sum.storeViewingAccounts || 0) + (row.accessMix.storeViewingAccounts || 0),
                        sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
                        piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
                    }), emptyAccessMix()),
                    revenue: sumRevenue(rows.map(row => row.revenue)),
                    titlePerformance: [],
                    platformPerformance,
                }];
            }),
        );
        return {
            schemaVersion: WORLD_STREAMING_VIEWING_SCHEMA_VERSION,
            initializedAtAbsoluteWeek,
            lastProcessedAbsoluteWeek: absoluteWeek,
            sourceFingerprint: createDeterministicId('world-streaming-viewing', absoluteWeek, customers.sourceFingerprint, 'AI_PLATFORM_FIELD'),
            countries, platforms, global,
            aiCatalogue: aiCatalogue.titles,
            aiCatalogueSeededPlatformIds: aiCatalogue.seededPlatformIds,
            aiStoreEntitlements: rivalViewing.aiStoreEntitlements,
            aiStoreTransactions: rivalViewing.aiStoreTransactions,
            commercialTransactions: [],
            snapshots: [...snapshots.filter(item => item.absoluteWeek !== absoluteWeek), {
                absoluteWeek,
                totalViewingAccounts: global.totalViewingAccounts,
                totalHoursViewed: global.totalHoursViewed,
                unmetDemandAccounts: global.unmetDemandAccounts,
                incrementalRevenue: global.revenue.totalIncrementalRevenue,
            }].slice(-MAX_SNAPSHOTS),
        };
    }

    const programWeek = getProgramWeek({ ...preparedPlayer, ownedStreamingPlatform: platform }, absoluteWeek);
    const entries = getOwnedStreamingProgramEntries({ ...preparedPlayer, ownedStreamingPlatform: platform });
    const candidates = entries.map(entry => resolveStreamingViewingProjectFacts(preparedPlayer, entry, programWeek));
    const pricing = platform.serviceConfiguration.pricing;
    const playerCommercialOffers = projectStreamingCommercialOffers(pricing);
    const ownedTitleIds = new Set(candidates
        .filter(candidate => candidate.ownedLibrary)
        .map(candidate => candidate.entry.projectId));
    const evaluateCachedRoute = createStreamingTitleRouteCache((projectId, countryId, route) => (
        evaluatePlayerStreamingTitleRoute(preparedPlayer, projectId, countryId, absoluteWeek, route, {
            platform,
            ownedTitleIds,
        })
    ));
    const activeEntitlementHouseholds = new Map<string, number>();
    (preparedPlayer.world.worldStreamingAudienceChoice?.entitlements || []).forEach(row => {
        if (row.kind !== 'PURCHASE' && (row.expiresAtAbsoluteWeek || 0) <= absoluteWeek) return;
        const key = JSON.stringify([row.countryId, row.titleId, row.kind]);
        activeEntitlementHouseholds.set(key, (activeEntitlementHouseholds.get(key) || 0) + row.households);
    });
    // Older active careers can have a placeholder zero capacity without a commissioned
    // network. Only a commissioned network is a physical delivery constraint.
    const playerCountryIds = Object.keys(customers.countries).filter(countryId => (
        customers.countries[countryId].platformSummaries.some(row => row.platformId === 'PLAYER' && row.accessLoadAccounts > 0)
        || (choices[countryId]?.platforms.PLAYER?.freeAd || 0) > 0
        || (choices[countryId]?.platforms.PLAYER?.store || 0) > 0
    ));
    const geographicCoverage = platform.infrastructureSetup
        ? new Map(deriveStreamingNetworkCoverage({
            facilities: platform.infrastructureSetup.facilities || [],
            openingCountryIds: playerCountryIds,
            fibreState: platform.fibre,
        }).countries.map(country => [country.countryId, country.coveredShare]))
        : null;
    const countryReach = (countryId: string): number => geographicCoverage
        ? clamp(geographicCoverage.get(countryId) || 0, 0, 1) : 1;
    const reachableDemandAccounts = playerCountryIds.reduce((sum, countryId) => sum + (
        (customers.countries[countryId].platformSummaries.find(row => row.platformId === 'PLAYER')?.accessLoadAccounts || 0)
        + ((choices[countryId]?.platforms.PLAYER?.freeAd || 0)
            + (choices[countryId]?.platforms.PLAYER?.store || 0)) * countryReach(countryId)
    ), 0);
    const effectiveBurstCapacity = Math.max(0, platform.capacity.burstConcurrentStreams)
        * getStreamingInfrastructureOperationsEffects(platform).capacityMultiplier;
    const deliveryFraction = platform.infrastructureSetup && reachableDemandAccounts > 0
        ? clamp(effectiveBurstCapacity / (reachableDemandAccounts * PEAK_CONCURRENCY_SHARE), 0, 1)
        : 1;
    const adHoursFor = (country: WorldStreamingViewingCountryTitleState): number => {
        const customer = customers.countries[country.countryId]?.platformSummaries.find(row => row.platformId === 'PLAYER');
        const adPaid = customer?.planAllocations.reduce((sum, allocation) => (
            sum + (pricing.plans.find(plan => plan.id === allocation.planId)?.ads ? allocation.paidAccounts : 0)
        ), 0) || 0;
        const paidShare = customer?.endingPaidAccounts ? adPaid / customer.endingPaidAccounts : 0;
        const eligible = (country.accessMix.freeViewingAccounts || 0)
            + country.accessMix.paidViewingAccounts * paidShare;
        return country.hoursViewed * clamp(eligible / Math.max(1, country.viewingAccounts), 0, 1);
    };
    const countryStates: Record<string, WorldStreamingViewingCountryState> = {};
    const titleCountryRows = new Map<string, WorldStreamingViewingCountryTitleState[]>();
    const storeTransactions = new Map<string, { rental: number; purchase: number }>();
    const storeBuyerSegments = new Map<string, { countryId: string; titleId: string;
        kind: 'RENTAL' | 'PURCHASE'; buyerPlanId: string | null; households: number }>();

    Object.keys(customers.countries).sort().forEach(countryId => {
        const customerCountry = customers.countries[countryId];
        const countryDeliveryFraction = deliveryFraction * countryReach(countryId);
        const paidDeliveryFraction = countryReach(countryId) > 0 ? deliveryFraction : 0;
        const audienceCountry = preparedPlayer.world.worldAudienceEconomy?.countries[countryId];
        const populationCountry = preparedPlayer.world.worldPopulation?.countries[countryId];
        if (!audienceCountry || !populationCountry) return;
        const paidPlayerCohorts = customerCountry.cohorts.flatMap(customerCohort => {
            const planCells = customerCohort.planCells.filter(cell => cell.platformId === 'PLAYER');
            if (!planCells.length) return [];
            const audienceCohort = audienceCountry.cohorts.find(item => item.id === customerCohort.cohortId);
            return audienceCohort ? planCells.map(cell => ({ audienceCohort, cell, accessKind: 'SUBSCRIPTION' as const })) : [];
        });
        const freePlayerCohorts = audienceCountry.cohorts.flatMap(audienceCohort => {
            const households = choices[countryId]?.cohorts[audienceCohort.id]?.PLAYER?.freeAd || 0;
            if (!households) return [];
            return [{ audienceCohort, accessKind: 'FREE_AD' as const,
                cell: { planId: 'FREE_AD', paidAccounts: households,
                    externalSharedHouseholds: 0, piracyReach: 0 } }];
        });
        const playerCohorts = [...paidPlayerCohorts, ...freePlayerCohorts];
        if (!playerCohorts.length && !(choices[countryId]?.platforms.PLAYER?.store || 0)) return;
        const eligibleByPlanId = new Map<string, ViewingCandidate[]>();
        for (const { cell } of playerCohorts) {
            if (eligibleByPlanId.has(cell.planId)) continue;
            const route = cell.planId === 'FREE_AD'
                ? { kind: 'AD_SUPPORTED' as const }
                : { kind: 'SUBSCRIPTION' as const, planId: cell.planId };
            eligibleByPlanId.set(cell.planId, candidates.filter(candidate => (
                evaluateCachedRoute(candidate.entry.projectId, countryId, route).allowed
            )));
        }
        const countryTitle = new Map<string, WorldStreamingViewingCountryTitleState>();
        let accessibleAccounts = 0;
        let unmetDemandAccounts = 0;

        playerCohorts.forEach(({ audienceCohort, cell, accessKind }) => {
            const eligible = eligibleByPlanId.get(cell.planId) || [];
            const ownedAccounts = cell.paidAccounts;
            const sharedAccounts = Math.max(0, Math.round(cell.externalSharedHouseholds * .72));
            const piracyAudience = cell.piracyReach;
            const cohortAccessible = ownedAccounts + sharedAccounts;
            accessibleAccounts += cohortAccessible;
            if (!eligible.length || cohortAccessible <= 0) {
                unmetDemandAccounts += cohortAccessible;
                return;
            }
            const scored = eligible.map(candidate => scoreCandidate(preparedPlayer, candidate, countryId, audienceCohort, absoluteWeek));
            const meanScore = scored.reduce((sum, row) => sum + row.score, 0) / Math.max(1, scored.length);
            const engagementRate = clamp(.24 + audienceCohort.entertainmentAppetiteIndex * .0042
                + Math.min(.16, eligible.length * .018) + Math.min(.1, meanScore * .055), .22, .88);
            const ownedViewingTotal = Math.min(ownedAccounts, Math.round(ownedAccounts * engagementRate
                * (accessKind === 'SUBSCRIPTION' ? paidDeliveryFraction : countryDeliveryFraction)));
            const sharedViewingTotal = Math.min(sharedAccounts, Math.round(sharedAccounts * clamp(engagementRate * 1.06, 0, .92) * countryDeliveryFraction));
            const piracyViewingTotal = Math.min(piracyAudience, Math.round(piracyAudience * clamp(.22 + meanScore * .09, .12, .72)));
            unmetDemandAccounts += cohortAccessible - ownedViewingTotal - sharedViewingTotal;
            const weights = scored.map(row => row.score);
            const ownedByTitle = distributeInteger(ownedViewingTotal, weights);
            const sharedByTitle = distributeInteger(sharedViewingTotal, weights);
            const piracyByTitle = distributeInteger(piracyViewingTotal, weights);
            eligible.forEach((candidate, index) => {
                const paidViewingAccounts = accessKind === 'SUBSCRIPTION' ? ownedByTitle[index] || 0 : 0;
                const freeViewingAccounts = accessKind === 'FREE_AD' ? ownedByTitle[index] || 0 : 0;
                const sharedViewingAccounts = sharedByTitle[index] || 0;
                const piracyViewingAccounts = piracyByTitle[index] || 0;
                const viewingAccounts = paidViewingAccounts + freeViewingAccounts + sharedViewingAccounts;
                if (viewingAccounts <= 0 && piracyViewingAccounts <= 0) return;
                const score = scored[index];
                const rng = createDeterministicRng(`${platform.simulationSeed}:we6-engagement:${absoluteWeek}:${countryId}:${audienceCohort.id}:${candidate.entry.projectId}`);
                const completionRate = roundRate(clamp(
                    .3 + candidate.quality * .005 + score.languageFit * .13
                    + (candidate.entry.projectType === 'MOVIE' ? .04 : 0)
                    - Math.max(0, candidate.runtimeHours - 3) * .02 + (rng() - .5) * .06,
                    .2,
                    .96,
                ));
                const repeatViewingRate = roundRate(clamp(
                    .025 + (candidate.entry.releasePattern === 'WEEKLY' ? .075 : .025)
                    + (candidate.hasUniverse ? .055 : 0) + candidate.quality * .00065 + (rng() - .5) * .025,
                    .01,
                    .32,
                ));
                const repeatStarts = Math.round(viewingAccounts * repeatViewingRate);
                const starts = viewingAccounts + repeatStarts;
                const averageHours = candidate.runtimeHours * (.22 + completionRate * .78);
                const hoursViewed = Math.max(0, Math.round((viewingAccounts + repeatStarts * .7) * averageHours));
                const estimatedViewers = Math.max(viewingAccounts, Math.round(viewingAccounts * clamp(populationCountry.averageHouseholdSize * .7, 1, 2.8)));
                const current = countryTitle.get(candidate.entry.projectId);
                const next: WorldStreamingViewingCountryTitleState = {
                    projectId: candidate.entry.projectId,
                    title: candidate.entry.title,
                    countryId,
                    viewingAccounts: (current?.viewingAccounts || 0) + viewingAccounts,
                    estimatedViewers: (current?.estimatedViewers || 0) + estimatedViewers,
                    starts: (current?.starts || 0) + starts,
                    hoursViewed: (current?.hoursViewed || 0) + hoursViewed,
                    completionRate,
                    repeatViewingRate,
                    abandonmentRate: roundRate(1 - completionRate),
                    accessMix: {
                        paidViewingAccounts: (current?.accessMix.paidViewingAccounts || 0) + paidViewingAccounts,
                        freeViewingAccounts: (current?.accessMix.freeViewingAccounts || 0) + freeViewingAccounts,
                        storeViewingAccounts: current?.accessMix.storeViewingAccounts || 0,
                        sharedViewingAccounts: (current?.accessMix.sharedViewingAccounts || 0) + sharedViewingAccounts,
                        piracyViewingAccounts: (current?.accessMix.piracyViewingAccounts || 0) + piracyViewingAccounts,
                    },
                    revenue: emptyRevenue(),
                };
                countryTitle.set(candidate.entry.projectId, next);
            });
        });

        // A store customer acquires a title entitlement before a viewing event is counted.
        // Each country/title has at most one aggregate sale of each kind in this week.
        const storeHomes = choices[countryId]?.platforms.PLAYER?.store || 0;
        const storePolicy = playerCommercialOffers.storeOffer;
        const storeRestricted = storePolicy?.eligibility.kind === 'MEMBERSHIP_PLANS';
        accessibleAccounts += storeHomes;
        unmetDemandAccounts += storeHomes - Math.round(storeHomes * countryDeliveryFraction);
        if (pricing.streams.includes('rentals') && (storeHomes > 0 || playerCohorts.length > 0)) {
            const saleRoutes = (['RENTAL', 'PURCHASE'] as const).map(kind => ({
                kind,
                eligible: candidates.filter(candidate => evaluateCachedRoute(
                    candidate.entry.projectId, countryId, { kind }).allowed),
            }));
            saleRoutes.forEach(({ kind, eligible }) => {
                if (!eligible.length) return;
                const price = kind === 'RENTAL' ? pricing.rentals.rent : pricing.rentals.buy;
                const affordableStoreHomes = storeRestricted ? 0 : audienceCountry.cohorts.reduce((sum, cohort) => (
                    sum + (cohort.monthlyEntertainmentBudgetPerHousehold >= price
                        ? choices[countryId]?.cohorts[cohort.id]?.PLAYER?.store || 0 : 0)
                ), 0);
                const canBuyOutsidePlan = (candidate: ViewingCandidate, cohort: typeof playerCohorts[number]): boolean => {
                    if (storeRestricted && (cohort.accessKind !== 'SUBSCRIPTION'
                        || !storePolicy?.eligibility.planIds.includes(cohort.cell.planId))) return false;
                    const alreadySpent = cohort.accessKind === 'SUBSCRIPTION'
                        ? (cohort.cell.monthlySubscriptionRevenue || 0) / Math.max(1, cohort.cell.paidAccounts) : 0;
                    if (cohort.audienceCohort.monthlyEntertainmentBudgetPerHousehold - alreadySpent < price) return false;
                    const route = cohort.accessKind === 'FREE_AD'
                        ? { kind: 'AD_SUPPORTED' as const }
                        : { kind: 'SUBSCRIPTION' as const, planId: cohort.cell.planId };
                    return !evaluateCachedRoute(candidate.entry.projectId, countryId, route).allowed;
                };
                const eligibleHomesByTitle = eligible.map(candidate => affordableStoreHomes
                    + playerCohorts.reduce((sum, cohort) => sum
                        + (canBuyOutsidePlan(candidate, cohort) ? cohort.cell.paidAccounts : 0), 0));
                const buyerPool = affordableStoreHomes + playerCohorts.reduce((sum, cohort) => sum
                    + (eligible.some(candidate => canBuyOutsidePlan(candidate, cohort))
                        ? cohort.cell.paidAccounts : 0), 0);
                const buyers = Math.round(calculateStreamingStoreConversion({ buyerPool, price, kind }) * countryDeliveryFraction);
                const byTitle = distributeInteger(buyers, eligible.map((candidate, index) => (
                    eligibleHomesByTitle[index] * Math.max(1, candidate.quality)
                )));
                eligible.forEach((candidate, index) => {
                    const existingOwners = activeEntitlementHouseholds.get(JSON.stringify([
                        countryId,
                        candidate.entry.projectId,
                        kind,
                    ])) || 0;
                    const count = Math.min(byTitle[index] || 0,
                        Math.max(0, eligibleHomesByTitle[index] - existingOwners));
                    if (!count) return;
                    const key = `${countryId}:${candidate.entry.projectId}`;
                    const existingSale = storeTransactions.get(key) || { rental: 0, purchase: 0 };
                    existingSale[kind === 'RENTAL' ? 'rental' : 'purchase'] += count;
                    storeTransactions.set(key, existingSale);
                    const buyerSources = [
                        { planId: null as string | null, households: affordableStoreHomes },
                        ...playerCohorts.filter(cohort => canBuyOutsidePlan(candidate, cohort)).map(cohort => ({
                            planId: cohort.accessKind === 'SUBSCRIPTION' ? cohort.cell.planId : null,
                            households: cohort.cell.paidAccounts,
                        })),
                    ];
                    distributeInteger(count, buyerSources.map(source => source.households)).forEach((households, sourceIndex) => {
                        if (!households) return;
                        const buyerPlanId = buyerSources[sourceIndex].planId;
                        const segmentKey = JSON.stringify([countryId, candidate.entry.projectId, kind, buyerPlanId]);
                        const prior = storeBuyerSegments.get(segmentKey);
                        storeBuyerSegments.set(segmentKey, { countryId, titleId: candidate.entry.projectId,
                            kind, buyerPlanId, households: (prior?.households || 0) + households });
                    });
                    const current = countryTitle.get(candidate.entry.projectId);
                    const hours = Math.round(count * candidate.runtimeHours * .72);
                    const viewers = Math.max(count, Math.round(count * clamp(populationCountry.averageHouseholdSize * .7, 1, 2.8)));
                    countryTitle.set(candidate.entry.projectId, current ? {
                        ...current,
                        viewingAccounts: current.viewingAccounts + count,
                        estimatedViewers: current.estimatedViewers + viewers,
                        starts: current.starts + count,
                        hoursViewed: current.hoursViewed + hours,
                        accessMix: { ...current.accessMix,
                            storeViewingAccounts: (current.accessMix.storeViewingAccounts || 0) + count },
                    } : {
                        projectId: candidate.entry.projectId, title: candidate.entry.title, countryId,
                        viewingAccounts: count, estimatedViewers: viewers, starts: count, hoursViewed: hours,
                        completionRate: .72, repeatViewingRate: 0, abandonmentRate: .28,
                        accessMix: { ...emptyAccessMix(), storeViewingAccounts: count },
                        revenue: emptyRevenue(),
                    });
                });
            });
        }

        const titlePerformance = [...countryTitle.values()].sort((left, right) => right.viewingAccounts - left.viewingAccounts || left.projectId.localeCompare(right.projectId));
        titlePerformance.forEach(row => titleCountryRows.set(row.projectId, [...(titleCountryRows.get(row.projectId) || []), row]));
        const totalViewingAccounts = titlePerformance.reduce((sum, row) => sum + row.viewingAccounts, 0);
        const accessMix = titlePerformance.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
            paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
            freeViewingAccounts: (sum.freeViewingAccounts || 0) + (row.accessMix.freeViewingAccounts || 0),
            storeViewingAccounts: (sum.storeViewingAccounts || 0) + (row.accessMix.storeViewingAccounts || 0),
            sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
            piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
        }), emptyAccessMix());
        countryStates[countryId] = {
            countryId,
            accessibleAccounts,
            totalViewingAccounts,
            estimatedViewers: titlePerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
            totalStarts: titlePerformance.reduce((sum, row) => sum + row.starts, 0),
            totalHoursViewed: titlePerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
            unmetDemandAccounts,
            accessMix,
            revenue: emptyRevenue(),
            titlePerformance,
        };
    });

    const passOffers = projectStreamingCommercialOffers(pricing).adFreePasses;
    const passAllocations = new Map<string, {
        oneHourTransactions: number; dayTransactions: number;
        oneHourRevenue: number; dayRevenue: number; coveredHours: number;
    }>();
    if (pricing.streams.includes('ads')) {
        Object.values(countryStates).forEach(country => {
            const rows = country.titlePerformance;
            const eligibleHours = rows.map(adHoursFor);
            const totalEligibleHours = eligibleHours.reduce((sum, hours) => sum + hours, 0);
            const playerCustomers = customers.countries[country.countryId]?.platformSummaries.find(row => row.platformId === 'PLAYER');
            const adPaidHouseholds = playerCustomers?.planAllocations.reduce((sum, allocation) => (
                sum + (pricing.plans.find(plan => plan.id === allocation.planId)?.ads ? allocation.paidAccounts : 0)
            ), 0) || 0;
            const adViewingHouseholds = (choices[country.countryId]?.platforms.PLAYER?.freeAd || 0) + adPaidHouseholds;
            const averagePaidMonthlyPrice = (playerCustomers?.monthlySubscriptionRevenue || 0)
                / Math.max(1, playerCustomers?.endingPaidAccounts || 0);
            const affordablePassHouseholds = (price: number | null): number => {
                if (price === null) return 0;
                return Math.min(adViewingHouseholds, (audience.countries[country.countryId]?.cohorts || [])
                    .reduce((sum, cohort) => {
                        const picked = choices[country.countryId]?.cohorts[cohort.id]?.PLAYER;
                        const budget = cohort.monthlyEntertainmentBudgetPerHousehold;
                        return sum + (budget >= price ? picked?.freeAd || 0 : 0)
                            + (budget - averagePaidMonthlyPrice >= price ? picked?.adSubscriptions || 0 : 0);
                    }, 0));
            };
            const passes = calculateStreamingAdFreePassWeek({ adViewingHouseholds,
                adEligibleHours: totalEligibleHours,
                oneHourPrice: passOffers.oneHourPrice, dayPrice: passOffers.dayPrice,
                oneHourEligibleHouseholds: affordablePassHouseholds(passOffers.oneHourPrice),
                dayEligibleHouseholds: affordablePassHouseholds(passOffers.dayPrice) });
            const oneHourCounts = distributeInteger(passes.oneHourTransactions, eligibleHours);
            const dayCounts = distributeInteger(passes.dayTransactions, eligibleHours);
            const oneHourRevenue = distributeInteger(passes.oneHourRevenue, oneHourCounts);
            const dayRevenue = distributeInteger(passes.dayRevenue, dayCounts);
            const coveredHours = distributeInteger(passes.coveredHours, eligibleHours);
            rows.forEach((row, index) => passAllocations.set(`${country.countryId}:${row.projectId}`, {
                oneHourTransactions: oneHourCounts[index] || 0,
                dayTransactions: dayCounts[index] || 0,
                oneHourRevenue: oneHourRevenue[index] || 0,
                dayRevenue: dayRevenue[index] || 0,
                coveredHours: coveredHours[index] || 0,
            }));
        });
    }

    const playerAdOutcomes = clearDeliveredStreamingAds(preparedPlayer, absoluteWeek, rivalViewing,
        pricing.streams.includes('ads') ? Object.values(countryStates).map(country => ({
            platformId: 'PLAYER', countryId: country.countryId,
            eligibleHours: country.titlePerformance.reduce((sum, row) => sum + Math.max(0,
                adHoursFor(row) - (passAllocations.get(`${country.countryId}:${row.projectId}`)?.coveredHours || 0)), 0),
            minutesPerHour: pricing.ads.minutesPerHour,
            audienceQualityIndex: resolvePlayerStreamingCommerceCapabilityIndex(
                platform.technologyLevels.ADVERTISING_COMMERCE || 0),
            brandSafetyIndex: platform.competitiveWorld.globalPrestige,
        })) : [], offerRegistry);
    const playerTitleAds = new Map<string, { filledImpressions: number; revenue: number }>();
    Object.values(countryStates).forEach(country => {
        const outcome = playerAdOutcomes.get(country.countryId);
        const weights = country.titlePerformance.map(row => Math.max(0,
            adHoursFor(row) - (passAllocations.get(`${country.countryId}:${row.projectId}`)?.coveredHours || 0)));
        const impressions = distributeInteger(outcome?.filledImpressions || 0, weights);
        const revenues = distributeInteger(outcome?.revenue || 0, weights);
        country.titlePerformance.forEach((row, index) => playerTitleAds.set(`${country.countryId}:${row.projectId}`,
            { filledImpressions: impressions[index] || 0, revenue: revenues[index] || 0 }));
    });

    const baseTitlePerformance = candidates.flatMap(candidate => {
        const countryPerformance = titleCountryRows.get(candidate.entry.projectId) || [];
        if (!countryPerformance.length) return [];
        const viewingAccounts = countryPerformance.reduce((sum, row) => sum + row.viewingAccounts, 0);
        const weight = Math.max(1, viewingAccounts);
        const weighted = (getValue: (row: WorldStreamingViewingCountryTitleState) => number) => (
            countryPerformance.reduce((sum, row) => sum + getValue(row) * Math.max(1, row.viewingAccounts), 0) / weight
        );
        const completionRate = roundRate(weighted(row => row.completionRate));
        const repeatViewingRate = roundRate(weighted(row => row.repeatViewingRate));
        const accessMix = countryPerformance.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
            paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
            freeViewingAccounts: (sum.freeViewingAccounts || 0) + (row.accessMix.freeViewingAccounts || 0),
            storeViewingAccounts: (sum.storeViewingAccounts || 0) + (row.accessMix.storeViewingAccounts || 0),
            sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
            piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
        }), emptyAccessMix());
        const topCountry = countryPerformance.slice().sort((left, right) => right.viewingAccounts - left.viewingAccounts || left.countryId.localeCompare(right.countryId))[0];
        const growthAction = platform.growthActions.find(action => action.status === 'LOCKED'
            && action.targetAbsoluteWeek === absoluteWeek && action.projectId === candidate.entry.projectId);
        return [{
            projectId: candidate.entry.projectId,
            title: candidate.entry.title,
            source: candidate.entry.source,
            projectType: candidate.entry.projectType,
            genre: candidate.entry.genre,
            weeksAvailable: candidate.weeksAvailable,
            viewingAccounts,
            estimatedViewers: countryPerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
            starts: countryPerformance.reduce((sum, row) => sum + row.starts, 0),
            hoursViewed: countryPerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
            completionRate,
            repeatViewingRate,
            abandonmentRate: roundRate(1 - completionRate),
            satisfactionScore: round2(clamp(38 + completionRate * 52 + repeatViewingRate * 24 + candidate.rating * 1.2, 30, 98)),
            acquisitionAttributedAccounts: 0,
            retentionAttributedAccounts: Math.round(viewingAccounts * completionRate * .08),
            accessMix,
            discoveryMix: titleDiscoveryMix(candidate, platform.technologyLevels.DATA_RECOMMENDATIONS || 0, Boolean(growthAction)),
            revenue: emptyRevenue(),
            topCountryId: topCountry?.countryId || null,
            countryPerformance,
        }];
    }).sort((left, right) => right.viewingAccounts - left.viewingAccounts || left.projectId.localeCompare(right.projectId));
    const streams = new Set(pricing.streams);
    const canonicalWeeklySubscriptionRevenue = streams.has('subs')
        ? Math.max(0, Math.round(playerCustomers.monthlySubscriptionRevenue / 4.33))
        : 0;
    const subscriptionAllocation = distributeInteger(canonicalWeeklySubscriptionRevenue, baseTitlePerformance.map(title => (
        Math.max(1, title.accessMix.paidViewingAccounts) * (.45 + title.completionRate * .42 + title.repeatViewingRate * .55)
    )));
    const acquisitionPool = Math.max(0, playerCustomers.joins + playerCustomers.reactivations);
    const acquisitionAllocation = distributeInteger(acquisitionPool, baseTitlePerformance.map(title => {
        const candidate = candidates.find(item => item.entry.projectId === title.projectId)!;
        return Math.max(1, title.viewingAccounts) * (candidate.weeksAvailable <= 2 ? 1.4 : 1)
            * (candidate.entry.marketingPlan === 'EVENT' ? 1.25 : 1);
    }));
    const commerceCapabilityIndex = resolvePlayerStreamingCommerceCapabilityIndex(
        platform.technologyLevels.ADVERTISING_COMMERCE || 0,
    );
    const sponsoredTitleIds = new Set(baseTitlePerformance.slice(0, Math.max(0, Math.round(pricing.sponsor.titles))).map(title => title.projectId));
    const nonSubscriberOpportunityAllocation = distributeInteger(
        Object.values(countryStates).reduce((sum, country) => sum + country.unmetDemandAccounts, 0),
        baseTitlePerformance.map(title => Math.max(1, title.viewingAccounts)),
    );
    const titlePerformance = baseTitlePerformance.map((title, index) => {
        const candidate = candidates.find(item => item.entry.projectId === title.projectId)!;
        const freshMovie = title.projectType === 'MOVIE' && candidate.weeksAvailable <= 2;
        const countrySales = title.countryPerformance.map(country => (
            storeTransactions.get(`${country.countryId}:${title.projectId}`) || { rental: 0, purchase: 0 }
        ));
        const rawCommercial = calculateWorldStreamingCommercialRevenue({
            pricing: passOffers.oneHourPrice !== null || passOffers.dayPrice !== null
                ? { ...pricing, streams: pricing.streams.filter(stream => stream !== 'daypass') }
                : pricing,
            paidViewingAccounts: title.accessMix.paidViewingAccounts,
            viewingAccounts: title.viewingAccounts,
            nonSubscriberOpportunityAccounts: nonSubscriberOpportunityAllocation[index] || 0,
            hoursViewed: title.hoursViewed,
            adEligibleHours: 0,
            estimatedViewers: title.estimatedViewers,
            completionRate: title.completionRate,
            repeatViewingRate: title.repeatViewingRate,
            isFreshMovie: freshMovie,
            isRentalEligible: false,
            isPurchaseEligible: false,
            isSponsorEligible: sponsoredTitleIds.has(title.projectId),
            commerceCapabilityIndex,
            reputationIndex: platform.competitiveWorld.globalPrestige,
        });
        const rentalTransactions = countrySales.reduce((sum, row) => sum + row.rental, 0);
        const purchaseTransactions = countrySales.reduce((sum, row) => sum + row.purchase, 0);
        const rentalRevenue = Math.round(rentalTransactions * Math.max(0, pricing.rentals.rent));
        const purchaseRevenue = Math.round(purchaseTransactions * Math.max(0, pricing.rentals.buy));
        const storeOperatingCost = Math.round((rentalRevenue + purchaseRevenue) * .035);
        const countryPasses = title.countryPerformance.map(country => passAllocations.get(`${country.countryId}:${title.projectId}`));
        const oneHourPassTransactions = countryPasses.reduce((sum, row) => sum + (row?.oneHourTransactions || 0), 0);
        const oneHourPassRevenue = countryPasses.reduce((sum, row) => sum + (row?.oneHourRevenue || 0), 0);
        const dayPassTransactions = countryPasses.reduce((sum, row) => sum + (row?.dayTransactions || 0), 0);
        const dayPassRevenue = countryPasses.reduce((sum, row) => sum + (row?.dayRevenue || 0), 0);
        const adFreeCoveredHours = countryPasses.reduce((sum, row) => sum + (row?.coveredHours || 0), 0);
        const passOperatingCost = Math.round((oneHourPassRevenue + dayPassRevenue) * .035);
        const countryAds = title.countryPerformance.map(country =>
            playerTitleAds.get(`${country.countryId}:${title.projectId}`)
                || { filledImpressions: 0, revenue: 0 });
        const advertisingImpressions = countryAds.reduce((sum, row) => sum + row.filledImpressions, 0);
        const advertisingRevenue = countryAds.reduce((sum, row) => sum + row.revenue, 0);
        const commercial = {
            ...rawCommercial,
            advertisingImpressions,
            advertisingRevenue,
            rentalTransactions,
            rentalRevenue,
            purchaseTransactions,
            purchaseRevenue,
            oneHourPassTransactions,
            oneHourPassRevenue,
            dayPassTransactions: rawCommercial.dayPassTransactions + dayPassTransactions,
            dayPassRevenue: rawCommercial.dayPassRevenue + dayPassRevenue,
            adFreeCoveredHours,
            totalIncrementalRevenue: Math.max(0, rawCommercial.totalIncrementalRevenue + rentalRevenue + purchaseRevenue
                + advertisingRevenue + oneHourPassRevenue + dayPassRevenue),
            commercialOperatingCost: Math.max(0,
                rawCommercial.commercialOperatingCost + storeOperatingCost
                + passOperatingCost + Math.round(advertisingRevenue * .12)),
        };
        const revenue: WorldStreamingViewingRevenue = {
            ...commercial,
            attributedSubscriptionRevenue: subscriptionAllocation[index] || 0,
        };
        const subscriptionWeights = title.countryPerformance.map(country => Math.max(0, country.accessMix.paidViewingAccounts));
        const countryWeights = title.countryPerformance.map(country => Math.max(0, country.viewingAccounts));
        const rentalByCountry = countrySales.map(row => row.rental);
        const purchaseByCountry = countrySales.map(row => row.purchase);
        const rentalRevenueByCountry = distributeInteger(rentalRevenue, rentalByCountry);
        const purchaseRevenueByCountry = distributeInteger(purchaseRevenue, purchaseByCountry);
        const storeRevenueByCountry = countrySales.map((_, countryIndex) => (
            rentalRevenueByCountry[countryIndex] + purchaseRevenueByCountry[countryIndex]
        ));
        const adOperatingCost = Math.round(advertisingRevenue * .12);
        const nonStoreRevenueByCountry = distributeInteger(rawCommercial.totalIncrementalRevenue, countryWeights);
        const nonStoreOperatingByCountry = distributeInteger(rawCommercial.commercialOperatingCost, countryWeights);
        const storeOperatingByCountry = distributeInteger(storeOperatingCost, storeRevenueByCountry);
        const adOperatingByCountry = distributeInteger(adOperatingCost, countryAds.map(row => row.revenue));
        const passOperatingByCountry = distributeInteger(passOperatingCost,
            countryPasses.map(row => (row?.oneHourRevenue || 0) + (row?.dayRevenue || 0)));
        const legacyDayPassTransactions = distributeInteger(rawCommercial.dayPassTransactions, countryWeights);
        const legacyDayPassRevenue = distributeInteger(rawCommercial.dayPassRevenue, countryWeights);
        const allocations = {
            attributedSubscriptionRevenue: distributeInteger(revenue.attributedSubscriptionRevenue, subscriptionWeights),
            advertisingImpressions: countryAds.map(row => row.filledImpressions),
            advertisingRevenue: countryAds.map(row => row.revenue),
            premiumTransactions: distributeInteger(revenue.premiumTransactions, countryWeights),
            premiumRevenue: distributeInteger(revenue.premiumRevenue, countryWeights),
            rentalTransactions: rentalByCountry,
            rentalRevenue: rentalRevenueByCountry,
            purchaseTransactions: purchaseByCountry,
            purchaseRevenue: purchaseRevenueByCountry,
            dayPassTransactions: countryPasses.map((row, index) => (row?.dayTransactions || 0)
                + legacyDayPassTransactions[index]),
            dayPassRevenue: countryPasses.map((row, index) => (row?.dayRevenue || 0)
                + legacyDayPassRevenue[index]),
            oneHourPassTransactions: countryPasses.map(row => row?.oneHourTransactions || 0),
            oneHourPassRevenue: countryPasses.map(row => row?.oneHourRevenue || 0),
            adFreeCoveredHours: countryPasses.map(row => row?.coveredHours || 0),
            meteredAccounts: distributeInteger(revenue.meteredAccounts, countryWeights),
            meteredHours: distributeInteger(revenue.meteredHours, countryWeights),
            meteredRevenue: distributeInteger(revenue.meteredRevenue, countryWeights),
            patronAccounts: distributeInteger(revenue.patronAccounts, countryWeights),
            patronRevenue: distributeInteger(revenue.patronRevenue, countryWeights),
            sponsorshipImpressions: distributeInteger(revenue.sponsorshipImpressions, countryWeights),
            sponsorshipRevenue: distributeInteger(revenue.sponsorshipRevenue, countryWeights),
            totalIncrementalRevenue: nonStoreRevenueByCountry.map((value, countryIndex) => (
                value + storeRevenueByCountry[countryIndex] + countryAds[countryIndex].revenue
                    + (countryPasses[countryIndex]?.oneHourRevenue || 0) + (countryPasses[countryIndex]?.dayRevenue || 0)
            )),
            commercialOperatingCost: nonStoreOperatingByCountry.map((value, countryIndex) => (
                value + storeOperatingByCountry[countryIndex] + adOperatingByCountry[countryIndex]
                    + passOperatingByCountry[countryIndex]
            )),
        };
        title.countryPerformance.forEach((country, countryIndex) => {
            country.revenue = {
                attributedSubscriptionRevenue: allocations.attributedSubscriptionRevenue[countryIndex] || 0,
                advertisingImpressions: allocations.advertisingImpressions[countryIndex] || 0,
                advertisingRevenue: allocations.advertisingRevenue[countryIndex] || 0,
                premiumTransactions: allocations.premiumTransactions[countryIndex] || 0,
                premiumRevenue: allocations.premiumRevenue[countryIndex] || 0,
                rentalTransactions: allocations.rentalTransactions[countryIndex] || 0,
                rentalRevenue: allocations.rentalRevenue[countryIndex] || 0,
                purchaseTransactions: allocations.purchaseTransactions[countryIndex] || 0,
                purchaseRevenue: allocations.purchaseRevenue[countryIndex] || 0,
                dayPassTransactions: allocations.dayPassTransactions[countryIndex] || 0,
                dayPassRevenue: allocations.dayPassRevenue[countryIndex] || 0,
                oneHourPassTransactions: allocations.oneHourPassTransactions[countryIndex] || 0,
                oneHourPassRevenue: allocations.oneHourPassRevenue[countryIndex] || 0,
                adFreeCoveredHours: allocations.adFreeCoveredHours[countryIndex] || 0,
                meteredAccounts: allocations.meteredAccounts[countryIndex] || 0,
                meteredHours: allocations.meteredHours[countryIndex] || 0,
                meteredRevenue: allocations.meteredRevenue[countryIndex] || 0,
                patronAccounts: allocations.patronAccounts[countryIndex] || 0,
                patronRevenue: allocations.patronRevenue[countryIndex] || 0,
                sponsorshipImpressions: allocations.sponsorshipImpressions[countryIndex] || 0,
                sponsorshipRevenue: allocations.sponsorshipRevenue[countryIndex] || 0,
                totalIncrementalRevenue: allocations.totalIncrementalRevenue[countryIndex] || 0,
                commercialOperatingCost: allocations.commercialOperatingCost[countryIndex] || 0,
            };
        });
        return {
            ...title,
            acquisitionAttributedAccounts: acquisitionAllocation[index] || 0,
            revenue,
        };
    });
    Object.values(countryStates).forEach(country => {
        country.revenue = sumRevenue(country.titlePerformance.map(title => title.revenue));
    });
    const totalViewingAccounts = titlePerformance.reduce((sum, row) => sum + row.viewingAccounts, 0);
    const accessMix = titlePerformance.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
        paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
        freeViewingAccounts: (sum.freeViewingAccounts || 0) + (row.accessMix.freeViewingAccounts || 0),
        storeViewingAccounts: (sum.storeViewingAccounts || 0) + (row.accessMix.storeViewingAccounts || 0),
        sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
        piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
    }), emptyAccessMix());
    const platformSummary: WorldStreamingViewingPlatformSummary = {
        platformId: 'PLAYER',
        platformName: platform.identity!.name,
        totalViewingAccounts,
        estimatedViewers: titlePerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
        totalStarts: titlePerformance.reduce((sum, row) => sum + row.starts, 0),
        totalHoursViewed: titlePerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
        averageCompletionRate: totalViewingAccounts > 0
            ? roundRate(titlePerformance.reduce((sum, row) => sum + row.completionRate * row.viewingAccounts, 0) / totalViewingAccounts) : 0,
        averageRepeatViewingRate: totalViewingAccounts > 0
            ? roundRate(titlePerformance.reduce((sum, row) => sum + row.repeatViewingRate * row.viewingAccounts, 0) / totalViewingAccounts) : 0,
        unmetDemandAccounts: Object.values(countryStates).reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
        accessMix,
        revenue: sumRevenue(titlePerformance.map(row => row.revenue)),
        streamLoadAccounts: totalViewingAccounts,
        titlePerformance,
    };
    const platforms = { ...rivalViewing.platforms, PLAYER: platformSummary };
    const allCountryIds = new Set([...Object.keys(rivalViewing.countries), ...Object.keys(countryStates)]);
    allCountryIds.forEach(countryId => {
        const playerCountry = countryStates[countryId];
        const platformPerformance: Record<string, WorldStreamingViewingCountryPlatformSummary> = {
            ...(rivalViewing.countries[countryId] || {}),
        };
        if (playerCountry) {
            platformPerformance.PLAYER = {
                platformId: 'PLAYER',
                platformName: platform.identity!.name,
                totalViewingAccounts: playerCountry.titlePerformance.reduce((sum, row) => sum + row.viewingAccounts, 0),
                estimatedViewers: playerCountry.titlePerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
                totalStarts: playerCountry.titlePerformance.reduce((sum, row) => sum + row.starts, 0),
                totalHoursViewed: playerCountry.titlePerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
                unmetDemandAccounts: playerCountry.unmetDemandAccounts,
                accessMix: { ...playerCountry.accessMix },
                revenue: { ...playerCountry.revenue },
            };
        }
        const rows = Object.values(platformPerformance);
        countryStates[countryId] = {
            countryId,
            accessibleAccounts: (customers.countries[countryId]?.platformSummaries.reduce((sum, row) => sum + row.accessLoadAccounts, 0) || 0)
                + Object.values(choices[countryId]?.platforms || {}).reduce((sum, row) => sum + row.freeAd + row.store, 0),
            totalViewingAccounts: rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0),
            estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
            totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
            totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
            unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
            accessMix: rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
                paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
                freeViewingAccounts: (sum.freeViewingAccounts || 0) + (row.accessMix.freeViewingAccounts || 0),
                storeViewingAccounts: (sum.storeViewingAccounts || 0) + (row.accessMix.storeViewingAccounts || 0),
                sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
                piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
            }), emptyAccessMix()),
            revenue: sumRevenue(rows.map(row => row.revenue)),
            titlePerformance: playerCountry?.titlePerformance || [],
            platformPerformance,
        };
    });
    const global = summarizeAllPlatforms(platforms, Object.keys(countryStates).length);
    const nextSnapshot: WorldStreamingViewingSnapshot = {
        absoluteWeek,
        totalViewingAccounts: global.totalViewingAccounts,
        totalHoursViewed: global.totalHoursViewed,
        unmetDemandAccounts: global.unmetDemandAccounts,
        incrementalRevenue: global.revenue.totalIncrementalRevenue,
    };
    const commercialTransactions = [...storeBuyerSegments.values()].map(segment => ({
        transactionId: createDeterministicId('streaming-store-sale', absoluteWeek,
            segment.countryId, segment.titleId, segment.kind, segment.buyerPlanId || 'PUBLIC'),
        countryId: segment.countryId, titleId: segment.titleId, kind: segment.kind,
        buyerPlanId: segment.buyerPlanId, households: segment.households,
        purchasedAtAbsoluteWeek: absoluteWeek,
    })).sort((left, right) => left.transactionId.localeCompare(right.transactionId));
    return {
        schemaVersion: WORLD_STREAMING_VIEWING_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        sourceFingerprint: createDeterministicId('world-streaming-viewing', absoluteWeek, customers.sourceFingerprint,
            platform.serviceConfiguration.revision, entries.map(entry => `${entry.projectId}:${entry.launchWeek}`).join('|')),
        countries: countryStates,
        platforms,
        global,
        aiCatalogue: aiCatalogue.titles,
        aiCatalogueSeededPlatformIds: aiCatalogue.seededPlatformIds,
        aiStoreEntitlements: rivalViewing.aiStoreEntitlements,
        aiStoreTransactions: rivalViewing.aiStoreTransactions,
        commercialTransactions,
        snapshots: [...snapshots.filter(item => item.absoluteWeek !== absoluteWeek), nextSnapshot].slice(-MAX_SNAPSHOTS),
    };
};

const buildState = (
    player: Player,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldStreamingViewingSnapshot[],
    priorState?: WorldStreamingViewingState,
    diagnostics: { onStage?: (stage: string) => void; preparedWorld?: boolean } = {},
): WorldStreamingViewingState => {
    return buildViewingState(player, absoluteWeek, initializedAtAbsoluteWeek, snapshots, priorState, diagnostics);
};

export const createWorldStreamingViewingState = (
    player: Player,
    absoluteWeek: number,
): WorldStreamingViewingState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    return buildState(player, week, week, []);
};

export const normalizeWorldStreamingViewingState = (
    input: WorldStreamingViewingState | undefined,
    player: Player,
    absoluteWeek: number,
    diagnostics: { onStage?: (stage: string) => void; preparedWorld?: boolean } = {},
): WorldStreamingViewingState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    if (isValidViewingState(input, week)) return input;
    return buildState(
        player,
        week,
        Math.max(0, Math.round(Number(input?.initializedAtAbsoluteWeek) || week)),
        Array.isArray(input?.snapshots) ? input.snapshots : [],
        input,
        diagnostics,
    );
};

export const advanceWorldStreamingViewingToWeek = (
    input: WorldStreamingViewingState | undefined,
    player: Player,
    absoluteWeek: number,
): WorldStreamingViewingState => normalizeWorldStreamingViewingState(input, player, absoluteWeek);

export const getWorldStreamingPlayerViewingOutcome = (
    state: WorldStreamingViewingState | undefined,
): WorldStreamingViewingPlatformSummary | null => state?.platforms?.PLAYER || null;
