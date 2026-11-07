import { createCinemaViewingRouteLookup } from '../boxOffice/boxOfficeViewingRoutes';
import { resolveStreamingProductionReadiness } from '../streamingProductionReadiness';
import { allocateCinemaStreamingEvidence, cinemaStreamingInterestWeight, cinemaStreamingLanguageReady, type CinemaStreamingAudienceEvidence } from '../boxOffice/boxOfficeStreamingAudience';
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
import { getStreamingIncidentHarm } from '../streamingIncidentHarm';
import { deriveStreamingNetworkCoverage } from '../streamingNetworkCoverage';
import { PEAK_CONCURRENCY_SHARE } from '../streamingNetworkReach';
import { resolveStreamingDeliveryLoad } from '../streamingDeliveryLoad';
import {
    STREAMING_AD_LEVEL_EFFECTS, resolveStreamingPlanAdLevel, resolveStreamingPlanOffer, streamingFreeTierEngagementFactor, streamingPlanIncludes,
    streamingPlanOfferAppeal,
} from '../streamingPlanOffer';
import { resolveStreamingTechTree, streamingTechAdEffects, streamingTechSmartAiEffects } from '../streamingTechTreeCatalogue';
import { resolveStreamingStoreEditions } from '../streamingStoreEditions';
import { createPlayerStreamingTitleRouteEvaluator, createStreamingCatalogueReadContext, evaluatePlayerStreamingTitleRoute } from '../streamingContentAvailability';
import type { StreamingTitleAccessRoute } from '../streamingTitleAccess';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import {
    STREAMING_LANGUAGE_FIT,
    STREAMING_LOCALIZED_ENGAGEMENT_LIFT,
    createStreamingCountryLocalizationResolver,
    localizationCoverageShare,
    resolveTitleLanguageFit,
    streamingLocalizationPackagesForLanguages,
    type StreamingCountryLocalization,
} from '../streamingLocalizationRegions';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { resolveHistoricalCatalogueTitle } from '../historicalCatalogue';
import { streamingTitleQuality, streamingTitleWeeksAvailable } from './worldStreamingContentValue';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldAudienceParticipation';
import { normalizeWorldPopulationState } from './worldPopulation';
import {
    getWorldStreamingPlayerCustomerOutcome,
    normalizeWorldStreamingCustomerState,
} from './worldStreamingCustomers';
import { getWorldStreamingOffers } from './worldStreamingOffers';
import { allocateStreamingAudienceChoice } from './worldStreamingAudienceChoice';
import {createStreamingCohortCommerce, spendStreamingCommerceSource, streamingBudgetEvidence,
    type StreamingCommerceSource, fundStreamingAncillaryRevenue, fundStreamingAdFreePasses, streamingConsumerProductRate, fundStreamingConsumerProducts} from './worldStreamingHouseholdBudget';
import { allocateStreamingStoreUnits, calculateStreamingAdFreePassWeek, calculateStreamingStoreConversion,
    calculateWorldStreamingCommercialRevenue } from './worldStreamingCommercialEconomy';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import { clearStreamingAdMarket, getStreamingCountryAdMarket,
    type StreamingAdMarketOutcome, type StreamingAdMarketSupply } from './worldStreamingAdMarket';
import { createAiTitleAccessResolver,
    seedLegacyAiCatalogue } from './worldStreamingAiCatalogue';
import {attachStreamingRoyaltyReceipts} from './worldStreamingRoyaltyAttribution';
import { streamingCampaignTitleFit } from '../campaigns/streamingCampaignEffects';

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
        || (input.royaltyReceipts !== undefined && (!Array.isArray(input.royaltyReceipts)
            || new Set(input.royaltyReceipts.map(row=>row.receiptId)).size!==input.royaltyReceipts.length
            || input.royaltyReceipts.some(row=>(row.sourceKind !== undefined && !['SUBSCRIPTION','ADVERTISING','RENTAL','PURCHASE','SPONSORSHIP','ANCILLARY'].includes(row.sourceKind)) || !row.receiptId || !row.platformId || !row.countryId || !row.projectId
                || !Number.isSafeInteger(row.grossReceipts) || row.grossReceipts<=0
                || !['SUBSCRIPTION','NON_STORE'].includes(row.kind))))
        || (input.royaltySourceReceipts !== undefined && (!Array.isArray(input.royaltySourceReceipts)
            || input.royaltySourceReceipts.some(row=>!row.platformId || !row.countryId
                || !Number.isSafeInteger(row.grossReceipts) || row.grossReceipts<=0
                || !['SUBSCRIPTION','FREE_AD','STORE'].includes(row.sourceKind))))
        || (input.commercialTransactions !== undefined && (!Array.isArray(input.commercialTransactions)
            || input.commercialTransactions.some(row => !row.transactionId || !row.countryId || !row.titleId
                || !Number.isSafeInteger(row.households) || row.households <= 0
                || row.purchasedAtAbsoluteWeek !== absoluteWeek)))
        || (input.aiCatalogue !== undefined && (!Array.isArray(input.aiCatalogue)
            || input.aiCatalogue.some(title => !title.platformId || !title.titleId || !title.contractId
                || !Array.isArray(title.countryIds) || !title.accessGrant)))
        || (input.cinemaAudienceEvidence !== undefined && (!Array.isArray(input.cinemaAudienceEvidence)
            || input.cinemaAudienceEvidence.some(row=>!row || !row.titleId || !row.countryId || !row.platformId
                || row.absoluteWeek!==absoluteWeek || !Number.isSafeInteger(row.viewingAccounts) || row.viewingAccounts<=0)))
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
    cinemaAudienceEvidence:CinemaStreamingAudienceEvidence[];
    platforms: Record<string, WorldStreamingViewingPlatformSummary>;
    countries: Record<string, Record<string, WorldStreamingViewingCountryPlatformSummary>>;
    adEligibleHours: Record<string, Record<string, number>>;
    aiStoreEntitlements: WorldStreamingAiStoreEntitlement[];
    aiStoreTransactions: WorldStreamingAiStoreTransaction[];
    royaltySourceReceipts: NonNullable<WorldStreamingViewingState['royaltySourceReceipts']>;
}

interface CountryChoiceCount { subscriptions: number; freeAd: number; store: number; adSubscriptions: number;
    storeEligibleSubscriptions: number; secondaryStore:number }
interface CountryChoiceProjection {
    platforms: Record<string, CountryChoiceCount>;
    cohorts: Record<string, Record<string, CountryChoiceCount>>;
    storeSources: Record<string,StreamingCommerceSource[]>;
    budgets: Array<{cohortId:string;budget:ReturnType<typeof createStreamingCohortCommerce>['budget']}>;
}

const choiceZero = (): CountryChoiceCount => ({ subscriptions: 0, freeAd: 0, store: 0,
    adSubscriptions: 0, storeEligibleSubscriptions: 0, secondaryStore:0 });

type WorldStreamingOfferRegistry = ReturnType<typeof getWorldStreamingOffers>;

export const projectCountryChoices = (
    player: Player,
    absoluteWeek: number,
    registry: WorldStreamingOfferRegistry,
    customers: ReturnType<typeof normalizeWorldStreamingCustomerState>,
): Record<string, CountryChoiceProjection> => {
    const offerMap = new Map(registry.offers.map(offer => [offer.platformId, offer]));
    const commercialByPlatform = new Map(registry.offers.map(offer => [
        offer.platformId,
        projectStreamingCommercialOffers(offer.commercialConfiguration),
    ]));
    const result: Record<string, CountryChoiceProjection> = {};
    Object.entries(player.world.worldAudienceEconomy?.countries || {}).forEach(([countryId, country]) => {
        const offers = (registry.byCountry[countryId] || []).map(id => offerMap.get(id)).filter((offer): offer is NonNullable<typeof offer> => Boolean(offer));
        const projected: CountryChoiceProjection = { platforms: {}, cohorts: {}, storeSources:{}, budgets:[] };
        country.cohorts.forEach(cohort => {
            const participation = player.world.worldAudienceParticipation?.countries[countryId]?.cohorts
                .find(row => row.cohortId === cohort.id);
            if (!participation) return;
            const allocation = allocateStreamingAudienceChoice(countryId, cohort, participation, offers);
            const subscriptions = (customers.countries[countryId]?.cohorts || [])
                .filter(row=>row.cohortId===cohort.id).flatMap(row=>row.planCells.map(cell=>({
                    platformId:cell.platformId,planId:cell.planId,households:cell.paidAccounts,
                    monthlySpend:cell.monthlySubscriptionRevenue})));
            const commerce=createStreamingCohortCommerce({countryId,cohort,participation,choice:allocation,offers,subscriptions,
                consumerProductPlatformIds:streamingConsumerProductRate(player.ownedStreamingPlatform)>0?['PLAYER']:[]});
            commerce.storeSources.forEach(source=>(projected.storeSources[source.platformId] ||= []).push(source));
            projected.budgets.push({cohortId:cohort.id,budget:commerce.budget});
            // Desired subscription demand can differ from retained paid stock.
            // Commerce already caps complementary free reach against those live
            // accounts; viewing must use the same households as their wallets.
            commerce.storeSources.filter(row=>row.id===`${row.platformId}:secondary-ad`).forEach(row=>{
                (projected.platforms[row.platformId] ||= choiceZero()).freeAd+=row.households;
                ((projected.cohorts[cohort.id] ||= {})[row.platformId] ||= choiceZero()).freeAd+=row.households;
            });
            allocation.storeOpportunities.forEach(row=>{
                (projected.platforms[row.platformId] ||= choiceZero()).secondaryStore+=row.households;
                ((projected.cohorts[cohort.id] ||= {})[row.platformId] ||= choiceZero()).secondaryStore+=row.households;
            });
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
    const cinemaAudienceEvidence:CinemaStreamingAudienceEvidence[]=[];
    const offers = new Map(offerRegistry.offers.map(offer => [offer.platformId, offer]));
    const countries: RivalViewingProjection['countries'] = {};
    const adEligibleHours: RivalViewingProjection['adEligibleHours'] = {};
    const rowsByPlatform = new Map<string, WorldStreamingViewingCountryPlatformSummary[]>();
    const entitlementMap = new Map<string, WorldStreamingAiStoreEntitlement>();
    const aiStoreTransactions: WorldStreamingAiStoreTransaction[] = [];
    const royaltySourceReceipts: NonNullable<WorldStreamingViewingState['royaltySourceReceipts']> = [];
    const titleFacts=createStreamingCatalogueReadContext(player);
    const qualityByTitle=new Map<string,number>();
    const titleQuality=(id:string):number=>{
        if(!qualityByTitle.has(id))qualityByTitle.set(id,streamingTitleQuality(player,id,titleFacts));
        return qualityByTitle.get(id)!;
    };
    // The player snapshot is unchanged throughout this synchronous projection.
    // Readiness has no country/route dimension; do not rescan the same production
    // for every country. Keep the cache local so later gameplay changes re-read.
    const readinessByTitle=new Map<string,boolean>();
    const productionReady=(id:string):boolean=>{
        if(!readinessByTitle.has(id))readinessByTitle.set(id,resolveStreamingProductionReadiness(player,id,undefined,titleFacts.productionIndex).ready);
        return readinessByTitle.get(id)!;
    };
    const titleResolvers = new Map([...offers.values()].filter(offer => !offer.isPlayer).map(offer => [
        offer.platformId, createAiTitleAccessResolver(player, offer, aiCatalogue, titleFacts),
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
            if (!customer && !choice.freeAd && !choice.store && !choice.secondaryStore) return;
            const rawLookup=createCinemaViewingRouteLookup(titleResolvers.get(offer.platformId)!);
            const playableLookup=createCinemaViewingRouteLookup((countryId:string,week:number,route:StreamingTitleAccessRoute)=>rawLookup.titles(countryId,week,route).filter(title=>
                !player.world.cinemaMarket?.titles[title.titleId] || (productionReady(title.titleId)
                    && cinemaStreamingLanguageReady(player,title.titleId,countryId,offer.platformId,week))));
            const playable=playableLookup.titles;

            const paidPlanId = offer.plans.find(plan => plan.monthlyPrice > 0)?.id;
            const subscriptionTitles = paidPlanId
                ? playable(country.countryId, absoluteWeek, { kind: 'SUBSCRIPTION', planId: paidPlanId }) : [];
            const freeTitles = playable(country.countryId, absoluteWeek, { kind: 'AD_SUPPORTED' });
            const rentalTitles = playable(country.countryId, absoluteWeek, { kind: 'RENTAL' });
            const purchaseTitles = playable(country.countryId, absoluteWeek, { kind: 'PURCHASE' });
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
            // Resolver plus the cinema delivery/language filter above enforce the real date, country, production and route access.
            const paidEvidence=allocateCinemaStreamingEvidence(player,country.countryId,offer.platformId,absoluteWeek,subscriptionTitles.map(t=>t.titleId),paidViewingAccounts,productionReady);
            const freeEvidence=allocateCinemaStreamingEvidence(player,country.countryId,offer.platformId,absoluteWeek,freeTitles.map(t=>t.titleId),freeViewingAccounts,productionReady);
            const merged=new Map(paidEvidence.map(r=>[r.titleId,r]));
            for(const row of freeEvidence){const old=merged.get(row.titleId);if(!old||row.viewingAccounts>old.viewingAccounts)merged.set(row.titleId,row)}
            cinemaAudienceEvidence.push(...merged.values());

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
                // a rival's targeting steps (#69) add to it; none taken, nothing added
                commerceCapabilityIndex: clamp(offer.reliabilityIndex * .55 + offer.marketingIndex * .45 + (offer.adAudienceQualityBonus || 0), 0, 100),
                reputationIndex: offer.reputationIndex,
            });
            const storeSources = choices[country.countryId]?.storeSources[offer.platformId] || [];
            const canBuy = (source:StreamingCommerceSource, titleId:string, price:number):boolean => {
                if (source.remainingMonthlyBudget < price) return false;
                if (commercialOffers.storeOffer?.eligibility.kind === 'MEMBERSHIP_PLANS'
                    && (source.kind !== 'SUBSCRIPTION' || !commercialOffers.storeOffer.eligibility.planIds.includes(source.planId || ''))) return false;
                if (source.kind === 'STORE') return true;
                return !playableLookup.hasTitle(country.countryId,absoluteWeek,source.kind==='FREE_AD'
                    ? {kind:'AD_SUPPORTED'} : {kind:'SUBSCRIPTION',planId:source.planId || ''},titleId);
            };
            const settleStore = (kind: 'RENTAL' | 'PURCHASE', titles: typeof rentalTitles): number => {
                if (!titles.length) return 0;
                const price = kind === 'RENTAL' ? commercialPricing.rentals.rent : commercialPricing.rentals.buy;
                const eligibleSources = titles.map(title=>storeSources.filter(source=>canBuy(source,title.titleId,price)));
                const eligiblePools = eligibleSources.map(sources=>sources.reduce((sum,source)=>sum+source.households,0));
                const buyerPool = storeSources.filter(source=>titles.some(title=>canBuy(source,title.titleId,price)))
                    .reduce((sum,source)=>sum+source.households,0);
                const quality = titles.reduce((sum,title)=>sum+titleQuality(title.titleId),0)/titles.length;
                const weeksAvailable = titles.reduce((sum,title)=>sum+Math.max(1,absoluteWeek-title.startsAtAbsoluteWeek+1),0)/titles.length;
                const wanted = calculateStreamingStoreConversion({ buyerPool, price, kind, quality, weeksAvailable });
                const allocations = allocateStreamingStoreUnits(wanted, eligiblePools);
                let settled = 0;
                titles.forEach((title, index) => {
                    const key = `${offer.platformId}:${country.countryId}:${title.titleId}:${kind}`;
                    const owned = entitlementMap.get(key)?.households || 0;
                    const purchaseOwners = entitlementMap.get(`${offer.platformId}:${country.countryId}:${title.titleId}:PURCHASE`)?.households || 0;
                    const opportunity = eligiblePools[index];
                    const rentalOwners = entitlementMap.get(`${offer.platformId}:${country.countryId}:${title.titleId}:RENTAL`)?.households || 0;
                    const desiredUnits = Math.min(allocations[index], Math.max(0, opportunity - rentalOwners - purchaseOwners));
                    const sources=eligibleSources[index];
                    const units=allocateStreamingStoreUnits(desiredUnits,sources.map(source=>source.households))
                        .reduce((sum,wanted,i)=>sum+spendStreamingCommerceSource(sources[i],Math.min(wanted,sources[i].households),price),0);
                    if (units <= 0) return;
                    settled += units;
                    aiStoreTransactions.push({ transactionId: createDeterministicId('ai-store-sale',
                        absoluteWeek, offer.platformId, country.countryId, title.titleId, kind),
                        platformId: offer.platformId, countryId: country.countryId,
                        titleId: title.titleId, contractId: title.contractId, kind,
                        households: units,
                        revenue: Math.floor(units * (kind === 'RENTAL'
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
            const funded = fundStreamingAncillaryRevenue(commercial,commercialPricing,storeSources.filter(source=>{
                const routes = source.kind==='SUBSCRIPTION' ? [{kind:'SUBSCRIPTION' as const,planId:source.planId || ''}]
                    : source.kind==='FREE_AD' ? [{kind:'AD_SUPPORTED' as const}] : [{kind:'RENTAL' as const},{kind:'PURCHASE' as const}];
                return routes.some(route=>rawLookup.titles(country.countryId,absoluteWeek,route).length>0);
            }));
            royaltySourceReceipts.push(...funded.map(row=>({...row,platformId:offer.platformId,countryId:country.countryId})));
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
    return { cinemaAudienceEvidence, platforms, countries, adEligibleHours, royaltySourceReceipts, aiStoreTransactions: aiStoreTransactions.sort((left, right) =>
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
                audienceQualityIndex: clamp(offer.reliabilityIndex * .55 + offer.marketingIndex * .45 + (offer.adAudienceQualityBonus || 0), 0, 100),
                brandSafetyIndex: offer.reputationIndex,
                // a rival's own ad tech (#69): more slots at the same minutes, fewer viewers lost in long breaks
                ...(offer.adSlotFactor ? { slotFactor: offer.adSlotFactor } : {}),
                ...(offer.adBreakSlope ? { breakSlope: offer.adBreakSlope } : {}) }];
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
        weeksAvailable: streamingTitleWeeksAvailable(player, entry, (player.ownedStreamingPlatform.launchCommit?.committedAtAbsoluteWeek ?? 1) + programWeek - 1),
        ownedLibrary: entry.source === 'OWNED_LIBRARY',
    };
};

const getProgramWeek = (player: Player, absoluteWeek: number): number => {
    const launchWeek = player.ownedStreamingPlatform.launchCommit?.committedAtAbsoluteWeek;
    if (Number.isFinite(launchWeek)) return Math.max(1, absoluteWeek - Number(launchWeek) + 1);
    return Math.max(1, Number(player.ownedStreamingPlatform.weeklyHistory.at(-1)?.operations?.programWeek || 0) + 1);
};

/**
 * A title's strength in a country by language. Native: unchanged. Another
 * language: the region that reaches the country best sets it, by which titles
 * its levels reach (library, new releases, day-one premieres: see
 * `streamingLocalizationRegions.ts`); with none, .42 as before. `uncoveredFit`
 * is the same title without any localization, for the week's counterfactual,
 * and `coverage` how much of the way to a local title localization took it.
 */
const resolveLanguageFit = (
    candidate: ViewingCandidate,
    normalizedCountryLanguages: string[],
    cohort: WorldAudienceCohortState,
    localization: StreamingCountryLocalization,
): { fit: number; native: boolean; uncoveredFit: number; coverage: number } => {
    if (normalizedCountryLanguages.includes(candidate.originalLanguageId)) {
        const fit = 1.05 + cohort.localLanguageAffinityIndex / 260;
        return { fit, native: true, uncoveredFit: fit, coverage: 0 };
    }
    const uncoveredFit = STREAMING_LANGUAGE_FIT.uncovered - cohort.localLanguageAffinityIndex / 500;
    if (!localization.packageId) return { fit: uncoveredFit, native: false, uncoveredFit, coverage: 0 };
    const fit = resolveTitleLanguageFit(localization, candidate.weeksAvailable);
    return { fit, native: false, uncoveredFit, coverage: localizationCoverageShare(fit) };
};

const scoreCandidate = (
    player: Player,
    candidate: ViewingCandidate,
    countryId: string,
    cohort: WorldAudienceCohortState,
    absoluteWeek: number,
    countryLanguages: string[],
    countryLocalization: StreamingCountryLocalization,
): { score: number; languageFit: number; native: boolean; uncoveredFit: number; coverage: number } => {
    const platform = player.ownedStreamingPlatform;
    const language = resolveLanguageFit(candidate, countryLanguages, cohort, countryLocalization);
    const languageFit = language.fit;
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
    /* #145: a title's campaigns pull more viewers where they built awareness */
    const campaignFit = streamingCampaignTitleFit(platform, candidate.entry.projectId, countryId);
    const reliability = clamp((platform.infrastructureSetup?.reliabilityTarget || platform.metrics.technologyHealth || 75) / 100, .65, 1);
    const rng = createDeterministicRng(`${platform.simulationSeed}:we6-score:${absoluteWeek}:${countryId}:${cohort.id}:${candidate.entry.projectId}`);
    const variance = .94 + rng() * .12;
    return {
        score: Math.max(.01, qualityFit * genreFit * languageFit * prestigeFit * fandomFit * marketingFit
            * freshness * weeklyLift * recommendationFit * growthFit * campaignFit * reliability * variance
            * cinemaStreamingInterestWeight(player,candidate.entry.projectId,countryId,absoluteWeek)),
        languageFit,
        native: language.native,
        uncoveredFit: language.uncoveredFit,
        coverage: language.coverage,
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
    const finish=(state:WorldStreamingViewingState)=>attachStreamingRoyaltyReceipts(
        {...preparedPlayer,world:{...preparedPlayer.world,worldStreamingCustomers:customers}},state,offerRegistry.offers);
    const choices = projectCountryChoices(preparedPlayer, absoluteWeek, offerRegistry, customers);
    markStage('choices_ready');
    const aiCatalogue = seedLegacyAiCatalogue(preparedPlayer,
        offerRegistry.offers, absoluteWeek,
        priorState?.aiCatalogue || [], priorState?.aiCatalogueSeededPlatformIds || []);
    markStage('ai_catalogue_ready');
    const rivalViewing = projectRivalViewing(preparedPlayer, absoluteWeek, customers, choices,
        aiCatalogue.titles, priorState?.aiStoreEntitlements || [], offerRegistry);
    markStage('rival_viewing_ready');
    const royaltySourceReceipts = [...rivalViewing.royaltySourceReceipts];
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
        return finish({
            schemaVersion: WORLD_STREAMING_VIEWING_SCHEMA_VERSION,
            initializedAtAbsoluteWeek,
            lastProcessedAbsoluteWeek: absoluteWeek,
            sourceFingerprint: createDeterministicId('world-streaming-viewing', absoluteWeek, customers.sourceFingerprint, 'AI_PLATFORM_FIELD'),
            countries, platforms, global,
            ...(rivalViewing.cinemaAudienceEvidence.length ? {cinemaAudienceEvidence:rivalViewing.cinemaAudienceEvidence} : {}),
            aiCatalogue: aiCatalogue.titles,
            aiCatalogueSeededPlatformIds: aiCatalogue.seededPlatformIds,
            aiStoreEntitlements: rivalViewing.aiStoreEntitlements,
            aiStoreTransactions: rivalViewing.aiStoreTransactions,
            royaltySourceReceipts,
            commercialTransactions: [],
            householdProductRevenue:0,
            householdBudgets:Object.entries(choices).flatMap(([id,choice])=>choice.budgets.map(row=>streamingBudgetEvidence(id,row.cohortId,row.budget))),
            snapshots: [...snapshots.filter(item => item.absoluteWeek !== absoluteWeek), {
                absoluteWeek,
                totalViewingAccounts: global.totalViewingAccounts,
                totalHoursViewed: global.totalHoursViewed,
                unmetDemandAccounts: global.unmetDemandAccounts,
                incrementalRevenue: global.revenue.totalIncrementalRevenue,
            }].slice(-MAX_SNAPSHOTS),
        });
    }

    const programWeek = getProgramWeek({ ...preparedPlayer, ownedStreamingPlatform: platform }, absoluteWeek);
    const entries = getOwnedStreamingProgramEntries({ ...preparedPlayer, ownedStreamingPlatform: platform });
    const candidates = entries.map(entry => resolveStreamingViewingProjectFacts(preparedPlayer, entry, programWeek));
    const pricing = platform.serviceConfiguration.pricing;
    const playerCommercialOffers = projectStreamingCommercialOffers(pricing);
    // Free with ads' own quality (#46): free viewers watch longer the better it is; unset, ×1 as before
    const freeTierEngagement = streamingFreeTierEngagementFactor(pricing.freeAdOffer
        ? streamingPlanOfferAppeal(pricing.freeAdOffer, resolveStreamingTechTree(platform)) : undefined);
    // Rent or buy's quality and editions (#47): buyers decide on the HD price, a better store
    // converts more of them, and a sale earns its editions' average; unset, as before
    const storeEditions = resolveStreamingStoreEditions(pricing, resolveStreamingTechTree(platform));
    // Smart AI (#59): more of a cohort's accounts find something to watch, and Autoplay and previews
    // keep them on a title longer and back for more; the starter alone (Trending rows v1) changes nothing.
    // AI channels and Autoplay reach the viewers of the plans that include them (#62), the free tier's too.
    const smartAiTree = resolveStreamingTechTree(platform);
    const smartAiByPlan = new Map<string, ReturnType<typeof streamingTechSmartAiEffects>>();
    const smartAiFor = (planId: string): ReturnType<typeof streamingTechSmartAiEffects> => {
        const known = smartAiByPlan.get(planId);
        if (known) return known;
        const plan = pricing.plans.find(item => item.id === planId);
        const offer = planId === 'FREE_AD' ? pricing.freeAdOffer : plan ? resolveStreamingPlanOffer(plan, smartAiTree) : null;
        const effects = streamingTechSmartAiEffects(smartAiTree, {
            aiChannels: streamingPlanIncludes(offer, 'aiChannels', smartAiTree), autoplay: streamingPlanIncludes(offer, 'autoplay', smartAiTree),
        });
        smartAiByPlan.set(planId, effects);
        return effects;
    };
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
        || (choices[countryId]?.platforms.PLAYER?.secondaryStore || 0) > 0
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
            + (choices[countryId]?.platforms.PLAYER?.store || 0)
            + (choices[countryId]?.platforms.PLAYER?.secondaryStore || 0)) * countryReach(countryId)
    ), 0);
    const effectiveBurstCapacity = Math.max(0, platform.capacity.burstConcurrentStreams)
        * getStreamingInfrastructureOperationsEffects(platform).capacityMultiplier;
    // Each viewer needs the load units their plan's picture streams, after Optimisation and the
    // save's calibration (streamingDeliveryLoad): the same figure the weekly close uses.
    const freeDemandAccounts = playerCountryIds.reduce((sum, countryId) => (
        sum + (choices[countryId]?.platforms.PLAYER?.freeAd || 0) * countryReach(countryId)
    ), 0);
    const storeDemandAccounts = playerCountryIds.reduce((sum, countryId) => (
        sum + ((choices[countryId]?.platforms.PLAYER?.store || 0) + (choices[countryId]?.platforms.PLAYER?.secondaryStore || 0)) * countryReach(countryId)
    ), 0);
    const viewerLoad = resolveStreamingDeliveryLoad(platform, customers.global.playerPlanAllocations, {
        free: freeDemandAccounts, store: storeDemandAccounts,
        others: Math.max(0, reachableDemandAccounts - freeDemandAccounts - storeDemandAccounts),
    }).viewerLoad;
    /* an open incident's viewers watch less (#51): its reach × its kind's viewing harm; none open, ×1 */
    const incidentDelivery = 1 - getStreamingIncidentHarm(platform).viewingLoss;
    const deliveryFraction = (platform.infrastructureSetup && reachableDemandAccounts > 0
        ? clamp(effectiveBurstCapacity / (reachableDemandAccounts * PEAK_CONCURRENCY_SHARE * Math.max(.01, viewerLoad)), 0, 1)
        : 1) * incidentDelivery;
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
    // Localization by region: one reader for the week, and what it did — who
    // watched in their own language (and which titles), what the levels added,
    // and who watched other-language titles no level reached ("untapped",
    // credited to the region that speaks the country's main language).
    const resolveCountryLocalization = createStreamingCountryLocalizationResolver(platform);
    const localizationByPackage = new Map<string, { localized: number; added: number; untapped: number; titles: Map<string, number> }>();
    const localizationRow = (packageId: string) => {
        const row = localizationByPackage.get(packageId) || { localized: 0, added: 0, untapped: 0, titles: new Map<string, number>() };
        localizationByPackage.set(packageId, row);
        return row;
    };

    Object.keys(customers.countries).sort().forEach(countryId => {
        const customerCountry = customers.countries[countryId];
        const countryDeliveryFraction = deliveryFraction * countryReach(countryId);
        const paidDeliveryFraction = countryReach(countryId) > 0 ? deliveryFraction : 0;
        const audienceCountry = preparedPlayer.world.worldAudienceEconomy?.countries[countryId];
        const populationCountry = preparedPlayer.world.worldPopulation?.countries[countryId];
        if (!audienceCountry || !populationCountry) return;
        const countryLanguages = populationCountry.languages.map(normalizeStreamingLanguageId);
        const countryLocalization = resolveCountryLocalization(populationCountry.languages);
        const homePackageId = countryLocalization.packageId
            || streamingLocalizationPackagesForLanguages(populationCountry.languages.slice(0, 1))[0]
            || streamingLocalizationPackagesForLanguages(populationCountry.languages)[0]
            || null;
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
        if (!playerCohorts.length && !(choices[countryId]?.platforms.PLAYER?.store || 0)
            && !(choices[countryId]?.platforms.PLAYER?.secondaryStore || 0)) return;
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
            const scored = eligible.map(candidate => scoreCandidate(preparedPlayer, candidate, countryId, audienceCohort, absoluteWeek,
                countryLanguages, countryLocalization));
            const meanScore = scored.reduce((sum, row) => sum + row.score, 0) / Math.max(1, scored.length);
            const tierEngagement = accessKind === 'FREE_AD' ? freeTierEngagement : 1;
            const baseEngagement = (mean: number): number => Math.min(.92, clamp(.24 + audienceCohort.entertainmentAppetiteIndex * .0042
                + Math.min(.16, eligible.length * .018) + Math.min(.1, mean * .055), .22, .88) * tierEngagement);
            // Where a region's subtitles and dubbing reach the titles a cohort would
            // choose, more of it finds something to watch: up to +25% when its whole
            // weighted choice is other-language titles both tracks reach. No region: unchanged.
            const totalWeight = scored.reduce((sum, row) => sum + row.score, 0);
            const localizedShare = totalWeight > 0
                ? scored.reduce((sum, row) => sum + (row.native ? 0 : row.score * row.coverage), 0) / totalWeight : 0;
            const localized = Boolean(countryLocalization.packageId) && localizedShare > 0;
            const localizedRate = localized
                ? Math.min(.92, baseEngagement(meanScore) * (1 + STREAMING_LOCALIZED_ENGAGEMENT_LIFT * localizedShare))
                : baseEngagement(meanScore);
            const smartAi = smartAiFor(cell.planId);
            const engagementRate = smartAi.engagementLift > 0 ? Math.min(.92, localizedRate * (1 + smartAi.engagementLift)) : localizedRate;
            const ownedDelivery = accessKind === 'SUBSCRIPTION' ? paidDeliveryFraction : countryDeliveryFraction;
            const ownedViewingTotal = Math.min(ownedAccounts, Math.round(ownedAccounts * engagementRate * ownedDelivery));
            const sharedViewingTotal = Math.min(sharedAccounts, Math.round(sharedAccounts * clamp(engagementRate * 1.06, 0, .92) * countryDeliveryFraction));
            const piracyViewingTotal = Math.min(piracyAudience, Math.round(piracyAudience * clamp(.22 + meanScore * .09, .12, .72)));
            unmetDemandAccounts += cohortAccessible - ownedViewingTotal - sharedViewingTotal;
            const weights = scored.map(row => row.score);
            const ownedByTitle = distributeInteger(ownedViewingTotal, weights);
            const sharedByTitle = distributeInteger(sharedViewingTotal, weights);
            const piracyByTitle = distributeInteger(piracyViewingTotal, weights);
            if (localized) {
                // The same cohort this week with no localization: other-language titles at
                // their uncovered strength and no lift. The difference is what it added.
                const meanUncovered = scored.reduce((sum, row) => sum + (row.native
                    ? row.score : row.score * row.uncoveredFit / Math.max(.01, row.languageFit)), 0) / Math.max(1, scored.length);
                // Smart AI's lift is in both, so the difference stays what localization added
                const engagementUncovered = smartAi.engagementLift > 0
                    ? Math.min(.92, baseEngagement(meanUncovered) * (1 + smartAi.engagementLift)) : baseEngagement(meanUncovered);
                const ownedUncovered = Math.min(ownedAccounts, Math.round(ownedAccounts * engagementUncovered * ownedDelivery));
                const sharedUncovered = Math.min(sharedAccounts, Math.round(sharedAccounts
                    * clamp(engagementUncovered * 1.06, 0, .92) * countryDeliveryFraction));
                localizationRow(countryLocalization.packageId!).added += Math.max(0,
                    ownedViewingTotal + sharedViewingTotal - ownedUncovered - sharedUncovered);
            }
            // Other-language titles: in their own language where a subtitle or dubbing
            // level reaches the title, untapped where none does.
            if (homePackageId) {
                scored.forEach((row, index) => {
                    if (row.native) return;
                    const viewers = (ownedByTitle[index] || 0) + (sharedByTitle[index] || 0);
                    if (viewers <= 0) return;
                    if (countryLocalization.packageId && row.languageFit > STREAMING_LANGUAGE_FIT.covered + 1e-9) {
                        const target = localizationRow(countryLocalization.packageId);
                        target.localized += viewers;
                        const projectId = eligible[index].entry.projectId;
                        target.titles.set(projectId, (target.titles.get(projectId) || 0) + viewers);
                    } else {
                        localizationRow(homePackageId).untapped += viewers;
                    }
                });
            }
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
                    - Math.max(0, candidate.runtimeHours - 3) * .02 + (rng() - .5) * .06 + smartAi.completionLift,
                    .2,
                    .96,
                ));
                const repeatViewingRate = roundRate(clamp(
                    .025 + (candidate.entry.releasePattern === 'WEEKLY' ? .075 : .025)
                    + (candidate.hasUniverse ? .055 : 0) + candidate.quality * .00065 + (rng() - .5) * .025 + smartAi.repeatLift,
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
        const storeHomes = (choices[countryId]?.platforms.PLAYER?.store || 0)
            + (choices[countryId]?.platforms.PLAYER?.secondaryStore || 0);
        const storePolicy = playerCommercialOffers.storeOffer;
        const storeRestricted = storePolicy?.eligibility.kind === 'MEMBERSHIP_PLANS';
        accessibleAccounts += storeHomes;
        unmetDemandAccounts += storeHomes - Math.round(storeHomes * countryDeliveryFraction);
        if (pricing.streams.includes('rentals') && (storeHomes > 0 || playerCohorts.length > 0)) {
            const sources = choices[countryId]?.storeSources.PLAYER || [];
            const canBuyTitle = (source:StreamingCommerceSource,candidate:ViewingCandidate,price:number):boolean => {
                if (source.remainingMonthlyBudget < price) return false;
                if (storeRestricted && (source.kind!=='SUBSCRIPTION'
                    || !storePolicy?.eligibility.planIds.includes(source.planId || ''))) return false;
                return source.kind==='STORE' || !evaluateCachedRoute(candidate.entry.projectId,countryId,
                    source.kind==='FREE_AD' ? {kind:'AD_SUPPORTED'}
                        : {kind:'SUBSCRIPTION',planId:source.planId || ''}).allowed;
            };
            const reservedStoreHomes = new Map<string,number>();
            const saleRoutes = (['RENTAL', 'PURCHASE'] as const).map(kind => ({
                kind,
                eligible: candidates.filter(candidate => evaluateCachedRoute(
                    candidate.entry.projectId, countryId, { kind }).allowed),
            }));
            saleRoutes.forEach(({ kind, eligible }) => {
                if (!eligible.length) return;
                const price = kind === 'RENTAL' ? storeEditions.hdRent : storeEditions.hdBuy;
                const paid = kind === 'RENTAL' ? storeEditions.rentPrice : storeEditions.buyPrice;
                const eligibleSourcesByTitle=eligible.map(candidate=>sources.filter(source=>canBuyTitle(source,candidate,price)));
                const eligibleHomesByTitle=eligibleSourcesByTitle.map(rows=>rows.reduce((sum,source)=>sum+source.households,0));
                const buyerPool=sources.filter(source=>eligible.some(candidate=>canBuyTitle(source,candidate,price)))
                    .reduce((sum,source)=>sum+source.households,0);
                const quality = eligible.reduce((sum,candidate)=>sum+candidate.quality,0)/eligible.length;
                const weeksAvailable = eligible.reduce((sum,candidate)=>sum+candidate.weeksAvailable,0)/eligible.length;
                const buyers = Math.round(calculateStreamingStoreConversion({ buyerPool, price, kind, quality, weeksAvailable })
                    * storeEditions.qualityFactor * countryDeliveryFraction);
                const byTitle = allocateStreamingStoreUnits(buyers, eligible.map((candidate, index) => (
                    eligibleHomesByTitle[index] * Math.max(1, candidate.quality)
                )));
                eligible.forEach((candidate, index) => {
                    const ownershipKey = `${countryId}:${candidate.entry.projectId}`;
                    const existingOwners = (['RENTAL','PURCHASE'] as const).reduce((sum,routeKind)=>
                        sum+(activeEntitlementHouseholds.get(JSON.stringify([
                            countryId,candidate.entry.projectId,routeKind])) || 0),0);
                    const wanted = Math.min(byTitle[index] || 0,
                        Math.max(0, eligibleHomesByTitle[index] - existingOwners - (reservedStoreHomes.get(ownershipKey) || 0)));
                    const buyerSources = eligibleSourcesByTitle[index];
                    const sourceSales = allocateStreamingStoreUnits(wanted,buyerSources.map(source=>source.households))
                        .map((units,i)=>spendStreamingCommerceSource(buyerSources[i],Math.min(units,buyerSources[i].households),paid));
                    const count = sourceSales.reduce((sum,units)=>sum+units,0);
                    if (!count) return;
                    reservedStoreHomes.set(ownershipKey,(reservedStoreHomes.get(ownershipKey) || 0)+count);
                    const key = ownershipKey;
                    const existingSale = storeTransactions.get(key) || { rental: 0, purchase: 0 };
                    existingSale[kind === 'RENTAL' ? 'rental' : 'purchase'] += count;
                    storeTransactions.set(key, existingSale);
                    sourceSales.forEach((households, sourceIndex) => {
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
            let passes = calculateStreamingAdFreePassWeek({ adViewingHouseholds,
                adEligibleHours: totalEligibleHours,
                oneHourPrice: passOffers.oneHourPrice, dayPrice: passOffers.dayPrice,
                oneHourEligibleHouseholds: affordablePassHouseholds(passOffers.oneHourPrice),
                dayEligibleHouseholds: affordablePassHouseholds(passOffers.dayPrice) });
            const passSources=(choices[country.countryId]?.storeSources.PLAYER || []).filter(source=>source.kind==='FREE_AD'
                || (source.kind==='SUBSCRIPTION' && pricing.plans.some(plan=>plan.id===source.planId && plan.ads)));
            passes=fundStreamingAdFreePasses(passes,passSources,passOffers.oneHourPrice,passOffers.dayPrice,totalEligibleHours,
                row=>royaltySourceReceipts.push({...row,platformId:'PLAYER',countryId:country.countryId}));
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

    /* Ad minutes an hour in a country (Phase 2): the service's cadence for free viewers, and per
       ad plan its level's share of it (light half, standard all, heavy double), by accounts. */
    const adMinutesFor = (countryId: string): number => {
        const customer = customers.countries[countryId]?.platformSummaries.find(row => row.platformId === 'PLAYER');
        const free = choices[countryId]?.platforms.PLAYER?.freeAd || 0;
        let accounts = free;
        let weighted = free;
        customer?.planAllocations.forEach(allocation => {
            const plan = pricing.plans.find(item => item.id === allocation.planId);
            if (!plan?.ads || allocation.paidAccounts <= 0) return;
            accounts += allocation.paidAccounts;
            weighted += allocation.paidAccounts * STREAMING_AD_LEVEL_EFFECTS[resolveStreamingPlanAdLevel(plan)].minutes;
        });
        return pricing.ads.minutesPerHour * (accounts > 0 ? weighted / accounts : 1);
    };
    // Ads tech (#61): New ad formats sells more slots an hour, Smarter ad breaks keeps viewers through long breaks
    const adTech = streamingTechAdEffects(resolveStreamingTechTree(platform));
    const playerAdOutcomes = clearDeliveredStreamingAds(preparedPlayer, absoluteWeek, rivalViewing,
        pricing.streams.includes('ads') ? Object.values(countryStates).map(country => ({
            platformId: 'PLAYER', countryId: country.countryId,
            eligibleHours: country.titlePerformance.reduce((sum, row) => sum + Math.max(0,
                adHoursFor(row) - (passAllocations.get(`${country.countryId}:${row.projectId}`)?.coveredHours || 0)), 0),
            minutesPerHour: adMinutesFor(country.countryId),
            audienceQualityIndex: resolvePlayerStreamingCommerceCapabilityIndex(
                platform.technologyLevels.ADVERTISING_COMMERCE || 0),
            brandSafetyIndex: platform.competitiveWorld.globalPrestige,
            ...(adTech.slots !== 1 ? { slotFactor: adTech.slots } : {}),
            ...(adTech.breakSlope !== 1 ? { breakSlope: adTech.breakSlope } : {}),
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
    // Store-source checks below read one unchanging player: prepare it once (on
    // first use) instead of normalising the platform per title × country × route.
    let storeSourceRoutes: ReturnType<typeof createPlayerStreamingTitleRouteEvaluator> | null = null;
    const titlePerformance = baseTitlePerformance.map((title, index) => {
        const candidate = candidates.find(item => item.entry.projectId === title.projectId)!;
        const freshMovie = title.projectType === 'MOVIE' && candidate.weeksAvailable <= 2;
        const countrySales = title.countryPerformance.map(country => (
            storeTransactions.get(`${country.countryId}:${title.projectId}`) || { rental: 0, purchase: 0 }
        ));
        let rawCommercial = calculateWorldStreamingCommercialRevenue({
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
        const rawWeights=title.countryPerformance.map(country=>Math.max(0,country.viewingAccounts));
        const rawByField=Object.fromEntries(Object.entries(rawCommercial).map(([key,value])=>[key,distributeInteger(value,rawWeights)]));
        const rawByCountry=title.countryPerformance.map((country,i)=>{
            const raw={...rawCommercial};
            (Object.keys(raw) as Array<keyof typeof raw>).forEach(key=>{raw[key]=rawByField[key][i];});
            const funded=fundStreamingAncillaryRevenue(raw,pricing,(choices[country.countryId]?.storeSources.PLAYER || []).filter(source=>{
                const routes = source.kind==='SUBSCRIPTION' ? [{kind:'SUBSCRIPTION' as const,planId:source.planId || ''}]
                    : source.kind==='FREE_AD' ? [{kind:'AD_SUPPORTED' as const}] : [{kind:'RENTAL' as const},{kind:'PURCHASE' as const}];
                storeSourceRoutes ??= createPlayerStreamingTitleRouteEvaluator(preparedPlayer, absoluteWeek);
                return routes.some(route=>storeSourceRoutes!(title.projectId,country.countryId,route).allowed);
            }));
            royaltySourceReceipts.push(...funded.map(row=>({...row,platformId:'PLAYER',countryId:country.countryId,projectId:title.projectId})));
            return raw;
        });
        (Object.keys(rawCommercial) as Array<keyof typeof rawCommercial>).forEach(key=>{
            rawCommercial[key]=rawByCountry.reduce((sum,row)=>sum+row[key],0);
        });
        const rentalTransactions = countrySales.reduce((sum, row) => sum + row.rental, 0);
        const purchaseTransactions = countrySales.reduce((sum, row) => sum + row.purchase, 0);
        const rentalRevenue = Math.floor(rentalTransactions * Math.max(0, storeEditions.rentPrice));
        const purchaseRevenue = Math.floor(purchaseTransactions * Math.max(0, storeEditions.buyPrice));
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
        const nonStoreRevenueByCountry = rawByCountry.map(row=>row.totalIncrementalRevenue);
        const nonStoreOperatingByCountry = rawByCountry.map(row=>row.commercialOperatingCost);
        const storeOperatingByCountry = distributeInteger(storeOperatingCost, storeRevenueByCountry);
        const adOperatingByCountry = distributeInteger(adOperatingCost, countryAds.map(row => row.revenue));
        const passOperatingByCountry = distributeInteger(passOperatingCost,
            countryPasses.map(row => (row?.oneHourRevenue || 0) + (row?.dayRevenue || 0)));
        const legacyDayPassTransactions = rawByCountry.map(row=>row.dayPassTransactions);
        const legacyDayPassRevenue = rawByCountry.map(row=>row.dayPassRevenue);
        const allocations = {
            attributedSubscriptionRevenue: distributeInteger(revenue.attributedSubscriptionRevenue, subscriptionWeights),
            advertisingImpressions: countryAds.map(row => row.filledImpressions),
            advertisingRevenue: countryAds.map(row => row.revenue),
            premiumTransactions: rawByCountry.map(row=>row.premiumTransactions),
            premiumRevenue: rawByCountry.map(row=>row.premiumRevenue),
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
            meteredAccounts: rawByCountry.map(row=>row.meteredAccounts),
            meteredHours: rawByCountry.map(row=>row.meteredHours),
            meteredRevenue: rawByCountry.map(row=>row.meteredRevenue),
            patronAccounts: rawByCountry.map(row=>row.patronAccounts),
            patronRevenue: rawByCountry.map(row=>row.patronRevenue),
            sponsorshipImpressions: rawByCountry.map(row=>row.sponsorshipImpressions),
            sponsorshipRevenue: rawByCountry.map(row=>row.sponsorshipRevenue),
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
    const localizationRows = [...localizationByPackage.entries()].sort(([left], [right]) => left.localeCompare(right));
    const nextSnapshot: WorldStreamingViewingSnapshot = {
        absoluteWeek,
        totalViewingAccounts: global.totalViewingAccounts,
        totalHoursViewed: global.totalHoursViewed,
        unmetDemandAccounts: global.unmetDemandAccounts,
        incrementalRevenue: global.revenue.totalIncrementalRevenue,
        // The Content Desk's localization figures: who watched in their own
        // language through a region (and its five most-watched titles), how many
        // the region's levels added, and who watched other-language titles no
        // level reached.
        localization: {
            playerViewingAccounts: Math.max(0, Math.round(platformSummary.totalViewingAccounts || 0)),
            localizedViewingAccounts: localizationRows.reduce((sum, [, row]) => sum + row.localized, 0),
            addedViewingAccounts: localizationRows.reduce((sum, [, row]) => sum + row.added, 0),
            untappedViewingAccounts: localizationRows.reduce((sum, [, row]) => sum + row.untapped, 0),
            byPackage: Object.fromEntries(localizationRows.map(([packageId, row]) => [packageId, {
                localized: row.localized,
                added: row.added,
                untapped: row.untapped,
                top: [...row.titles.entries()]
                    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
                    .slice(0, 5) as Array<[string, number]>,
            }])),
        },
    };
    const householdProductRevenue=Object.values(choices).reduce((sum,choice)=>sum+
        fundStreamingConsumerProducts(choice.storeSources.PLAYER || [],streamingConsumerProductRate(platform)),0);
    const commercialTransactions = [...storeBuyerSegments.values()].map(segment => ({
        transactionId: createDeterministicId('streaming-store-sale', absoluteWeek,
            segment.countryId, segment.titleId, segment.kind, segment.buyerPlanId || 'PUBLIC'),
        countryId: segment.countryId, titleId: segment.titleId, kind: segment.kind,
        buyerPlanId: segment.buyerPlanId, households: segment.households,
        purchasedAtAbsoluteWeek: absoluteWeek,
    })).sort((left, right) => left.transactionId.localeCompare(right.transactionId));
    return finish({
        schemaVersion: WORLD_STREAMING_VIEWING_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        sourceFingerprint: createDeterministicId('world-streaming-viewing', absoluteWeek, customers.sourceFingerprint,
            platform.serviceConfiguration.revision, entries.map(entry => `${entry.projectId}:${entry.launchWeek}`).join('|')),
        countries: countryStates,
        platforms,
        global,
        ...(rivalViewing.cinemaAudienceEvidence.length ? {cinemaAudienceEvidence:rivalViewing.cinemaAudienceEvidence} : {}),
        aiCatalogue: aiCatalogue.titles,
        aiCatalogueSeededPlatformIds: aiCatalogue.seededPlatformIds,
        aiStoreEntitlements: rivalViewing.aiStoreEntitlements,
        aiStoreTransactions: rivalViewing.aiStoreTransactions,
        commercialTransactions,
        royaltySourceReceipts,
        householdProductRevenue,
        householdBudgets:Object.entries(choices).flatMap(([id,choice])=>choice.budgets.map(row=>streamingBudgetEvidence(id,row.cohortId,row.budget))),
        snapshots: [...snapshots.filter(item => item.absoluteWeek !== absoluteWeek), nextSnapshot].slice(-MAX_SNAPSHOTS),
    });
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
