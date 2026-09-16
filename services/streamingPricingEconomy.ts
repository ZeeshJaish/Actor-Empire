import type {
    OwnedStreamingPlatformState,
    OwnedStreamingPricingConfiguration,
    OwnedStreamingPricingPlan,
    StreamingRevenueStreamId,
} from '../types';

export const STREAMING_MINIMUM_PAID_PLAN_PRICE = .99;
export const STREAMING_MAXIMUM_PLAN_PRICE = 100;
export const STREAMING_INTRO_OFFER_WEEKS = 13;
export const STREAMING_ANNUAL_BILLING_SHARE = .33;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

export const normalizeStreamingPlanPrice = (value: number, canBeFree: boolean): number => {
    const minimum = canBeFree ? 0 : STREAMING_MINIMUM_PAID_PLAN_PRICE;
    return round2(clamp(Number(value), minimum, STREAMING_MAXIMUM_PLAN_PRICE));
};

export const normalizeStreamingPricingConfiguration = (
    pricing: OwnedStreamingPricingConfiguration,
): OwnedStreamingPricingConfiguration => {
    const streams = [...new Set(pricing.streams)].slice(0, 8) as StreamingRevenueStreamId[];
    const advertisingEnabled = streams.includes('ads');
    const plans = pricing.plans.slice(0, 6).map((plan, index): OwnedStreamingPricingPlan => {
        const ads = advertisingEnabled && plan.ads === true;
        return {
            ...plan,
            id: String(plan.id || `PLAN_${index + 1}`).slice(0, 50),
            name: String(plan.name || `Plan ${index + 1}`).slice(0, 40),
            monthly: normalizeStreamingPlanPrice(Number(plan.monthly), ads),
            featureIds: [...new Set(plan.featureIds.map(String))].slice(0, 20),
            ads,
        };
    });
    return {
        ...pricing,
        streams,
        plans,
        annualDiscount: round2(clamp(pricing.annualDiscount, 0, 40)),
        introOffer: round2(clamp(pricing.introOffer, 0, 60)),
    };
};

export const effectiveMonthlyStreamingPlanPrice = (
    monthly: number,
    annualDiscountPercent: number,
    introOfferPercent: number,
    weeksSinceOfferStart: number,
): number => {
    const listPrice = round2(clamp(monthly, 0, STREAMING_MAXIMUM_PLAN_PRICE));
    const annualMultiplier = 1 - clamp(annualDiscountPercent, 0, 40) / 100;
    const introMultiplier = weeksSinceOfferStart < STREAMING_INTRO_OFFER_WEEKS
        ? 1 - clamp(introOfferPercent, 0, 60) / 100
        : 1;
    return round2(listPrice * (
        STREAMING_ANNUAL_BILLING_SHARE * annualMultiplier
        + (1 - STREAMING_ANNUAL_BILLING_SHARE) * introMultiplier
    ));
};

export const firstYearStreamingPlanRevenuePerSubscriber = (
    monthly: number,
    annualDiscountPercent: number,
    introOfferPercent: number,
): number => {
    const listPrice = round2(clamp(monthly, 0, STREAMING_MAXIMUM_PLAN_PRICE));
    const annualRevenue = listPrice * 12 * (1 - clamp(annualDiscountPercent, 0, 40) / 100);
    const monthlyRevenue = listPrice * (
        3 * (1 - clamp(introOfferPercent, 0, 60) / 100) + 9
    );
    return round2(
        annualRevenue * STREAMING_ANNUAL_BILLING_SHARE
        + monthlyRevenue * (1 - STREAMING_ANNUAL_BILLING_SHARE)
    );
};

const configuredPlans = (platform: Pick<OwnedStreamingPlatformState, 'serviceConfiguration' | 'subscriptionPrices'>): OwnedStreamingPricingPlan[] => {
    const pricing = platform.serviceConfiguration.pricing;
    if (platform.serviceConfiguration.source !== 'UNCONFIGURED' && pricing.streams.includes('subs') && pricing.plans.length) {
        return normalizeStreamingPricingConfiguration(pricing).plans;
    }
    return Object.entries(platform.subscriptionPrices).map(([id, monthly]) => ({
        id,
        name: id,
        monthly: normalizeStreamingPlanPrice(monthly, false),
        featureIds: [],
        ads: false,
    }));
};

export const getStreamingEntryPrice = (
    platform: Pick<OwnedStreamingPlatformState, 'serviceConfiguration' | 'subscriptionPrices'>,
): number => {
    const plans = configuredPlans(platform);
    return plans.length ? Math.min(...plans.map(plan => plan.monthly)) : 0;
};

export const getStreamingBlendedMonthlyPrice = (
    platform: Pick<OwnedStreamingPlatformState, 'serviceConfiguration' | 'subscriptionPrices'>,
): number => {
    const pricing = normalizeStreamingPricingConfiguration(platform.serviceConfiguration.pricing);
    const plans = configuredPlans(platform);
    if (!plans.length) return 0;
    const weights = plans.map(plan => Math.max(.1, 1 + plan.featureIds.length * .12 - (plan.ads ? .08 : 0)));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const weeksSinceOfferStart = STREAMING_INTRO_OFFER_WEEKS;
    return round2(plans.reduce((sum, plan, index) => (
        sum + effectiveMonthlyStreamingPlanPrice(
            plan.monthly,
            pricing.annualDiscount,
            pricing.introOffer,
            weeksSinceOfferStart,
        ) * weights[index]
    ), 0) / totalWeight);
};

export interface StreamingFundingPressure {
    availableCash: number;
    fundedCost: number;
    unfundedCost: number;
    fundingCoverage: number;
    technologyHealthPenalty: number;
    distressed: boolean;
}

export const calculateStreamingFundingPressure = (input: {
    treasuryBefore: number;
    operatingRevenue: number;
    operatingCost: number;
}): StreamingFundingPressure => {
    const availableCash = Math.max(0, input.treasuryBefore) + Math.max(0, input.operatingRevenue);
    const operatingCost = Math.max(0, input.operatingCost);
    const fundedCost = Math.min(availableCash, operatingCost);
    const unfundedCost = round2(Math.max(0, operatingCost - fundedCost));
    const fundingCoverage = operatingCost > 0 ? clamp(fundedCost / operatingCost, 0, 1) : 1;
    return {
        availableCash: round2(availableCash),
        fundedCost: round2(fundedCost),
        unfundedCost,
        fundingCoverage,
        technologyHealthPenalty: round2((1 - fundingCoverage) * 18),
        distressed: unfundedCost > 0,
    };
};
