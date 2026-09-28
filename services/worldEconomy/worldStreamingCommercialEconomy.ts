import type {
    OwnedStreamingPricingConfiguration,
    StreamingRevenueStreamId,
} from '../../types';
import { resolveStreamingAdMarket, type StreamingAdMarketInput } from './worldStreamingAdMarket';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(Number(value)) ? Number(value) : minimum))
);
const whole = (value: number): number => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));

/** Shared aggregate intent curve; entitlement and affordability are checked before this step. */
export const calculateStreamingStoreConversion = (input: {
    buyerPool: number;
    price: number;
    kind: 'RENTAL' | 'PURCHASE';
}): number => {
    const pool = whole(input.buyerPool);
    const price = clamp(input.price, 0, 1_000_000);
    const conversion = input.kind === 'RENTAL' ? .035 : .008;
    const comfortable = input.kind === 'RENTAL' ? 12 : 30;
    return Math.min(pool, whole(pool * conversion * Math.exp(-price / comfortable)));
};

export interface StreamingCommercialStreamDefinition {
    id: StreamingRevenueStreamId;
    revenueClass: 'SUBSCRIPTION' | 'ADVERTISING' | 'TRANSACTION' | 'SPONSORSHIP' | 'COMMUNITY';
    capability: 'BASE' | 'ADVERTISING_COMMERCE' | 'STORE' | 'LIVE' | 'FAN';
}

/**
 * Canonical registry shared by launch, live player settlement and AI strategy.
 * Future technology unlocks can extend this registry without adding another
 * disconnected revenue switch to the week loop.
 */
export const STREAMING_COMMERCIAL_STREAM_REGISTRY: readonly StreamingCommercialStreamDefinition[] = [
    { id: 'subs', revenueClass: 'SUBSCRIPTION', capability: 'BASE' },
    { id: 'ads', revenueClass: 'ADVERTISING', capability: 'ADVERTISING_COMMERCE' },
    { id: 'rentals', revenueClass: 'TRANSACTION', capability: 'STORE' },
    { id: 'premium', revenueClass: 'TRANSACTION', capability: 'STORE' },
    { id: 'daypass', revenueClass: 'TRANSACTION', capability: 'LIVE' },
    { id: 'sponsor', revenueClass: 'SPONSORSHIP', capability: 'ADVERTISING_COMMERCE' },
    { id: 'metered', revenueClass: 'TRANSACTION', capability: 'ADVERTISING_COMMERCE' },
    { id: 'patron', revenueClass: 'COMMUNITY', capability: 'FAN' },
] as const;

export interface WorldStreamingCommercialRevenue {
    advertisingImpressions: number;
    advertisingRevenue: number;
    premiumTransactions: number;
    premiumRevenue: number;
    rentalTransactions: number;
    rentalRevenue: number;
    purchaseTransactions: number;
    purchaseRevenue: number;
    dayPassTransactions: number;
    dayPassRevenue: number;
    meteredAccounts: number;
    meteredHours: number;
    meteredRevenue: number;
    patronAccounts: number;
    patronRevenue: number;
    sponsorshipImpressions: number;
    sponsorshipRevenue: number;
    totalIncrementalRevenue: number;
    commercialOperatingCost: number;
}

export interface StreamingAdFreePassOutcome {
    oneHourTransactions: number;
    dayTransactions: number;
    oneHourRevenue: number;
    dayRevenue: number;
    coveredHours: number;
}

/** Weekly aggregate coverage; a pass removes ads only from already-entitled viewing. */
export const calculateStreamingAdFreePassWeek = (input: {
    adViewingHouseholds: number;
    adEligibleHours: number;
    oneHourPrice: number | null;
    dayPrice: number | null;
    oneHourEligibleHouseholds?: number;
    dayEligibleHouseholds?: number;
}): StreamingAdFreePassOutcome => {
    const households = whole(input.adViewingHouseholds);
    const eligibleHours = whole(input.adEligibleHours);
    const oneHourPrice = input.oneHourPrice === null ? null : clamp(input.oneHourPrice, 0, 1_000_000);
    const dayPrice = input.dayPrice === null ? null : clamp(input.dayPrice, 0, 1_000_000);
    const empty = { oneHourTransactions: 0, dayTransactions: 0, oneHourRevenue: 0,
        dayRevenue: 0, coveredHours: 0 };
    if (!households || !eligibleHours || (oneHourPrice === null && dayPrice === null)) return empty;
    const oneHourEligible = Math.min(households, whole(input.oneHourEligibleHouseholds ?? households));
    const dayEligible = Math.min(households, whole(input.dayEligibleHouseholds ?? households));
    const oneHourTransactions = oneHourPrice === null ? 0 : Math.min(oneHourEligible,
        whole(oneHourEligible * .012 * priceDemand(oneHourPrice, 5)));
    const dayTransactions = dayPrice === null ? 0 : Math.min(dayEligible, households - oneHourTransactions,
        whole(dayEligible * .004 * priceDemand(dayPrice, 12)));
    return { oneHourTransactions, dayTransactions,
        oneHourRevenue: whole(oneHourTransactions * (oneHourPrice || 0)),
        dayRevenue: whole(dayTransactions * (dayPrice || 0)),
        coveredHours: Math.min(eligibleHours, oneHourTransactions + dayTransactions * 3) };
};

export interface WorldStreamingCommercialInput {
    pricing: OwnedStreamingPricingConfiguration;
    paidViewingAccounts: number;
    viewingAccounts: number;
    nonSubscriberOpportunityAccounts: number;
    hoursViewed: number;
    adEligibleHours?: number;
    estimatedViewers: number;
    completionRate: number;
    repeatViewingRate: number;
    isFreshMovie: boolean;
    isRentalEligible: boolean;
    /** Separate durable-purchase permission; omitted fixed-input callers retain C0 behavior. */
    isPurchaseEligible?: boolean;
    isSponsorEligible: boolean;
    commerceCapabilityIndex: number;
    reputationIndex: number;
    /** Optional fixed-input market context; live viewing clears all platforms together. */
    adMarket?: Omit<StreamingAdMarketInput, 'eligibleHours' | 'minutesPerHour' | 'targetCpm'
        | 'audienceQualityIndex' | 'brandSafetyIndex'>;
}

const priceDemand = (price: number, comfortablePrice: number, floor = 0): number => (
    clamp(Math.exp(-Math.max(0, price) / Math.max(.25, comfortablePrice)), floor, 1)
);

export const calculateStreamingCommercialAudienceAdjustment = (
    pricing: OwnedStreamingPricingConfiguration,
): number => {
    const streams = new Set(pricing.streams);
    let adjustment = 0;
    if (streams.has('ads')) {
        const minutes = clamp(pricing.ads.minutesPerHour, 0, 30);
        adjustment += 2.5 - Math.max(0, minutes - 5) * .9;
    }
    if (streams.has('rentals')) adjustment += 2.5 * priceDemand(pricing.rentals.rent, 9);
    if (streams.has('premium')) adjustment += 2.2 * priceDemand(pricing.premium.price, 34);
    if (streams.has('daypass')) adjustment += 4 * priceDemand(pricing.daypass.price, 11);
    if (streams.has('metered')) adjustment += 3 * priceDemand(pricing.metered.perHour, 3.25);
    if (streams.has('patron')) adjustment += 1.6 * priceDemand(pricing.patron.monthly, 24);
    return Math.round(clamp(adjustment, -18, 14) * 100) / 100;
};

export const calculateWorldStreamingCommercialRevenue = (
    input: WorldStreamingCommercialInput,
): WorldStreamingCommercialRevenue => {
    const streams = new Set(input.pricing.streams);
    const paidViewingAccounts = whole(input.paidViewingAccounts);
    const viewingAccounts = whole(input.viewingAccounts);
    const opportunityAccounts = whole(input.nonSubscriberOpportunityAccounts);
    const transactionOpportunityAccounts = paidViewingAccounts + opportunityAccounts * .18;
    const hoursViewed = whole(input.hoursViewed);
    const estimatedViewers = whole(input.estimatedViewers);
    const completion = clamp(input.completionRate, 0, 1);
    const repeat = clamp(input.repeatViewingRate, 0, 1);
    const capability = clamp(input.commerceCapabilityIndex, 0, 100) / 100;
    const reputation = clamp(input.reputationIndex, 0, 100) / 100;

    const adMinutes = clamp(input.pricing.ads.minutesPerHour, 0, 30);
    const market = streams.has('ads') && input.adMarket
        ? resolveStreamingAdMarket({ ...input.adMarket,
            eligibleHours: input.adEligibleHours ?? hoursViewed,
            minutesPerHour: adMinutes,
            audienceQualityIndex: input.commerceCapabilityIndex,
            brandSafetyIndex: input.reputationIndex }) : null;
    const advertisingImpressions = market?.filledImpressions ?? 0;
    const advertisingRevenue = market?.revenue ?? 0;

    const premiumPrice = clamp(input.pricing.premium.price, 0, 1_000_000);
    const premiumTransactions = streams.has('premium') && input.isFreshMovie
        ? whole(transactionOpportunityAccounts * (.008 + completion * .018 + repeat * .01)
            * priceDemand(premiumPrice, 34) * (.72 + capability * .38))
        : 0;
    const premiumRevenue = whole(premiumTransactions * premiumPrice);

    const rentPrice = clamp(input.pricing.rentals.rent, 0, 1_000_000);
    const buyPrice = clamp(input.pricing.rentals.buy, 0, 1_000_000);
    const rentalTransactions = streams.has('rentals') && input.isRentalEligible
        ? whole(transactionOpportunityAccounts * (.011 + completion * .019)
            * priceDemand(rentPrice, 9) * (.76 + capability * .3))
        : 0;
    const purchaseTransactions = streams.has('rentals') && (input.isPurchaseEligible ?? input.isRentalEligible)
        ? whole(transactionOpportunityAccounts * (.002 + repeat * .014)
            * priceDemand(buyPrice, 27) * (.76 + capability * .3))
        : 0;
    const rentalRevenue = whole(rentalTransactions * rentPrice);
    const purchaseRevenue = whole(purchaseTransactions * buyPrice);

    const dayPassPrice = clamp(input.pricing.daypass.price, 0, 1_000_000);
    const dayPassTransactions = streams.has('daypass')
        ? whole(opportunityAccounts * (.018 + completion * .045 + reputation * .015)
            * priceDemand(dayPassPrice, 11) * (.7 + capability * .38))
        : 0;
    const dayPassRevenue = whole(dayPassTransactions * dayPassPrice);

    const meteredPrice = clamp(input.pricing.metered.perHour, 0, 1_000_000);
    const meteredAccounts = streams.has('metered')
        ? whole(opportunityAccounts * (.012 + completion * .025)
            * priceDemand(meteredPrice, 3.25) * (.65 + capability * .4))
        : 0;
    const hoursPerMeteredAccount = clamp(2.5 + completion * 5 + repeat * 8, 2, 10);
    const meteredHours = whole(meteredAccounts * hoursPerMeteredAccount);
    const meteredRevenue = whole(meteredHours * meteredPrice);

    const patronPrice = clamp(input.pricing.patron.monthly, 0, 1_000_000);
    const patronAccounts = streams.has('patron')
        ? whole(viewingAccounts * (.001 + repeat * .018 + reputation * .004)
            * priceDemand(patronPrice, 24) * (.7 + capability * .25))
        : 0;
    const patronRevenue = whole(patronAccounts * patronPrice / 4.33);

    const sponsorshipImpressions = streams.has('sponsor') && input.isSponsorEligible ? estimatedViewers : 0;
    const sponsorshipCap = clamp(input.pricing.sponsor.perTitle, 0, 1_000_000_000) / 52;
    const sponsorshipDelivery = clamp(sponsorshipImpressions / Math.max(50_000, estimatedViewers * 1.15), 0, 1);
    const sponsorshipRevenue = whole(sponsorshipCap * sponsorshipDelivery * (.72 + reputation * .28));

    const transactionRevenue = premiumRevenue + rentalRevenue + purchaseRevenue + dayPassRevenue + meteredRevenue;
    const totalIncrementalRevenue = advertisingRevenue + transactionRevenue + patronRevenue + sponsorshipRevenue;
    const commercialOperatingCost = whole(
        advertisingRevenue * .12
        + transactionRevenue * .035
        + patronRevenue * .06
        + sponsorshipRevenue * .05,
    );

    return {
        advertisingImpressions,
        advertisingRevenue,
        premiumTransactions,
        premiumRevenue,
        rentalTransactions,
        rentalRevenue,
        purchaseTransactions,
        purchaseRevenue,
        dayPassTransactions,
        dayPassRevenue,
        meteredAccounts,
        meteredHours,
        meteredRevenue,
        patronAccounts,
        patronRevenue,
        sponsorshipImpressions,
        sponsorshipRevenue,
        totalIncrementalRevenue,
        commercialOperatingCost,
    };
};

export interface AiStreamingCommercialConfigurationInput {
    platformId: string;
    kind: string;
    technology: number;
    brandPower: number;
    cataloguePower: number;
    prestige: number;
    absoluteWeek: number;
    foundedAtAbsoluteWeek: number;
}

const hashUnit = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 0xffffffff;
};

export const createAiStreamingCommercialConfiguration = (
    input: AiStreamingCommercialConfigurationInput,
): OwnedStreamingPricingConfiguration => {
    const technology = clamp(input.technology, 0, 100);
    const brand = clamp(input.brandPower, 0, 100);
    const catalogue = clamp(input.cataloguePower, 0, 100);
    const prestige = clamp(input.prestige, 0, 100);
    const maturityWeeks = Math.max(0, input.absoluteWeek - input.foundedAtAbsoluteWeek);
    const maturity = clamp(maturityWeeks / 156, 0, 1);
    const variation = hashUnit(`${input.platformId}:commercial`);
    const coreModel: 'subs' | 'ads' | 'rentals' = variation >= .84 && technology >= 34 && catalogue >= 38
        ? 'rentals' : variation >= .65 ? 'ads' : 'subs';
    const streams: StreamingRevenueStreamId[] = [coreModel];
    if (coreModel === 'subs' && (technology >= 18 || brand < 55)) streams.push('ads');
    if (coreModel === 'subs' && technology >= 34 && catalogue >= 38) streams.push('rentals');
    if (coreModel === 'ads' && variation >= .77 && technology >= 34 && catalogue >= 38) streams.push('rentals');
    if (technology >= 48 && catalogue >= 55 && maturity >= .3) streams.push('premium');
    if (technology >= 28 && brand >= 38) streams.push('sponsor');
    if (technology >= 55 && maturity >= .45 && (input.kind.includes('GLOBAL') || variation > .55)) streams.push('daypass');
    if (technology >= 72 && maturity >= .7 && variation > .45) streams.push('metered');
    if (technology >= 62 && prestige >= 60 && catalogue >= 65 && variation > .3) streams.push('patron');

    const basePrice = clamp(5 + prestige * .075 + brand * .035, 4.5, 18);
    return {
        streams,
        plans: streams.includes('subs')
            ? [{ id: 'AI_BASE', name: 'Standard', monthly: Math.round(basePrice * 100) / 100, featureIds: [], ads: streams.includes('ads') }]
            : [],
        annualDiscount: clamp(8 + (100 - brand) * .1, 5, 24),
        introOffer: maturity < .25 ? clamp(12 + (100 - brand) * .12, 8, 30) : 0,
        ads: {
            minutesPerHour: Math.round(clamp(3 + (100 - brand) * .035 + variation * 2, 2, 8) * 10) / 10,
            cpm: Math.round(clamp(10 + prestige * .15 + technology * .08, 8, 36) * 100) / 100,
        },
        rentals: { rent: Math.round(clamp(4 + prestige * .025, 4, 8) * 100) / 100, buy: Math.round(clamp(13 + prestige * .09, 12, 24) * 100) / 100, windowWeeks: Math.round(clamp(4 + catalogue / 25, 4, 8)) },
        premium: { price: Math.round(clamp(18 + prestige * .14, 18, 34) * 100) / 100 },
        daypass: { price: Math.round(clamp(3.5 + prestige * .035, 3.5, 8) * 100) / 100 },
        sponsor: { perTitle: whole(clamp(1_000_000 + brand * 75_000, 1_000_000, 10_000_000)), titles: Math.max(1, Math.round(clamp(catalogue / 28, 1, 4))) },
        metered: { perHour: Math.round(clamp(.5 + prestige * .012, .5, 2) * 100) / 100 },
        patron: { monthly: Math.round(clamp(4 + prestige * .07, 4, 12) * 100) / 100 },
    };
};
