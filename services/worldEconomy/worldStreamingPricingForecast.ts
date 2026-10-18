import type {
    OwnedStreamingPricingConfiguration,
    Player,
    WorldStreamingPlanAllocation,
} from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import {
    normalizeStreamingPricingConfiguration,
    streamingBillingPathPrice,
    streamingIntroOfferAppliesTo,
} from '../streamingPricingEconomy';
import { allocateStreamingAudienceChoice } from './worldStreamingAudienceChoice';
import {createStreamingCohortCommerce, spendStreamingCommerceSource, fundStreamingAdFreePasses, streamingConsumerProductRate} from './worldStreamingHouseholdBudget';
import { normalizeWorldPopulationState } from './worldPopulation';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldAudienceParticipation';
import { clearStreamingAdMarket, getStreamingCountryAdMarket } from './worldStreamingAdMarket';
import { getWorldStreamingOffers } from './worldStreamingOffers';
import { allocateStreamingStoreUnits, calculateStreamingAdFreePassWeek, calculateStreamingStoreConversion } from './worldStreamingCommercialEconomy';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import { stageWorldStreamingOpeningOffer } from './worldStreamingOpening';
import { deriveStreamingNetworkCoverage } from '../streamingNetworkCoverage';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { evaluatePlayerStreamingTitleRoute } from '../streamingContentAvailability';
import { streamingTitleQuality, streamingTitleWeeksAvailable } from './worldStreamingContentValue';

export interface WorldStreamingLaunchPricingForecast {
    reachableHouseholds: number;
    subscribers: number;
    monthlySubscribers: number;
    annualSubscribers: number;
    monthlySubscriptionRevenue: number;
    freeAdHouseholds: number;
    storeHouseholds: number;
    secondaryStoreOpportunities?: number;
    /** Conditional estimate, assuming eligible titles and delivery. Not guaranteed revenue. */
    estimatedWeeklyAdRevenueIfPlayable: number;
    /** Conditional on both an ad-entitled title and delivery. */
    estimatedWeeklyPassRevenueIfPlayable: number;
    /** Conditional on eligible saved titles and delivery; bounded by shared weekly buyer wallets. */
    estimatedWeeklyRentalRevenueIfPlayable: number;
    estimatedWeeklyPurchaseRevenueIfPlayable: number;
    estimatedWeeklyPassBuyersIfPlayable: number;
    estimatedWeeklyRentalBuyersIfPlayable: number;
    estimatedWeeklyPurchaseBuyersIfPlayable: number;
    adAvailableImpressions: number;
    adFilledImpressions: number;
    /** Null when no inventory or filled impressions make the rate unknowable. */
    adFillRate: number | null;
    adRealizedCpm: number | null;
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
    monthlySubscribers: number;
    annualSubscribers: number;
    monthlySubscriptionRevenue: number;
    freeAdHouseholds: number;
    storeHouseholds: number;
    secondaryStoreOpportunities?: number;
    estimatedWeeklyAdRevenueIfPlayable: number;
    estimatedWeeklyPassRevenueIfPlayable: number;
    estimatedWeeklyRentalRevenueIfPlayable: number;
    estimatedWeeklyPurchaseRevenueIfPlayable: number;
    estimatedWeeklyPassBuyersIfPlayable: number;
    estimatedWeeklyRentalBuyersIfPlayable: number;
    estimatedWeeklyPurchaseBuyersIfPlayable: number;
    adAvailableImpressions: number;
    adFilledImpressions: number;
    adFillRate: number | null;
    adRealizedCpm: number | null;
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
    const accounts = countries.reduce((sum, country) => sum + buildViewerAccounts(country), 0);
    if (total <= 0 || accounts <= 0) {
        return Object.fromEntries(countries.map(country => [country.countryId, 0]));
    }
    const rows = countries.map(country => {
        const exact = total * buildViewerAccounts(country) / accounts;
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

const buildViewerAccounts = (country: WorldStreamingLaunchPricingCountryForecast): number => (
    country.accounts + country.freeAdHouseholds + country.storeHouseholds + (country.secondaryStoreOpportunities || 0)
);

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
    const passPrices = projectStreamingCommercialOffers(pricing).adFreePasses;
    const storeEligibility = projectStreamingCommercialOffers(pricing).storeOffer?.eligibility;
    const requestedCountryIds = [...new Set(proposedCountryIds.map(id => String(id || '').trim().toUpperCase()).filter(Boolean))].sort();
    const previewBase: Player = {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            lifecycle: 'ACTIVE',
            identity: platform.identity ? {
                ...platform.identity,
                dayOneMarketIds: requestedCountryIds,
            } : {
                name: 'Your platform',
                slug: 'player-platform',
                primaryColor: '#6d4aff',
                secondaryColor: '#111827',
                logoKey: 'FRAME_PLAY',
                brandPromiseId: 'BALANCED',
                publicManifesto: '',
                dayOneMarketIds: requestedCountryIds,
                launchServerCityId: null,
                foundedAtAbsoluteWeek: absoluteWeek,
            },
            marketOperations: platform.lifecycle === 'ACTIVE' && platform.launchCommit ? platform.marketOperations : [],
            serviceConfiguration: {
                ...platform.serviceConfiguration,
                source: 'PLAYER_ACTION',
                pricing,
                revision: platform.serviceConfiguration.revision + 1,
            },
            launchCommit: platform.lifecycle === 'ACTIVE' ? platform.launchCommit : null,
        },
    };
    const previewPlayer = platform.lifecycle === 'ACTIVE' && platform.launchCommit
        ? previewBase : stageWorldStreamingOpeningOffer(previewBase, absoluteWeek);
    const programEntries = getOwnedStreamingProgramEntries(previewPlayer);
    const registry = getWorldStreamingOffers(previewPlayer, absoluteWeek);
    // The saved platform normalizer bounds day-one markets and network coverage
    // may narrow them further. Forecast only the countries where the same player
    // offer used by live customer choice is actually available.
    const requested = new Set(requestedCountryIds);
    const countryIds = (registry.offers.find(offer => offer.platformId === 'PLAYER')?.activeCountryIds || [])
        .filter(countryId => requested.has(countryId)).sort();
    const population = normalizeWorldPopulationState(previewPlayer.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(previewPlayer.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = normalizeWorldAudienceParticipationState(previewPlayer.world.worldAudienceParticipation,
        population, audience, absoluteWeek);
    const offerMap = new Map(registry.offers.map(offer => [offer.platformId, offer]));
    const facilities = platform.infrastructureSetup?.facilities;
    const coveredShares = facilities?.length ? new Map(deriveStreamingNetworkCoverage({
        facilities, openingCountryIds: requestedCountryIds, fibreState: platform.fibre,
    }).countries.map(country => [country.countryId, country.coveredShare])) : null;
    const choices = countryIds.map(countryId => {
        const countryOffers = (registry.byCountry[countryId] || []).map(id => offerMap.get(id))
            .filter((offer): offer is NonNullable<typeof offer> => Boolean(offer));
        const cohorts = audience.countries[countryId]?.cohorts || [];
        const cohortChoices = cohorts.map(cohort => {
            const path = participation.countries[countryId]?.cohorts.find(row => row.cohortId === cohort.id);
            const coveredShare = coveredShares ? coveredShares.get(countryId) || 0 : 1;
            const choice=path ? allocateStreamingAudienceChoice(countryId,cohort,path,countryOffers) : null;
            if(!choice || !path) return {cohort,allocations:[],commerce:null};
            choice.allocations=choice.allocations.map(row=>row.platformId==='PLAYER' ? {...row,
                households:Math.round(row.households*coveredShare),primaryHouseholds:Math.round(row.primaryHouseholds*coveredShare),
                monthlySpend:Math.round(row.monthlySpend*coveredShare*100)/100} : row);
            choice.storeOpportunities=choice.storeOpportunities.map(row=>row.platformId==='PLAYER'
                ? {...row,households:Math.round(row.households*coveredShare)} : row);
            choice.freeAdOpportunities=choice.freeAdOpportunities.map(row=>row.platformId==='PLAYER'?{...row,households:Math.round(row.households*coveredShare)}:row);
            return {cohort,allocations:[...choice.allocations,...choice.freeAdOpportunities],commerce:createStreamingCohortCommerce({countryId,cohort,participation:path,choice,offers:countryOffers,consumerProductPlatformIds:streamingConsumerProductRate(platform)>0?['PLAYER']:[]})};
        });
        return { countryId, allocations: cohortChoices.flatMap(row => row.allocations), cohortChoices };
    });
    const allocationsByPlan = new Map<string, WorldStreamingPlanAllocation>();
    pricing.plans.forEach(plan => allocationsByPlan.set(plan.id, {
        planId: plan.id,
        planName: plan.name,
        households: 0,
        monthlyHouseholds: 0,
        annualHouseholds: 0,
        effectiveMonthlyPrice: 0,
        monthlySubscriptionRevenue: 0,
    }));
    choices.flatMap(row => row.allocations.filter(item => item.platformId === 'PLAYER'
        && item.kind === 'SUBSCRIPTION')).forEach(row => {
        const current = allocationsByPlan.get(row.planId) || {
            planId: row.planId!,
            planName: pricing.plans.find(plan => plan.id === row.planId)?.name || row.planId!,
            households: 0,
            monthlyHouseholds: 0,
            annualHouseholds: 0,
            effectiveMonthlyPrice: 0,
            monthlySubscriptionRevenue: 0,
        };
        current.households += row.households;
        current.monthlyHouseholds += row.billingPath === 'MONTHLY' ? row.households : 0;
        current.annualHouseholds += row.billingPath === 'ANNUAL' ? row.households : 0;
        current.monthlySubscriptionRevenue = Math.round((current.monthlySubscriptionRevenue + row.monthlySpend) * 100) / 100;
        current.effectiveMonthlyPrice = current.households > 0
            ? Math.round(current.monthlySubscriptionRevenue / current.households * 100) / 100
            : 0;
        allocationsByPlan.set(row.planId!, current);
    });
    const planAllocations = [...allocationsByPlan.values()];
    const priceByPlan = new Map(pricing.plans.map(plan => [plan.id, plan.monthly]));
    const firstYearSubscriptionRevenue = Math.round(planAllocations.reduce((sum, row) => {
        const list = priceByPlan.get(row.planId) || 0;
        const introApplies = streamingIntroOfferAppliesTo(row.planId, pricing.introOfferPlanId);
        const annualMonth = streamingBillingPathPrice(list, pricing.annualDiscount, pricing.introOffer, 0, 'ANNUAL', introApplies);
        const introMonth = streamingBillingPathPrice(list, pricing.annualDiscount, pricing.introOffer, 0, 'MONTHLY', introApplies);
        const matureMonth = streamingBillingPathPrice(list, pricing.annualDiscount, pricing.introOffer, 13, 'MONTHLY', introApplies);
        return sum + row.annualHouseholds * annualMonth * 12
            + row.monthlyHouseholds * (introMonth * 3 + matureMonth * 9);
    }, 0) * 100) / 100;
    const eligibleRivals = registry.offers.filter(offer => (
        !offer.isPlayer && offer.activeCountryIds.some(countryId => countryIds.includes(countryId))
    ));
    const rivalEntryPrices = eligibleRivals.flatMap(offer => (
        offer.plans.length ? [Math.min(...offer.plans.map(plan => plan.effectiveMonthlyPrice))] : []
    ));
    const countries = countryIds.map(countryId => {
        const choice = choices.find(row => row.countryId === countryId)!;
        const playerRows = choice.allocations.filter(row => row.platformId === 'PLAYER');
        const paidRows = playerRows.filter(row => row.kind === 'SUBSCRIPTION');
        const freeAdHouseholds = playerRows.filter(row => row.kind === 'FREE_AD')
            .reduce((sum, row) => sum + row.households, 0);
        const storeHouseholds = playerRows.filter(row => row.kind === 'STORE')
            .reduce((sum, row) => sum + row.households, 0);
        const adPlanHouseholds = paidRows.filter(row => pricing.plans.some(plan => plan.id === row.planId && plan.ads))
            .reduce((sum, row) => sum + row.households, 0);
        const marketCountry = population.countries[countryId];
        const market = marketCountry && getStreamingCountryAdMarket(marketCountry, absoluteWeek,
            participation.countries[countryId]?.streamingReachableHouseholds || 0);
        const adViewingHouseholds = freeAdHouseholds + adPlanHouseholds;
        const averagePaidMonthlyPrice = paidRows.reduce((sum, row) => sum + row.monthlySpend, 0)
            / Math.max(1, paidRows.reduce((sum, row) => sum + row.households, 0));
        const affordablePassHouseholds = (price: number | null): number => price === null ? 0
            : Math.min(adViewingHouseholds, choice.cohortChoices.reduce((sum, row) => {
                const playerRows = row.allocations.filter(allocation => allocation.platformId === 'PLAYER');
                const budget = row.cohort.monthlyEntertainmentBudgetPerHousehold;
                return sum + playerRows.reduce((cohortSum, allocation) => (
                    cohortSum + (allocation.kind === 'FREE_AD' && budget >= price ? allocation.households : 0)
                        + (allocation.kind === 'SUBSCRIPTION'
                            && pricing.plans.some(plan => plan.id === allocation.planId && plan.ads)
                            && budget - averagePaidMonthlyPrice >= price ? allocation.households : 0)
                ), 0);
            }, 0));
        const estimatedAdHoursIfPlayable = adViewingHouseholds * 1.5;
        let passes = calculateStreamingAdFreePassWeek({ adViewingHouseholds,
            adEligibleHours: estimatedAdHoursIfPlayable,
            oneHourPrice: passPrices.oneHourPrice, dayPrice: passPrices.dayPrice,
            oneHourEligibleHouseholds: affordablePassHouseholds(passPrices.oneHourPrice),
            dayEligibleHouseholds: affordablePassHouseholds(passPrices.dayPrice) });
        const storeSources = choice.cohortChoices.flatMap(row=>row.commerce?.storeSources || [])
            .filter(source=>source.platformId==='PLAYER');
        const reservedStoreHomes = new Map<string,number>();
        const estimateStoreBuyers = (kind: 'RENTAL' | 'PURCHASE'): number => {
            if (!pricing.streams.includes('rentals')) return 0;
            const price = kind === 'RENTAL' ? pricing.rentals.rent : pricing.rentals.buy;
            const titles = programEntries.filter(entry=>evaluatePlayerStreamingTitleRoute(
                previewPlayer,entry.projectId,countryId,absoluteWeek,{kind}).allowed);
            if(!titles.length) return 0;
            const quality=titles.reduce((sum,title)=>sum+streamingTitleQuality(previewPlayer,title.projectId),0)/titles.length;
            const weeksAvailable=titles.reduce((sum,title)=>sum+streamingTitleWeeksAvailable(previewPlayer,title,absoluteWeek),0)/titles.length;
            const canBuyTitle = (source:typeof storeSources[number],titleId:string):boolean => {
                const permitted=storeEligibility?.kind!=='MEMBERSHIP_PLANS'
                    || (source.kind==='SUBSCRIPTION' && storeEligibility.planIds.includes(source.planId || ''));
                if(!permitted || source.remainingMonthlyBudget<price) return false;
                return source.kind==='STORE' || !evaluatePlayerStreamingTitleRoute(
                    previewPlayer,titleId,countryId,absoluteWeek,source.kind==='FREE_AD'
                        ? {kind:'AD_SUPPORTED'} : {kind:'SUBSCRIPTION',planId:source.planId || ''}).allowed;
            };
            const sources=storeSources.filter(source=>titles.some(title=>canBuyTitle(source,title.projectId)));
            const pool=sources.reduce((sum,source)=>sum+source.households,0);
            const eligibleByTitle=titles.map(title=>sources.filter(source=>canBuyTitle(source,title.projectId)));
            const pools=eligibleByTitle.map(rows=>rows.reduce((sum,source)=>sum+source.households,0));
            const wanted=calculateStreamingStoreConversion({buyerPool:pool,price,kind,quality,weeksAvailable});
            const byTitle=allocateStreamingStoreUnits(wanted,titles.map((title,index)=>
                pools[index]*Math.max(1,streamingTitleQuality(previewPlayer,title.projectId))));
            return titles.reduce((sum,title,index)=>{
                const owners=(previewPlayer.world.worldStreamingAudienceChoice?.entitlements || [])
                    .filter(row=>row.countryId===countryId && row.titleId===title.projectId
                        && (row.kind==='PURCHASE' || Number(row.expiresAtAbsoluteWeek)>absoluteWeek))
                    .reduce((total,row)=>total+row.households,0);
                const remaining=Math.max(0,pools[index]-owners-(reservedStoreHomes.get(title.projectId) || 0));
                const counts=allocateStreamingStoreUnits(Math.min(byTitle[index],remaining),
                    eligibleByTitle[index].map(source=>source.households));
                const settled=eligibleByTitle[index].reduce((total,source,i)=>total+spendStreamingCommerceSource(
                    source,Math.min(counts[i],source.households),price),0);
                reservedStoreHomes.set(title.projectId,(reservedStoreHomes.get(title.projectId) || 0)+settled);
                return sum+settled;
            },0);
        };
        const rentalBuyers = estimateStoreBuyers('RENTAL');
        const purchaseBuyers = estimateStoreBuyers('PURCHASE');
        passes=fundStreamingAdFreePasses(passes,storeSources.filter(source=>source.kind==='FREE_AD'
            || (source.kind==='SUBSCRIPTION' && pricing.plans.some(plan=>plan.id===source.planId && plan.ads))),
            passPrices.oneHourPrice,passPrices.dayPrice,estimatedAdHoursIfPlayable);
        const adForecast = pricing.streams.includes('ads') && market
            ? clearStreamingAdMarket({ countryId, absoluteWeek,
                advertiserDemandBudget: market.advertiserDemandBudget,
                marketReferenceCpm: market.marketReferenceCpm,
                suppliers: (registry.byCountry[countryId] || []).flatMap(platformId => {
                    const candidate = offerMap.get(platformId);
                    if (!candidate?.commercialConfiguration.streams.includes('ads')) return [];
                    const adHouseholds = choice.allocations.filter(row => row.platformId === platformId
                        && (row.kind === 'FREE_AD' || (row.kind === 'SUBSCRIPTION'
                            && candidate.plans.some(plan => plan.id === row.planId && plan.ads))))
                        .reduce((sum, row) => sum + row.households, 0);
                    const eligibleHours = Math.max(0, adHouseholds * 1.5
                        - (candidate.isPlayer ? passes.coveredHours : 0));
                    return [{ platformId, eligibleHours,
                        minutesPerHour: candidate.commercialConfiguration.ads.minutesPerHour,
                        audienceQualityIndex: candidate.isPlayer
                            ? Math.max(0, Math.min(100, platform.technologyLevels.ADVERTISING_COMMERCE || 0))
                            : Math.max(0, Math.min(100, candidate.reliabilityIndex * .55 + candidate.marketingIndex * .45)),
                        brandSafetyIndex: candidate.isPlayer
                            ? platform.competitiveWorld.globalPrestige : candidate.reputationIndex }];
                }),
            }).byPlatform.PLAYER || null : null;
        return {
            countryId,
            reachableHouseholds: participation.countries[countryId]?.streamingReachableHouseholds || 0,
            accounts: paidRows.reduce((sum, row) => sum + row.households, 0),
            monthlySubscribers: paidRows.filter(row => row.billingPath === 'MONTHLY')
                .reduce((sum, row) => sum + row.households, 0),
            annualSubscribers: paidRows.filter(row => row.billingPath === 'ANNUAL')
                .reduce((sum, row) => sum + row.households, 0),
            monthlySubscriptionRevenue: Math.round(paidRows.reduce((sum, row) => (
                sum + row.monthlySpend
            ), 0) * 100) / 100,
            freeAdHouseholds, storeHouseholds,
            secondaryStoreOpportunities:storeSources.filter(source=>source.kind==='STORE').reduce((sum,source)=>sum+source.households,0)-storeHouseholds,
            estimatedWeeklyAdRevenueIfPlayable: adForecast?.revenue || 0,
            estimatedWeeklyPassRevenueIfPlayable: passes.oneHourRevenue + passes.dayRevenue,
            estimatedWeeklyRentalRevenueIfPlayable: Math.round(rentalBuyers * pricing.rentals.rent),
            estimatedWeeklyPurchaseRevenueIfPlayable: Math.round(purchaseBuyers * pricing.rentals.buy),
            estimatedWeeklyPassBuyersIfPlayable: passes.oneHourTransactions + passes.dayTransactions,
            estimatedWeeklyRentalBuyersIfPlayable: rentalBuyers,
            estimatedWeeklyPurchaseBuyersIfPlayable: purchaseBuyers,
            adAvailableImpressions: adForecast?.availableImpressions || 0,
            adFilledImpressions: adForecast?.filledImpressions || 0,
            adFillRate: adForecast && adForecast.availableImpressions > 0 ? adForecast.fillRate : null,
            adRealizedCpm: adForecast && adForecast.filledImpressions > 0 ? adForecast.realizedCpm : null,
        };
    });
    return {
        reachableHouseholds: countries.reduce((sum, country) => sum + country.reachableHouseholds, 0),
        subscribers: countries.reduce((sum, row) => sum + row.accounts, 0),
        monthlySubscribers: countries.reduce((sum, row) => sum + row.monthlySubscribers, 0),
        annualSubscribers: countries.reduce((sum, row) => sum + row.annualSubscribers, 0),
        monthlySubscriptionRevenue: Math.round(countries.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0) * 100) / 100,
        freeAdHouseholds: countries.reduce((sum, row) => sum + row.freeAdHouseholds, 0),
        storeHouseholds: countries.reduce((sum, row) => sum + row.storeHouseholds, 0),
        secondaryStoreOpportunities:countries.reduce((sum,row)=>sum+(row.secondaryStoreOpportunities || 0),0),
        estimatedWeeklyPassRevenueIfPlayable: countries.reduce((sum, row) => sum + row.estimatedWeeklyPassRevenueIfPlayable, 0),
        estimatedWeeklyAdRevenueIfPlayable: countries.reduce((sum, row) => sum + row.estimatedWeeklyAdRevenueIfPlayable, 0),
        estimatedWeeklyRentalRevenueIfPlayable: countries.reduce((sum, row) => sum + row.estimatedWeeklyRentalRevenueIfPlayable, 0),
        estimatedWeeklyPurchaseRevenueIfPlayable: countries.reduce((sum, row) => sum + row.estimatedWeeklyPurchaseRevenueIfPlayable, 0),
        estimatedWeeklyPassBuyersIfPlayable: countries.reduce((sum, row) => sum + row.estimatedWeeklyPassBuyersIfPlayable, 0),
        estimatedWeeklyRentalBuyersIfPlayable: countries.reduce((sum, row) => sum + row.estimatedWeeklyRentalBuyersIfPlayable, 0),
        estimatedWeeklyPurchaseBuyersIfPlayable: countries.reduce((sum, row) => sum + row.estimatedWeeklyPurchaseBuyersIfPlayable, 0),
        adAvailableImpressions: countries.reduce((sum, row) => sum + row.adAvailableImpressions, 0),
        adFilledImpressions: countries.reduce((sum, row) => sum + row.adFilledImpressions, 0),
        adFillRate: countries.some(row => row.adAvailableImpressions > 0)
            ? countries.reduce((sum, row) => sum + row.adFilledImpressions, 0)
                / countries.reduce((sum, row) => sum + row.adAvailableImpressions, 0)
            : null,
        adRealizedCpm: countries.some(row => row.adFilledImpressions > 0)
            ? countries.reduce((sum, row) => sum + row.estimatedWeeklyAdRevenueIfPlayable, 0) * 1000
                / countries.reduce((sum, row) => sum + row.adFilledImpressions, 0)
            : null,
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
    const forecastAccounts = pricingForecast.subscribers + pricingForecast.freeAdHouseholds + pricingForecast.storeHouseholds
        + (pricingForecast.secondaryStoreOpportunities || 0);
    const low = Math.max(0, Math.round(forecastAccounts * 0.12));
    const likely = Math.max(low, Math.round(forecastAccounts * 0.24));
    const high = Math.max(likely, Math.round(forecastAccounts * 0.42));
    return {
        low,
        likely,
        high,
        byMarket: allocateDemandByCountry(likely, pricingForecast.countries),
        reachableHouseholds: pricingForecast.reachableHouseholds,
        forecastAccounts,
    };
};
